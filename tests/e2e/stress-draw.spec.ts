import { expect, test } from "@playwright/test";
import {
  assertNoDuplicateGeneralWinners,
  clearAppStorage,
  collectConsoleErrors,
  completeLottery,
  expectAppNotBlank,
  getWinnerCount,
  gotoApp,
  importParticipants,
  importPrizes,
  lockLottery,
  STORAGE_KEY,
} from "./helpers/actions";
import { buildParticipants, buildStressPrizes } from "./helpers/testData";

test("批次抽獎在大量資料下維持狀態穩定", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "壓力測試只在桌機瀏覽器執行。");

  const consoleErrors = collectConsoleErrors(page);

  await gotoApp(page);
  await clearAppStorage(page);
  await importParticipants(page, buildParticipants(300));
  await importPrizes(page, buildStressPrizes());
  await lockLottery(page);
  await completeLottery(page, 10, 20);

  await expect(page.locator(".status")).toHaveText("completed");
  await expectAppNotBlank(page);
  expect(await getWinnerCount(page)).toBe(120);
  await assertNoDuplicateGeneralWinners(page, []);

  const storedState = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(storedState).toBeTruthy();
  expect(() => JSON.parse(storedState ?? "{}")).not.toThrow();
  expect(consoleErrors).toEqual([]);
});
