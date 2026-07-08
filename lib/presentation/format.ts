export function formatPresentationCurrency(value: number): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
export function formatPresentationCount(value: number): string { return new Intl.NumberFormat("en-US", { maximumFractionDigits: Math.abs(value) < 10 && !Number.isInteger(value) ? 1 : 0 }).format(value); }
export function formatPresentationPercentage(value: number): string { return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value * 100)}%`; }
export function formatPresentationHours(value: number): string { return `${formatPresentationCount(value)} hours`; }
export function formatPresentationMetric(value: number, suffix = ""): string { return `${formatPresentationCount(value)}${suffix}`; }
