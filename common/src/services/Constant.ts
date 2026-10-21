export const AUTH_TYPE = {
  GOOGLE: "google",
  DIRECT: "direct",
} as const;

export const ROLE = {
  USER: "user",
  ADMIN: "admin",
} as const;

export const PROFILE_TYPE = {
  PRIVATE: "private",
  PUBLIC: "public",
} as const;

export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PAGE_NOT_FOUND: 404,
  NOT_ACCEPTABLE: 406,
  DATA_CONFLICT: 409,
  TOO_MAY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  SERVICE_UNAVALIABLE: 503,
} as const;

export const FLAGS = {
  ACTIVE: "1",
  INACTIVE: "0",
  DELETE: "2",
  TRUE: true,
  FALSE: false,
} as const;

export const TRANSACTION_TYPE = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  PURCHASE: "purchase",
} as const;

export const SPENT_TYPE = {
  PURCHASE: "purchase",
  TOPUP: "top-up",
  REFUND: "refund",
} as const;

export const PAYMENT_METHOD = {
  CARD: "card",
  MANUAL: "manual",
} as const;

export const TRANSACTION_STATUS = {
  SUCCESS: "success",
  FAILED: "failed",
  PENDING: "pending",
  CANCELLED: "cancelled",
  REFUND: "refund",
} as const;
