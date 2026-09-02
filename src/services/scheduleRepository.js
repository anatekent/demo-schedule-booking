import { equipment, initialBookings } from "../data/demoData";
import { sharePointConfig } from "../config/sharepoint";

const STORAGE_KEY_EQUIPMENT = "demo_schedule_equipment_v3";
const STORAGE_KEY_BOOKINGS = "demo_schedule_bookings_v3";

let memoryEquipment = null;
let memoryBookings = null;

function getPersistentEquipment() {
  if (memoryEquipment) return memoryEquipment;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EQUIPMENT);
    if (saved) {
      memoryEquipment = JSON.parse(saved);
      return memoryEquipment;
    }
  } catch (e) {}
  
  memoryEquipment = equipment.map((item, index) => ({ ...item, sortOrder: index + 1 }));
  try {
    localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(memoryEquipment));
  } catch (e) {}
  return memoryEquipment;
}

function setPersistentEquipment(data) {
  memoryEquipment = data;
  try {
    localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(data));
  } catch (e) {}
}

function getPersistentBookings() {
  if (memoryBookings) return memoryBookings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (saved) {
      memoryBookings = JSON.parse(saved);
      return memoryBookings;
    }
  } catch (e) {}

  memoryBookings = initialBookings;
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(memoryBookings));
  } catch (e) {}
  return memoryBookings;
}

function setPersistentBookings(data) {
  memoryBookings = data;
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(data));
  } catch (e) {}
}

export class DemoScheduleRepository {
  mode = "demo";
  async getEquipment() { return structuredClone(getPersistentEquipment()); }
  async getBookings() { return structuredClone(getPersistentBookings()); }
  async saveEquipment(item) {
    const list = getPersistentEquipment();
    const isExisting = Boolean(item.id);
    let savedItem;
    if (isExisting) {
      savedItem = { ...item };
      const index = list.findIndex((i) => i.id === item.id);
      if (index >= 0) list[index] = savedItem; else list.push(savedItem);
    } else {
      savedItem = { ...item, id: `equipment-${Date.now()}`, sortOrder: list.length + 1 };
      list.push(savedItem);
    }
    setPersistentEquipment(list);
    return structuredClone(savedItem);
  }
  async deleteEquipment(id) {
    let list = getPersistentEquipment();
    list = list.filter((item) => item.id !== id);
    setPersistentEquipment(list);
    return null;
  }
  async saveEquipmentOrder(items) {
    setPersistentEquipment(items);
    return null;
  }
  async saveBooking(booking) {
    const list = getPersistentBookings();
    const isExisting = Boolean(booking.id);
    let savedBooking;
    if (isExisting) {
      savedBooking = { ...booking };
      const index = list.findIndex((b) => b.id === booking.id);
      if (index >= 0) list[index] = savedBooking; else list.push(savedBooking);
    } else {
      savedBooking = { ...booking, id: Date.now() };
      list.push(savedBooking);
    }
    setPersistentBookings(list);
    return structuredClone(savedBooking);
  }
  async deleteBooking(id) {
    let list = getPersistentBookings();
    list = list.filter((booking) => booking.id !== id);
    setPersistentBookings(list);
    return null;
  }
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
      credentials: "include", ...options,
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
      method: "POST", headers: { "Content-Type": "application/json;odata=nometadata" },
    });
    return data.FormDigestValue;
  }
  async getEquipment() {
    const query = "$select=Id,Title,NameZh,Maker,Model,PartNo,SerialNo,Accessories,SortOrder,Active&$filter=Active eq 1&$orderby=SortOrder,Title";
    const data = await this.request(`${this.listEndpoint(this.config.equipmentList)}/items?${query}`);
    return data.value.map((row) => ({
      id: String(row.Id), name: row.Title || "", nameZh: row.NameZh || "",
      maker: row.Maker || "", model: row.Model || "", partNo: row.PartNo || "", serialNo: row.SerialNo || "",
      accessories: row.Accessories || "", sortOrder: row.SortOrder ?? 9999,
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
      Title: item.name, NameZh: item.nameZh, Maker: item.maker, Model: item.model,
      PartNo: item.partNo, SerialNo: item.serialNo, Accessories: item.accessories,
      SortOrder: item.sortOrder ?? 9999, Active: true,
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
      method: "POST", headers: { "X-RequestDigest": digest, "If-Match": "*", "X-HTTP-Method": "DELETE" },
    });
  }
  async deleteEquipment(id) { return this.deleteListItem(this.config.equipmentList, id); }
  async saveEquipmentOrder(items) {
    const digest = await this.getDigest();
    for (const [index, item] of items.entries()) {
      await this.request(`${this.listEndpoint(this.config.equipmentList)}/items(${Number(item.id)})`, {
        method: "POST",
        headers: { "Content-Type": "application/json;odata=nometadata", "X-RequestDigest": digest, "If-Match": "*", "X-HTTP-Method": "MERGE" },
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
  async deleteBooking(id) { return this.deleteListItem(this.config.bookingsList, id); }
}

export function createScheduleRepository() {
  return sharePointConfig.enabled ? new SharePointScheduleRepository(sharePointConfig) : new DemoScheduleRepository();
}