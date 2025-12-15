// ================================
// Admin App (Frontend)
// ================================

// ⚠️ 본인의 Worker URL로 교체하세요
const WORKER_URL = "https://lotto-api.loto09090909.workers.dev";

// ENTER KEY SUPPORT
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("admin-code");
  if (input) {
    input.addEventListener("keyup", (e) => {
      if (e.key === "Enter") adminLogin();
    });
  }
});
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
async function adminLogin() {
  const code = document.getElementById("admin-code").value;

  const res = await fetch(`${WORKER_URL}/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  }).then(r => r.json()).catch(() => ({ ok:false }));

  if (!res.ok) return alert("관리자 코드가 올바르지 않습니다.");

  hide("admin-auth");
  show("admin-view");
  loadAlgorithms();
}

async function loadAlgorithms() {
  const list = await fetch(`${WORKER_URL}/algorithms`).then(r => r.json());
  document.getElementById("algo-json").value = JSON.stringify(list, null, 2);
}

async function testAlgo() {
  let json;
  try {
    json = JSON.parse(document.getElementById("algo-json").value);
  } catch {
    return alert("JSON 형식 오류입니다.");
  }

  // seed 예시 — 관리자 테스트용 (고정값)
  const seed = {
    solar: { y: 2025, m: 11, d: 23 },
    lunar: { y: 2025, m: 10, d: 3 }
  };

  const output = [];

  for (const algo of json) {
    try {
      const fn = new Function("seed", "normalize", algo.code);
      const res = fn(seed, normalize);
      output.push({ name: algo.name, numbers: res });
    } catch (err) {
      output.push({ name: algo.name, error: err.toString() });
    }
  }

  document.getElementById("test-result").textContent =
    JSON.stringify(output, null, 2);
}

async function applyAlgo() {
  let json;
  try {
    json = JSON.parse(document.getElementById("algo-json").value);
  } catch {
    return alert("JSON 형식 오류입니다.");
  }

  const res = await fetch(`${WORKER_URL}/algorithms/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
  }).then(r => r.json());

  alert(res.message || "적용 완료");
}

async function updateUserCode() {
  const newCode = document.getElementById("new-user-code").value.trim();

  if (!newCode) {
    return alert("새로운 사용자 코드를 입력하세요.");
  }

  const res = await fetch(`${WORKER_URL}/security/update-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newCode })
  }).then(r => r.json());

  if (res.error) {
    alert("오류: " + res.error);
  } else {
    alert("사용자 코드가 성공적으로 변경되었습니다.");
  }
}
