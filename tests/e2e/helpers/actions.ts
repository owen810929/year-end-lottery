import { expect, type Page } from "@playwright/test";

export const STORAGE_KEY = "company-year-end-party-2027";

export type WinnerRow = {
  order: string;
  prizeName: string;
  amount: string;
  department: string;
  winnerName: string;
};

export async function gotoApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    const fastSetTimeout: typeof window.setTimeout = (handler, timeout, ...args) => {
      return originalSetTimeout(handler, Math.min(Number(timeout) || 0, 80), ...args);
    };
    window.setTimeout = fastSetTimeout;
  });

  await page.goto("./", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toBeVisible();
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, STORAGE_KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toBeVisible();
}

export function acceptAllDialogs(page: Page): void {
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
}

export function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  return consoleErrors;
}

export async function importParticipants(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "人員" }).click();
  const textarea = page.getByPlaceholder(/複製人員表格/);
  await textarea.fill(text);
  await page.getByRole("button", { name: "匯入貼上的資料" }).click();
  const expectedCount = Math.max(0, text.trim().split(/\r?\n/).length - 1);
  await expect(page.getByRole("heading", { name: `${expectedCount} 位人員` })).toBeVisible();
}

export async function importPrizes(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "獎項" }).click();
  const textarea = page.getByPlaceholder(/複製獎項表格/);
  await textarea.fill(text);
  await page.getByRole("button", { name: "匯入貼上的資料" }).click();
  const expectedCount = Math.max(0, text.trim().split(/\r?\n/).length - 1);
  await expect(page.getByRole("heading", { name: `${expectedCount} 個獎項` })).toBeVisible();
}

export async function lockLottery(page: Page): Promise<void> {
  await page.getByRole("button", { name: "抽獎" }).click();
  await page.getByRole("button", { name: "檢查並鎖定資料" }).click();
  await expect(page.locator(".status")).toHaveText("locked");
}

export async function drawOnce(page: Page, batchSize?: number): Promise<void> {
  await expect(page.locator(".status")).toHaveText("locked", { timeout: 10_000 });

  if (batchSize !== undefined) {
    const batchInput = page.locator(".batch-control input");
    await expect(batchInput).toBeEnabled({ timeout: 10_000 });
    await batchInput.fill(String(batchSize));
  }

  const before = await getWinnerCount(page);
  const drawButton = page.locator(".prize-action-buttons .primary");
  await expect(drawButton).toBeEnabled({ timeout: 10_000 });
  await drawButton.click();

  await page.waitForFunction(
    (previousWinnerCount) => {
      const status = document.querySelector(".status")?.textContent?.trim();
      const titleText = Array.from(document.querySelectorAll("h2"))
        .map((element) => element.textContent ?? "")
        .find((text) => text.includes("已抽出"));
      const count = Number(titleText?.match(/已抽出\s*(\d+)/)?.[1] ?? 0);
      return status === "completed" || (status === "locked" && count > previousWinnerCount);
    },
    before,
    { timeout: 15_000 },
  );
}

export async function completeLottery(page: Page, batchSize?: number, maxDraws = 40): Promise<void> {
  for (let drawIndex = 0; drawIndex < maxDraws; drawIndex += 1) {
    const status = (await page.locator(".status").textContent())?.trim();
    if (status === "completed") return;

    const nextBatchSize = batchSize ?? (await getCurrentMaxBatchSize(page));
    await drawOnce(page, nextBatchSize);
  }

  throw new Error(`Lottery did not complete after ${maxDraws} draws.`);
}

export async function getWinnerCount(page: Page): Promise<number> {
  const title = await page.locator("h2", { hasText: /已抽出/ }).first().textContent();
  return Number(title?.match(/已抽出\s*(\d+)/)?.[1] ?? 0);
}

export async function getWinnerRows(page: Page): Promise<WinnerRow[]> {
  return page.locator(".lottery-layout .list-panel tbody tr").evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent?.trim() ?? "");
      return {
        order: cells[0] ?? "",
        prizeName: cells[1] ?? "",
        amount: cells[2] ?? "",
        department: cells[3] ?? "",
        winnerName: cells[4] ?? "",
      };
    }),
  );
}

export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
}

export async function assertNoDuplicateGeneralWinners(page: Page, specialPrizeNames: string[] = ["明年尾牙主辦"]): Promise<void> {
  const rows = await getWinnerRows(page);
  const generalWinners = rows.filter((row) => !specialPrizeNames.includes(row.prizeName)).map((row) => row.winnerName);
  expect(new Set(generalWinners).size).toBe(generalWinners.length);
}

export async function expectAppNotBlank(page: Page): Promise<void> {
  await expect(page.locator("#root")).toBeVisible();
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "抽獎" })).toBeVisible();
}

export async function expectPrintableWinnerDom(page: Page): Promise<void> {
  await expect(page.locator(".print-only.print-sheet table thead")).toHaveCount(1);
  await expect(page.locator(".print-only.print-sheet table tbody")).toHaveCount(1);
  await expect(page.locator(".print-only.print-sheet th", { hasText: "簽收欄" })).toHaveCount(1);
}

async function getCurrentMaxBatchSize(page: Page): Promise<number> {
  const value = await page.locator(".batch-control input").getAttribute("max");
  const max = Number(value);
  return Number.isFinite(max) && max > 0 ? max : 1;
}
