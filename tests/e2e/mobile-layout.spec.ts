import { expect, test } from "@playwright/test";
import {
  acceptAllDialogs,
  clearAppStorage,
  collectConsoleErrors,
  drawOnce,
  gotoApp,
  hasHorizontalOverflow,
  importParticipants,
  importPrizes,
  lockLottery,
} from "./helpers/actions";
import { buildParticipants, buildSpecialPrizes } from "./helpers/testData";

test("手機版獎項修改與抽獎後版面維持穩定", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "手機版版面測試只在 mobile Chromium 執行。");

  const consoleErrors = collectConsoleErrors(page);
  acceptAllDialogs(page);

  await gotoApp(page);
  await clearAppStorage(page);
  await importParticipants(page, buildParticipants(20));
  await importPrizes(page, buildSpecialPrizes());

  await page.getByRole("button", { name: "獎項" }).click();
  const prizeRows = page.locator(".settings-layout .list-panel tbody tr");
  await expect(prizeRows).toHaveCount(3);

  await prizeRows.nth(1).getByRole("button", { name: "修改" }).click();
  await expect(page.getByRole("button", { name: "儲存修改" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增獎項" })).toHaveCount(0);

  await page.getByLabel("抽獎人").fill("手機測試抽獎人");
  await page.getByRole("button", { name: "儲存修改" }).click();
  await expect(page.getByRole("heading", { name: "3 個獎項" })).toBeVisible();
  await expect(prizeRows).toHaveCount(3);
  await expect(prizeRows.nth(1)).toContainText("手機測試抽獎人");

  await prizeRows.nth(1).getByRole("button", { name: "刪除" }).click();
  await expect(page.getByRole("heading", { name: "2 個獎項" })).toBeVisible();
  await expect(prizeRows).toHaveCount(2);
  await expect(prizeRows).not.toContainText("手機測試抽獎人");

  await lockLottery(page);
  await drawOnce(page, 1);

  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(consoleErrors).toEqual([]);
});
