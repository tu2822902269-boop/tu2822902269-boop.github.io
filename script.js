(function(){
  const $ = (id)=>document.getElementById(id);

  const greetingEl = $("greeting");
  const dateEl = $("date");
  const timeEl = $("time");
  const daysEl = $("daysCount");
  const messageEl = $("message");
  const btn = $("greetBtn");
  const inlineLabel = $("btnLabelInline");
  const toast = $("toast");

  function getPeriod(h){
    if (h >= 5 && h <= 11) return {label:"早上好", emoji:"🌤️"};
    if (h >= 12 && h <= 17) return {label:"下午好", emoji:"🌞"};
    return {label:"晚上好", emoji:"🌙"};
  }
  function formatDate(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const dd=String(d.getDate()).padStart(2,"0");
    const w=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][d.getDay()];
    return `${y}年${m}月${dd}日  ${w}`;
  }
  function formatTime(d){
    const hh=String(d.getHours()).padStart(2,"0");
    const mm=String(d.getMinutes()).padStart(2,"0");
    const ss=String(d.getSeconds()).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }

  const START_KEY="cat_start_date_v1";
  function getStartDate(){
    const raw = localStorage.getItem(START_KEY);
    if (raw){
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) return dt;
    }
    const now=new Date();
    const start=new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    localStorage.setItem(START_KEY, start.toISOString());
    return start;
  }
  function calcDays(){
    const s=getStartDate();
    const now=new Date();
    const s0=new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0,0,0,0);
    const n0=new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const diff=n0.getTime()-s0.getTime();
    return Math.max(1, Math.floor(diff/86400000)+1);
  }

  function todayKey(){
    const d=new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }
  function pick(list){ return list[Math.floor(Math.random()*list.length)]; }
  function tpl(s, greet){ return (s||"").split("{greet}").join(greet); }

  function getPreMessage(greet){
    const key="cat_pre_msg_"+todayKey();
    let msg=localStorage.getItem(key);
    if(!msg){
      msg=pick(window.MESSAGES||[]);
      localStorage.setItem(key,msg);
    }
    return tpl(msg,greet);
  }
  function getAfterMessage(greet){
    const key="cat_after_msg_"+todayKey();
    let msg=localStorage.getItem(key);
    if(!msg){
      msg=pick(window.AFTER_MESSAGES||["今天也好喜欢猫猫💕"]);
      localStorage.setItem(key,msg);
    }
    return tpl(msg,greet);
  }
  function hasCheckedIn(){ return localStorage.getItem("cat_checked_"+todayKey())==="1"; }
  function setCheckedIn(){ localStorage.setItem("cat_checked_"+todayKey(),"1"); }

  function beep(){
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      const ctx=new AudioCtx();
      const o=ctx.createOscillator();
      const g=ctx.createGain();
      o.type="sine"; o.frequency.value=880;
      g.gain.value=0.001;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.18);
      o.stop(ctx.currentTime+0.2);
      setTimeout(()=>ctx.close(),260);
    }catch(e){}
  }
  function showToast(text){
    toast.textContent=text;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t=setTimeout(()=>toast.classList.remove("show"),1400);
  }

  function tick(){
    const now=new Date();
    const p=getPeriod(now.getHours());
    greetingEl.textContent=`${p.label} ${p.emoji}`;
    dateEl.textContent=formatDate(now);
    timeEl.textContent=`现在是 ${formatTime(now)}`;
    btn.textContent=p.label;
    inlineLabel.textContent=p.label;

    if(hasCheckedIn()){
      messageEl.textContent=getAfterMessage(p.label);
      btn.disabled=true;
      btn.style.opacity="0.65";
      btn.style.cursor="default";
    }else{
      messageEl.textContent=getPreMessage(p.label);
      btn.disabled=false;
      btn.style.opacity="1";
      btn.style.cursor="pointer";
    }
    daysEl.textContent=String(calcDays());
  }

  btn.addEventListener("click", ()=>{
    const now=new Date();
    const p=getPeriod(now.getHours());
    if(hasCheckedIn()) return;
    setCheckedIn();
    beep();
    messageEl.textContent=getAfterMessage(p.label);
    showToast("今天也好喜欢猫猫💕");
    btn.disabled=true;
    btn.style.opacity="0.65";
    btn.style.cursor="default";
  });

  document.querySelectorAll(".nav-item").forEach(a=>{
    a.addEventListener("click",(e)=>{
      e.preventDefault();
      beep();
      showToast("还在施工中～先抱抱猫猫💕");
    });
  });

  tick();
  setInterval(tick, 1000);
})();
