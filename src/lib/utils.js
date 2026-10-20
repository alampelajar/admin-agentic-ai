export function cn(...values) {
  return values.flat(Infinity).filter((value) => typeof value === "string" && value.trim().length > 0).join(" ")
}
