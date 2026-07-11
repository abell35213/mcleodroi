import type { CSSProperties } from "react";

/**
 * Shared, dependency-free chart primitives for the Review value story.
 *
 * Charts are static, server-rendered inline SVG — no client JavaScript, no
 * external chart library, and no network calls. Each chart is made accessible
 * with `role="img"` plus a concise `aria-label`, an SVG `<title>`/`<desc>`, and
 * a visually hidden data table so the underlying numbers are available to
 * assistive technology and keyboard users.
 */

export const chartPalette = [
  "#0b1d33",
  "#28614a",
  "#d89b2b",
  "#54708f",
  "#3f5e4a",
  "#9c6b1f",
  "#7a8ba0",
  "#1f4a3a",
] as const;

export function paletteColor(index: number): string {
  return chartPalette[index % chartPalette.length];
}

const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(value: number): string {
  return wholeMoney.format(value);
}

export function formatCompactMoney(value: number): string {
  return compactMoney.format(value);
}

export function formatPercentShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Inline style that hides content visually while keeping it in the a11y tree. */
export const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};
