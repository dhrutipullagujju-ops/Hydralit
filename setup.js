if (!sessionStorage.getItem("hydralit-demo-user")) window.location.replace("login.html");

const nameForm = document.getElementById("name-form");
const goalForm = document.getElementById("goal-form");
const stepLabel = document.getElementById("step-label");
const profileKey = "hydralit-profile";
let profile = {};
try { profile = JSON.parse(localStorage.getItem(profileKey) || "{}"); } catch { profile = {}; }
document.getElementById("display-name").value = profile.name || "";
document.getElementById("daily-goal").value = profile.goal || 8;

function showGoalStep() {
  const name = document.getElementById("display-name").value.trim();
  if (!name) return;
  profile.name = name;
  nameForm.hidden = true;
  goalForm.hidden = false;
  stepLabel.textContent = "YOUR DAILY RHYTHM · STEP 2 OF 2";
  document.getElementById("step-one-progress").classList.add("done");
  document.getElementById("step-two-progress").classList.add("current");
  document.getElementById("daily-goal").focus();
}

nameForm.addEventListener("submit", (event) => { event.preventDefault(); if (nameForm.reportValidity()) showGoalStep(); });
document.getElementById("back-button").addEventListener("click", () => {
  goalForm.hidden = true; nameForm.hidden = false;
  stepLabel.textContent = "JOIN THE HYDRATION CLUB · STEP 1 OF 2";
  document.getElementById("step-one-progress").classList.remove("done");
  document.getElementById("step-two-progress").classList.remove("current");
  document.getElementById("display-name").focus();
});
goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!goalForm.reportValidity()) return;
  const goal = Number(document.getElementById("daily-goal").value);
  if (!Number.isSafeInteger(goal) || goal < 1) return;
  profile.goal = goal;
  localStorage.setItem(profileKey, JSON.stringify(profile));
  try {
    const state = JSON.parse(localStorage.getItem("ripple-water-state-v1") || "{}");
    state.goal = goal;
    localStorage.setItem("ripple-water-state-v1", JSON.stringify(state));
  } catch { localStorage.setItem("ripple-water-state-v1", JSON.stringify({ goal })); }
  window.location.href = "index.html";
});
document.getElementById("setup-sign-out").addEventListener("click", () => {
  sessionStorage.removeItem("hydralit-demo-user");
  window.location.href = "login.html";
});
