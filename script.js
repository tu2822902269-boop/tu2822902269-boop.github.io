(function () {
  const $ = (id) => document.getElementById(id);

  const greetingEl = $("greeting");
  const dateEl = $("date");
  const timeEl = $("time");
  const daysEl = $("daysCount");
  const messageEl = $("message");
  const btn = $("greetBtn");
  const toast = $("toast");

  // ✅ 用版本前缀，自动“跳过你之前点过的旧记录”
  const PREFIX = "catv2_";
  const KEY_START = PREFIX + "start_date";
  const KEY_CHECKED = PREFIX + "checked_";   // + todayKey()
  const KEY_DAILYMSG = PREFIX + "dailymsg_"; // + todayKey()
  const KEY_PREMSG = PREFIX + "premsg_";     // + todayKey()

  function getPeriod(h) {
    if (h >= 5 && h <= 11) return { label: "早上好", emoji: "🌤️" };
    if (h >= 12 && h <= 17) return { label: "下午好", emoji: "🌞" };
    return { label: "晚上好", emoji: "🌙" };
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const w = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][d.getDay()];
    return `${y}年${m}月${dd}日  ${w}`;
  }

  function formatTime(d) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function getStartDate() {
    const raw = localStorage.getItem(KEY_START);
    if (raw) {
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) return dt;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    localStorage.setItem(KEY_START, start.toISOString());
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

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${dd}`;
  }

  function hasCheckedIn() {
    return localStorage.getItem(KEY_CHECKED + todayKey()) === "1";
  }
  function setCheckedIn() {
    localStorage.setItem(KEY_CHECKED + todayKey(), "1");
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function showToast(text, ms = 3000) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), ms);
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

  // ✅ messages.js 暴露的是 window.messages（对象数组：{face,text}）
  function getPool() {
    const pool = window.messages;
    return Array.isArray(pool) ? pool : [];
  }

  function saveDailyMsg(one) {
    localStorage.setItem(KEY_DAILYMSG + todayKey(), JSON.stringify(one));
  }
  function loadDailyMsg() {
    const raw = localStorage.getItem(KEY_DAILYMSG + todayKey());
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  // ✅ 未点击前的引导语：要保留 span，所以用 innerHTML
  function ensurePreMessage(label) {
    // 你想要固定这一句就固定（不随机）
    messageEl.innerHTML = `还没贴贴…来和小宝说<span id="btnLabelInline">${label}</span>吧！`;
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
      // ✅ 已贴贴：永远显示今天抽到的那条
      const saved = loadDailyMsg();
      if (saved && saved.face && saved.text) {
        messageEl.textContent = `${saved.face} ${saved.text}`;
      } else {
        // ✅ 如果意外没存到，就现场抽一次再存（防闪回）
        const pool = getPool();
        if (pool.length) {
          const one = pick(pool);
          saveDailyMsg(one);
          messageEl.textContent = `${one.face} ${one.text}`;
        } else {
          messageEl.textContent = "（猫猫的留言池还没加载到…）";
        }
      }
      btn.disabled = true;
      btn.style.opacity = "0.65";
      btn.style.cursor = "default";
    } else {
      // ✅ 未贴贴：引导语
      ensurePreMessage(p.label);
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  }

  // ✅ 点击贴贴：弹三秒气泡 + 抽当日留言 + 按钮变灰
  btn.addEventListener("click", () => {
    const now = new Date();
    const p = getPeriod(now.getHours());
    if (hasCheckedIn()) return;

    setCheckedIn();

    showToast("今天也好喜欢猫猫💕", 3000);

    const pool = getPool();
    if (pool.length) {
      const one = pick(pool);
      saveDailyMsg(one);
      messageEl.textContent = `${one.face} ${one.text}`;
    } else {
      messageEl.textContent = "（猫猫的留言池还没加载到…）";
    }

    btn.disabled = true;
    btn.style.opacity = "0.65";
    btn.style.cursor = "default";
  });

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
