const WORKER_URL = "https://lotto-api.loto09090909.workers.dev";

function normalize(nums) {
  const used = new Set();
  const fixed = [];

  for (let n of nums) {
    if (n < 1) n = 1;
    if (n > 45) n = 45;

    let val = n;
    let tries = 0;

    while (used.has(val) && tries < 50) {
      if (val >= 45) val--;
      else if (val <= 1) val++;
      else val = (tries % 2 === 0) ? val + 1 : val - 1;

      tries++;
    }

    while (used.has(val)) val = (val % 45) + 1;

    used.add(val);
    fixed.push(val);
  }

  return fixed.sort((a, b) => a - b);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("auth-input");
  if (input) {
    input.addEventListener("keyup", (e) => {
      if (e.key === "Enter") userLogin();
    });
  }

  if (sessionStorage.getItem("user-auth") === "yes") showMain();
});


async function userLogin() {
  const code = document.getElementById("auth-input").value;

  const res = await fetch(`${WORKER_URL}/auth/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  }).then(r => r.json()).catch(() => ({ ok: false }));

  if (!res.ok) return alert("보안코드가 올바르지 않습니다.");

  sessionStorage.setItem("user-auth", "yes");
  showMain();
}

function showMain() {
  hide("auth-view");
  loadSaturdays();
  show("main-view");
}


function loadSaturdays() {
  const s = document.getElementById("date-select");
  s.innerHTML = "";

  const today = new Date();
  for (let i = 0; i <= 31; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);

    if (d.getDay() === 6) {
      const opt = document.createElement("option");
      opt.value = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      opt.textContent = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (토)`;
      s.appendChild(opt);
    }
  }
}

let countdownTimer = null;
let messageTimer = null;
let remainingSeconds = 0;

function beginGenerate() {
  hide("main-view");
  show("loading-view");

  const loadingText = document.getElementById("loading-text");
  const loadingCount = document.getElementById("loading-count");

  loadingCount.style.display = "none";
  loadingCount.innerText = "";

  loadingText.innerText = "분석을 시작합니다...";

  setTimeout(() => {
    loadingText.innerText = "분석 모델 초기화 중...";
  }, 700);

  setTimeout(() => {
    loadingText.innerText = "환경 설정 로딩 중...";
  }, 1400);

  setTimeout(() => {
    remainingSeconds = Math.floor(Math.random() * (5 - 1 + 1)) + 1;

    loadingText.innerText = `분석 예상 시간: ${remainingSeconds}초`;


    loadingCount.style.display = "block";
    loadingCount.innerText = `남은 시간: ${remainingSeconds} 초`;

    startActualLoading();

  }, 2000);
}

const LOADING_MESSAGES = [
  "음력 기반 핵심 시드 생성 중…",
  "양력 → 음력 달력 정보 정밀 변환…",
  "알고리즘 10개 병렬 로딩…",
  "패턴 매칭 엔진 초기화…",
  "과거 데이터 기반 확률 보정…",
  "시드 기반 번호 군집화 계산…",
  "번호 간 상관관계 분석 중…",
  "기초 조합 생성…",
  "중복 여부 및 규칙성 점검…",
  "최종 검증 중…",
  "거의 완료되었습니다…"
];

function startActualLoading() {
  const totalMessages = LOADING_MESSAGES.length;
  let messageIndex = 0;

  const intervalPerMessage = remainingSeconds / totalMessages;

  messageTimer = setInterval(() => {
    const el = document.getElementById("loading-text");
    el.style.opacity = 0;

    setTimeout(() => {
      el.innerText = LOADING_MESSAGES[messageIndex];
      el.style.opacity = 1;
    }, 150);

    messageIndex = Math.min(messageIndex + 1, totalMessages - 1);
  }, intervalPerMessage * 1000);

  countdownTimer = setInterval(() => {
    remainingSeconds--;

    const counterEl = document.getElementById("loading-count");

    counterEl.textContent = `남은 시간: ${remainingSeconds} 초`;

    if (remainingSeconds <= 10) {
      counterEl.style.color = "#d63f3f";
    }

    if (remainingSeconds <= 0) {
      clearInterval(countdownTimer);
      clearInterval(messageTimer);
      generateNumbers();
    }
  }, 1000);
}


async function generateNumbers() {
  const date = document.getElementById("date-select").value;
  const [y, m, d] = date.split("-").map(Number);

  const lunar = await fetch(`${WORKER_URL}/lunar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year: y, month: m, day: d })
  }).then(r => r.json());

  const solarMonth = m;
  const solarDay = d;

  const lunarMonth = lunar.lunar.m;
  const lunarDay = lunar.lunar.d;

  document.getElementById("date-info").innerHTML = `
    선택 날짜: ${solarMonth}월 ${solarDay}일 (음 ${lunarMonth}월 ${lunarDay}일)<br>
    기준 값: ${solarMonth}, ${solarDay}, ${lunarMonth}, ${lunarDay}
  `;

  const seed = {
    solar: { y, m: solarMonth, d: solarDay },
    lunar: { y, m: lunarMonth, d: lunarDay }
  };

  const algolist = await fetch(`${WORKER_URL}/algorithms`)
    .then(r => r.json());

  const box = document.getElementById("result-box");
  box.innerHTML = "";

  function makeBall(num) {
    let cls = "ball-yellow";
    if (num >= 10 && num < 20) cls = "ball-blue";
    else if (num >= 20 && num < 30) cls = "ball-red";
    else if (num >= 30 && num < 40) cls = "ball-gray";
    else if (num >= 40) cls = "ball-green";

    return `<span class="lotto-ball ${cls}">${num}</span>`;
  }

  algolist.forEach(algo => {
    try {
      const fn = new Function("seed", "normalize", algo.code);
      const nums = fn(seed, normalize);
      
      const mainNums = normalize(nums.slice(0, 6));
      let bonusNum = nums[6];
      
      const mainSet = new Set(mainNums);
      while (mainSet.has(bonusNum)) {
        bonusNum = (bonusNum % 45) + 1;
      }
      
      const div = document.createElement("div");
      div.innerHTML = `
        <b>${algo.name}</b><br>
        ${mainNums.map(n => makeBall(n)).join("")}
        <span class="plus-sign"> + </span>
        ${makeBall(bonusNum)}
      `;
      box.appendChild(div);

    } catch (err) {
      const div = document.createElement("div");
      div.innerHTML = `<b>${algo.name}</b><br>ERROR: ${err}`;
      box.appendChild(div);
    }
  });

  hide("loading-view");
  show("result-view");
}

function goHome() {
  hide("result-view");
  show("main-view");
}
