const PREFERRED_TIMEZONES = [
  "Africa/Algiers",
  "UTC",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Riyadh",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
] as const;

const FALLBACK_TIMEZONES = [
  "Africa/Algiers",
  "UTC",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
] as const;

type IntlWithTimeZoneValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function getTimezones() {
  const supportedValuesOf = (Intl as IntlWithTimeZoneValues).supportedValuesOf;
  const values = supportedValuesOf ? supportedValuesOf("timeZone") : [...FALLBACK_TIMEZONES];
  const priority = new Map(PREFERRED_TIMEZONES.map((timezone, index) => [timezone, index]));

  return Array.from(new Set([...PREFERRED_TIMEZONES, ...values])).sort((left, right) => {
    const leftPriority = priority.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priority.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
}

export const timezoneOptions = getTimezones();
