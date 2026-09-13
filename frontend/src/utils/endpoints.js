/**
 * Centralized API Endpoints Definition
 * Sesuai aturan ketat AGENTS.md:
 * - Dilarang hardcode endpoint di komponen atau halaman
 * - Seluruh route API dipanggil dari konstanta/fungsi di file ini
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    PROFILE: "/api/auth/profile",
    ROLES: "/api/auth/roles",
  },

  DASHBOARD: {
    STATS: "/api/dashboard/stats",
    PIPELINE: "/api/dashboard/pipeline",
    RECENT_ACTIVITIES: "/api/dashboard/recent-activities",
  },

  PIC: {
    SUMMARY: "/api/pic/dashboard-summary",
  },

  ORDERS: {
    LIST: "/api/orders",
    DETAIL: (id) => `/api/orders/${id}`,
    CREATE: "/api/orders",
    UPDATE: (id) => `/api/orders/${id}`,
    DELETE: (id) => `/api/orders/${id}`,
    TRACKING: (id) => `/api/orders/${id}/tracking`,
    SCAN: (number) => `/api/orders/scan/${number}`,
  },

  HANDOVERS: {
    LIST: "/api/handovers",
    CREATE: "/api/handovers",
    RECEIVE: (id) => `/api/handovers/${id}/receive`,
    INCOMING: "/api/handovers/incoming",
  },

  QC: {
    LIST: "/api/qc",
    CREATE: "/api/qc",
    REWORKS: "/api/qc/reworks",
  },

  CUSTOMERS: {
    LIST: "/api/customers",
    CREATE: "/api/customers",
    UPDATE: (id) => `/api/customers/${id}`,
    DELETE: (id) => `/api/customers/${id}`,
  },

  PRODUCTS: {
    LIST: "/api/products",
    CREATE: "/api/products",
    UPDATE: (id) => `/api/products/${id}`,
    DELETE: (id) => `/api/products/${id}`,
  },

  USERS: {
    LIST: "/api/users",
    CREATE: "/api/users",
    UPDATE: (id) => `/api/users/${id}`,
    DELETE: (id) => `/api/users/${id}`,
  },

  REPORTS: {
    SUMMARY: "/api/reports/summary",
    PIC_PRODUCTIVITY: "/api/reports/pic-productivity",
  },

  UPLOAD: "/api/upload",
};
