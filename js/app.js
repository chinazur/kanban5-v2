"use strict";

/* =========================================================
   CONFIG — change the email address here (one place only)
   ========================================================= */
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/YOUR_EMAIL@example.com";
const FORMSUBMIT_TIMEOUT_MS = 15000;

/* =========================================================
   Reference data
   ========================================================= */
const STATUSES = [
  { key: "Backlog",     desc: "Logged, not yet scheduled" },
  { key: "In Progress", desc: "Actively being worked" },
  { key: "Blocked",     desc: "Waiting on a dependency, vendor or approval" },
  { key: "Done",        desc: "Completed / closed" },
];
const STATUS_KEYS = STATUSES.map(s => s.key);
const PROJECTS = [
  "Core Banking Upgrade",
  "Digital Channels",
  "Cybersecurity Uplift",
  "Data & Analytics",
  "Infrastructure & Cloud",
  "Vendor Management",
];
const CATEGORIES = [
  "Application Development",
  "Infrastructure",
  "Cybersecurity",
  "Data",
  "Compliance",
  "Vendor",
];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

/* =========================================================
   Small helpers
   ========================================================= */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatId(n) {
  return "UOB-ITPM-" + String(n).padStart(4, "0");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Local calendar date as YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function toISODate(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

function todayISO() {
  return toISODate(new Date());
}

function daysFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISODate(d);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(task) {
  return task.status !== "Done" && task.dueDate < todayISO();
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const ICONS = {
  project:  '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.2l1.5 1.5H13A1.5 1.5 0 0 1 14.5 4.5v8A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5V3z"/></svg>',
  assignee: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="5" r="3" fill="currentColor"/><path fill="currentColor" d="M2 14.5c0-3.3 2.7-5 6-5s6 1.7 6 5z"/></svg>',
  due:      '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 1h1.5v1.5h5V1H12v1.5h1A1.5 1.5 0 0 1 14.5 4v9A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V4A1.5 1.5 0 0 1 3 2.5h1zM3 6v7h10V6z"/></svg>',
};

/* =========================================================
   State — the single source of truth (memory only)
   ========================================================= */
const state = {
  tasks: [],
  filters: { project: "", assignee: "", priority: "" },
  ui: { confirmDeleteId: null, moveOpenId: null },
  nextId: 1,
};

/* =========================================================
   Seed data: 8 demo tasks across all four columns
   ========================================================= */
function seedTasks() {
  const seeds = [
    { title: "Migrate FX pricing service to AWS", description: "Lift-and-shift the FX rate pricing microservice to the landing zone; cut over after parallel run.", project: "Infrastructure & Cloud", category: "Infrastructure", assignee: "Priya Raman", priority: "High", dueDate: daysFromToday(21), status: "Backlog" },
    { title: "Define data retention rules for customer analytics lake", description: "Align retention periods with regulatory guidance and record approvals.", project: "Data & Analytics", category: "Compliance", assignee: "Marcus Lee", priority: "Medium", dueDate: daysFromToday(35), status: "Backlog" },
    { title: "Patch CVE-2025-XXXX on branch teller VDI", description: "Apply vendor hotfix to all teller VDI images; validate peripheral drivers before rollout.", project: "Cybersecurity Uplift", category: "Cybersecurity", assignee: "Ahmad Faiz", priority: "Critical", dueDate: daysFromToday(-2), status: "In Progress" },
    { title: "Build real-time payments status API", description: "Expose payment lifecycle events to the mobile app via the API gateway.", project: "Digital Channels", category: "Application Development", assignee: "Grace Tan", priority: "High", dueDate: daysFromToday(10), status: "In Progress" },
    { title: "UAT sign-off for mobile onboarding release 4.2", description: "Awaiting business sign-off; two defects open on eKYC document capture.", project: "Digital Channels", category: "Application Development", assignee: "Grace Tan", priority: "High", dueDate: daysFromToday(-1), status: "Blocked" },
    { title: "Renew core banking vendor support contract", description: "Pending procurement approval on revised SLA terms.", project: "Vendor Management", category: "Vendor", assignee: "Daniel Wong", priority: "Medium", dueDate: daysFromToday(14), status: "Blocked" },
    { title: "Decommission legacy GL batch scheduler", description: "All jobs migrated to the new orchestrator; servers wiped and returned.", project: "Core Banking Upgrade", category: "Infrastructure", assignee: "Siti Nurhaliza", priority: "Low", dueDate: daysFromToday(-7), status: "Done" },
    { title: "Quarterly privileged access review", description: "Reviewed admin accounts across core banking and payments platforms.", project: "Cybersecurity Uplift", category: "Compliance", assignee: "Ahmad Faiz", priority: "Medium", dueDate: daysFromToday(-4), status: "Done" },
  ];
  state.tasks = seeds.map(s => ({ ...s, id: formatId(state.nextId++) }));
}

/* =========================================================
   Filtering
   ========================================================= */
function applyFilters(tasks) {
  const { project, assignee, priority } = state.filters;
  const needle = assignee.trim().toLowerCase();
  return tasks.filter(t =>
    (!project || t.project === project) &&
    (!priority || t.priority === priority) &&
    (!needle || t.assignee.toLowerCase().includes(needle))
  );
}

function hasActiveFilters() {
  const f = state.filters;
  return Boolean(f.project || f.priority || f.assignee.trim());
}

/* =========================================================
   Rendering
   ========================================================= */
function renderCard(task) {
  const id = escapeHtml(task.id);
  const prio = slug(task.priority);
  const overdue = isOverdue(task);
  const confirming = state.ui.confirmDeleteId === task.id;
  const moveOpen = state.ui.moveOpenId === task.id;

  let actions;
  if (confirming) {
    actions = `
      <div class="confirm" role="group" aria-label="Confirm delete ${id}">
        <span>Delete?</span>
        <button type="button" class="small-btn danger" data-action="delete-yes" data-id="${id}">Yes</button>
        <button type="button" class="small-btn" data-action="delete-no" data-id="${id}">No</button>
      </div>`;
  } else {
    const targets = STATUS_KEYS.filter(s => s !== task.status)
      .map(s => `<li><button type="button" class="small-btn" data-action="move-to" data-id="${id}" data-status="${escapeHtml(s)}">${escapeHtml(s)}</button></li>`)
      .join("");
    actions = `
      <button type="button" class="small-btn" data-action="move-toggle" data-id="${id}"
        aria-expanded="${moveOpen}" aria-label="Move ${id} to another column">Move ▸</button>
      ${moveOpen ? `<ul class="move-menu" aria-label="Move ${id} to">${targets}</ul>` : ""}`;
  }

  return `
    <article class="card prio-${prio}" draggable="true" data-id="${id}" aria-label="${id}: ${escapeHtml(task.title)}">
      <div class="card-top">
        <span class="card-id">${id}</span>
        ${overdue ? '<span class="badge-overdue">Overdue</span>' : ""}
        <span class="spacer"></span>
        <button type="button" class="icon-btn" data-action="delete" data-id="${id}" aria-label="Delete task ${id}">×</button>
      </div>
      <h3 class="card-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ""}
      <dl class="meta">
        <div><dt>${ICONS.project}<span class="visually-hidden">Project</span></dt><dd>${escapeHtml(task.project)}</dd></div>
        <div><dt>${ICONS.assignee}<span class="visually-hidden">Assignee</span></dt><dd>${escapeHtml(task.assignee)}</dd></div>
        <div><dt>${ICONS.due}<span class="visually-hidden">Due</span></dt><dd>${escapeHtml(formatDate(task.dueDate))}</dd></div>
      </dl>
      <div class="tags">
        <span class="pill pill-${prio}">${escapeHtml(task.priority)}<span class="visually-hidden"> priority</span></span>
        <span class="tag">${escapeHtml(task.category)}</span>
      </div>
      <div class="card-actions">${actions}</div>
    </article>`;
}

function renderSummary() {
  const counts = Object.fromEntries(STATUS_KEYS.map(s => [s, 0]));
  state.tasks.forEach(t => { counts[t.status]++; });
  const overdue = state.tasks.filter(isOverdue).length;

  const items = [
    ["Total", state.tasks.length, false],
    ...STATUS_KEYS.map(s => [s, counts[s], false]),
    ["Overdue", overdue, overdue > 0],
  ];
  document.getElementById("summary").innerHTML = items.map(([label, value, alert]) =>
    `<li${alert ? ' class="is-alert"' : ""}><span class="label">${escapeHtml(label)}</span><span class="value">${value}</span></li>`
  ).join("");
}

function renderBoard() {
  const visible = applyFilters(state.tasks);
  const filtered = hasActiveFilters();

  document.getElementById("board").innerHTML = STATUSES.map(col => {
    const colTasks = visible.filter(t => t.status === col.key);
    const total = state.tasks.filter(t => t.status === col.key).length;
    const countText = filtered ? `${colTasks.length} / ${total}` : String(total);
    const colId = "col-" + slug(col.key);
    return `
      <section class="column" data-status="${escapeHtml(col.key)}" aria-labelledby="${colId}">
        <div class="column-header">
          <h2 id="${colId}">${escapeHtml(col.key)}</h2>
          <span class="count-badge" aria-label="${colTasks.length} tasks shown">${countText}</span>
        </div>
        <p class="column-desc">${escapeHtml(col.desc)}</p>
        <div class="card-list">
          ${colTasks.length ? colTasks.map(renderCard).join("") : `<p class="empty">${filtered ? "No matching tasks" : "Drop tasks here"}</p>`}
        </div>
      </section>`;
  }).join("");

  document.getElementById("filter-status").textContent = filtered
    ? `Showing ${visible.length} of ${state.tasks.length} tasks`
    : "";
  renderSummary();
}

// Move keyboard focus to a control inside a re-rendered card
function focusCard(id, selector) {
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (!card) return false;
  const target = (selector && card.querySelector(selector)) || card.querySelector('[data-action="move-toggle"]') || card;
  target.focus();
  return true;
}

/* =========================================================
   Task operations (mutate state, then re-render)
   ========================================================= */
function addTask(data) {
  const task = { ...data, id: formatId(state.nextId++) };
  state.tasks.push(task);
  renderBoard();
  return task;
}

function moveTask(id, status) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || !STATUS_KEYS.includes(status) || task.status === status) return false;
  task.status = status;
  state.ui.moveOpenId = null;
  state.ui.confirmDeleteId = null;
  renderBoard();
  return true;
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.ui.confirmDeleteId = null;
  state.ui.moveOpenId = null;
  renderBoard();
}

function setUi(patch) {
  Object.assign(state.ui, patch);
  renderBoard();
}

/* =========================================================
   Toasts
   ========================================================= */
function showToast(message, type = "info", duration = 4500) {
  const region = document.getElementById("toast-region");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.setAttribute("role", type === "warning" ? "alert" : "status");
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/* =========================================================
   FormSubmit notification (AJAX JSON endpoint)
   ========================================================= */
async function notifyNewTask(task) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORMSUBMIT_TIMEOUT_MS);
  try {
    const res = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        _subject: `[UOB IT PMO] New task ${task.id}: ${task.title}`,
        _template: "table",
        _captcha: "false",
        "Task ID": task.id,
        Title: task.title,
        Description: task.description,
        Project: task.project,
        Category: task.category,
        Assignee: task.assignee,
        Priority: task.priority,
        "Due Date": task.dueDate,
        Status: task.status,
        "Submitted At": new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`FormSubmit failed: ${res.status}`);
    const json = await res.json();
    // FormSubmit can answer 200 with success:"false" (e.g. unactivated or invalid address)
    if (json && String(json.success) === "false") {
      throw new Error(`FormSubmit rejected: ${json.message || "unknown reason"}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   Add Task form: validation + submit
   ========================================================= */
const FORM_FIELDS = ["title", "description", "project", "category", "assignee", "priority", "dueDate", "status"];

function readForm(form) {
  const fd = new FormData(form);
  const data = {};
  FORM_FIELDS.forEach(name => { data[name] = String(fd.get(name) || "").trim(); });
  return data;
}

function validateForm(data) {
  const errors = {};
  if (!data.title) errors.title = "Task title is required.";
  else if (data.title.length > 80) errors.title = "Title must be 80 characters or fewer.";

  if (data.description.length > 500) errors.description = "Description must be 500 characters or fewer.";

  if (!PROJECTS.includes(data.project)) errors.project = "Choose a project / workstream.";
  if (!CATEGORIES.includes(data.category)) errors.category = "Choose a category.";

  if (!data.assignee) errors.assignee = "Assignee is required.";
  else if (data.assignee.length > 60) errors.assignee = "Assignee must be 60 characters or fewer.";

  if (!PRIORITIES.includes(data.priority)) errors.priority = "Choose a priority.";

  if (!data.dueDate) errors.dueDate = "Due date is required.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) errors.dueDate = "Enter a valid date.";
  else if (data.dueDate < todayISO()) errors.dueDate = "Due date cannot be in the past.";

  if (!STATUS_KEYS.includes(data.status)) errors.status = "Choose a status.";
  return errors;
}

function showFormErrors(errors) {
  FORM_FIELDS.forEach(name => {
    const input = document.getElementById("f-" + name);
    const msg = document.getElementById("f-" + name + "-error");
    if (errors[name]) {
      input.setAttribute("aria-invalid", "true");
      msg.textContent = errors[name];
    } else {
      input.removeAttribute("aria-invalid");
      msg.textContent = "";
    }
  });
  const first = FORM_FIELDS.find(name => errors[name]);
  if (first) document.getElementById("f-" + first).focus();
}

function resetTaskForm() {
  const form = document.getElementById("task-form");
  form.reset();
  document.getElementById("f-priority").value = "Medium";
  document.getElementById("f-status").value = "Backlog";
  document.getElementById("f-dueDate").min = todayISO();
  showFormErrors({});
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitBtn = document.getElementById("submit-task");
  if (submitBtn.disabled) return;

  const data = readForm(form);
  const errors = validateForm(data);
  showFormErrors(errors);
  if (Object.keys(errors).length) return;

  // Optimistic UI: card appears immediately
  const task = addTask(data);
  resetTaskForm();
  showToast(`Task ${task.id} added to ${task.status}.`, "success");
  document.getElementById("f-title").focus();

  // Notify in parallel; a failure never affects the board
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  try {
    await notifyNewTask(task);
    showToast(`Email notification sent for ${task.id}.`, "info");
  } catch (err) {
    console.warn(err);
    showToast("Card added locally — email notification failed", "warning", 6000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Task";
  }
}

/* =========================================================
   Modal open / close / focus trap
   ========================================================= */
let lastFocusBeforeModal = null;

function openModal() {
  lastFocusBeforeModal = document.activeElement;
  resetTaskForm();
  document.getElementById("modal-backdrop").hidden = false;
  document.getElementById("f-title").focus();
}

function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  if (backdrop.hidden) return;
  backdrop.hidden = true;
  if (lastFocusBeforeModal && document.contains(lastFocusBeforeModal)) lastFocusBeforeModal.focus();
}

function trapFocus(event) {
  const modal = document.querySelector("#modal-backdrop .modal");
  const focusable = Array.from(modal.querySelectorAll("button, input, select, textarea"))
    .filter(el => !el.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* =========================================================
   Board interactions: clicks (delegated) and drag & drop
   ========================================================= */
function handleBoardClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  switch (btn.dataset.action) {
    case "move-toggle":
      setUi({ moveOpenId: state.ui.moveOpenId === id ? null : id, confirmDeleteId: null });
      focusCard(id, state.ui.moveOpenId ? ".move-menu button" : '[data-action="move-toggle"]');
      break;
    case "move-to": {
      const status = btn.dataset.status;
      if (moveTask(id, status)) {
        showToast(`${id} moved to ${status}.`, "info", 3000);
        if (!focusCard(id)) {
          const heading = document.getElementById("col-" + slug(status));
          heading.setAttribute("tabindex", "-1");
          heading.focus();
        }
      }
      break;
    }
    case "delete":
      setUi({ confirmDeleteId: id, moveOpenId: null });
      focusCard(id, '[data-action="delete-no"]');
      break;
    case "delete-no":
      setUi({ confirmDeleteId: null });
      focusCard(id, '[data-action="delete"]');
      break;
    case "delete-yes": {
      const card = btn.closest(".card");
      const column = btn.closest(".column");
      const sibling = card.nextElementSibling || card.previousElementSibling;
      const siblingId = sibling && sibling.classList.contains("card") ? sibling.dataset.id : null;
      const colStatus = column.dataset.status;
      deleteTask(id);
      showToast(`Task ${id} deleted.`, "info", 3000);
      if (!(siblingId && focusCard(siblingId))) {
        const heading = document.getElementById("col-" + slug(colStatus));
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
      break;
    }
  }
}

let draggedId = null;

function clearDropTargets() {
  document.querySelectorAll(".column.drop-target").forEach(c => c.classList.remove("drop-target"));
}

function handleDragStart(event) {
  const card = event.target.closest && event.target.closest(".card");
  if (!card) return;
  draggedId = card.dataset.id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedId);
  card.classList.add("dragging");
}

function handleDragEnd(event) {
  const card = event.target.closest && event.target.closest(".card");
  if (card) card.classList.remove("dragging");
  draggedId = null;
  clearDropTargets();
}

function handleDragOver(event) {
  const column = event.target.closest(".column");
  if (!column || !draggedId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  if (!column.classList.contains("drop-target")) {
    clearDropTargets();
    column.classList.add("drop-target");
  }
}

function handleDragLeave(event) {
  const column = event.target.closest(".column");
  if (column && !column.contains(event.relatedTarget)) column.classList.remove("drop-target");
}

function handleDrop(event) {
  const column = event.target.closest(".column");
  if (!column) return;
  event.preventDefault();
  const id = event.dataTransfer.getData("text/plain") || draggedId;
  clearDropTargets();
  draggedId = null;
  const status = column.dataset.status;
  if (moveTask(id, status)) showToast(`${id} moved to ${status}.`, "info", 3000);
}

/* =========================================================
   Setup: populate selects, wire events, first render
   ========================================================= */
function fillSelect(select, values, placeholder) {
  const opts = placeholder ? [`<option value="">${escapeHtml(placeholder)}</option>`] : [];
  values.forEach(v => opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`));
  select.innerHTML = opts.join("");
}

function init() {
  // Filter selects
  fillSelect(document.getElementById("filter-project"), PROJECTS, "All projects");
  fillSelect(document.getElementById("filter-priority"), PRIORITIES, "All priorities");

  // Form selects
  fillSelect(document.getElementById("f-project"), PROJECTS, "Select a project…");
  fillSelect(document.getElementById("f-category"), CATEGORIES, "Select a category…");
  fillSelect(document.getElementById("f-priority"), PRIORITIES);
  fillSelect(document.getElementById("f-status"), STATUS_KEYS);

  // Filters
  document.getElementById("filter-project").addEventListener("change", e => {
    state.filters.project = e.target.value; renderBoard();
  });
  document.getElementById("filter-priority").addEventListener("change", e => {
    state.filters.priority = e.target.value; renderBoard();
  });
  document.getElementById("filter-assignee").addEventListener("input", e => {
    state.filters.assignee = e.target.value; renderBoard();
  });
  document.getElementById("clear-filters").addEventListener("click", () => {
    state.filters = { project: "", assignee: "", priority: "" };
    document.getElementById("filter-form").reset();
    renderBoard();
  });

  // Board
  const board = document.getElementById("board");
  board.addEventListener("click", handleBoardClick);
  board.addEventListener("dragstart", handleDragStart);
  board.addEventListener("dragend", handleDragEnd);
  board.addEventListener("dragover", handleDragOver);
  board.addEventListener("dragleave", handleDragLeave);
  board.addEventListener("drop", handleDrop);

  // Modal + form
  document.getElementById("open-add-task").addEventListener("click", openModal);
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("cancel-modal").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("mousedown", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("task-form").addEventListener("submit", handleTaskSubmit);

  // Global keys: Esc closes modal, or an open Move menu / Delete confirm
  document.addEventListener("keydown", e => {
    const modalOpen = !document.getElementById("modal-backdrop").hidden;
    if (e.key === "Escape") {
      if (modalOpen) { closeModal(); return; }
      const openId = state.ui.moveOpenId || state.ui.confirmDeleteId;
      if (openId) {
        setUi({ moveOpenId: null, confirmDeleteId: null });
        focusCard(openId);
      }
    } else if (e.key === "Tab" && modalOpen) {
      trapFocus(e);
    }
  });

  seedTasks();
  renderBoard();
}

init();

/* =========================================================
   v2 additions: theme toggle and hero video
   The theme follows the system setting until the toggle is used.
   It is deliberately not stored: a refresh returns to the system theme.
   ========================================================= */
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  return set || (darkQuery.matches ? "dark" : "light");
}

function syncThemeButton() {
  const btn = document.getElementById("theme-toggle");
  const dark = currentTheme() === "dark";
  btn.setAttribute("aria-pressed", String(dark));
  btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

function initTheme() {
  document.getElementById("theme-toggle").addEventListener("click", () => {
    document.documentElement.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
    syncThemeButton();
  });
  darkQuery.addEventListener("change", syncThemeButton);
  syncThemeButton();
}

function initHeroVideo() {
  const video = document.getElementById("hero-video");
  const btn = document.getElementById("video-toggle");
  if (!video || !btn) return;

  function sync() {
    btn.textContent = video.paused ? "Play" : "Pause";
    btn.setAttribute("aria-pressed", String(video.paused));
  }
  btn.addEventListener("click", () => {
    if (video.paused) video.play().catch(() => {}); else video.pause();
  });
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);

  // Autoplay only when the visitor hasn't asked for reduced motion
  if (!reducedMotionQuery.matches) video.play().catch(() => {});
  sync();
}

initTheme();
initHeroVideo();
