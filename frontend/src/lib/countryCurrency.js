// Common country-code -> currency-code mapping for budget display.
// Falls back to USD for any country not listed here.
const MAP = {
  US: "USD", GB: "GBP", IN: "INR", CA: "CAD", AU: "AUD", DE: "EUR", FR: "EUR",
  IT: "EUR", ES: "EUR", NL: "EUR", JP: "JPY", CN: "CNY", BR: "BRL", MX: "MXN",
  ZA: "ZAR", NG: "NGN", PK: "PKR", BD: "BDT", RU: "RUB", KR: "KRW", ID: "IDR",
  SA: "SAR", AE: "AED", CH: "CHF", SG: "SGD", NZ: "NZD", PH: "PHP", EG: "EGP",
  TR: "TRY", TH: "THB", VN: "VND", KE: "KES", AR: "ARS",
};

export function currencyForCountry(countryCode) {
  return MAP[(countryCode || "").toUpperCase()] || "USD";
}
