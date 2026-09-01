import { equipment, initialBookings } from "../data/demoData";
import { sharePointConfig } from "../config/sharepoint";

export class DemoScheduleRepository {
  mode = "demo";
  async getEquipment() { return structuredClone(equipment.map((item, index) => ({ ...item, sortOrder: index + 1 }))); }
  async getBookings() { return structuredClone(initialBookings); }
  async saveEquipment(item) {
    return structuredClone({ ...item, id: item.id || `equipment-${Date.now()}` });
  }
  async deleteEquipment() { return null; }
  async saveEquipmentOrder() { return null; }
  async saveBooking(booking) { return structuredClone(booking); }
  async deleteBooking() { return null; }
}

export class SharePointScheduleRepository {
  mode = "sharepoint";

  constructor(config) {
    this.config = config;
    this.siteUrl = (config.siteUrl || window._spPageContextInfo?.webAbsoluteUrl || "").replace(/\/$/, "");
    if (!this.siteUrl) throw new Error("尚未設定 SharePoint Site URL。");
  }

  listEndpoint(listName) {
    const escaped = listName.replaceAll("'", "''");
    return `${this.siteUrl}/_api/web/lists/GetByTitle('${escaped}')`;
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: { Accept: "application/json;odata=nometadata", ...options.headers },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`SharePoint ${response.status}: ${detail.slice(0, 220)}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async getDigest() {
    const data = await this.request(`${this.siteUrl}/_api/contextinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json;odata=nometadata" },
    });
    return data.FormDigestValue;
  }

  async getEquipment() {
    const query = "$select=Id,Title,NameZh,Maker,Model,PartNo,SerialNo,Accessories,SortOrder,Active&$filter=Active eq 1&$orderby=SortOrder,Title";
    const data = await this.request(`${this.listEndpoint(this.config.equipmentList)}/items?${query}`);
    return data.value.map((row) => ({
      id: String(row.Id), name: row.Title || "", nameZh: row.NameZh || "",
      maker: row.Maker || "", model: row.Model || "", partNo: row.PartNo || "", serialNo: row.SerialNo || "",
      accessories: row.Accessories || "",
      sortOrder: row.SortOrder ?? 9999,
    }));
  }

  async getBookings() {
    const query = "$select=Id,Title,EquipmentId,Customer,Contact,Applicant,DemoOwner,StartDate,EndDate,Status&$orderby=StartDate";
    const data = await this.request(`${this.listEndpoint(this.config.bookingsList)}/items?${query}`);
    return data.value.map((row) => ({
      id: row.Id, equipmentId: String(row.EquipmentId), title: row.Title || "",
      customer: row.Customer || "", contact: row.Contact || "", applicant: row.Applicant || "",
      demoOwner: row.DemoOwner || "", start: row.StartDate?.slice(0, 10) || "",
      end: row.EndDate?.slice(0, 10) || "", status: row.Status || "reserved",
    }));
  }

  async saveEquipment(item) {
    const digest = await this.getDigest();
    const payload = {
      Title: item.name,
      NameZh: item.nameZh,
      Maker: item.maker,
      Model: item.model,
      PartNo: item.partNo,
      SerialNo: item.serialNo,
      Accessories: item.accessories,
      SortOrder: item.sortOrder ?? 9999,
      Active: true,
    };
    const isExisting = Number.isInteger(Number(item.id)) && Number(item.id) > 0;
    const endpoint = isExisting
      ? `${this.listEndpoint(this.config.equipmentList)}/items(${Number(item.id)})`
      : `${this.listEndpoint(this.config.equipmentList)}/items`;
    const result = await this.request(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;odata=nometadata",
        "X-RequestDigest": digest,
        ...(isExisting ? { "If-Match": "*", "X-HTTP-Method": "MERGE" } : {}),
      },
      body: JSON.stringify(payload),
    });
    return { ...item, id: isExisting ? String(item.id) : String(result.Id) };
  }

  async deleteListItem(listName, id) {
    const digest = await this.getDigest();
    await this.request(`${this.listEndpoint(listName)}/items(${Number(id)})`, {
      method: "POST",
      headers: {
        "X-RequestDigest": digest,
        "If-Match": "*",
        "X-HTTP-Method": "DELETE",
      },
    });
  }

  async deleteEquipment(id) {
    return this.deleteListItem(this.config.equipmentList, id);
  }

  async saveEquipmentOrder(items) {
    const digest = await this.getDigest();
    for (const [index, item] of items.entries()) {
      await this.request(`${this.listEndpoint(this.config.equipmentList)}/items(${Number(item.id)})`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;odata=nometadata",
          "X-RequestDigest": digest,
          "If-Match": "*",
          "X-HTTP-Method": "MERGE",
        },
        body: JSON.stringify({ SortOrder: index + 1 }),
      });
    }
  }

  async hasConflict(booking) {
    const start = `${booking.start}T00:00:00Z`;
    const end = `${booking.end}T23:59:59Z`;
    const ignoreCurrent = booking.id ? ` and Id ne ${Number(booking.id)}` : "";
    const filter = `EquipmentId eq ${Number(booking.equipmentId)} and StartDate le datetime'${end}' and EndDate ge datetime'${start}'${ignoreCurrent}`;
    const url = `${this.listEndpoint(this.config.bookingsList)}/items?$select=Id&$top=1&$filter=${encodeURIComponent(filter)}`;
    const data = await this.request(url);
    return data.value.length > 0;
  }

  async saveBooking(booking) {
    if (await this.hasConflict(booking)) {
      throw new Error("此設備在 SharePoint 中已有重疊預約，請重新整理後調整日期。");
    }
    const digest = await this.getDigest();
    const payload = {
      Title: booking.title, EquipmentId: Number(booking.equipmentId), Customer: booking.customer,
      Contact: booking.contact, Applicant: booking.applicant, DemoOwner: booking.demoOwner,
      StartDate: `${booking.start}T00:00:00Z`, EndDate: `${booking.end}T23:59:59Z`, Status: booking.status,
    };
    const isExisting = Number.isInteger(Number(booking.id)) && Number(booking.id) > 0;
    const endpoint = isExisting
      ? `${this.listEndpoint(this.config.bookingsList)}/items(${Number(booking.id)})`
      : `${this.listEndpoint(this.config.bookingsList)}/items`;
    const headers = {
      "Content-Type": "application/json;odata=nometadata", "X-RequestDigest": digest,
      ...(isExisting ? { "If-Match": "*", "X-HTTP-Method": "MERGE" } : {}),
    };
    const result = await this.request(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
    return { ...booking, id: isExisting ? Number(booking.id) : result.Id };
  }

  async deleteBooking(id) {
    return this.deleteListItem(this.config.bookingsList, id);
  }
}

export function createScheduleRepository() {
  return sharePointConfig.enabled ? new SharePointScheduleRepository(sharePointConfig) : new DemoScheduleRepository();
}
