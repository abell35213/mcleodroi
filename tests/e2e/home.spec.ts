import { expect, test } from "@playwright/test";

test("home page exposes the dashboard shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Business Impact Analyses" })).toBeVisible();
  await expect(page.getByRole("link", { name: "+ New Analysis" })).toBeVisible();
});
