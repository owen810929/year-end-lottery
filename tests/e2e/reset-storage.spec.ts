import { expect, test } from "@playwright/test";
import {
  acceptAllDialogs,
  clearAppStorage,
  collectConsoleErrors,
  drawOnce,
  getWinnerCount,
  gotoApp,
  importParticipants,
  importPrizes,
  lockLottery,
  STORAGE_KEY,
} from "./helpers/actions";
import { buildParticipants, buildPrizes } from "./helpers/testData";

const SENTINEL_KEY = "year-end-lottery-e2e-sentinel";

test("Reset 保留設定且清除所有暫存資料只移除本系統 key", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Reset 與 storage 測試以桌機瀏覽器執行。");

  const consoleErrors = collectConsoleErrors(page);
  acceptAllDialogs(page);

  await gotoApp(page);
  await clearAppStorage(page);
  await page.evaluate((key) => localStorage.setItem(key, "keep"), SENTINEL_KEY);

  await importParticipants(page, buildParticipants(35));
  await importPrizes(page, buildPrizes());
  await lockLottery(page);
  await drawOnce(page, 3);
  expect(await getWinnerCount(page)).toBe(3);

  await page.getByRole("button", { name: "立刻 Reset" }).click();
  await expect(page.locator(".status")).toHaveText("ready");
  expect(await getWinnerCount(page)).toBe(0);

  await page.getByRole("button", { name: "人員" }).click();
  await expect(page.getByRole("heading", { name: "35 位人員" })).toBeVisible();
  await page.getByRole("button", { name: "獎項" }).click();
  await expect(page.getByRole("heading", { name: "4 個獎項" })).toBeVisible();

  await page.getByRole("button", { name: "清除所有暫存資料" }).click();
  await expect(page.getByRole("heading", { name: "公司尾牙抽獎系統" })).toBeVisible();

  await page.getByRole("button", { name: "人員" }).click();
  await expect(page.getByRole("heading", { name: "0 位人員" })).toBeVisible();
  await page.getByRole("button", { name: "獎項" }).click();
  await expect(page.getByRole("heading", { name: "0 個獎項" })).toBeVisible();

  const storageSnapshot = await page.evaluate(
    ({ appKey, sentinelKey }) => ({
      appValue: localStorage.getItem(appKey),
      sentinelValue: localStorage.getItem(sentinelKey),
    }),
    { appKey: STORAGE_KEY, sentinelKey: SENTINEL_KEY },
  );
  expect(storageSnapshot.appValue).toBeNull();
  expect(storageSnapshot.sentinelValue).toBe("keep");
  expect(consoleErrors).toEqual([]);
});
