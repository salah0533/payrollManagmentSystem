const FALLBACK_CURRENCY_CODES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
  "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
  "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "INR",
  "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF",
  "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
  "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR",
  "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR",
  "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD",
  "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS",
  "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD",
  "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XOF", "XPF",
  "YER", "ZAR", "ZMW", "ZWL",
];

type IntlWithCurrencyValues = typeof Intl & {
  supportedValuesOf?: (key: "currency") => string[];
};

function getCurrencyName(code: string) {
  try {
    const locale = typeof navigator !== "undefined" ? navigator.language || "en" : "en";
    const displayNames = new Intl.DisplayNames([locale], { type: "currency" });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}

function getCurrencyCodes() {
  const supportedValuesOf = (Intl as IntlWithCurrencyValues).supportedValuesOf;
  const codes = supportedValuesOf ? supportedValuesOf("currency") : FALLBACK_CURRENCY_CODES;
  return Array.from(new Set(codes.map((code) => code.toUpperCase())))
    .filter((code) => code !== "ILS")
    .sort((left, right) => left.localeCompare(right));
}

export const currencyOptions = getCurrencyCodes().map((code) => ({
  code,
  label: `${code} - ${getCurrencyName(code)}`,
}));

export function isAllowedCurrency(code: string) {
  return currencyOptions.some((option) => option.code === code.toUpperCase());
}
