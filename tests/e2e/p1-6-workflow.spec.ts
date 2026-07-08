import { expect, test } from "@playwright/test";

test("West Side broker productivity workflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "+ New Analysis" }).click();
  await page.getByLabel("Company Name").fill("West Side Transport");
  await page.getByLabel("Business Type").selectOption("BROKERAGE");
  await page.getByLabel("Prepared By").fill("Test User");
  await page.getByRole("button", { name: "Create Analysis" }).click();
  await expect(page.getByRole("heading", { name: "What opportunities were identified?" })).toBeVisible();
  await page.getByRole("button", { name: /Increase Broker Productivity/ }).click();
  await expect(page.getByText("1 Opportunity Selected")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Assessment" }).click();
  await page.getByLabel("Current average loads per broker per day").fill("2");
  await page.getByLabel("Target average loads per broker per day").fill("3");
  await page.getByLabel("Number of brokers").fill("5");
  await page.getByLabel("Working days per month").fill("21");
  await page.getByLabel("Average gross margin per brokered load").fill("50");
  await page.getByRole("button", { name: "Save & Calculate" }).click();
  await expect(page.getByText("$5,250 / MONTH")).toBeVisible();
  await expect(page.getByText(/105 additional monthly loads/)).toBeVisible();
  await expect(page.getByText(/West Side Transport/)).toBeVisible();
  await expect(page.getByText("COMPLETE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to Review" })).toBeVisible();
  await page.getByRole("link", { name: "Continue to Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Value Story" })).toBeVisible();
  await expect(page.getByText("All selected opportunities are complete.")).toBeVisible();
});
