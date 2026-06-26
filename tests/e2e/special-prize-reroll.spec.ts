import { expect, test } from "@playwright/test";
import {
  acceptAllDialogs,
  clearAppStorage,
  collectConsoleErrors,
  drawOnce,
  expectAppNotBlank,
  getWinnerCount,
  getWinnerRows,
  gotoApp,
  importParticipants,
  importPrizes,
  lockLottery,
} from "./helpers/actions";
import { buildParticipants, buildSpecialPrizes } from "./helpers/testData";

test("特殊獎可重抽本輪且不影響一般獎中獎人", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "特殊獎流程以桌機瀏覽器執行。");

  const consoleErrors = collectConsoleErrors(page);
  acceptAllDialogs(page);

  await gotoApp(page);
  await clearAppStorage(page);
  await importParticipants(page, buildParticipants(30));
  await importPrizes(page, buildSpecialPrizes());
  await lockLottery(page);

  await drawOnce(page, 5);
  const generalRowsBefore = await getWinnerRows(page);
  expect(generalRowsBefore).toHaveLength(5);
  expect(generalRowsBefore.every((row) => row.prizeName === "一般獎")).toBe(true);

  await drawOnce(page, 3);
  expect(await getWinnerCount(page)).toBe(8);
  await expect(page.getByRole("button", { name: "重抽本輪" })).toBeVisible();

  await page.getByRole("button", { name: "重抽本輪" }).click();
  await expect(page.locator(".status")).toHaveText("locked");
  expect(await getWinnerCount(page)).toBe(5);

  const generalRowsAfterReroll = await getWinnerRows(page);
  expect(generalRowsAfterReroll.map((row) => row.winnerName)).toEqual(generalRowsBefore.map((row) => row.winnerName));

  await drawOnce(page, 3);
  expect(await getWinnerCount(page)).toBe(8);
  const rowsAfterSecondSpecialDraw = await getWinnerRows(page);
  expect(rowsAfterSecondSpecialDraw.filter((row) => row.prizeName === "一般獎")).toHaveLength(5);
  expect(rowsAfterSecondSpecialDraw.filter((row) => row.prizeName === "明年尾牙主辦")).toHaveLength(3);

  await expectAppNotBlank(page);
  expect(consoleErrors).toEqual([]);
});
