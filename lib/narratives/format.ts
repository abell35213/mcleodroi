function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, "");
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatCurrency(value: number, options: { maximumFractionDigits?: number } = {}): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: options.maximumFractionDigits ?? 0 }).format(value);
}

export function formatCurrencyRate(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function formatPercentage(value: number): string {
  return `${trimTrailingZero(formatNumber(value * 100, 1))}%`;
}

export function formatPercentagePoints(value: number): string {
  const points = trimTrailingZero(formatNumber(value * 100, 1));
  return `${points} percentage-point${points === "1" ? "" : "s"}`;
}

export function formatCount(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

export function formatHours(value: number): string {
  return `${formatCount(value)} hours`;
}
