export const equipment = [
  { id: "nitrogen", name: "Nitrate Nitrogen", nameZh: "硝酸鹽氮", maker: "HACH", model: "SC4500 + NT3100sc", partNo: "LXV525.99A11501", serialNo: "—", accessories: "—" },
  { id: "toc", name: "TOC (Total Organic Carbon)", nameZh: "總有機碳", maker: "HORIBA", model: "HT-110", partNo: "—", serialNo: "—", accessories: "—" },
  { id: "cod", name: "COD (Chemical Oxygen Demand)", nameZh: "化學需氧量", maker: "HACH", model: "CODmax III", partNo: "8974900", serialNo: "—", accessories: "—" },
  { id: "tp", name: "TP (Total Phosphorus)", nameZh: "總磷", maker: "HACH", model: "EZ7826", partNo: "8974900", serialNo: "—", accessories: "—" },
  { id: "do", name: "DO (Dissolved Oxygen)", nameZh: "溶氧", maker: "HACH", model: "Polymetron 2582sc", partNo: "2582.99.A01801", serialNo: "—", accessories: "—" },
  { id: "tss", name: "TSS / Turbidity", nameZh: "懸浮固體／濁度", maker: "HACH", model: "SOLITAX sc", partNo: "LXV423.99.00100", serialNo: "—", accessories: "—" },
];

export const initialBookings = [
  { id: 1, equipmentId: "nitrogen", title: "Demo 於 PSMC 8A", customer: "李羅曜", contact: "李羅曜", applicant: "楊惠雯 Rita", demoOwner: "黃于城", start: "2026-08-31", end: "2026-09-03", status: "active" },
  { id: 2, equipmentId: "nitrogen", title: "Demo 於 UMC 12AP1 2", customer: "林洛雨", contact: "林洛雨", applicant: "曾依蓉 Iris", demoOwner: "陳帝翰", start: "2026-09-05", end: "2026-09-11", status: "reserved" },
  { id: 3, equipmentId: "toc", title: "Demo 於 UMC 12AP5 6", customer: "黃翊元", contact: "黃翊元", applicant: "曾依蓉 Iris", demoOwner: "陳帝翰", start: "2026-09-02", end: "2026-09-08", status: "reserved" },
  { id: 4, equipmentId: "tp", title: "Demo 於 VIS 2", customer: "李羅曜", contact: "李羅曜", applicant: "楊惠雯 Rita", demoOwner: "黃于城", start: "2026-08-31", end: "2026-09-10", status: "active" },
  { id: 5, equipmentId: "do", title: "Demo 中龍鋼鐵 W56", customer: "張智中", contact: "張智中", applicant: "林語蓁 Lori", demoOwner: "盧柏豪", start: "2026-09-03", end: "2026-09-12", status: "active" },
  { id: 6, equipmentId: "tss", title: "Demo 於 Micron F16 A3", customer: "吳秉棋", contact: "吳秉棋", applicant: "林芳如 Rita", demoOwner: "楊源龍", start: "2026-08-31", end: "2026-09-04", status: "completed" },
  { id: 7, equipmentId: "cod", title: "Demo tsmc AP6A", customer: "劉冠廷", contact: "劉冠廷", applicant: "莊婷淑 Charlotte", demoOwner: "胡世韜", start: "2026-09-07", end: "2026-09-13", status: "preparing" },
];
