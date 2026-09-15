import { test, expect } from "@playwright/test";
test("attendee submission, moderation, voting, notes, export, and persistence", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("attendee.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Your question", { exact: true })
    .fill("How do we make implementation accountable to communities?");
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(page.getByRole("status")).toContainText("submitted for review");
  await expect(
    page.getByText("How do we make implementation accountable to communities?"),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Moderator access" }).click();
  let card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await card
    .getByLabel("Internal moderator note")
    .fill("Private note for our closing panel");
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("link", { name: "Question board", exact: true }).click();
  let publicCard = page.locator(".question-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(publicCard).toBeVisible();
  await expect(
    page.getByText("Private note for our closing panel"),
  ).toHaveCount(0);
  await publicCard.getByRole("button").click();
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  publicCard = page.locator(".question-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await publicCard.getByRole("button").click();
  await expect(publicCard.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("link", { name: "Moderator access" }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Approved", exact: true })
    .click();
  card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await expect(card.getByLabel("Internal moderator note")).toHaveValue(
    "Private note for our closing panel",
  );
  await card.getByRole("button", { name: "Shortlist", exact: true }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Shortlist", exact: true })
    .click();
  card = page.locator(".moderator-card").filter({
    hasText: "How do we make implementation accountable to communities?",
  });
  await card.getByRole("button", { name: "Mark answered" }).click();
  await page
    .locator(".status-tabs")
    .getByRole("button", { name: "Answered", exact: true })
    .click();
  await expect(
    page.locator(".moderator-card").filter({
      hasText: "How do we make implementation accountable to communities?",
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/questions-.*\.csv$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("event links resolve and unknown pages have recovery links", async ({
  page,
}) => {
  await page.goto("/e/public-health-ai-symposium");
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to the question board" })
    .click();
  await expect(page.getByRole("heading", { name: /Big ideas/ })).toBeVisible();
});
