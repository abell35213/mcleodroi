import { expect, test } from "@playwright/test";

async function createBrokerProductivityAnalysis(page: import("@playwright/test").Page, inputs: {
  currentLoads: string;
  targetLoads: string;
  brokers: string;
  workingDays: string;
  margin: string;
}) {
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
  await page.getByLabel("Current average loads per broker per day").fill(inputs.currentLoads);
  await page.getByLabel("Target average loads per broker per day").fill(inputs.targetLoads);
  await page.getByLabel("Number of brokers").fill(inputs.brokers);
  await page.getByLabel("Working days per month").fill(inputs.workingDays);
  await page.getByRole("spinbutton", { name: "Average gross margin per brokered load" }).fill(inputs.margin);
  await page.getByRole("button", { name: "Save & Calculate" }).click();
}

test("West Side broker productivity workflow", async ({ page }) => {
  await createBrokerProductivityAnalysis(page, {
    currentLoads: "2",
    targetLoads: "3",
    brokers: "5",
    workingDays: "21",
    margin: "50",
  });

  await expect(page.getByRole("heading", { name: "Increase Broker Productivity" })).toBeVisible();
  await expect(page.getByText("Estimated Gross-Margin Opportunity")).toBeVisible();
  await expect(page.getByText("$5,250").first()).toBeVisible();
  await expect(page.getByText("/ MONTH")).toBeVisible();
  await expect(page.getByText(/105 additional monthly loads/)).toBeVisible();
  await expect(page.getByText("COMPLETE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to Review" })).toBeVisible();

  await page.getByRole("link", { name: "Continue to Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Value Story" })).toBeVisible();
  await expect(page.getByText("$63,000").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revenue & Margin Opportunity" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Increase Broker Productivity" })).toBeVisible();
});

test("West Side review narrative edit stale reset handoff", async ({ page }) => {
  await createBrokerProductivityAnalysis(page, {
    currentLoads: "0",
    targetLoads: "3.5",
    brokers: "5",
    workingDays: "20",
    margin: "75",
  });

  await expect(page.getByText("$26,250").first()).toBeVisible();
  await expect(page.getByText("COMPLETE")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Review" }).click();
  await expect(page.getByRole("heading", { name: "Review Value Story" })).toBeVisible();
  await expect(page.getByText("$315,000").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revenue & Margin Opportunity" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Increase Broker Productivity" })).toBeVisible();
  await expect(page.getByText(/West Side Transport currently averages/)).toBeVisible();

  await page.getByRole("button", { name: "Edit Analysis" }).click();
  const textarea = page.getByLabel("Customer analysis for Increase Broker Productivity");
  await textarea.fill(`${await textarea.inputValue()}\n\nWest Side's brokerage team will use the recovered capacity to pursue additional shipper volume.`);
  await page.getByRole("button", { name: "Save Analysis" }).click();
  await expect(page.getByText("Custom Narrative")).toBeVisible();
  await expect(page.getByText(/recovered capacity to pursue additional shipper volume/)).toBeVisible();

  await page.getByRole("link", { name: "Assessment" }).click();
  await page.getByLabel("Target average loads per broker per day").fill("4");
  await page.getByRole("button", { name: "Save & Calculate" }).click();
  await expect(page.getByText("$30,000").first()).toBeVisible();
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByText("Custom Narrative May Need Review")).toBeVisible();
  await expect(page.getByText(/recovered capacity to pursue additional shipper volume/)).toBeVisible();

  await page.getByRole("button", { name: "Reset to Updated Default" }).click();
  await expect(page.getByText("Custom Narrative May Need Review")).not.toBeVisible();
  await expect(page.getByText("Template Narrative")).toBeVisible();
  await expect(page.getByText(/recovered capacity to pursue additional shipper volume/)).not.toBeVisible();
  await expect(page.getByText(/4 loads per broker per day/)).toBeVisible();

  await page.getByRole("link", { name: "Generate Presentation" }).click();
  await expect(page.getByRole("heading", { name: "Generate Presentation" })).toBeVisible();
  await expect(page.getByText("Your reviewed value story is ready to be converted into an editable McLeod-branded PowerPoint presentation.")).toBeVisible();
});
