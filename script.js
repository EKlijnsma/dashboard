const { useState, useEffect } = React;

const HABITS = [
  { id: "lezen40", label: "Dagelijks stukje gelezen", sublabel: "40-dagen tijd", emoji: "📖", color: "#00b4d8" },
  { id: "telefoon", label: "Telefoon uit beeld gehouden", sublabel: null, emoji: "📵", color: "#00b4d8" },
  { id: "bijbel", label: "Bijbel gelezen", sublabel: null, emoji: "✝️", color: "#00b4d8" },
  { id: "fictie", label: "Fictie gelezen", sublabel: null, emoji: "📚", color: "#00b4d8" },
  { id: "buiten", label: "Genoeg buiten geweest / bewogen", sublabel: null, emoji: "🌿", color: "#00b4d8" },
  { id: "bed", label: "Op tijd naar bed", sublabel: null, emoji: "🛏️", color: "#00b4d8" },
];

const MEAL_DEFAULTS = { ontbijt: "07:30", lunch: "12:00", diner: "18:00" };
const MEALS = {
  ontbijt: { label: "Ontbijt", emoji: "🥐", options: ["Overnight oats", "Kwark/Yoghurt", "Brood", "Anders - gezond", "Anders - ongezond"], health: { "Overnight oats": "goed", "Kwark/Yoghurt": "goed", Brood: "neutraal", "Anders - gezond": "goed", "Anders - ongezond": "slecht" } },
  lunch: { label: "Lunch", emoji: "🥗", options: ["Brood", "Salade", "Omelet", "Anders - gezond", "Anders - ongezond"], health: { Brood: "neutraal", Salade: "goed", Omelet: "goed", "Anders - gezond": "goed", "Anders - ongezond": "slecht" } },
  diner: { label: "Diner", emoji: "🥩", options: ["Gezond", "Gemiddeld", "Ongezond"], health: { Gezond: "goed", Gemiddeld: "neutraal", Ongezond: "slecht" } },
};
const SNACK_OPTIONS = ["Gezond", "Hartig", "Zoet"];
const SNACK_HEALTH = { Gezond: "goed", Hartig: "slecht", Zoet: "slecht" };
const SNACK_EMOJI = { Gezond: "🥦", Hartig: "🧀", Zoet: "🍫" };

const HEALTH_COLOR = { goed: "#39d353", neutraal: "#e6a817", slecht: "#e05252" };
const HEALTH_BG = { goed: "rgba(57,211,83,0.12)", neutraal: "rgba(230,168,23,0.12)", slecht: "rgba(224,82,82,0.12)" };
const HEALTH_BORDER = { goed: "rgba(57,211,83,0.35)", neutraal: "rgba(230,168,23,0.35)", slecht: "rgba(224,82,82,0.35)" };

const TL_START = 6;
const TL_END = 23;
function timeToPos(t) {
  const [h, m] = t.split(":").map(Number);
  return Math.max(0, Math.min(1, (h + m / 60 - TL_START) / (TL_END - TL_START))) * 100;
}
function toDateStr(d) { return d.toISOString().slice(0, 10); }
function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
function getLast7() {
  const a = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    a.push(toDateStr(d));
  }
  return a;
}
function getLast30() {
  const a = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    a.push(toDateStr(d));
  }
  return a;
}
const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function dayLbl(ds) { const d = new Date(`${ds}T12:00:00`); return DAYS[d.getDay()]; }
function shortDt(ds) { const d = new Date(`${ds}T12:00:00`); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function emptyDay() { return { ontbijt: null, ontbijt_time: "07:30", lunch: null, lunch_time: "12:00", diner: null, diner_time: "18:00", snacks: [] }; }
const HOUR_MARKS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

const C = {
  bg: "#0f1117",
  card: "#1a1d27",
  card2: "#20232f",
  border: "#2a2d3a",
  accent: "#00b4d8",
  accentDim: "rgba(0,180,216,0.15)",
  text: "#e8eaf0",
  muted: "#6b7080",
  dimmed: "#3a3d4a",
};

async function storageGet(key) {
  if (window.storage && typeof window.storage.get === "function") {
    return window.storage.get(key);
  }
  const value = localStorage.getItem(key);
  return value === null ? null : { value };
}

async function storageSet(key, value) {
  if (window.storage && typeof window.storage.set === "function") {
    return window.storage.set(key, value);
  }
  localStorage.setItem(key, value);
  return true;
}

function Card({ children, style = {} }) {
  return <div style={{ background: C.card, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>{children}</div>;
}

function App() {
  const [tab, setTab] = useState("gewoonten");
  const [hData, setHData] = useState({});
  const [fData, setFData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editTime, setEditTime] = useState(null);
  const [focusHabit, setFocusHabit] = useState(null);
  const [focusFood, setFocusFood] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 430);

  const today = toDateStr(new Date());
  const last7 = getLast7();
  const last30 = getLast30();

  useEffect(() => {
    (async () => {
      try {
        const r = await storageGet("habits-data");
        if (r) setHData(JSON.parse(r.value));
      } catch {}
      try {
        const r = await storageGet("food-data2");
        if (r) setFData(JSON.parse(r.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth <= 430);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function saveH(next) {
    setHData(next);
    try { await storageSet("habits-data", JSON.stringify(next)); } catch {}
  }

  async function saveF(next) {
    setFData(next);
    try { await storageSet("food-data2", JSON.stringify(next)); } catch {}
  }

  function isDone(date, id) { return !!hData[`${date}__${id}`]; }
  function toggleH(date, id) { saveH({ ...hData, [`${date}__${id}`]: !hData[`${date}__${id}`] }); }
  function getDay(date) { return fData[date] || emptyDay(); }
  function updateDay(date, patch) { const d = getDay(date); saveF({ ...fData, [date]: { ...d, ...patch } }); }
  function addSnack(date, type) { const d = getDay(date); updateDay(date, { snacks: [...(d.snacks || []), { type, time: nowTime() }] }); }
  function removeSnack(date, i) { const d = getDay(date); updateDay(date, { snacks: d.snacks.filter((_, j) => j !== i) }); }
  function updateSnackTime(date, i, time) { const d = getDay(date); updateDay(date, { snacks: d.snacks.map((s, j) => (j === i ? { ...s, time } : s)) }); setEditTime(null); }

  function todayCount() { return HABITS.filter((h) => isDone(today, h.id)).length; }
  function weekScore() { let t = 0; last7.forEach((d) => HABITS.forEach((h) => { if (isDone(d, h.id)) t += 1; })); return Math.round((t / (7 * HABITS.length)) * 100); }
  function streak() { let s = 0; for (const d of [...last30].reverse()) { if (HABITS.filter((h) => isDone(d, h.id)).length >= Math.ceil(HABITS.length / 2)) s += 1; else break; } return s; }
  function weekHabit(id) { return last7.filter((d) => isDone(d, id)).length; }

  function getDayEvents(date) {
    const df = getDay(date);
    const evs = [];
    Object.entries(MEALS).forEach(([key, meal]) => {
      if (df[key]) {
        evs.push({ time: df[`${key}_time`] || MEAL_DEFAULTS[key], label: df[key], emoji: meal.emoji, health: meal.health[df[key]], kind: "meal", mealKey: key });
      }
    });
    (df.snacks || []).forEach((s, i) => evs.push({ time: s.time, label: s.type, emoji: SNACK_EMOJI[s.type], health: SNACK_HEALTH[s.type], kind: "snack", idx: i }));
    return evs.sort((a, b) => a.time.localeCompare(b.time));
  }
  function eventMatchesFocus(ev) { if (!focusFood) return true; if (focusFood === "snack") return ev.kind === "snack"; return ev.mealKey === focusFood; }

  if (!loaded) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: C.bg, color: C.muted, fontFamily: "sans-serif", fontSize: 16, letterSpacing: "0.05em" }}>LADEN...</div>;
  }

  const dayFood = getDay(today);
  const tc = todayCount();
  const ws = weekScore();
  const st = streak();

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: C.bg, minHeight: "100vh", padding: "24px 16px", color: C.text }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", color: C.text }}>40-DAGEN DASHBOARD</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>

        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: C.card, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
          {[ ["gewoonten", "GEWOONTEN"], ["eten", "ETEN"] ].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", cursor: "pointer", background: tab === id ? C.accent : "transparent", color: tab === id ? "#000" : C.muted, transition: "all 0.15s" }}>{lbl}</button>
          ))}
        </div>

        {tab === "gewoonten" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { lbl: "VANDAAG", val: `${tc}/${HABITS.length}`, sub: "gewoonten", col: tc === HABITS.length ? HEALTH_COLOR.goed : C.accent },
                { lbl: "WEEK", val: `${ws}%`, sub: "voltooid", col: ws >= 80 ? HEALTH_COLOR.goed : ws >= 50 ? HEALTH_COLOR.neutraal : HEALTH_COLOR.slecht },
                { lbl: "STREAK", val: `${st}`, sub: "dagen", col: st >= 7 ? HEALTH_COLOR.goed : C.accent },
              ].map((k) => (
                <div key={k.lbl} style={{ background: C.card, borderRadius: 12, padding: "16px 12px", textAlign: "center", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.muted, marginBottom: 6 }}>{k.lbl}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.col, lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <Card>
              <SectionTitle>Vandaag</SectionTitle>
              {focusHabit && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: C.accentDim, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.accent}44` }}>
                  <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: "0.05em" }}>FOCUS: {HABITS.find((h) => h.id === focusHabit)?.label.toUpperCase()}</span>
                  <button onClick={() => setFocusHabit(null)} style={{ background: "none", border: "none", color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {HABITS.map((h) => {
                  const done = isDone(today, h.id);
                  const dim = focusHabit && focusHabit !== h.id;
                  return (
                    <div key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", opacity: dim ? 0.25 : 1, transition: "opacity 0.2s" }}>
                      <button onClick={() => toggleH(today, h.id)} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8,
                        border: `1px solid ${done ? C.accent : C.border}`,
                        background: done ? C.accentDim : C.card2, cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${done ? C.accent : C.dimmed}`, background: done ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {done && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: done ? C.accent : C.text }}>{h.label}</div>
                          {h.sublabel && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{h.sublabel}</div>}
                        </div>
                      </button>
                      <button onClick={() => setFocusHabit(focusHabit === h.id ? null : h.id)} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${focusHabit === h.id ? C.accent : C.border}`, background: focusHabit === h.id ? C.accentDim : C.card2, cursor: "pointer", color: focusHabit === h.id ? C.accent : C.muted, fontSize: 14, flexShrink: 0 }}>⊙</button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle>Voortgang deze week</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {HABITS.map((h) => {
                  const score = weekHabit(h.id);
                  const pct = Math.round((score / 7) * 100);
                  const dim = focusHabit && focusHabit !== h.id;
                  const col = pct >= 80 ? HEALTH_COLOR.goed : pct >= 50 ? HEALTH_COLOR.neutraal : HEALTH_COLOR.slecht;
                  return (
                    <div key={h.id} style={{ opacity: dim ? 0.2 : 1, transition: "opacity 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: C.text }}>{h.label}</span>
                        <span style={{ color: col, fontWeight: 700 }}>{score}/7</span>
                      </div>
                      <div style={{ background: C.card2, borderRadius: 3, height: 6, border: `1px solid ${C.border}` }}>
                        <div style={{ width: `${pct}%`, background: col, borderRadius: 3, height: "100%", transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle>Weekoverzicht</SectionTitle>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", paddingBottom: 10, color: C.muted, minWidth: 32, fontWeight: 600 }} />
                      {last7.map((d) => (
                        <th key={d} style={{ textAlign: "center", paddingBottom: 10, color: d === today ? C.accent : C.muted, fontWeight: d === today ? 800 : 500, fontSize: 11, letterSpacing: "0.05em" }}>
                          <div>{dayLbl(d)}</div>
                          <div style={{ fontSize: 9, marginTop: 2 }}>{shortDt(d)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HABITS.map((h) => {
                      const dim = focusHabit && focusHabit !== h.id;
                      return (
                        <tr key={h.id} style={{ opacity: dim ? 0.2 : 1, transition: "opacity 0.2s" }}>
                          <td style={{ paddingRight: 8, fontSize: 16, paddingBottom: 8 }}>{h.emoji}</td>
                          {last7.map((d) => {
                            const done = isDone(d, h.id);
                            return (
                              <td key={d} style={{ textAlign: "center", paddingBottom: 8 }}>
                                <button onClick={() => toggleH(d, h.id)} style={{
                                  width: isSmallScreen ? 36 : 30, height: isSmallScreen ? 36 : 30, borderRadius: 6,
                                  border: `1px solid ${done ? C.accent : d === today ? `${C.border}aa` : C.border}`,
                                  background: done ? C.accentDim : C.card2, cursor: "pointer",
                                  color: done ? C.accent : C.dimmed, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13,
                                }}>{done ? "✓" : ""}</button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <SectionTitle>{focusHabit ? `TREND - ${HABITS.find((h) => h.id === focusHabit)?.label.toUpperCase()}` : "TREND - 30 DAGEN"}</SectionTitle>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72 }}>
                {last30.map((d) => {
                  const count = focusHabit ? (isDone(d, focusHabit) ? 1 : 0) : HABITS.filter((h) => isDone(d, h.id)).length;
                  const max = focusHabit ? 1 : HABITS.length;
                  const pct = count / max;
                  const col = pct >= 0.8 ? HEALTH_COLOR.goed : pct >= 0.5 ? HEALTH_COLOR.neutraal : pct > 0 ? HEALTH_COLOR.slecht : C.card2;
                  return <div key={d} title={`${shortDt(d)}: ${count}/${max}`} style={{ flex: 1, background: col, borderRadius: "2px 2px 0 0", height: `${Math.max(pct * 100, pct > 0 ? 10 : 4)}%`, border: d === today ? `1px solid ${C.accent}` : "none", minHeight: 3 }} />;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 6 }}>
                <span>{shortDt(last30[0])}</span>
                <span>vandaag</span>
              </div>
            </Card>
          </>
        )}

        {tab === "eten" && (
          <>
            <Card>
              <SectionTitle>Vandaag loggen</SectionTitle>
              {Object.entries(MEALS).map(([key, meal]) => {
                const selected = dayFood[key];
                const timeVal = dayFood[`${key}_time`] || MEAL_DEFAULTS[key];
                const hk = selected ? meal.health[selected] : null;
                const isEd = editTime === `meal_${key}`;
                return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18 }}>{meal.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", color: C.text, textTransform: "uppercase" }}>{meal.label}</span>
                      {isEd ? (
                        <input type="time" defaultValue={timeVal} autoFocus onBlur={(e) => { updateDay(today, { [`${key}_time`]: e.target.value }); setEditTime(null); }} onKeyDown={(e) => { if (e.key === "Enter") { updateDay(today, { [`${key}_time`]: e.target.value }); setEditTime(null); } }} style={{ background: C.card2, border: `1px solid ${C.accent}`, borderRadius: 6, padding: "3px 8px", fontSize: 16, color: C.text }} />
                      ) : (
                        <button onClick={() => setEditTime(`meal_${key}`)} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, color: C.muted, cursor: "pointer" }}>{timeVal} ✏️</button>
                      )}
                      {selected && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: HEALTH_BG[hk], color: HEALTH_COLOR[hk], border: `1px solid ${HEALTH_BORDER[hk]}`, letterSpacing: "0.04em" }}>{selected.toUpperCase()}</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {meal.options.map((opt) => {
                        const active = selected === opt;
                        const ohk = meal.health[opt];
                        return <button key={opt} onClick={() => updateDay(today, { [key]: active ? null : opt })} style={{ padding: "7px 13px", borderRadius: 6, border: `1px solid ${active ? HEALTH_COLOR[ohk] : C.border}`, background: active ? HEALTH_BG[ohk] : C.card2, color: active ? HEALTH_COLOR[ohk] : C.muted, fontWeight: active ? 700 : 400, fontSize: 12, cursor: "pointer" }}>{opt}</button>;
                      })}
                      <button onClick={() => updateDay(today, { [key]: null })} style={{ padding: "7px 13px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dimmed, fontSize: 12, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                );
              })}

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>🍎</span>
                  <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", color: C.text, textTransform: "uppercase" }}>Snacks</span>
                </div>
                {(dayFood.snacks || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {(dayFood.snacks || []).map((s, i) => {
                      const hk = SNACK_HEALTH[s.type];
                      const isEd = editTime === `snack_${today}_${i}`;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: HEALTH_BG[hk], border: `1px solid ${HEALTH_BORDER[hk]}` }}>
                          <span style={{ fontSize: 15 }}>{SNACK_EMOJI[s.type]}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: HEALTH_COLOR[hk], flex: 1 }}>{s.type}</span>
                          {isEd ? (
                            <input type="time" defaultValue={s.time} autoFocus onBlur={(e) => updateSnackTime(today, i, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") updateSnackTime(today, i, e.target.value); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 16, color: C.text }} />
                          ) : (
                            <button onClick={() => setEditTime(`snack_${today}_${i}`)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.muted, cursor: "pointer" }}>{s.time} ✏️</button>
                          )}
                          <button onClick={() => removeSnack(today, i)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SNACK_OPTIONS.map((opt) => {
                    const hk = SNACK_HEALTH[opt];
                    return <button key={opt} onClick={() => addSnack(today, opt)} style={{ padding: "7px 13px", borderRadius: 6, border: `1px solid ${HEALTH_BORDER[hk]}`, background: HEALTH_BG[hk], color: HEALTH_COLOR[hk], fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ {opt}</button>;
                  })}
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle>Tijdlijn - afgelopen 7 dagen</SectionTitle>

              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[ ["ontbijt", "🥐 Ontbijt"], ["lunch", "🥗 Lunch"], ["diner", "🥩 Diner"], ["snack", "🍎 Snacks"] ].map(([key, lbl]) => (
                  <button key={key} onClick={() => setFocusFood((f) => (f === key ? null : key))} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", border: `1px solid ${focusFood === key ? C.accent : C.border}`, background: focusFood === key ? C.accentDim : C.card2, color: focusFood === key ? C.accent : C.muted }}>{lbl}</button>
                ))}
                {focusFood && <button onClick={() => setFocusFood(null)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${C.border}`, background: "transparent", color: C.muted }}>✕ Alles</button>}
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                {[ ["goed", "Gezond"], ["neutraal", "Gemiddeld"], ["slecht", "Ongezond"] ].map(([hk, lbl]) => (
                  <div key={hk} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: HEALTH_COLOR[hk] }} />
                    {lbl}
                  </div>
                ))}
              </div>

              <div style={{ position: "relative", height: 14, marginBottom: 4, marginLeft: 58 }}>
                {HOUR_MARKS.map((h) => (
                  <span key={h} style={{ position: "absolute", left: `${((h - TL_START) / (TL_END - TL_START)) * 100}%`, transform: "translateX(-50%)", fontSize: 9, color: C.muted, letterSpacing: "0.04em" }}>{h}u</span>
                ))}
              </div>

              {[...last7].reverse().map((d) => {
                const allEvs = getDayEvents(d);
                const isToday = d === today;
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 50, flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? C.accent : C.muted, letterSpacing: "0.04em" }}>{isToday ? "VANDAAG" : dayLbl(d).toUpperCase()}</div>
                      <div style={{ fontSize: 9, color: C.dimmed, marginTop: 1 }}>{shortDt(d)}</div>
                    </div>
                    <div style={{ flex: 1, position: "relative", height: 32 }}>
                      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: C.border, transform: "translateY(-50%)" }} />
                      {HOUR_MARKS.map((h) => (
                        <div key={h} style={{ position: "absolute", left: `${((h - TL_START) / (TL_END - TL_START)) * 100}%`, top: "50%", transform: "translate(-50%,-50%)", width: 1, height: 6, background: C.dimmed }} />
                      ))}
                      {allEvs.map((ev, i) => {
                        const focused = eventMatchesFocus(ev);
                        return (
                          <div key={i} title={`${ev.label} - ${ev.time}`} style={{
                            position: "absolute", left: `${timeToPos(ev.time)}%`, top: "50%", transform: "translate(-50%,-50%)",
                            zIndex: focused ? 2 : 1, width: 22, height: 22, borderRadius: "50%",
                            background: focused ? HEALTH_COLOR[ev.health] : C.card2,
                            border: `2px solid ${focused ? HEALTH_COLOR[ev.health] : C.border}`,
                            boxShadow: focused ? `0 0 8px ${HEALTH_COLOR[ev.health]}66` : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, opacity: focusFood && !focused ? 0.15 : 1, transition: "all 0.2s",
                          }}>{ev.emoji}</div>
                        );
                      })}
                      {allEvs.length === 0 && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 10, color: C.dimmed, fontStyle: "italic" }}>-</div>}
                    </div>
                  </div>
                );
              })}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
