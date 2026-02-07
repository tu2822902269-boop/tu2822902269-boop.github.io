(function () {
  const $ = (id) => document.getElementById(id);

  const greetingEl = $("greeting");
  const dateEl = $("date");
  const timeEl = $("time");
  const daysEl = $("daysCount");
  const messageEl = $("message");
  const btn = $("greetBtn");
  let inlineLabel = $("btnLabelInline");
  const toast = $("toast");

  const START_KEY = "cat_start_date_v1";

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function checkedKey() {
    return `cat_checked_${todayKey()}`;
  }

  function dailyMsgKey() {
    return `cat_daily_msg_${todayKey()}`;
  }

  // ✅ 让猫猫不用绝望：加 ?reset=1 可以重置“今天已点过”
  // 例：tu282...github.io/?reset=1
  if (location.search.includes("reset=1")) {
    localStorage.removeItem(checkedKey());
    localStorage.removeItem(dailyMsgKey());
  }

  function getPeriod(h) {
    if (h >= 5 && h <= 11) return { label: "早上好", emoji: "🌤️" };
    if (h >= 12 && h <= 17) return { label: "下午好", emoji: "🌞" };
    return { label: "晚上好", emoji: "🌙" };
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const w = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
    return `${y}年${m}月${dd}日  ${w}`;
  }

  function formatTime(d) {
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${hh}:${mm}:${ss}`;
  }

  function getStartDate() {
    const raw = localStorage.getItem(START_KEY);
    if (raw) {
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) return dt;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    localStorage.setItem(START_KEY, start.toISOString());
    return start;
  }

  function calcDays() {
    const s = getStartDate();
    const now = new Date();
    const s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
    const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const diff = n0.getTime() - s0.getTime();
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      o.stop(ctx.currentTime + 0.2);
      setTimeout(() => ctx.close(), 260);
    } catch (e) {}
  }

  function showToast(text, duration = 3000) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), duration);
  }

  function hasCheckedIn() {
    return localStorage.getItem(checkedKey()) === "1";
  }

  function setCheckedIn() {
    localStorage.setItem(checkedKey(), "1");
  }

  function getSavedDailyMsg() {
    const raw = localStorage.getItem(dailyMsgKey());
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setSavedDailyMsg(one) {
    localStorage.setItem(dailyMsgKey(), JSON.stringify(one));
  }

  function ensurePreMessage(pLabel) {
    // ✅ 不再用 textContent 覆盖 message 的 span（btnLabelInline），直接用 innerHTML 保持结构
    messageEl.innerHTML = `还没贴贴…来和小宝说<span id="btnLabelInline">${pLabel}</span>吧！`;
    inlineLabel = $("btnLabelInline"); // 重新拿一次
  }

  function tick() {
    const now = new Date();
    const p = getPeriod(now.getHours());

    greetingEl.textContent = `${p.label} ${p.emoji}`;
    dateEl.textContent = formatDate(now);
    timeEl.textContent = `现在是 ${formatTime(now)}`;
    btn.textContent = p.label;

    daysEl.textContent = String(calcDays());

    if (hasCheckedIn()) {
      const saved = getSavedDailyMsg();
      if (saved && saved.face && saved.text) {
        messageEl.textContent = `${saved.face} ${saved.text}`;
      } else {
        // 兜底：如果没存到，就从 messages 再抽一次并立刻存
        const pool = Array.isArray(window.messages) ? window.messages : [];
        if (pool.length) {
          const one = pick(pool);
          setSavedDailyMsg(one);
          messageEl.textContent = `${one.face} ${one.text}`;
        } else {
          messageEl.textContent = "（猫猫的留言池还没加载到…）";
        }
      }

      btn.disabled = true;
      btn.style.opacity = "0.65";
      btn.style.cursor = "default";
    } else {
      ensurePreMessage(p.label);

      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  }

  // ✅ 点击贴贴
  btn.addEventListener("click", () => {
    const now = new Date();
    const p = getPeriod(now.getHours());
    if (hasCheckedIn()) return;

    setCheckedIn();

    // 1) 三秒小气泡（从 AFTER_MESSAGES 抽一条；没有就用默认那句）
    const bubbles = Array.isArray(window.AFTER_MESSAGES) ? window.AFTER_MESSAGES : [];
    const bubble = bubbles.length ? pick(bubbles) : "今天也好喜欢猫猫💕";
    showToast(bubble, 3000);

    // 2) 主体显示：抽当日颜文字+留言，并存起来（保证“今天已贴贴”显示同一条）
    const pool = Array.isArray(window.messages) ? window.messages : [];
    if (pool.length) {
      const one = pick(pool);
      setSavedDailyMsg(one);
      messageEl.textContent = `${one.face} ${one.text}`;
    } else {
      messageEl.textContent = "（猫猫的留言池还没加载到…）";
    }

    // 3) 按钮变灰不可点
    btn.disabled = true;
    btn.style.opacity = "0.65";
    btn.style.cursor = "default";
  });

  // ✅ 索引按钮：可点，提示施工中
  document.querySelectorAll(".nav-item").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      beep();
      showToast("还在施工中～先抱抱猫猫💕", 1400);
    });
  });

  tick();
  setInterval(tick, 1000);
})();
