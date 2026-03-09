export function formatZAR(amount: number, options?: { showDecimals?: boolean }): string {
  const formatted = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: options?.showDecimals === false ? 0 : 2,
    maximumFractionDigits: options?.showDecimals === false ? 0 : 2,
  }).format(amount);
  return formatted;
}

export function formatZARShort(amount: number): string {
  if (amount >= 1000000) return `R${(amount / 1000000).toFixed(1)}m`;
  if (amount >= 1000) return `R${(amount / 1000).toFixed(0)}k`;
  return `R${amount.toFixed(0)}`;
}

export function parseZAR(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}
