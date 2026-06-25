import { useEffect, useMemo, useRef, useState } from "react";

type Participant = { id: string; department: string; name: string; eligible: boolean };
type Prize = { id: string; order: number; name: string; amount: number; quota: number; note?: string };
type Winner = { id: string; prizeId: string; prizeName: string; amount: number; participantId: string; department: string; name: string; drawnAt: string };
type LotteryStatus = "editing" | "ready" | "locked" | "drawing" | "revealing" | "completed";
type TabId = "lottery" | "participants" | "prizes";

type StoredState = {
  eventTitle: string;
  participants: Participant[];
  prizes: Prize[];
  lockedParticipants: Participant[];
  lockedPrizes: Prize[];
  winners: Winner[];
  currentPrizeIndex: number;
  currentDrawCountInPrize: number;
  lotteryStatus: LotteryStatus;
  remainingParticipantIds: string[];
};

const STORAGE_KEY = "company-year-end-party-2027";
const defaultState: StoredState = {
  eventTitle: "2027 年公司尾牙抽獎系統",
  participants: [],
  prizes: [],
  lockedParticipants: [],
  lockedPrizes: [],
  winners: [],
  currentPrizeIndex: 0,
  currentDrawCountInPrize: 0,
  lotteryStatus: "editing",
  remainingParticipantIds: [],
};

function id(prefix: string) {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.floor(performance.now())}`;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

function sortPrizes(prizes: Prize[]) {
  return [...prizes].sort((a, b) => a.order - b.order);
}

function splitRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/)).map((cell) => cell.trim()));
}

function toNumber(value?: string) {
  return Number((value ?? "").replaceAll(",", "").trim()) || 0;
}

function parseParticipants(text: string): Participant[] {
  const rows = splitRows(text);
  const body = rows[0]?.join("|").toLowerCase().match(/部門|姓名|id|抽獎/) ? rows.slice(1) : rows;
  return body
    .map((row, index) => ({
      department: row[0] ?? "",
      name: row[1] ?? "",
      id: row[2] || `P${String(index + 1).padStart(3, "0")}`,
      eligible: !["false", "0", "否", "不抽", "不參加", "no", "n"].includes((row[3] ?? "").toLowerCase()),
    }))
    .filter((person) => person.department || person.name || person.id);
}

function parsePrizes(text: string): Prize[] {
  const rows = splitRows(text);
  const body = rows[0]?.join("|").match(/順序|獎項|金額|名額|quota/i) ? rows.slice(1) : rows;
  return body
    .map((row, index) => ({
      id: id("prize"),
      order: toNumber(row[0]) || index + 1,
      name: row[1] ?? "",
      amount: toNumber(row[2]),
      quota: toNumber(row[3]),
      note: row[4] ?? "",
    }))
    .filter((prize) => prize.name || prize.amount || prize.quota);
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  values.forEach((value) => {
    const key = value.trim();
    if (seen.has(key)) duplicated.add(key);
    seen.add(key);
  });
  return Array.from(duplicated).filter(Boolean);
}

function validate(participants: Participant[], prizes: Prize[]) {
  const errors: string[] = [];
  const eligibleCount = participants.filter((person) => person.eligible).length;
  const totalQuota = prizes.reduce((sum, prize) => sum + prize.quota, 0);
  if (participants.length === 0) errors.push("請先新增或匯入抽獎人員。");
  if (eligibleCount === 0) errors.push("至少需要 1 位可抽獎人員。");
  if (prizes.length === 0) errors.push("請先新增或匯入獎項。");
  participants.forEach((person, index) => {
    if (!person.id.trim()) errors.push(`第 ${index + 1} 位人員缺少 ID。`);
    if (!person.name.trim()) errors.push(`第 ${index + 1} 位人員缺少姓名。`);
  });
  duplicates(participants.map((person) => person.id)).forEach((value) => errors.push(`人員 ID「${value}」重複。`));
  prizes.forEach((prize, index) => {
    if (!Number.isInteger(prize.order) || prize.order <= 0) errors.push(`第 ${index + 1} 個獎項的順序必須是正整數。`);
    if (!prize.name.trim()) errors.push(`第 ${index + 1} 個獎項缺少名稱。`);
    if (!Number.isInteger(prize.quota) || prize.quota <= 0) errors.push(`「${prize.name || `第 ${index + 1} 個獎項`}」的名額必須是正整數。`);
    if (!Number.isFinite(prize.amount) || prize.amount < 0) errors.push(`「${prize.name || `第 ${index + 1} 個獎項`}」的金額必須是 0 或正數。`);
  });
  duplicates(prizes.map((prize) => String(prize.order))).forEach((value) => errors.push(`獎項順序「${value}」重複。`));
  if (totalQuota > eligibleCount) errors.push(`總中獎名額 ${totalQuota} 位，大於可抽獎人員 ${eligibleCount} 位。`);
  return errors;
}

function drawWinner(pool: Participant[]) {
  if (!globalThis.crypto?.getRandomValues) throw new Error("此瀏覽器不支援安全隨機抽選。");
  const values = new Uint32Array(1);
  const limit = 0xffffffff - (0xffffffff % pool.length);
  do globalThis.crypto.getRandomValues(values);
  while (values[0] >= limit);
  return pool[values[0] % pool.length];
}

function dateText(date = new Date()) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export default function App() {
  const initial = useMemo(() => loadState(), []);
  const [eventTitle, setEventTitle] = useState(initial.eventTitle);
  const [participants, setParticipants] = useState<Participant[]>(initial.participants);
  const [prizes, setPrizes] = useState<Prize[]>(initial.prizes);
  const [lockedParticipants, setLockedParticipants] = useState<Participant[]>(initial.lockedParticipants);
  const [lockedPrizes, setLockedPrizes] = useState<Prize[]>(initial.lockedPrizes);
  const [winners, setWinners] = useState<Winner[]>(initial.winners);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(initial.currentPrizeIndex);
  const [currentDrawCountInPrize, setCurrentDrawCountInPrize] = useState(initial.currentDrawCountInPrize);
  const [lotteryStatus, setLotteryStatus] = useState<LotteryStatus>(initial.lotteryStatus);
  const [remainingParticipantIds, setRemainingParticipantIds] = useState<string[]>(initial.remainingParticipantIds);
  const [activeTab, setActiveTab] = useState<TabId>("lottery");
  const [participantDraft, setParticipantDraft] = useState<Participant>({ id: "", department: "", name: "", eligible: true });
  const [participantEditingId, setParticipantEditingId] = useState<string | null>(null);
  const [participantPaste, setParticipantPaste] = useState("");
  const [prizeDraft, setPrizeDraft] = useState<Prize>({ id: "", order: 1, name: "", amount: 0, quota: 1, note: "" });
  const [prizeEditingId, setPrizeEditingId] = useState<string | null>(null);
  const [prizePaste, setPrizePaste] = useState("");
  const drawTimer = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);

  const sortedPrizes = useMemo(() => sortPrizes(prizes), [prizes]);
  const setupErrors = useMemo(() => validate(participants, prizes), [participants, prizes]);
  const eligible = participants.filter((person) => person.eligible);
  const currentPrize = lockedPrizes.length ? lockedPrizes[Math.min(currentPrizeIndex, lockedPrizes.length - 1)] : sortedPrizes[0];
  const pool = lockedParticipants.length ? lockedParticipants.filter((person) => remainingParticipantIds.includes(person.id)) : eligible;
  const canEdit = lotteryStatus === "editing" || lotteryStatus === "ready";
  const latestWinner = winners[winners.length - 1];

  useEffect(() => {
    const state: StoredState = { eventTitle, participants, prizes, lockedParticipants, lockedPrizes, winners, currentPrizeIndex, currentDrawCountInPrize, lotteryStatus, remainingParticipantIds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [eventTitle, participants, prizes, lockedParticipants, lockedPrizes, winners, currentPrizeIndex, currentDrawCountInPrize, lotteryStatus, remainingParticipantIds]);

  useEffect(() => () => {
    if (drawTimer.current) window.clearTimeout(drawTimer.current);
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
  }, []);

  function touchEditing() {
    if (lotteryStatus === "ready") setLotteryStatus("editing");
  }

  function saveParticipant() {
    const person = { ...participantDraft, id: participantDraft.id.trim() || `P${String(participants.length + 1).padStart(3, "0")}`, department: participantDraft.department.trim(), name: participantDraft.name.trim() };
    if (!person.department && !person.name) return;
    setParticipants(participantEditingId ? participants.map((item) => (item.id === participantEditingId ? person : item)) : [...participants, person]);
    setParticipantDraft({ id: "", department: "", name: "", eligible: true });
    setParticipantEditingId(null);
    touchEditing();
  }

  function savePrize() {
    const prize = { ...prizeDraft, id: prizeEditingId ?? id("prize"), order: Number(prizeDraft.order), amount: Number(prizeDraft.amount), quota: Number(prizeDraft.quota), name: prizeDraft.name.trim(), note: prizeDraft.note?.trim() };
    if (!prize.name && prize.amount === 0 && prize.quota === 0) return;
    setPrizes(prizeEditingId ? prizes.map((item) => (item.id === prizeEditingId ? prize : item)) : [...prizes, prize]);
    setPrizeDraft({ id: "", order: prizes.length + 2, name: "", amount: 0, quota: 1, note: "" });
    setPrizeEditingId(null);
    touchEditing();
  }

  function prepareLottery() {
    const errors = validate(participants, prizes);
    if (errors.length) {
      setLotteryStatus("editing");
      return;
    }
    const nextParticipants = participants.filter((person) => person.eligible);
    const nextPrizes = sortPrizes(prizes);
    setLockedParticipants(nextParticipants);
    setLockedPrizes(nextPrizes);
    setWinners([]);
    setCurrentPrizeIndex(0);
    setCurrentDrawCountInPrize(0);
    setRemainingParticipantIds(nextParticipants.map((person) => person.id));
    setLotteryStatus("locked");
    setActiveTab("lottery");
  }

  function draw() {
    if (lotteryStatus !== "locked" || !currentPrize || drawTimer.current) return;
    if (!pool.length) {
      setLotteryStatus("completed");
      return;
    }
    setLotteryStatus("drawing");
    drawTimer.current = window.setTimeout(() => {
      const person = drawWinner(pool);
      const winner: Winner = { id: id("winner"), prizeId: currentPrize.id, prizeName: currentPrize.name, amount: currentPrize.amount, participantId: person.id, department: person.department, name: person.name, drawnAt: new Date().toISOString() };
      const nextRemaining = remainingParticipantIds.filter((personId) => personId !== person.id);
      const nextCount = currentDrawCountInPrize + 1;
      const moveNext = nextCount >= currentPrize.quota;
      const nextPrizeIndex = moveNext ? currentPrizeIndex + 1 : currentPrizeIndex;
      const completed = nextPrizeIndex >= lockedPrizes.length || nextRemaining.length === 0;
      setWinners((items) => [...items, winner]);
      setRemainingParticipantIds(nextRemaining);
      setCurrentPrizeIndex(nextPrizeIndex);
      setCurrentDrawCountInPrize(moveNext ? 0 : nextCount);
      setLotteryStatus("revealing");
      drawTimer.current = null;
      revealTimer.current = window.setTimeout(() => setLotteryStatus(completed ? "completed" : "locked"), 3000);
    }, 1600);
  }

  function resetProgress() {
    if (!window.confirm("這會清除中獎結果與抽獎進度，但保留活動名稱、人員與獎項。是否繼續？")) return;
    setLockedParticipants([]);
    setLockedPrizes([]);
    setWinners([]);
    setCurrentPrizeIndex(0);
    setCurrentDrawCountInPrize(0);
    setRemainingParticipantIds([]);
    setLotteryStatus(validate(participants, prizes).length ? "editing" : "ready");
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header no-print"><div className="brand-mark">抽</div><div><p>2027 Company Year End Party</p><h1>{eventTitle}</h1></div></header>
        <nav className="tabs no-print">{(["lottery", "participants", "prizes"] as TabId[]).map((tab) => <button key={tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "lottery" ? "抽獎" : tab === "participants" ? "人員" : "獎項"}</button>)}</nav>
        <main>
          {activeTab === "lottery" && <section className="lottery-layout">
            <div className="panel title-panel no-print"><label><span>活動名稱</span><input disabled={!canEdit} value={eventTitle} onChange={(event) => { setEventTitle(event.target.value); touchEditing(); }} /></label><b className={`status status-${lotteryStatus}`}>{lotteryStatus}</b></div>
            <section className="panel prize-panel"><p>目前獎項</p><h2>{currentPrize?.name ?? "尚未鎖定獎項"}</h2><div>{currentPrize ? `金額 ${currentPrize.amount.toLocaleString("zh-TW")}｜已抽 ${currentDrawCountInPrize} / ${currentPrize.quota}` : "請先設定資料"}</div></section>
            <section className={`panel machine ${lotteryStatus === "drawing" ? "is-drawing" : ""}`}><div className="reel">{[...pool.slice(0, 10), ...pool.slice(0, 10)].map((person, index) => <span key={`${person.id}-${index}`}>{person.name || "等待名單"}</span>)}</div></section>
            <section className={`panel winner ${lotteryStatus === "revealing" ? "is-revealing" : ""}`}><p>{lotteryStatus === "drawing" ? "抽選中" : lotteryStatus === "revealing" ? "中獎人揭曉" : "等待抽獎"}</p><strong>{latestWinner?.name ?? "尚無中獎人"}</strong><span>{latestWinner ? `${latestWinner.department}｜${latestWinner.prizeName}` : "按下抽獎後會在此顯示"}</span></section>
            <section className="panel action-panel no-print"><div className="stats"><span>可抽<b>{eligible.length}</b></span><span>剩餘<b>{pool.length}</b></span><span>已中獎<b>{winners.length}</b></span></div>{setupErrors.length > 0 && canEdit && <div className="alert">{setupErrors.map((error) => <p key={error}>{error}</p>)}</div>}<div className="buttons">{canEdit ? <button className="primary" onClick={prepareLottery}>檢查並鎖定資料</button> : lotteryStatus === "completed" ? <><button className="primary" onClick={() => window.print()}>列印 A4 中獎名單</button><button onClick={resetProgress}>Reset</button></> : <button className="primary" disabled={lotteryStatus !== "locked"} onClick={draw}>{lotteryStatus === "drawing" ? "抽選中" : lotteryStatus === "revealing" ? "揭曉中" : "抽出下一位"}</button>}</div></section>
            <WinnerTable winners={winners} />
          </section>}
          {activeTab === "participants" && <section className="settings-layout"><div className="panel form-panel"><h2>人員設定</h2>{!canEdit && <p className="alert">抽獎資料已鎖定，完成後 Reset 才能修改。</p>}<div className="form-grid"><label><span>部門</span><input disabled={!canEdit} value={participantDraft.department} onChange={(event) => setParticipantDraft({ ...participantDraft, department: event.target.value })} /></label><label><span>姓名</span><input disabled={!canEdit} value={participantDraft.name} onChange={(event) => setParticipantDraft({ ...participantDraft, name: event.target.value })} /></label><label><span>ID</span><input disabled={!canEdit || Boolean(participantEditingId)} value={participantDraft.id} onChange={(event) => setParticipantDraft({ ...participantDraft, id: event.target.value })} /></label><label className="check"><input disabled={!canEdit} type="checkbox" checked={participantDraft.eligible} onChange={(event) => setParticipantDraft({ ...participantDraft, eligible: event.target.checked })} />可參加抽獎</label></div><div className="buttons"><button disabled={!canEdit} onClick={saveParticipant}>{participantEditingId ? "儲存修改" : "新增人員"}</button></div></div><div className="panel form-panel"><h2>Excel 匯入</h2><textarea disabled={!canEdit} value={participantPaste} onChange={(event) => setParticipantPaste(event.target.value)} placeholder={"部門\t姓名\tID\n生產部\t王小明\tA001"} /><div className="buttons"><button disabled={!canEdit || !participantPaste.trim()} onClick={() => { setParticipants([...participants, ...parseParticipants(participantPaste)]); setParticipantPaste(""); touchEditing(); }}>匯入貼上內容</button><button disabled={!canEdit || !participants.length} onClick={() => window.confirm("清空人員？") && setParticipants([])}>清空人員</button></div></div><PeopleTable participants={participants} canEdit={canEdit} onEdit={(person) => { setParticipantDraft(person); setParticipantEditingId(person.id); }} onDelete={(personId) => setParticipants(participants.filter((person) => person.id !== personId))} /></section>}
          {activeTab === "prizes" && <section className="settings-layout"><div className="panel form-panel"><h2>獎項設定</h2>{!canEdit && <p className="alert">抽獎資料已鎖定，完成後 Reset 才能修改。</p>}<div className="form-grid"><label><span>順序</span><input disabled={!canEdit} type="number" min={1} value={prizeDraft.order} onChange={(event) => setPrizeDraft({ ...prizeDraft, order: Number(event.target.value) })} /></label><label><span>獎項名稱</span><input disabled={!canEdit} value={prizeDraft.name} onChange={(event) => setPrizeDraft({ ...prizeDraft, name: event.target.value })} /></label><label><span>金額</span><input disabled={!canEdit} type="number" min={0} value={prizeDraft.amount} onChange={(event) => setPrizeDraft({ ...prizeDraft, amount: Number(event.target.value) })} /></label><label><span>名額</span><input disabled={!canEdit} type="number" min={1} value={prizeDraft.quota} onChange={(event) => setPrizeDraft({ ...prizeDraft, quota: Number(event.target.value) })} /></label><label className="wide"><span>備註</span><input disabled={!canEdit} value={prizeDraft.note ?? ""} onChange={(event) => setPrizeDraft({ ...prizeDraft, note: event.target.value })} /></label></div><div className="buttons"><button disabled={!canEdit} onClick={savePrize}>{prizeEditingId ? "儲存修改" : "新增獎項"}</button></div></div><div className="panel form-panel"><h2>Excel 匯入</h2><textarea disabled={!canEdit} value={prizePaste} onChange={(event) => setPrizePaste(event.target.value)} placeholder={"順序\t獎項名稱\t金額\t名額\t備註\n1\t六獎\t1000\t20\t現金"} /><div className="buttons"><button disabled={!canEdit || !prizePaste.trim()} onClick={() => { setPrizes([...prizes, ...parsePrizes(prizePaste)]); setPrizePaste(""); touchEditing(); }}>匯入貼上內容</button><button disabled={!canEdit || !prizes.length} onClick={() => window.confirm("清空獎項？") && setPrizes([])}>清空獎項</button></div></div><PrizeTable prizes={sortedPrizes} canEdit={canEdit} onEdit={(prize) => { setPrizeDraft(prize); setPrizeEditingId(prize.id); }} onDelete={(prizeId) => setPrizes(prizes.filter((prize) => prize.id !== prizeId))} /></section>}
        </main>
      </div>
      <section className="print-only print-sheet"><header><p>中獎名單</p><h1>{eventTitle}</h1><time>{dateText()}</time></header><WinnerTable winners={winners} print /></section>
    </>
  );
}

function WinnerTable({ winners, print = false }: { winners: Winner[]; print?: boolean }) {
  return <section className={print ? "" : "panel list-panel"}><h2>{print ? "" : `已抽出 ${winners.length} 位`}</h2>{winners.length === 0 ? <p>尚無中獎紀錄。</p> : <div className="table-wrap"><table><thead><tr><th>順序</th><th>獎項</th><th>金額</th><th>部門</th><th>中獎人</th>{print && <th>簽收欄</th>}</tr></thead><tbody>{winners.map((winner, index) => <tr key={winner.id}><td>{index + 1}</td><td>{winner.prizeName}</td><td>{winner.amount.toLocaleString("zh-TW")}</td><td>{winner.department}</td><td>{winner.name}</td>{print && <td />}</tr>)}</tbody></table></div>}</section>;
}

function PeopleTable({ participants, canEdit, onEdit, onDelete }: { participants: Participant[]; canEdit: boolean; onEdit: (person: Participant) => void; onDelete: (id: string) => void }) {
  return <section className="panel list-panel"><h2>{participants.length} 位人員</h2>{participants.length === 0 ? <p>尚未新增人員。</p> : <div className="table-wrap"><table><thead><tr><th>ID</th><th>部門</th><th>姓名</th><th>狀態</th><th>操作</th></tr></thead><tbody>{participants.map((person) => <tr key={person.id}><td>{person.id}</td><td>{person.department}</td><td>{person.name}</td><td>{person.eligible ? "可抽獎" : "不抽獎"}</td><td><button disabled={!canEdit} onClick={() => onEdit(person)}>修改</button><button disabled={!canEdit} onClick={() => window.confirm("刪除這位人員？") && onDelete(person.id)}>刪除</button></td></tr>)}</tbody></table></div>}</section>;
}

function PrizeTable({ prizes, canEdit, onEdit, onDelete }: { prizes: Prize[]; canEdit: boolean; onEdit: (prize: Prize) => void; onDelete: (id: string) => void }) {
  return <section className="panel list-panel"><h2>{prizes.length} 個獎項</h2>{prizes.length === 0 ? <p>尚未新增獎項。</p> : <div className="table-wrap"><table><thead><tr><th>順序</th><th>獎項</th><th>金額</th><th>名額</th><th>備註</th><th>操作</th></tr></thead><tbody>{prizes.map((prize) => <tr key={prize.id}><td>{prize.order}</td><td>{prize.name}</td><td>{prize.amount.toLocaleString("zh-TW")}</td><td>{prize.quota}</td><td>{prize.note || "-"}</td><td><button disabled={!canEdit} onClick={() => onEdit(prize)}>修改</button><button disabled={!canEdit} onClick={() => window.confirm("刪除這個獎項？") && onDelete(prize.id)}>刪除</button></td></tr>)}</tbody></table></div>}</section>;
}
