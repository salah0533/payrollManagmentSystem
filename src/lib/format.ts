import { format } from "date-fns";

import { getCurrentLanguage, getLocaleTag } from "@/lib/i18n";
import i18n from "@/lib/i18n";

const CURRENCY_STORAGE_KEY = "payroll_default_currency";
let defaultCurrency =
  typeof window !== "undefined" ? window.localStorage.getItem(CURRENCY_STORAGE_KEY) || "DZD" : "DZD";

export function setDefaultCurrency(currency: string) {
  const normalized = currency?.toUpperCase() || "DZD";
  defaultCurrency = normalized;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
  }
}

export function getDefaultCurrency() {
  return defaultCurrency;
}

export function formatDate(value?: string | null, output = "MMM d, yyyy") {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (output === "MMM d, yyyy") {
    return new Intl.DateTimeFormat(getLocaleTag(getCurrentLanguage()), {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return format(date, output);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocaleTag(getCurrentLanguage()), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocaleTag(getCurrentLanguage()), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatCurrency(value?: number | string | null, currency = defaultCurrency) {
  const numeric = Number(value ?? 0);
  const locale = getLocaleTag(getCurrentLanguage());
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(numeric) ? numeric : 0);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(numeric) ? numeric : 0);
  }
}

export function formatNumber(value?: number | string | null, forceTwoDecimals = false) {
  const numeric = Number(value ?? 0);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;
  const locale = getLocaleTag(getCurrentLanguage());
  const showTwoDecimals = forceTwoDecimals || !Number.isInteger(safeNumber);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: showTwoDecimals ? 2 : 0,
    maximumFractionDigits: showTwoDecimals ? 2 : 0,
  }).format(safeNumber);
}

export function formatMinutes(minutes?: number | null) {
  if (!minutes) {
    return "0h 0m";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export function formatLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  const normalized = String(value).trim().toLowerCase();
  const translationKey = `labels.code.${normalized}`;
  if (i18n.exists(translationKey)) {
    return i18n.t(translationKey);
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatBooleanLabel(value?: boolean | null) {
  return value ? i18n.t("labels.boolean.yes", { defaultValue: "Yes" }) : i18n.t("labels.boolean.no", { defaultValue: "No" });
}

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function toInputDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return String(value).split("T")[0];
}
