import { format } from "date-fns";

export function formatDate(value?: string | null, output = "MMM d, yyyy") {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, output);
}

export function formatDateTime(value?: string | null) {
  return formatDate(value, "MMM d, yyyy HH:mm");
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

  return format(date, "HH:mm");
}

export function formatCurrency(value?: number | string | null, currency = "USD") {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
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

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
