// Dates in the console are shown in Jakarta time, without seconds: "22/9/2026, 15.49 WIB".
const wibFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

// Accepts a Date, a timestamp or a date string. Returns "-" when there is no valid date,
// including Go's zero time ("0001-01-01T00:00:00Z"), which the API sends for an unset date.
export function formatWib(value) {
  if (value === null || value === undefined || value === "") return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1) return "-"
  return `${wibFormat.format(date)} WIB`
}
