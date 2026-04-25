import { useState, useEffect, useRef } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&family=Nanum+Gothic&display=swap";

const C = {
  bg: "#fdf6ee", card: "#fffaf4", accent: "#c8845a", accentLight: "#f5dcc8",
  text: "#4a3020", sub: "#a07858", border: "#eeddd0", muted: "#d4b8a0",
  white: "#ffffff"
};

const S = {
  app: { minHeight: "100vh", background: C.bg, fontFamily: "'Gaegu', cursive", color: C.text, maxWidth: 420, margin: "0 auto", position: "relative", paddingBottom: 80 },
  hdr: { padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, position: "sticky", top: 0, zIndex: 10 },
  hdrTitle: { fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 },
  btn: (v = "solid", sm = false) => ({ background: v === "solid" ? C.accent : "transparent", color: v === "solid" ? "#fff" : C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 20, padding: sm ? "5px 14px" : "8px 20px", cursor: "pointer", fontSize: sm ? 12 : 14, fontWeight: "bold", fontFamily: "inherit" }),
  navBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.sub, padding: "0 6px", lineHeight: 1 },
  fab: { position: "fixed", bottom: 24, right: "50%", transform: "translateX(calc(50% + 180px))", width: 52, height: 52, borderRadius: "50%", background: C.accent, color: "#fff", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(200,132,90,0.4)", fontFamily: "inherit" },
  input: { width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, background: C.card, color: C.text, fontFamily: "inherit", boxSizing: "border-box" },
};

const DAYS = ["일","월","화","수","목","금","토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

async function resizeImg(dataUrl, maxDim = 768) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = dataUrl;
  });
}

function formatDate(d) {
  const [y, m, day] = d.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

async function callAI(photos, lang) {
  const photosData = photos.map(p => ({
    mediaType: (p.match(/^data:([^;]+)/) || [])[1] || "image/jpeg",
    data: p.split(",")[1]
  }));
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos: photosData, lang })
  });
  const result = await response.json();
  return result.diary || (lang === "ko" ? "일기를 생성할 수 없어요. 다시 시도해주세요." : "Could not generate entry. Please try again.");
}

function loadEntries() {
  const obj = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("diary:")) {
      try { obj[k.replace("diary:", "")] = JSON.parse(localStorage.getItem(k)); } catch {}
    }
  }
  return obj;
}

export default function App() {
  const [view, setView] = useState("cal");
  const [cal, setCal] = useState(new Date());
  const [selDate, setSelDate] = useState(null);
  const [entries, setEntries] = useState({});
  const [photos, setPhotos] = useState([]);
  const [lang, setLang] = useState("ko");
  const [diary, setDiary] = useState("");
  const [memo, setMemo] = useState("");
  const [genning, setGenning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT_URL;
    document.head.appendChild(link);
    setEntries(loadEntries());
  }, []);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  function openNew(dateStr) {
    setSelDate(dateStr || todayStr);
    setPhotos([]); setDiary(""); setMemo(""); setLang("ko");
    setView("new");
  }

  function openEntry(dateStr) {
    const e = entries[dateStr];
    setSelDate(dateStr);
    if (e) { setPhotos(e.photos || []); setDiary(e.diary || ""); setMemo(e.memo || ""); setLang(e.lang || "ko"); setView("detail"); }
    else openNew(dateStr);
  }

  async function handleFiles(files) {
    const arr = Array.from(files).slice(0, 5 - photos.length);
    const resized = await Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = async e => res(await resizeImg(e.target.result));
      r.readAsDataURL(f);
    })));
    setPhotos(prev => [...prev, ...resized].slice(0, 5));
  }

  async function generate() {
    if (!photos.length) return;
    setGenning(true); setDiary("");
    try { setDiary(await callAI(photos, lang)); } catch { setDiary(lang === "ko" ? "오류가 발생했어요. 다시 시도해주세요." : "An error occurred. Please try again."); }
    setGenning(false);
  }

  async function save() {
    if (!diary) return;
    setSaving(true);
    const entry = { photos, diary, memo, lang, date: selDate };
    try {
      localStorage.setItem(`diary:${selDate}`, JSON.stringify(entry));
      setEntries(prev => ({ ...prev, [selDate]: entry }));
      setView("detail");
    } catch { alert("저장에 실패했어요. 사진 용량을 줄여보세요."); }
    setSaving(false);
  }

  const yr = cal.getFullYear(), mo = cal.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];

  if (view === "new") {
    const isSaved = !!entries[selDate];
    return (
      <div style={S.app}>
        <div style={S.hdr}>
          <button style={S.navBtn} onClick={() => setView(isSaved ? "detail" : "cal")}>←</button>
          <span style={S.hdrTitle}>✦ {isSaved ? "일기 수정" : "새 일기"}</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ textAlign: "center", color: C.sub, fontSize: 13, marginBottom: 18 }}>{selDate && formatDate(selDate)}</div>
          <div style={{ border: `2px dashed ${C.border}`, borderRadius: 18, padding: 18, textAlign: "center", background: C.card, cursor: "pointer", marginBottom: 16 }}
            onClick={() => photos.length < 5 && fileRef.current.click()}>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            {photos.length === 0 ? (
              <div><div style={{ fontSize: 36, marginBottom: 6 }}>📷</div><div style={{ color: C.sub, fontSize: 13 }}>사진을 눌러 올려주세요 (최대 5장)</div></div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
                  {photos.map((p, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={p} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12 }} />
                      <button onClick={e => { e.stopPropagation(); setPhotos(prev => prev.filter((_, j) => j !== i)); setDiary(""); }}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  ))}
                  {photos.length < 5 && <div style={{ width: 80, height: 80, borderRadius: 12, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 22 }}>+</div>}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{photos.length}/5장</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {[["ko","🇰🇷 한국어"],["en","🇺🇸 English"]].map(([l, label]) => (
              <button key={l} style={{ ...S.btn(lang === l ? "solid" : "outline", true), minWidth: 110 }} onClick={() => setLang(l)}>{label}</button>
            ))}
          </div>
          <button style={{ ...S.btn(), width: "100%", padding: "12px 0", fontSize: 15, marginBottom: 20, opacity: (!photos.length || genning) ? 0.55 : 1 }}
            onClick={generate} disabled={!photos.length || genning}>
            {genning ? "✨ 일기를 쓰고 있어요..." : "✨ 감사일기 생성하기"}
          </button>
          {diary && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, marginBottom: 14 }}>
              <div style={{ lineHeight: 1.85, fontSize: 15, whiteSpace: "pre-wrap" }}>{diary}</div>
              <button style={{ ...S.btn("outline", true), marginTop: 12 }} onClick={generate} disabled={genning}>
                🔄 {lang === "ko" ? "다시 생성" : "Regenerate"}
              </button>
            </div>
          )}
          {diary && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 6 }}>💬 {lang === "ko" ? "나만의 한 마디 (선택)" : "Your note (optional)"}</div>
              <textarea value={memo} onChange={e => setMemo(e.target.value)}
                placeholder={lang === "ko" ? "오늘 느낀 점을 한마디로..." : "How did this moment feel?"}
                rows={3} style={{ ...S.input, resize: "none" }} />
            </div>
          )}
          {diary && (
            <button style={{ ...S.btn(), width: "100%", padding: "12px 0", fontSize: 15 }} onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "💾 저장하기"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === "detail") {
    const e = entries[selDate];
    return (
      <div style={S.app}>
        <div style={S.hdr}>
          <button style={S.navBtn} onClick={() => setView("cal")}>←</button>
          <span style={S.hdrTitle}>{selDate && formatDate(selDate)}</span>
          <button style={S.btn("outline", true)} onClick={() => openNew(selDate)}>수정</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {e ? (
            <>
              {e.photos?.length > 0 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 18, paddingBottom: 4 }}>
                  {e.photos.map((p, i) => <img key={i} src={p} style={{ height: 180, width: "auto", maxWidth: 240, borderRadius: 16, flexShrink: 0, objectFit: "cover" }} />)}
                </div>
              )}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, marginBottom: 14 }}>
                <div style={{ lineHeight: 1.9, fontSize: 15, whiteSpace: "pre-wrap" }}>{e.diary}</div>
              </div>
              {e.memo && (
                <div style={{ background: "#fef0e6", border: `1px solid ${C.accentLight}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>💬 나의 한 마디</div>
                  <div style={{ fontSize: 14 }}>{e.memo}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", color: C.sub, marginTop: 60 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
              <div style={{ marginBottom: 16 }}>아직 일기가 없어요</div>
              <button style={S.btn()} onClick={() => openNew(selDate)}>일기 쓰기</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <span style={S.hdrTitle}>📔 감사일기</span>
        <button style={S.btn("solid", true)} onClick={() => openNew(todayStr)}>+ 오늘</button>
      </div>
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 12 }}>
          <button style={S.navBtn} onClick={() => setCal(new Date(yr - 1, mo, 1))}>«</button>
          <button style={S.navBtn} onClick={() => setCal(new Date(yr, mo - 1, 1))}>‹</button>
          <span style={{ fontSize: 17, fontWeight: "bold", minWidth: 100, textAlign: "center" }}>{yr}년 {MONTHS[mo]}</span>
          <button style={S.navBtn} onClick={() => setCal(new Date(yr, mo + 1, 1))}>›</button>
          <button style={S.navBtn} onClick={() => setCal(new Date(yr + 1, mo, 1))}>»</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
          {DAYS.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 11, color: i === 0 ? "#c0624a" : i === 6 ? "#4a7ab5" : C.sub, padding: "2px 0", fontWeight: "bold" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const e = entries[ds];
            const isToday = ds === todayStr;
            const isPast = ds <= todayStr;
            const dayColor = (i % 7 === 0) ? "#c0624a" : (i % 7 === 6) ? "#4a7ab5" : C.text;
            return (
              <div key={ds} onClick={() => isPast && openEntry(ds)}
                style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: isPast ? "pointer" : "default", border: isToday ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: e ? C.accentLight : C.card, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", opacity: !isPast ? 0.35 : 1 }}>
                {e?.photos?.[0] && <img src={e.photos[0]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />}
                <span style={{ fontSize: 11, fontWeight: isToday ? "bold" : "normal", color: isToday ? C.accent : dayColor, position: "relative", zIndex: 1, textShadow: e?.photos?.[0] ? "0 0 4px #fff" : "none" }}>{day}</span>
              </div>
            );
          })}
        </div>
        {Object.keys(entries).length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, marginTop: 36, fontSize: 14, lineHeight: 2 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
            첫 번째 감사일기를 시작해보세요<br />
            <span style={{ fontSize: 12 }}>오늘의 사진 한 장이 아름다운 일기가 됩니다</span>
          </div>
        )}
      </div>
      <button style={S.fab} onClick={() => openNew(todayStr)}>+</button>
    </div>
  );
}