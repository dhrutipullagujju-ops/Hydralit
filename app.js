const STORAGE_KEY = "ripple-water-state-v1";
if (!sessionStorage.getItem("hydralit-demo-user")) window.location.replace("login.html");
const defaults = { count: 0, goal: 8, day: localDay() };
let state;
try { state = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { state = { ...defaults }; }
delete state.enabled;
delete state.interval;
const profile = (() => { try { return JSON.parse(localStorage.getItem("hydralit-profile") || "{}"); } catch { return {}; } })();
if (profile.goal) state.goal = Number(profile.goal);
state.history = state.history && typeof state.history === "object" ? state.history : {};
if (state.day !== localDay()) {
  if (state.count > 0) state.history[state.day] = state.count;
  state.count = 0; state.day = localDay();
}

const $ = (id) => document.getElementById(id);
const row = $("glass-row");
const goalInput = $("goal-input");
let toastTimer;
let calendarView = new Date();
let graphPeriod = "month";
let lastCalendarRenderKey = "";
const renderedCalendarFill = Object.create(null);

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function save() {
  state.history[state.day] = state.count;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function renderCalendar() {
  const year = calendarView.getFullYear();
  const month = calendarView.getMonth();
  const renderKey = `${year}-${month}`;
  const animateCalendar = renderKey !== lastCalendarRenderKey;
  lastCalendarRenderKey = renderKey;
  const today = localDay();
  $("calendar-month").textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(calendarView);
  const daysHost = $("calendar-days");
  daysHost.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement("span"); spacer.className = "calendar-empty"; spacer.setAttribute("aria-hidden", "true"); daysHost.append(spacer);
  }
  let goalDays = 0;
  let loggedDays = 0;
  const goal = Math.max(1, Number(state.goal) || 8);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const amount = Number(dateKey === state.day ? state.count : state.history[dateKey]) || 0;
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (animateCalendar) {
      cell.classList.add("calendar-enter");
      cell.style.setProperty("--calendar-delay", `${Math.min(day - 1, 24) * 16}ms`);
    }
    if (amount >= goal) { cell.classList.add("goal-met"); goalDays++; }
    else if (amount > 0) { cell.classList.add("goal-started"); loggedDays++; }
    const fillPercent = Math.max(0, Math.min(100, amount / goal * 100));
    if (!animateCalendar && renderedCalendarFill[dateKey] !== undefined && renderedCalendarFill[dateKey] !== fillPercent) {
      cell.classList.add("water-changed");
      cell.style.setProperty("--water-from", `${renderedCalendarFill[dateKey]}%`);
    }
    if (dateKey === today) cell.classList.add("is-today");
    if (dateKey > today) cell.classList.add("is-future");
    const labelDate = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(year, month, day));
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${labelDate}: ${amount} ${amount === 1 ? "glass" : "glasses"}${amount >= goal ? ", daily goal reached" : ""}`);
    cell.innerHTML = `<span class="calendar-water-level" style="--water-fill:${fillPercent}%"></span><span class="calendar-day-number">${day}</span>${amount > 0 ? `<span class="calendar-day-count">${amount} glass${amount === 1 ? "" : "es"}</span>` : ""}`;
    if (animateCalendar && fillPercent > 0) cell.querySelector(".calendar-water-level").classList.add("water-entry");
    renderedCalendarFill[dateKey] = fillPercent;
    daysHost.append(cell);
  }
  $("calendar-summary").textContent = `${goalDays} goal ${goalDays === 1 ? "day" : "days"} · ${loggedDays} other ${loggedDays === 1 ? "day" : "days"} logged`;
  renderProgressChart();
}
function countForDate(date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return Number(key === state.day ? state.count : state.history[key]) || 0;
}
function renderProgressChart() {
  const dailyGoal = Math.max(1, Number(state.goal) || 8);
  let values = [], labels = [], goal = dailyGoal, goalLabel = "Daily goal", periodLabel = "";
  if (graphPeriod === "week") {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      values.push(countForDate(date));
      labels.push(new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date));
    }
    periodLabel = "This week";
  } else if (graphPeriod === "year") {
    const year = calendarView.getFullYear();
    for (let month = 0; month < 12; month++) {
      const days = new Date(year, month + 1, 0).getDate();
      const currentDate = new Date();
      const observedDays = year > currentDate.getFullYear() || (year === currentDate.getFullYear() && month > currentDate.getMonth()) ? 0 : year === currentDate.getFullYear() && month === currentDate.getMonth() ? currentDate.getDate() : days;
      let total = 0;
      for (let day = 1; day <= observedDays; day++) total += countForDate(new Date(year, month, day));
      values.push(observedDays ? total / observedDays : 0);
      labels.push(new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(year, month, 1)));
    }
    goal = dailyGoal;
    goalLabel = "Daily goal";
    periodLabel = String(year);
  } else {
    const year = calendarView.getFullYear(), month = calendarView.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      values.push(countForDate(new Date(year, month, day)));
      labels.push(String(day));
    }
    periodLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(calendarView);
  }
  $("graph-goal-label").textContent = goalLabel;
  $("progress-chart").setAttribute("aria-label", `${graphPeriod} hydration progress for ${periodLabel}, compared with ${goalLabel.toLowerCase()}`);
  const maxValue = Math.max(goal, ...values, 4);
  const scale = Math.max(4, Math.ceil(maxValue / 2) * 2);
  const width = 700, height = 320, left = 38, right = 14, top = 24, bottom = 278;
  const plotWidth = width - left - right, plotHeight = bottom - top, slot = plotWidth / values.length;
  const y = (value) => bottom - value / scale * plotHeight;
  const gridValues = [0, scale / 3, scale * 2 / 3, scale];
  const grid = gridValues.map((value) => `<line class="chart-grid-line" x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text class="chart-axis-label" x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${Math.round(value)}</text>`).join("");
  const goalLine = `<line class="chart-goal-line" x1="${left}" y1="${y(goal)}" x2="${width - right}" y2="${y(goal)}"/>`;
  const bars = values.map((value, index) => {
    const barHeight = value ? Math.max(2, value / scale * plotHeight) : 0;
    const barWidth = Math.min(13, slot * .58);
    const x = left + index * slot + (slot - barWidth) / 2;
    const cls = value >= goal ? "chart-bar chart-bar-goal" : value > 0 ? "chart-bar chart-bar-log" : "chart-bar chart-bar-empty";
    const title = graphPeriod === "year" ? `${labels[index]}: ${value.toFixed(1)} average glasses per day` : `${labels[index]}: ${value} ${value === 1 ? "glass" : "glasses"}`;
    return `<rect class="${cls}" x="${x}" y="${bottom - barHeight}" width="${barWidth}" height="${barHeight}" rx="3"><title>${title}</title></rect>`;
  }).join("");
  const axisLabels = labels.map((label, index) => {
    const show = graphPeriod !== "month" || index === 0 || (index + 1) % 5 === 0 || index === labels.length - 1;
    return show ? `<text class="chart-axis-label" x="${left + index * slot + slot / 2}" y="${bottom + 20}" text-anchor="middle">${label}</text>` : "";
  }).join("");
  $("progress-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${grid}${goalLine}${bars}<line class="chart-axis-line" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"/><line class="chart-axis-line" x1="${left}" y1="${bottom}" x2="${width - right}" y2="${bottom}"/>${axisLabels}</svg>`;
}
function render() {
  const goal = Math.max(1, Number(state.goal) || 8);
  const count = Math.max(0, Number(state.count) || 0);
  $("drank").textContent = count;
  $("goal-display").textContent = goal;
  $("percent").textContent = `${Math.min(100, Math.round(count / goal * 100))}%`;
  $("progress-fill").style.width = `${Math.min(100, count / goal * 100)}%`;
  const progress = document.querySelector(".progress-track");
  progress.setAttribute("aria-valuemax", goal);
  progress.setAttribute("aria-valuenow", Math.min(count, goal));
  $("progress-caption").textContent = count >= goal ? "You reached your goal today. Lovely work!" : count === 0 ? "Every glass is a good start." : `${goal - count} more ${goal - count === 1 ? "glass" : "glasses"} to reach your goal.`;
  row.innerHTML = "";
  const visualSlots = Math.min(goal, 12);
  for (let i = 0; i < visualSlots; i++) {
    const glass = document.createElement("span");
    const slotComplete = count / goal >= (i + 1) / visualSlots;
    glass.className = `glass${slotComplete ? " filled" : ""}`;
    glass.setAttribute("aria-label", `Progress segment ${i + 1}${slotComplete ? ", completed" : ""}`);
    glass.innerHTML = "<svg viewBox='0 0 40 48' fill='none' aria-hidden='true'><path d='M14 9V3h3v7' stroke='#c5a9b4' stroke-width='1.5' stroke-linecap='round'/><path d='M27 14h2a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5h-5' stroke='#c5a9b4' stroke-width='2.2' stroke-linecap='round'/><rect x='9' y='9' width='19' height='7' rx='2.5' fill='#e0f5ef' stroke='#9bc9c2' stroke-width='1.4'/><path d='M10 16h17l-1.5 25q-.2 2-2.5 2h-9q-2.2 0-2.4-2L10 16Z' fill='#fff2f5' stroke='#c5a9b4' stroke-width='1.5' stroke-linejoin='round'/><path class='mini-water' d='M11.3 29h14l-.7 11q-.2 1.4-1.8 1.4h-9q-1.6 0-1.7-1.5L11.3 29Z' fill='#c8e7ec'/><path d='M14 24v5m0-4c-2-2.5-3-1-1 0m1 1c2-2 3-1 1 1' stroke='#87a983' stroke-width='1' stroke-linecap='round'/><circle cx='14' cy='22.5' r='1.6' fill='#f2a8b5'/><circle cx='12.5' cy='24' r='1.3' fill='#f2a8b5'/><circle cx='15.5' cy='24' r='1.3' fill='#f2a8b5'/><circle cx='14' cy='24.5' r='.7' fill='#f4d27d'/><path d='M21 33v4m0-3c-1.5-2-2.5-1-1 0m1 1c1.5-2 2.5-1 1 0' stroke='#87a983' stroke-width='1' stroke-linecap='round'/><circle cx='21' cy='31.5' r='1.4' fill='#f2a8b5'/><circle cx='19.7' cy='33' r='1.2' fill='#f2a8b5'/><circle cx='22.3' cy='33' r='1.2' fill='#f2a8b5'/><circle cx='21' cy='33.3' r='.6' fill='#f4d27d'/></svg>";
    row.append(glass);
  }
  $("undo-glass").disabled = count === 0;
  goalInput.value = String(goal);
  renderCalendar();
  save();
}
function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

$("date-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
if (profile.name) {
  $("user-name").textContent = profile.name;
  $("welcome-copy").textContent = `You’ve got this, ${profile.name}. Every sip is a little win.`;
}
$("sign-out").addEventListener("click", () => { sessionStorage.removeItem("hydralit-demo-user"); window.location.href = "login.html"; });
$("calendar-prev").addEventListener("click", () => { calendarView = new Date(calendarView.getFullYear(), calendarView.getMonth() - 1, 1); renderCalendar(); });
$("calendar-next").addEventListener("click", () => { calendarView = new Date(calendarView.getFullYear(), calendarView.getMonth() + 1, 1); renderCalendar(); });
document.querySelectorAll("[data-graph-period]").forEach((button) => button.addEventListener("click", () => {
  graphPeriod = button.dataset.graphPeriod;
  document.querySelectorAll("[data-graph-period]").forEach((item) => {
    const active = item.dataset.graphPeriod === graphPeriod;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderProgressChart();
}));
const checkDialog = $("water-check-dialog");
const cameraPreview = $("camera-preview");
const recognitionCanvas = $("recognition-overlay");
const recognitionContext = recognitionCanvas.getContext("2d");
const cameraStatus = $("camera-status");
const confirmSipCheck = $("confirm-sip-check");
const logWithoutCamera = $("log-without-camera");
let cameraStream = null;
let sipModel = null;
let detectionTimer = null;
let detectionRunning = false;
let nearMouthSince = 0;

function stopSipRecognition() {
  clearTimeout(detectionTimer); detectionTimer = null;
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraPreview.pause(); cameraPreview.srcObject = null;
  recognitionContext.clearRect(0, 0, recognitionCanvas.width, recognitionCanvas.height);
  nearMouthSince = 0; detectionRunning = false; confirmSipCheck.disabled = true;
}

async function requestSipCamera() {
  confirmSipCheck.disabled = true; logWithoutCamera.hidden = true;
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext || !window.cocoSsd || !window.tf) {
    cameraStatus.textContent = "Live recognition needs camera access, an internet connection, and a supported browser. You can log manually.";
    logWithoutCamera.hidden = false; return;
  }
  cameraStatus.textContent = "Requesting camera access…";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    if (!checkDialog.open) { stream.getTracks().forEach((track) => track.stop()); return; }
    cameraStream = stream; cameraPreview.srcObject = stream; await cameraPreview.play();
    cameraStatus.textContent = "Loading on-device object recognition…";
    if (!sipModel) {
      await tf.ready();
      sipModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    }
    if (!checkDialog.open) return;
    recognitionCanvas.width = cameraPreview.videoWidth; recognitionCanvas.height = cameraPreview.videoHeight;
    cameraStatus.textContent = "Show your face and water bottle or cup to the camera.";
    runSipDetection();
  } catch {
    stopSipRecognition();
    cameraStatus.textContent = "Couldn’t start camera recognition. You can still log the glass manually.";
    logWithoutCamera.hidden = false;
  }
}

function openSipCheck() {
  stopSipRecognition();
  checkDialog.showModal();
  requestSipCamera();
}

function isInFaceZone(person, vessel) {
  const [px, py, pw, ph] = person.bbox;
  const [vx, vy, vw, vh] = vessel.bbox;
  const cx = vx + vw / 2, cy = vy + vh / 2;
  return cx >= px + pw * .12 && cx <= px + pw * .88 && cy >= py + ph * .08 && cy <= py + ph * .42;
}

function drawDetections(predictions) {
  const width = cameraPreview.videoWidth, height = cameraPreview.videoHeight;
  if (!width || !height) return;
  if (recognitionCanvas.width !== width || recognitionCanvas.height !== height) {
    recognitionCanvas.width = width; recognitionCanvas.height = height;
  }
  recognitionContext.clearRect(0, 0, width, height);
  predictions.filter((item) => ["person", "cup", "bottle"].includes(item.class)).forEach((item) => {
    const [x, y, boxWidth, boxHeight] = item.bbox;
    const person = item.class === "person";
    recognitionContext.strokeStyle = person ? "#84C98E" : "#8AD9E8";
    recognitionContext.lineWidth = Math.max(2, width / 280);
    recognitionContext.strokeRect(x, y, boxWidth, boxHeight);
    const label = `${item.class} ${Math.round(item.score * 100)}%`;
    recognitionContext.font = `bold ${Math.max(12, width / 42)}px Courier New`;
    const labelWidth = recognitionContext.measureText(label).width + 12;
    const labelTop = Math.max(0, y - 23);
    recognitionContext.fillStyle = person ? "#277347" : "#247B96";
    recognitionContext.fillRect(x, labelTop, labelWidth, 22);
    recognitionContext.fillStyle = "#FFFFFF";
    recognitionContext.fillText(label, x + 6, labelTop + 16);
  });
}

async function runSipDetection() {
  if (!checkDialog.open || !cameraStream || !sipModel) return;
  if (!detectionRunning && cameraPreview.readyState >= 2) {
    detectionRunning = true;
    try {
      const predictions = await sipModel.detect(cameraPreview, 12, .35);
      drawDetections(predictions);
      const person = predictions.filter((item) => item.class === "person" && item.score >= .4).sort((a, b) => b.score - a.score)[0];
      const vessel = predictions.filter((item) => ["cup", "bottle"].includes(item.class) && item.score >= .35).sort((a, b) => b.score - a.score)[0];
      if (!person) {
        nearMouthSince = 0; confirmSipCheck.disabled = true;
        cameraStatus.textContent = "Move into the camera frame.";
      } else if (!vessel) {
        nearMouthSince = 0; confirmSipCheck.disabled = true;
        cameraStatus.textContent = "Person found. Show your water bottle or cup.";
      } else if (!isInFaceZone(person, vessel)) {
        nearMouthSince = 0; confirmSipCheck.disabled = true;
        cameraStatus.textContent = `${vessel.class === "bottle" ? "Bottle" : "Cup"} found. Bring it near your face.`;
      } else {
        nearMouthSince ||= Date.now();
        const holdFor = Date.now() - nearMouthSince;
        const remaining = Math.max(0, 1200 - holdFor);
        if (remaining === 0) {
          confirmSipCheck.disabled = false;
          cameraStatus.textContent = "Possible sip recognized. Tap Log this glass to confirm.";
        } else {
          confirmSipCheck.disabled = true;
          cameraStatus.textContent = `Cup near face — hold for ${Math.ceil(remaining / 100) / 10}s…`;
        }
      }
    } catch {
      cameraStatus.textContent = "Recognition paused. Try adjusting the camera or log manually.";
      logWithoutCamera.hidden = false;
    } finally {
      detectionRunning = false;
    }
  }
  if (checkDialog.open && cameraStream) detectionTimer = setTimeout(runSipDetection, 300);
}

function logGlass() {
  state.count += 1; state.day = localDay(); save(); render();
  const button = $("add-glass");
  const cupStage = document.querySelector(".cup-stage");
  button.classList.remove("sip-pop"); cupStage.classList.remove("sip-burst");
  void button.offsetWidth;
  button.classList.add("sip-pop"); cupStage.classList.add("sip-burst");
  setTimeout(() => { button.classList.remove("sip-pop"); cupStage.classList.remove("sip-burst"); }, 1100);
  showToast(state.count >= state.goal ? "Daily goal reached — wonderful work! ✨" : "Glass logged. Nice little reset 💧");
}
$("add-glass").addEventListener("click", openSipCheck);
$("close-water-check").addEventListener("click", () => checkDialog.close());
checkDialog.addEventListener("close", stopSipRecognition);
confirmSipCheck.addEventListener("click", () => { checkDialog.close(); logGlass(); });
logWithoutCamera.addEventListener("click", () => { checkDialog.close(); logGlass(); });
$("undo-glass").addEventListener("click", () => { if (state.count > 0) { state.count -= 1; save(); render(); showToast("Last glass removed."); } });
goalInput.addEventListener("change", () => {
  const goal = Number(goalInput.value);
  if (!Number.isSafeInteger(goal) || goal < 1) { goalInput.value = String(state.goal); return; }
  state.goal = goal;
  profile.goal = goal;
  localStorage.setItem("hydralit-profile", JSON.stringify(profile));
  save(); render(); showToast("Daily goal updated.");
});
render();
