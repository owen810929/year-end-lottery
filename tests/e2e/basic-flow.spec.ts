import { expect, test } from "@playwright/test";
import {
  assertNoDuplicateGeneralWinners,
  clearAppStorage,
  collectConsoleErrors,
  completeLottery,
  expectAppNotBlank,
  expectPrintableWinnerDom,
  getWinnerCount,
  gotoApp,
  importParticipants,
  importPrizes,
  lockLottery,
  STORAGE_KEY,
} from "./helpers/actions";
import { buildParticipants, buildPrizes } from "./helpers/testData";

test("基本匯入與連續抽獎流程穩定", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "基本流程以桌機瀏覽器執行，手機版另有版面測試。");

  const consoleErrors = collectConsoleErrors(page);

  await gotoApp(page);
  await clearAppStorage(page);
  await importParticipants(page, buildParticipants(35));
  await importPrizes(page, buildPrizes());
  await lockLottery(page);
  await completeLottery(page);

  await expect(page.locator(".status")).toHaveText("completed");
  await expectAppNotBlank(page);
  await expectPrintableWinnerDom(page);
  expect(await getWinnerCount(page)).toBe(29);
  await assertNoDuplicateGeneralWinners(page);

  const storedState = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(storedState).toBeTruthy();
  expect(() => JSON.parse(storedState ?? "{}")).not.toThrow();
  expect(consoleErrors).toEqual([]);
});
