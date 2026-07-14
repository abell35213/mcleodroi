import { expect, test, type Page } from "@playwright/test";

function installRuntimeGuards(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || /Unexpected end of JSON input|NaN|controlled.*uncontrolled|uncontrolled.*controlled/i.test(text)) {
      failures.push(`console.${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => failures.push(`uncaught exception: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) failures.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return failures;
}

async function createBrokerageAnalysis(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "+ New Analysis" }).click();
  await page.getByLabel("Company Name").fill("Runtime Validation Brokerage");
  await page.getByLabel("Business Type").selectOption("BROKERAGE");
  await page.getByLabel("Prepared By").fill("Runtime Validator");
  await page.getByRole("button", { name: "Create Analysis" }).click();
  await expect(page.getByRole("heading", { name: "What opportunities were identified?" })).toBeVisible();
}

test("mixed standard/custom assessment workflow preserves values after inline custom validation", async ({ page }) => {
  const runtimeFailures = installRuntimeGuards(page);

  await createBrokerageAnalysis(page);
  await page.getByRole("button", { name: /Improve Gross Margin Performance/ }).click();
  await page.getByRole("button", { name: "Select Custom Opportunity" }).click();
  await expect(page.getByText("2 Opportunities Selected")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Assessment" }).click();

  await expect(page.getByRole("heading", { name: "Improve Gross Margin Performance" })).toBeVisible();
  await page.getByLabel("Monthly gross revenue").fill("1000000");
  await page.getByRole("textbox", { name: "Current gross margin percentage" }).fill("15");
  await page.getByRole("textbox", { name: "Target gross margin percentage" }).fill("17");
  await page.getByRole("button", { name: "Save & Calculate" }).click();

  await expect(page.getByRole("heading", { name: "Improve Gross Margin Performance" })).toBeVisible();
  await expect(page.getByText("Additional Retained Margin")).toBeVisible();
  await expect(page.getByText("$20,000").first()).toBeVisible();
  await expect(page.getByText("COMPLETE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Next Opportunity" })).toBeVisible();

  await page.getByRole("link", { name: "Next Opportunity" }).click();
  await expect(page.getByRole("heading", { name: "Create a Custom Opportunity" })).toBeVisible();
  await page.getByLabel("Opportunity title").fill("Brokerage Claims Reduction");
  await page.getByLabel("Category").selectOption({ index: 0 });
  await page.getByLabel("Value classification").selectOption("COST_REDUCTION");
  await page.getByLabel("Value frequency").selectOption("MONTHLY_RECURRING");
  await page.getByRole("textbox", { name: "Financial value", exact: true }).fill("7500");
  await page.locator('input[name="assumptionLabel0"]').fill("Monthly claims avoided");
  await page.locator('input[name="assumptionValue0"]').fill("3");
  await page.locator('input[name="assumptionUnit0"]').fill("claims");
  await page.locator('input[name="assumptionSource0"]').fill("Customer discovery");
  await page.getByLabel("Calculation rationale").fill("");
  await page.getByRole("button", { name: "Save Custom Opportunity" }).click();

  await expect(page.getByText("Calculation rationale is required.")).toBeVisible();
  await expect(page.getByText(/Application error|Unhandled Runtime Error|500/)).not.toBeVisible();
  await expect(page.getByLabel("Opportunity title")).toHaveValue("Brokerage Claims Reduction");
  await expect(page.getByLabel("Value classification")).toHaveValue("COST_REDUCTION");
  await expect(page.getByLabel("Value frequency")).toHaveValue("MONTHLY_RECURRING");
  await expect(page.getByRole("textbox", { name: "Financial value", exact: true })).toHaveValue("7500");
  await expect(page.locator('input[name="assumptionLabel0"]')).toHaveValue("Monthly claims avoided");
  await expect(page.locator('input[name="assumptionValue0"]')).toHaveValue("3");
  await expect(page.locator('input[name="assumptionUnit0"]')).toHaveValue("claims");
  await expect(page.locator('input[name="assumptionSource0"]')).toHaveValue("Customer discovery");

  await page.getByLabel("Calculation rationale").fill("Three avoided claims per month at an estimated $2,500 customer-discovery cost per claim.");
  await page.getByRole("button", { name: "Save Custom Opportunity" }).click();
  await expect(page.getByText("Brokerage Claims Reduction").first()).toBeVisible();
  await expect(page.getByText("COMPLETE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to Review" })).toBeVisible();
  await page.getByRole("link", { name: "Continue to Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Value Story" })).toBeVisible();

  expect(runtimeFailures).toEqual([]);
});
