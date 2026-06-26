const DEPARTMENTS = ["財務", "物流", "業務", "管理", "資訊", "製造"];

export function buildParticipants(count: number): string {
  const rows = ["部門\t姓名\tID\t是否參加抽獎"];

  for (let index = 1; index <= count; index += 1) {
    const department = DEPARTMENTS[(index - 1) % DEPARTMENTS.length];
    const serial = String(index).padStart(3, "0");
    rows.push(`${department}\t測試人員${serial}\tT${serial}\t是`);
  }

  return rows.join("\n");
}

export function buildPrizes(): string {
  return [
    "順序\t獎項名稱\t金額\t名額\t抽獎人\t備註\t抽獎池\t中獎後",
    "1\t幸運獎\t1000\t20\t總經理\t測試\t剩餘未中獎人\t移出後續抽獎池",
    "2\t明年尾牙主辦\t2000\t3\t主持人\t特殊測試\t全部可抽人員\t仍可再中其他獎",
    "3\t一等獎\t5000\t5\t董事\t測試\t剩餘未中獎人\t移出後續抽獎池",
    "4\t特等獎\t10000\t1\t董事長\t壓軸\t剩餘未中獎人\t移出後續抽獎池",
  ].join("\n");
}

export function buildStressPrizes(): string {
  return [
    "順序\t獎項名稱\t金額\t名額\t抽獎人\t備註\t抽獎池\t中獎後",
    "1\t壓力測試幸運獎\t500\t50\t總經理\t壓力測試\t剩餘未中獎人\t移出後續抽獎池",
    "2\t壓力測試二獎\t1000\t40\t副總經理\t壓力測試\t剩餘未中獎人\t移出後續抽獎池",
    "3\t壓力測試一獎\t3000\t30\t董事\t壓力測試\t剩餘未中獎人\t移出後續抽獎池",
  ].join("\n");
}

export function buildSpecialPrizes(): string {
  return [
    "順序\t獎項名稱\t金額\t名額\t抽獎人\t備註\t抽獎池\t中獎後",
    "1\t一般獎\t1000\t5\t總經理\t一般測試\t剩餘未中獎人\t移出後續抽獎池",
    "2\t明年尾牙主辦\t2000\t3\t主持人\t特殊測試\t全部可抽人員\t仍可再中其他獎",
    "3\t一般壓軸獎\t5000\t1\t董事長\t一般測試\t剩餘未中獎人\t移出後續抽獎池",
  ].join("\n");
}
