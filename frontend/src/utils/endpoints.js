export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    ME: "/api/auth/me",
  },
  PRODUCTS: {
    LIST: "/api/products",
    DETAIL: (id) => `/api/products/${id}`,
    UPDATE: (id) => `/api/products/${id}`,
    UPDATE_PRICE: (id) => `/api/products/${id}/quick-price`,
    UPDATE_VARIANT_PRICE: (productId, variantId) => `/api/products/${productId}/variants/${variantId}/quick-price`,
    UNITS: (id) => `/api/products/${id}/units`,
    UNIT_DETAIL: (productId, unitId) => `/api/products/${productId}/units/${unitId}`,
  },
  TRANSACTIONS: {
    LIST: "/api/transactions",
    CREATE: "/api/transactions",
    DETAIL: (id) => `/api/transactions/${id}`,
    DELETE: (id) => `/api/transactions/${id}`,
    REFUND: (id) => `/api/transactions/${id}/refund`,
  },
  CUSTOMERS: {
    LIST: "/api/customers",
    CREATE: "/api/customers",
    DETAIL: (id) => `/api/customers/${id}`,
    UPDATE: (id) => `/api/customers/${id}`,
    DELETE: (id) => `/api/customers/${id}`,
    BARCODE_LOOKUP: (code) => `/api/customers/barcode/${encodeURIComponent(code)}`,
    POINTS_LOG: (id) => `/api/customers/${id}/points-log`,
    ADD_POINTS: (id) => `/api/customers/${id}/points`,
    STATS: (id) => `/api/customers/${id}/stats`,
  },
  CASH_ACCOUNTS: {
    LIST: "/api/cash-accounts",
  },
  SETTINGS: {
    GET: "/api/settings",
    UPDATE: "/api/settings",
  },
  PRICE_CHECKER: {
    CHECK: (code) => `/api/price-checker?code=${encodeURIComponent(code)}`,
  },
  RECEIVABLES: {
    PAY: (id) => `/api/receivables/${id}/pay`,
  },
};
