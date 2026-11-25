import { expect, type Locator, type Page, test } from "@playwright/test";

/** Drags with real pointer events and intermediate moves, which dnd-kit needs to start a drag. */
async function drag(page: Page, from: Locator, to: Locator) {
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Drag source or target is not visible");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("play a card by dragging it to the board, then the bot takes its turn", async ({ page }) => {
  await page.goto("/play");

  const hand = page.getByTestId("hand").getByTestId("card");
  const board = page.getByTestId("your-board");
  await expect(hand).toHaveCount(4);
  await expect(page.getByTestId("turn-status")).toContainText("Your turn");

  await drag(page, hand.first(), board);
  await expect(board.getByTestId("card")).toHaveCount(1);
  await expect(hand).toHaveCount(3);

  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByTestId("turn-status")).toContainText("Opponent's turn");

  // The bot plays in a Web Worker and eventually passes back; we then hold one more card.
  await expect(page.getByTestId("turn-status")).toContainText("Your turn", { timeout: 15_000 });
  await expect(hand).toHaveCount(4);
});

test("dragging within the hand reorders it without playing a card", async ({ page }) => {
  await page.goto("/play");
  const hand = page.getByTestId("hand").getByTestId("card");
  await expect(hand).toHaveCount(4);

  const firstBefore = await hand.first().getAttribute("title");
  await drag(page, hand.first(), hand.nth(2));

  await expect(hand).toHaveCount(4);
  await expect(page.getByTestId("your-board").getByTestId("card")).toHaveCount(0);
  await expect(hand.first()).not.toHaveAttribute("title", firstBefore ?? "");
});

test("online play requires sign-in", async ({ page }) => {
  await page.goto("/pvp");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
