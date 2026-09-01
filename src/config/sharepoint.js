const runtimeConfig = window.__DEMO_SCHEDULE_CONFIG__ || {};

export const sharePointConfig = {
  enabled: runtimeConfig.dataSource === "sharepoint" || import.meta.env.VITE_DATA_SOURCE === "sharepoint",
  siteUrl: runtimeConfig.siteUrl || import.meta.env.VITE_SHAREPOINT_SITE_URL || "",
  equipmentList: runtimeConfig.equipmentList || import.meta.env.VITE_EQUIPMENT_LIST || "DemoEquipment",
  bookingsList: runtimeConfig.bookingsList || import.meta.env.VITE_BOOKINGS_LIST || "DemoBookings",
};
