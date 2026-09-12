"use strict";

const EDGE_ORIGIN = "https://iymstmgtmkquhgypfqlg.supabase.co";
const EDGE_BASE = EDGE_ORIGIN + "/functions/v1/family-dispatcher";
const API_BASE = location.hostname.endsWith(".supabase.co")
  ? location.pathname.replace(/\/$/, "") + "/api"
  : EDGE_BASE + "/api";

const STORAGE_TOKEN = "family_dispatcher_session_v2";
const STORAGE_MEMBER = "family_dispatcher_member_v2";
const STORAGE_LOGIN = "family_dispatcher_login_v2";
const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const SHORT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const CALENDAR_YEAR = 2026;
const CALENDAR_MONTHS = [9, 10, 11, 12];

const state = {
  token: localStorage.getItem(STORAGE_TOKEN) || "",
  member: readStoredMember(),
  events: [],
  payments: [],
  base: [],
  calendar: [],
  changes: [],
  settings: {},
  people: [],
  children: [],
  loading: false,
  poller: null,
};

const byId = (id) => document.getElementById(id);

function readStoredMember() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_MEMBER) || "null");
  } catch {
    return null;
  }
}

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined && text !== null) item.textContent = String(text);
  return item;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value, options = { day: "numeric", month: "long" }) {
  if (!value) return "дата не указана";
  const date = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", options).format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortTime(value) {
  return String(value || "").slice(0, 5);
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function mondayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

function minutes(value) {
  const [hours = 0, mins = 0] = shortTime(value).split(":").map(Number);
  return hours * 60 + mins;
}

function hhmm(value) {
  const total = Math.max(0, Math.min(1439, Math.round(Number(value) || 0)));
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateUtc(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dayIndexFromIso(value) {
  return (dateUtc(value).getUTCDay() + 6) % 7;
}

function inRange(value, start, end) {
  return Boolean(value && start && value >= start && value <= (end || start));
}

function eventInterval(item) {
  const buffer = Number(item.buffer_min || 0);
  return {
    start: minutes(item.start_time) - Number(item.travel_before_min || 0) - buffer,
    end: minutes(item.end_time) + Number(item.travel_after_min || 0) + buffer,
  };
}

function actualOverlap(first, second) {
  return minutes(first.start_time) < minutes(second.end_time) && minutes(second.start_time) < minutes(first.end_time);
}

function travelOverlap(first, second) {
  const firstInterval = eventInterval(first);
  const secondInterval = eventInterval(second);
  return firstInterval.start < secondInterval.end && secondInterval.start < firstInterval.end;
}

function confirmationText(value) {
  return value === "confirmed" ? "Подтверждено" : "Предварительно";
}

function eventStatusText(value) {
  return {
    pre: "Предварительно",
    confirmed: "Подтверждено",
    moved: "Перенесено",
    cancelled: "Отменено",
  }[value] || "Предварительно";
}

function policyText(value) {
  return { burn: "Сгорает", shift: "Переносится", case: "Индивидуально" }[value] || "Сгорает";
}

function eventTypeText(value) {
  return {
    regular: "Регулярное",
    oneoff: "Разовое",
    doctor: "Врач",
    family: "Семейное",
  }[value] || "Событие";
}

function personTone(name) {
  if (!name) return "person-tone-none";
  if (name === "Такси") return "taxi-tone";
  const index = state.people.findIndex((item) => item.display_name === name);
  return index >= 0 ? `person-tone-${index % 3}` : "person-tone-none";
}

function baseForChild(child) {
  return state.base.find((item) => item.child === child) || null;
}

function conflicts() {
  const active = state.events.filter((item) => item.event_status !== "cancelled");
  const result = [];
  for (let firstIndex = 0; firstIndex < active.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < active.length; secondIndex += 1) {
      const first = active[firstIndex];
      const second = active[secondIndex];
      if (Number(first.day_index) !== Number(second.day_index)) continue;
      if (first.child === second.child && actualOverlap(first, second)) {
        result.push({ type: "child", first, second, message: `У ${first.child} пересекаются два события` });
      }
      if (first.responsible && first.responsible === second.responsible && first.responsible !== "Такси" && travelOverlap(first, second)) {
        result.push({ type: "adult", first, second, message: `${first.responsible}: два дела одновременно с учётом дороги` });
      }
    }
  }
  return result;
}

function conflictIds() {
  const ids = new Set();
  conflicts().forEach((item) => {
    ids.add(item.first.id);
    ids.add(item.second.id);
  });
  return ids;
}

function isOverdue(payment) {
  return payment.payment_status !== "paid" && payment.pay_date && payment.pay_date < todayIso();
}

function isDueSoon(payment) {
  if (payment.payment_status === "paid" || !payment.pay_date) return false;
  const due = new Date(payment.pay_date + "T12:00:00");
  const now = new Date(todayIso() + "T12:00:00");
  const days = Math.ceil((due - now) / 86400000);
  return days >= 0 && days <= 7;
}

function tableLabel(value) {
  return {
    schedule_events: "расписание",
    payments: "оплаты",
    base_schedule: "базовый режим",
    calendar_marks: "календарь",
    app_settings: "настройки",
  }[value] || "данные";
}

function actionLabel(value) {
  return { INSERT: "добавлено", UPDATE: "изменено", DELETE: "удалено" }[value] || String(value || "").toLowerCase();
}

function personByKey(key) {
  const person = state.people.find((item) => item.login_key === key);
  return person ? person.display_name : "Участник";
}

function showToast(message, isError = false) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = "toast";
  }, 3400);
}

function setSync(message, kind = "") {
  const sync = byId("sync-state");
  sync.textContent = message;
  sync.className = "sync-state" + (kind ? " " + kind : "");
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label || "Сохраняю…";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

async function api(route, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.auth !== false && state.token) headers.Authorization = "Bearer " + state.token;
  const response = await fetch(API_BASE + "/" + route, {
    method: options.method || "POST",
    headers,
    body: options.body === undefined ? "{}" : JSON.stringify(options.body),
    cache: "no-store",
  });
  let payload = null;
  const text = await response.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { error: text }; }
  }
  if (!response.ok) {
    const error = new Error(payload && payload.error ? payload.error : "Ошибка соединения");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function rememberSession(token, member, loginKey) {
  state.token = token;
  state.member = member;
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_MEMBER, JSON.stringify(member));
  localStorage.setItem(STORAGE_LOGIN, loginKey);
}

function forgetSession() {
  state.token = "";
  state.member = null;
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_MEMBER);
}

function showLogin(message = "") {
  clearInterval(state.poller);
  byId("app").hidden = true;
  byId("login-screen").hidden = false;
  byId("login-message").textContent = message;
  byId("login-key").value = localStorage.getItem(STORAGE_LOGIN) || "";
  byId("login-code").value = "";
  setTimeout(() => (byId("login-key").value ? byId("login-code") : byId("login-key")).focus(), 50);
}

function showApp() {
  byId("login-screen").hidden = true;
  byId("app").hidden = false;
  byId("member-name").textContent = state.member ? state.member.display_name : "";
  clearInterval(state.poller);
  state.poller = setInterval(() => {
    if (!document.hidden && state.token && !state.loading) loadSnapshot(true);
  }, 30000);
}

async function login(event) {
  event.preventDefault();
  const button = byId("login-button");
  const loginKey = byId("login-key").value.trim().toLowerCase();
  const code = byId("login-code").value.trim();
  byId("login-message").textContent = "";
  if (!loginKey || !code) return;
  setButtonBusy(button, true, "Проверяю…");
  try {
    const result = await api("login", {
      auth: false,
      body: { login_key: loginKey, code },
    });
    rememberSession(result.token, result.member, loginKey);
    byId("login-code").value = "";
    showApp();
    await loadSnapshot();
  } catch (error) {
    byId("login-message").textContent =
      error.status === 429
        ? "Слишком много попыток. Подождите 15 минут."
        : "Имя входа или код не подошли.";
  } finally {
    setButtonBusy(button, false);
  }
}

async function logout() {
  const token = state.token;
  forgetSession();
  try {
    if (token) {
      state.token = token;
      await api("logout");
    }
  } catch {
    // The local session is removed even if the server is temporarily unavailable.
  } finally {
    forgetSession();
    showLogin("Вы вышли из общей версии.");
  }
}

async function loadSnapshot(quiet = false) {
  if (state.loading) return;
  state.loading = true;
  if (!quiet) setSync("загрузка…");
  try {
    const data = await api("snapshot");
    state.member = data.member;
    state.events = data.events || [];
    state.payments = data.payments || [];
    state.base = data.base || [];
    state.calendar = data.calendar || [];
    state.changes = data.changes || [];
    state.settings = data.settings || {};
    state.people = data.people || [];
    state.children = data.children || [];
    localStorage.setItem(STORAGE_MEMBER, JSON.stringify(state.member));
    showApp();
    renderAll();
    setSync("всё синхронно", "ok");
    byId("last-loaded").textContent = "Обновлено " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    if (error.status === 401) {
      forgetSession();
      showLogin("Сессия закончилась. Войдите снова.");
      return;
    }
    setSync("нет связи", "error");
    if (!quiet) showToast("Не удалось загрузить данные. Проверьте интернет.", true);
  } finally {
    state.loading = false;
  }
}

function renderAll() {
  const childSuffix = state.children.length ? " · " + state.children.join(" и ") : "";
  byId("dispatcher-title").textContent = "Семейный диспетчер" + childSuffix;
  refreshDynamicOptions();
  renderPeopleLegend();
  renderOverview();
  renderWeek();
  renderDay();
  renderPayments();
  renderCalendar();
  renderBase();
  renderConflicts();
  renderChanges();
}

function renderPeopleLegend() {
  const root = byId("people-legend");
  const items = state.people.map((person) => {
    const item = node("span", "legend-pill");
    item.append(node("i", "person-swatch " + personTone(person.display_name)), document.createTextNode(person.display_name));
    return item;
  });
  const taxi = node("span", "legend-pill");
  taxi.append(node("i", "person-swatch taxi-tone"), document.createTextNode("Такси"));
  items.push(taxi);
  root.replaceChildren(...items);
}

function renderOverview() {
  const today = new Date();
  const day = mondayIndex(today);
  const todayEvents = state.events
    .filter((item) => item.day_index === day && item.event_status !== "cancelled")
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  byId("today-title").textContent = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);
  byId("today-summary").textContent = todayEvents.length
    ? "Сегодня занятий: " + todayEvents.length
    : "На сегодня занятий в расписании нет.";

  const pending = state.events.filter((item) =>
    item.event_status === "pre" || item.responsible_status === "pre"
  ).length;
  const due = state.payments.filter((item) => isOverdue(item) || isDueSoon(item)).length;
  const conflictRows = conflicts();
  const metrics = [
    [state.events.length, "занятий в неделе"],
    [conflictRows.length, "накладок"],
    [pending, "нужно подтвердить"],
    [due, "оплат требуют внимания"],
  ];
  const metricRoot = byId("metrics");
  metricRoot.replaceChildren(...metrics.map(([value, label]) => {
    const card = node("article", "metric-card");
    card.append(node("strong", "", value), node("span", "", label));
    return card;
  }));

  const attention = [];
  conflictRows.slice(0, 5).forEach((item) => {
    attention.push({
      kind: "urgent",
      title: item.message,
      text: `${DAYS[item.first.day_index]} · ${item.first.title} / ${item.second.title}`,
    });
  });
  state.payments
    .filter((item) => isOverdue(item))
    .sort((a, b) => String(a.pay_date).localeCompare(String(b.pay_date)))
    .forEach((item) => {
      attention.push({
        kind: "urgent",
        title: "Просрочена оплата: " + item.activity,
        text: formatDate(item.pay_date) + " · " + formatMoney(item.amount),
      });
    });
  state.payments
    .filter((item) => isDueSoon(item))
    .sort((a, b) => String(a.pay_date).localeCompare(String(b.pay_date)))
    .forEach((item) => {
      attention.push({
        kind: "attention",
        title: "Скоро оплата: " + item.activity,
        text: formatDate(item.pay_date) + " · " + formatMoney(item.amount),
      });
    });
  state.events
    .filter((item) => item.responsible_status === "pre" && item.event_status !== "cancelled")
    .slice(0, 5)
    .forEach((item) => {
      attention.push({
        kind: "attention",
        title: "Нужно подтвердить сопровождающего",
        text: SHORT_DAYS[item.day_index] + " · " + shortTime(item.start_time) + " · " + item.title,
      });
    });

  const attentionRoot = byId("attention-list");
  if (!attention.length) {
    attentionRoot.replaceChildren(emptyState("Сейчас ничего не горит."));
  } else {
    attentionRoot.replaceChildren(...attention.slice(0, 8).map((item) => {
      const card = node("div", "notice " + item.kind);
      card.append(node("strong", "", item.title), node("div", "tiny", item.text));
      return card;
    }));
  }

  const nextRoot = byId("next-events");
  if (!todayEvents.length) {
    nextRoot.replaceChildren(emptyState("Сегодня свободный день."));
  } else {
    nextRoot.replaceChildren(...todayEvents.map((item) => eventListItem(item)));
  }
}

function eventListItem(item) {
  const row = node("div", "list-item");
  const text = node("div");
  text.append(
    node("h3", "", item.title),
    node("p", "", [item.child, item.responsible || "сопровождающий не назначен"].join(" · "))
  );
  row.append(node("time", "", shortTime(item.start_time)), text);
  return row;
}

function badge(text, tone = "") {
  return node("span", "badge" + (tone ? " " + tone : ""), text);
}

function baseStrip(item) {
  const strip = node("div", "base-strip");
  strip.append(
    node("strong", "", `${shortTime(item.start_time)}–${shortTime(item.end_time)} ${item.child}`),
    node("span", "", "🏫 " + item.institution),
    node("span", "", `→ ${item.drop_person || "не назначено"} (${confirmationText(item.drop_status)}) · ← ${item.pickup_person || "не назначено"} (${confirmationText(item.pickup_status)})`)
  );
  if (Number(item.amount || 0) || item.pay_date || item.payer) {
    strip.append(node("span", "", `💳 ${formatMoney(item.amount)} · ${item.payer || "не назначено"} (${confirmationText(item.payer_status)})`));
  }
  return strip;
}

function eventCard(item, badIds, compact = false) {
  const special = ["oneoff", "doctor", "family"].includes(item.event_type) ? " oneoff" : "";
  const conflict = badIds.has(item.id) ? " conflict" : "";
  const card = node("button", `event-card ${item.event_status || "pre"} ${personTone(item.responsible)}${special}${conflict}`);
  card.type = "button";
  card.append(
    node("time", "", `${shortTime(item.start_time)}–${shortTime(item.end_time)}`),
    node("strong", "", `${item.child} · ${item.title}`),
    node("small", "", `👤 ${item.responsible || "не назначено"} · ${confirmationText(item.responsible_status)}`)
  );
  const statusLine = node("div", "status-line");
  statusLine.append(
    badge(eventStatusText(item.event_status), item.event_status === "confirmed" ? "green" : item.event_status === "cancelled" ? "red" : "amber"),
    badge(eventTypeText(item.event_type))
  );
  card.append(statusLine);
  if (!compact && item.payer) card.append(node("small", "", `💳 ${item.payer} · ${confirmationText(item.payer_status)}`));
  card.addEventListener("click", () => openEvent(item));
  return card;
}

function renderWeek() {
  const current = mondayIndex();
  const badIds = conflictIds();
  const columns = DAYS.map((dayName, dayIndex) => {
    const column = node("article", "day-column" + (dayIndex === current ? " today" : ""));
    const head = node("div", "day-head");
    head.append(node("strong", "", dayName), node("span", "", dayIndex === current ? "сегодня" : ""));
    column.append(head);
    if (dayIndex < 5) state.base.forEach((item) => column.append(baseStrip(item)));
    const events = state.events
      .filter((item) => Number(item.day_index) === dayIndex)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    if (!events.length) column.append(emptyState("Нет занятий"));
    events.forEach((item) => column.append(eventCard(item, badIds)));
    return column;
  });
  byId("week-grid").replaceChildren(...columns);
}

function clusterEvents(items) {
  const clusters = [];
  const sorted = [...items].sort((a, b) => minutes(a.start_time) - minutes(b.start_time));
  sorted.forEach((item) => {
    const start = minutes(item.start_time);
    const end = Math.max(start + 30, minutes(item.end_time));
    const last = clusters[clusters.length - 1];
    if (last && start < last.end) {
      last.events.push(item);
      last.end = Math.max(last.end, end);
    } else {
      clusters.push({ start, end, events: [item] });
    }
  });
  return clusters;
}

function renderDay() {
  const day = Number(byId("day-select").value || 0);
  const selected = byId("child-filter").value || "all";
  const visibleChildren = selected === "all" ? state.children : state.children.filter((child) => child === selected);
  byId("day-table-head").replaceChildren(node("th", "", "Время"), ...visibleChildren.map((child) => node("th", "", child)));
  const body = byId("day-table-body");
  if (!visibleChildren.length) {
    const row = node("tr");
    const cell = node("td", "empty-table", "Пока нет данных о детях.");
    cell.colSpan = 2;
    row.append(cell);
    body.replaceChildren(row);
    return;
  }
  const configuredStart = minutes(state.settings.day_start || "07:00");
  const configuredEnd = minutes(state.settings.day_end || "22:00");
  const dayStart = Math.floor(configuredStart / 30) * 30;
  const dayEnd = Math.max(dayStart + 30, Math.ceil(configuredEnd / 30) * 30);
  const clusterMaps = new Map();
  visibleChildren.forEach((child) => {
    const map = new Map();
    clusterEvents(state.events.filter((item) => Number(item.day_index) === day && item.child === child)).forEach((cluster) => {
      const start = Math.max(dayStart, Math.floor(cluster.start / 30) * 30);
      const end = Math.min(dayEnd, Math.ceil(cluster.end / 30) * 30);
      if (start < end) map.set(start, { ...cluster, start, end });
    });
    clusterMaps.set(child, map);
  });
  const skips = new Map(visibleChildren.map((child) => [child, 0]));
  const badIds = conflictIds();
  const rows = [];
  for (let time = dayStart; time < dayEnd; time += 30) {
    const row = node("tr");
    row.append(node("td", "time-cell", hhmm(time)));
    visibleChildren.forEach((child) => {
      const skip = skips.get(child) || 0;
      if (skip > 0) {
        skips.set(child, skip - 1);
        return;
      }
      const cluster = clusterMaps.get(child).get(time);
      if (cluster) {
        const span = Math.max(1, Math.ceil((cluster.end - cluster.start) / 30));
        skips.set(child, span - 1);
        const cell = node("td", "occupied-cell");
        cell.rowSpan = span;
        const group = node("div", "occupied-group");
        cluster.events.forEach((item) => {
          const block = eventCard(item, badIds, true);
          block.classList.add("occupied-block");
          const interval = eventInterval(item);
          block.append(node("small", "", `С дорогой: ${hhmm(interval.start)}–${hhmm(interval.end)}`));
          group.append(block);
        });
        cell.append(group);
        row.append(cell);
        return;
      }
      const cell = node("td", "day-slot-cell");
      const base = day < 5 ? baseForChild(child) : null;
      const insideBase = base && time >= minutes(base.start_time) && time < minutes(base.end_time);
      const slot = node("button", "day-slot" + (insideBase ? " base-slot" : ""));
      slot.type = "button";
      slot.setAttribute("aria-label", `Добавить событие: ${DAYS[day]}, ${child}, ${hhmm(time)}`);
      if (insideBase) slot.append(node("span", "mini-base", "🏫 " + base.institution));
      slot.addEventListener("click", () => openEvent(null, { dayIndex: day, child, startTime: hhmm(time) }));
      cell.append(slot);
      row.append(cell);
    });
    rows.push(row);
  }
  body.replaceChildren(...rows);
}

function paymentState(item) {
  if (item.payment_status === "paid") return "paid";
  if (isOverdue(item)) return "overdue";
  return "pending";
}

function makePaymentCard(item) {
  const status = paymentState(item);
  const card = node("button", "payment-card " + status);
  card.type = "button";
  const top = node("div", "card-top");
  top.append(node("h3", "", item.child + " · " + item.activity), node("span", "amount", formatMoney(item.amount)));
  const statusBadge = badge(
    status === "paid" ? "Оплачено" : status === "overdue" ? "Просрочено" : "Ожидает оплаты",
    status === "paid" ? "green" : status === "overdue" ? "red" : "amber"
  );
  const purchased = Number(item.purchased || 0);
  const used = Number(item.used || 0);
  const saved = Number(item.saved || 0);
  const burned = Number(item.burned || 0);
  const remaining = Math.max(0, purchased - used - burned);
  const meta = node("div", "card-meta");
  meta.append(
    node("span", "", "Срок: " + formatDate(item.pay_date)),
    node("span", "", `Платит: ${item.payer || "не назначено"} · ${confirmationText(item.payer_status)}`),
    node("span", "", `Куплено: ${purchased} · использовано: ${used} · сохранено: ${saved} · сгорело: ${burned}`),
    node("span", "", `Осталось: ${remaining} · при пропуске: ${policyText(item.policy)}`)
  );
  if (item.note) meta.append(node("span", "", item.note));
  card.append(top, statusBadge, meta);
  card.addEventListener("click", () => openPayment(item));
  return card;
}

function makeBasePaymentCard(item) {
  const card = node("article", "payment-card base-payment");
  const top = node("div", "card-top");
  top.append(node("h3", "", item.child + " · " + item.institution), node("span", "amount", formatMoney(item.amount)));
  const meta = node("div", "card-meta");
  meta.append(
    node("span", "", "Базовый режим"),
    node("span", "", "Срок: " + formatDate(item.pay_date)),
    node("span", "", `Платит: ${item.payer || "не назначено"} · ${confirmationText(item.payer_status)}`),
    node("span", "", "Править во вкладке «Базовый режим»")
  );
  card.append(top, meta);
  return card;
}

function renderPayments() {
  const cards = state.base
    .filter((item) => Number(item.amount || 0) > 0 || item.pay_date || item.payer)
    .map((item) => makeBasePaymentCard(item));
  const payments = [...state.payments].sort((a, b) => {
    const rank = { overdue: 0, pending: 1, paid: 2 };
    const difference = rank[paymentState(a)] - rank[paymentState(b)];
    return difference || String(a.pay_date || "9999").localeCompare(String(b.pay_date || "9999"));
  });
  cards.push(...payments.map((item) => makePaymentCard(item)));
  byId("payments-list").replaceChildren(...(cards.length ? cards : [emptyState("Оплат пока нет.")]));
}

function markKind(item) {
  return item.mark_type === "busy" ? "busy" : item.mark_type;
}

function markTitle(item) {
  if (item.title) return item.title;
  if (item.mark_type === "busy") return personByKey(item.busy_login_key) + " занят(а)";
  return {
    plan: "Запланированное событие",
    cancel: "Разовая отмена",
    stop: "Больше не ходит",
  }[item.mark_type] || "Отметка";
}

function activityKey(item) {
  return `${item.child} — ${item.title}`;
}

function markMatchesEvent(mark, item) {
  if (mark.child && mark.child !== item.child) return false;
  return mark.activity === activityKey(item) || mark.activity === item.title;
}

function regularEventsOnDate(value) {
  const day = dayIndexFromIso(value);
  return state.events.filter((item) =>
    item.event_type === "regular" && Number(item.day_index) === day && item.event_status !== "cancelled"
  );
}

function cancelMarkFor(value, item) {
  return state.calendar.find((mark) =>
    mark.mark_type === "cancel" && inRange(value, mark.start_date, mark.end_date) && markMatchesEvent(mark, item)
  );
}

function stopMarkFor(value, item) {
  return state.calendar.find((mark) =>
    mark.mark_type === "stop" && value >= mark.start_date && markMatchesEvent(mark, item)
  );
}

function calendarChip(text, className, mark = null) {
  const chip = node(mark ? "button" : "span", "cal-chip " + className, text);
  if (mark) {
    chip.type = "button";
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      openMark(mark);
    });
  }
  return chip;
}

function renderMonths() {
  const primary = state.people[0] || null;
  const secondary = state.people[1] || null;
  const primaryLegend = byId("busy-legend-primary");
  const secondaryLegend = byId("busy-legend-secondary");
  primaryLegend.hidden = !primary;
  secondaryLegend.hidden = !secondary;
  if (primary) primaryLegend.textContent = primary.display_name + " занят(а)";
  if (secondary) secondaryLegend.textContent = secondary.display_name + " занят(а)";

  const monthCards = CALENDAR_MONTHS.map((month) => {
    const card = node("article", "month-card");
    card.append(node("h3", "", `${MONTH_NAMES[month]} ${CALENDAR_YEAR}`));
    const scroll = node("div", "month-scroll");
    const grid = node("div", "month-grid");
    SHORT_DAYS.forEach((day) => grid.append(node("div", "month-head", day)));
    const first = new Date(Date.UTC(CALENDAR_YEAR, month - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const dayCount = new Date(Date.UTC(CALENDAR_YEAR, month, 0)).getUTCDate();
    for (let index = 0; index < offset; index += 1) grid.append(node("div", "month-day empty"));
    for (let day = 1; day <= dayCount; day += 1) {
      const value = isoDate(CALENDAR_YEAR, month, day);
      const busyMarks = state.calendar.filter((mark) => mark.mark_type === "busy" && inRange(value, mark.start_date, mark.end_date));
      const primaryBusy = primary && busyMarks.some((mark) => mark.busy_login_key === primary.login_key);
      const secondaryBusy = secondary && busyMarks.some((mark) => mark.busy_login_key === secondary.login_key);
      const busyClass = primaryBusy && secondaryBusy
        ? " busy-both"
        : primaryBusy
          ? " busy-primary"
          : secondaryBusy
            ? " busy-secondary"
            : busyMarks.length
              ? " busy-other"
              : "";
      const cell = node("div", "month-day" + busyClass);
      cell.append(node("div", "day-num", day));

      regularEventsOnDate(value).forEach((item) => {
        const stopMark = stopMarkFor(value, item);
        const cancelMark = cancelMarkFor(value, item);
        if (stopMark) cell.append(calendarChip(`⛔ ${item.child}: ${item.title}`, "cal-stop", stopMark));
        else if (cancelMark) cell.append(calendarChip(`↶ ${item.child}: ${item.title} — разово отменено`, "cal-cancel", cancelMark));
        else cell.append(calendarChip(`${shortTime(item.start_time)} ${item.child} · ${item.title}`, "cal-regular"));
      });

      state.calendar.filter((mark) => inRange(value, mark.start_date, mark.end_date)).forEach((mark) => {
        if (mark.mark_type === "plan") {
          cell.append(calendarChip(`📌 ${mark.title || "Событие"}${mark.child ? " · " + mark.child : ""}`, "cal-plan", mark));
        }
        if (mark.mark_type === "busy") {
          const tone = primary && mark.busy_login_key === primary.login_key
            ? "busy-note-primary"
            : secondary && mark.busy_login_key === secondary.login_key
              ? "busy-note-secondary"
              : "busy-note-other";
          const substitute = mark.substitute ? ` · подмена: ${mark.substitute}` : "";
          cell.append(calendarChip(`${personByKey(mark.busy_login_key)} занят(а)${substitute}`, tone, mark));
        }
        if (mark.mark_type === "cancel") {
          const projected = regularEventsOnDate(value).some((item) => markMatchesEvent(mark, item));
          if (!projected) cell.append(calendarChip(`↶ ${mark.activity || "Занятие"} — разовая отмена`, "cal-cancel", mark));
        }
        if (mark.mark_type === "stop" && value === mark.start_date) {
          cell.append(calendarChip(`⛔ С ${formatDate(mark.start_date)}: ${mark.activity || "занятие"}`, "cal-stop", mark));
        }
      });
      grid.append(cell);
    }
    const trailing = (7 - ((offset + dayCount) % 7)) % 7;
    for (let index = 0; index < trailing; index += 1) grid.append(node("div", "month-day empty"));
    scroll.append(grid);
    card.append(scroll);
    return card;
  });
  byId("months-wrap").replaceChildren(...monthCards);
}

function renderCalendar() {
  renderMonths();
  const root = byId("calendar-list");
  const marks = [...state.calendar].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  if (!marks.length) {
    root.replaceChildren(emptyState("Отметок календаря пока нет."));
    return;
  }
  root.replaceChildren(...marks.map((item) => {
    const card = node("article", "mark-card " + markKind(item));
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    const top = node("div", "card-top");
    top.append(node("h3", "", markTitle(item)), node("span", "badge", item.child || "для всех"));
    const dateText = item.start_date === item.end_date
      ? formatDate(item.start_date)
      : formatDate(item.start_date) + " — " + formatDate(item.end_date);
    const meta = node("div", "card-meta");
    meta.append(
      node("span", "", dateText),
      node("span", "", [item.activity, item.substitute ? "подмена: " + item.substitute : ""].filter(Boolean).join(" · ")),
      node("span", "", item.note || "")
    );
    card.append(top, meta);
    card.addEventListener("click", () => openMark(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openMark(item);
    });
    return card;
  }));
}

function renderBase() {
  const root = byId("base-rows");
  if (!state.base.length) {
    root.replaceChildren(emptyState("Базовый режим ещё не заполнен."));
  } else {
    root.replaceChildren(...state.base.map((item) => {
      const card = node("article", "base-card");
      card.dataset.child = item.child;
      card.append(node("h3", "", item.child));
      const grid = node("div", "form-grid three");
      grid.append(
        field("Учреждение", input("text", "institution", item.institution)),
        field("Начало", input("time", "start_time", shortTime(item.start_time))),
        field("Конец", input("time", "end_time", shortTime(item.end_time))),
        field("Кто отвозит", select("drop_person", peopleOptions(item.drop_person))),
        field("Кто забирает", select("pickup_person", peopleOptions(item.pickup_person))),
        field("Кто платит", select("payer", payerOptions(item.payer))),
        field("Дорога туда, мин", input("number", "travel_before_min", item.travel_before_min, { min: "0", max: "300" })),
        field("Дорога обратно, мин", input("number", "travel_after_min", item.travel_after_min, { min: "0", max: "300" })),
        field("Сумма, ₽", input("number", "amount", item.amount, { min: "0", max: "10000000" })),
        field("Дата оплаты", input("date", "pay_date", item.pay_date || "")),
        field("Отвоз подтверждён", select("drop_status", confirmationOptions(item.drop_status))),
        field("Возврат подтверждён", select("pickup_status", confirmationOptions(item.pickup_status))),
        field("Плательщик подтверждён", select("payer_status", confirmationOptions(item.payer_status)))
      );
      card.append(grid);
      return card;
    }));
  }
  byId("day-start").value = shortTime(state.settings.day_start) || "07:00";
  byId("day-end").value = shortTime(state.settings.day_end) || "22:00";
}

function renderConflicts() {
  const rows = conflicts();
  const root = byId("conflicts-list");
  if (!rows.length) {
    const good = node("div", "notice good");
    good.append(
      node("strong", "", "Накладок нет."),
      node("div", "tiny", "Проверены дети и сопровождающие с учётом дороги и буфера.")
    );
    root.replaceChildren(good);
    return;
  }
  root.replaceChildren(...rows.map((item) => {
    const notice = node("div", "notice urgent");
    const firstInterval = item.type === "adult"
      ? eventInterval(item.first)
      : { start: minutes(item.first.start_time), end: minutes(item.first.end_time) };
    const secondInterval = item.type === "adult"
      ? eventInterval(item.second)
      : { start: minutes(item.second.start_time), end: minutes(item.second.end_time) };
    notice.append(
      node("strong", "", item.message),
      node("div", "tiny", `${DAYS[item.first.day_index]} · ${item.first.child} ${item.first.title} (${hhmm(firstInterval.start)}–${hhmm(firstInterval.end)})`),
      node("div", "tiny", `${item.second.child} ${item.second.title} (${hhmm(secondInterval.start)}–${hhmm(secondInterval.end)})`)
    );
    return notice;
  }));
}

function renderChanges() {
  const root = byId("changes-list");
  if (!state.changes.length) {
    root.replaceChildren(emptyState("Пока нет новых изменений."));
    return;
  }
  root.replaceChildren(...state.changes.map((item) => {
    const row = node("article", "timeline-item");
    row.append(
      node("h3", "", (item.changed_by || "Система") + " · " + actionLabel(item.action)),
      node("p", "", tableLabel(item.table_name) + " · " + formatDateTime(item.changed_at))
    );
    return row;
  }));
}

function emptyState(text) {
  return node("div", "empty-state", text);
}

function field(labelText, control) {
  const label = node("label");
  label.append(document.createTextNode(labelText), control);
  return label;
}

function input(type, name, value, attrs = {}) {
  const control = document.createElement("input");
  control.type = type;
  control.name = name;
  control.value = value ?? "";
  Object.entries(attrs).forEach(([key, val]) => control.setAttribute(key, val));
  return control;
}

function select(name, options) {
  const control = document.createElement("select");
  control.name = name;
  options.forEach(({ value, label, selected }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = Boolean(selected);
    control.append(option);
  });
  return control;
}

function peopleOptions(selected = "") {
  return [
    { value: "", label: "Не назначено", selected: !selected },
    ...state.people.map((item) => ({
      value: item.display_name,
      label: item.display_name,
      selected: item.display_name === selected,
    })),
    { value: "Такси", label: "Такси", selected: selected === "Такси" },
  ];
}

function payerOptions(selected = "") {
  return [
    { value: "", label: "Не назначено", selected: !selected },
    ...state.people.map((item) => ({
      value: item.display_name,
      label: item.display_name,
      selected: item.display_name === selected,
    })),
    { value: "Совместно", label: "Совместно", selected: selected === "Совместно" },
  ];
}

function confirmationOptions(selected = "pre") {
  return [
    { value: "pre", label: "Предварительно", selected: selected !== "confirmed" },
    { value: "confirmed", label: "Подтверждено", selected: selected === "confirmed" },
  ];
}

function fillSelect(control, options, selected = "") {
  if (!control) return;
  control.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    option.selected = String(value) === String(selected);
    return option;
  }));
}

function regularActivityOptions(selected = "") {
  const child = byId("mark-child") ? byId("mark-child").value : "";
  const values = [...new Set(state.events
    .filter((item) => item.event_type === "regular" && (!child || item.child === child))
    .map((item) => activityKey(item)))];
  if (selected && !values.includes(selected)) values.push(selected);
  return [{ value: "", label: "— выберите занятие —" }, ...values.sort().map((value) => ({ value, label: value }))];
}

function refreshDynamicOptions() {
  const eventChild = byId("event-child");
  const paymentChild = byId("payment-child");
  const markChild = byId("mark-child");
  const childFilter = byId("child-filter");
  const eventResponsible = byId("event-responsible");
  const eventPayer = byId("event-payer");
  const paymentPayer = byId("payment-payer");
  const busy = byId("mark-busy-person");
  const substitute = byId("mark-substitute");
  const activity = byId("mark-activity");
  fillSelect(eventChild, state.children.map((value) => ({ value, label: value })), eventChild ? eventChild.value : "");
  fillSelect(paymentChild, state.children.map((value) => ({ value, label: value })), paymentChild ? paymentChild.value : "");
  fillSelect(markChild, [{ value: "", label: "Не относится" }, ...state.children.map((value) => ({ value, label: value }))], markChild ? markChild.value : "");
  fillSelect(childFilter, [{ value: "all", label: "Всех детей" }, ...state.children.map((value) => ({ value, label: value }))], childFilter ? childFilter.value : "all");
  fillSelect(eventResponsible, peopleOptions(eventResponsible ? eventResponsible.value : ""), eventResponsible ? eventResponsible.value : "");
  fillSelect(eventPayer, payerOptions(eventPayer ? eventPayer.value : ""), eventPayer ? eventPayer.value : "");
  fillSelect(paymentPayer, payerOptions(paymentPayer ? paymentPayer.value : ""), paymentPayer ? paymentPayer.value : "");
  fillSelect(busy, state.people.map((item) => ({ value: item.login_key, label: item.display_name })), busy ? busy.value : "");
  fillSelect(substitute, peopleOptions(substitute ? substitute.value : ""), substitute ? substitute.value : "");
  fillSelect(activity, regularActivityOptions(activity ? activity.value : ""), activity ? activity.value : "");
}

function toggleEventPaymentGroup() {
  const group = byId("event-payment-group");
  const regular = byId("event-type").value === "regular";
  group.classList.toggle("inactive", !regular);
  group.querySelectorAll("input, select").forEach((control) => {
    control.disabled = !regular;
  });
}

function openEvent(item = null, defaults = {}) {
  const existing = item || {};
  byId("event-dialog-title").textContent = item ? "Изменить занятие" : "Новое занятие";
  byId("event-id").value = existing.id || "";
  refreshDynamicOptions();
  const dayIndex = existing.day_index ?? defaults.dayIndex ?? mondayIndex();
  const startTime = shortTime(existing.start_time) || defaults.startTime || "17:00";
  byId("event-day").value = String(dayIndex);
  byId("event-child").value = existing.child || defaults.child || state.children[0] || "";
  byId("event-type").value = existing.event_type || "regular";
  byId("event-start").value = startTime;
  byId("event-end").value = shortTime(existing.end_time) || hhmm(minutes(startTime) + 60);
  byId("event-status").value = existing.event_status || "pre";
  byId("event-title").value = existing.title || "";
  byId("event-place").value = existing.place || "";
  byId("event-responsible").value = existing.responsible || "";
  byId("event-role").value = existing.responsibility_role || "Привозит и забирает";
  byId("event-responsible-status").value = existing.responsible_status || "pre";
  byId("event-before").value = existing.travel_before_min || 0;
  byId("event-after").value = existing.travel_after_min || 0;
  byId("event-buffer").value = existing.buffer_min || 0;
  byId("event-payer").value = existing.payer || "";
  byId("event-payer-status").value = existing.payer_status || "pre";
  byId("event-extra-cost").value = existing.extra_cost || 0;
  byId("event-amount").value = existing.regular_amount || 0;
  byId("event-pay-date").value = existing.regular_pay_date || "";
  byId("event-purchased").value = existing.regular_purchased || 0;
  byId("event-used").value = existing.regular_used || 0;
  byId("event-saved").value = existing.regular_saved || 0;
  byId("event-burned").value = existing.regular_burned || 0;
  byId("event-policy").value = existing.regular_policy || "burn";
  byId("event-attendance").value = existing.attendance_status || "planned";
  byId("event-note").value = existing.note || "";
  byId("delete-event-button").hidden = !item;
  toggleEventPaymentGroup();
  byId("event-dialog").showModal();
}

async function saveEvent(event) {
  event.preventDefault();
  const start = byId("event-start").value;
  const end = byId("event-end").value;
  if (minutes(end) <= minutes(start)) {
    showToast("Время окончания должно быть позже начала.", true);
    return;
  }
  const submit = event.submitter;
  const id = byId("event-id").value;
  const original = state.events.find((item) => item.id === id) || {};
  const row = {
    ...original,
    id: id || undefined,
    day_index: Number(byId("event-day").value),
    child: byId("event-child").value,
    event_type: byId("event-type").value,
    start_time: start,
    end_time: end,
    event_status: byId("event-status").value,
    title: byId("event-title").value.trim(),
    place: byId("event-place").value.trim(),
    responsible: byId("event-responsible").value || null,
    responsibility_role: byId("event-role").value,
    responsible_status: byId("event-responsible-status").value,
    travel_before_min: Number(byId("event-before").value || 0),
    travel_after_min: Number(byId("event-after").value || 0),
    buffer_min: Number(byId("event-buffer").value || 0),
    payer: byId("event-payer").value || null,
    payer_status: byId("event-payer-status").value,
    extra_cost: Number(byId("event-extra-cost").value || 0),
    regular_amount: Number(byId("event-amount").value || 0),
    regular_pay_date: byId("event-pay-date").value || null,
    regular_purchased: Number(byId("event-purchased").value || 0),
    regular_used: Number(byId("event-used").value || 0),
    regular_saved: Number(byId("event-saved").value || 0),
    regular_burned: Number(byId("event-burned").value || 0),
    regular_policy: byId("event-policy").value,
    attendance_status: byId("event-attendance").value,
    note: byId("event-note").value.trim(),
  };
  await mutate("event/save", row, byId("event-dialog"), submit, "Занятие сохранено.");
}

async function deleteEvent() {
  const id = byId("event-id").value;
  if (!id || !confirm("Удалить это занятие?")) return;
  await mutate("event/delete", { id }, byId("event-dialog"), byId("delete-event-button"), "Занятие удалено.");
}

function openPayment(item = null) {
  const value = item || {};
  byId("payment-id").value = value.id || "";
  refreshDynamicOptions();
  byId("payment-child").value = value.child || state.children[0] || "";
  byId("payment-activity").value = value.activity || "";
  byId("payment-amount").value = value.amount || 0;
  byId("payment-date").value = value.pay_date || "";
  byId("payment-payer").value = value.payer || "";
  byId("payment-payer-status").value = value.payer_status || "pre";
  byId("payment-status").value = value.payment_status || "pending";
  byId("payment-policy").value = value.policy || "burn";
  byId("payment-purchased").value = value.purchased || 0;
  byId("payment-used").value = value.used || 0;
  byId("payment-saved").value = value.saved || 0;
  byId("payment-burned").value = value.burned || 0;
  byId("payment-note").value = value.note || "";
  byId("delete-payment-button").hidden = !item;
  byId("payment-dialog").showModal();
}

async function savePayment(event) {
  event.preventDefault();
  const id = byId("payment-id").value;
  const original = state.payments.find((item) => item.id === id) || {};
  const row = {
    ...original,
    id: id || undefined,
    child: byId("payment-child").value,
    activity: byId("payment-activity").value.trim(),
    amount: Number(byId("payment-amount").value || 0),
    pay_date: byId("payment-date").value || null,
    payer: byId("payment-payer").value || null,
    payer_status: byId("payment-payer-status").value,
    payment_status: byId("payment-status").value,
    policy: byId("payment-policy").value,
    purchased: Number(byId("payment-purchased").value || 0),
    used: Number(byId("payment-used").value || 0),
    saved: Number(byId("payment-saved").value || 0),
    burned: Number(byId("payment-burned").value || 0),
    note: byId("payment-note").value.trim(),
  };
  await mutate("payment/save", row, byId("payment-dialog"), event.submitter, "Оплата сохранена.");
}

async function deletePayment() {
  const id = byId("payment-id").value;
  if (!id || !confirm("Удалить эту оплату?")) return;
  await mutate("payment/delete", { id }, byId("payment-dialog"), byId("delete-payment-button"), "Оплата удалена.");
}

function toggleMarkFields() {
  byId("mark-busy-wrapper").hidden = byId("mark-type").value !== "busy";
}

function openMark(item = null) {
  const value = item || {};
  byId("mark-id").value = value.id || "";
  byId("mark-child").value = value.child || "";
  byId("mark-activity").value = value.activity || "";
  refreshDynamicOptions();
  byId("mark-type").value = value.mark_type || "plan";
  byId("mark-child").value = value.child || "";
  fillSelect(byId("mark-activity"), regularActivityOptions(value.activity || ""), value.activity || "");
  byId("mark-start").value = value.start_date || todayIso();
  byId("mark-end").value = value.end_date || value.start_date || todayIso();
  byId("mark-substitute").value = value.substitute || "";
  byId("mark-title").value = value.title || "";
  byId("mark-note").value = value.note || "";
  byId("mark-busy-person").value = value.busy_login_key || (state.people[0] ? state.people[0].login_key : "");
  toggleMarkFields();
  byId("delete-mark-button").hidden = !item;
  byId("mark-dialog").showModal();
}

async function saveMark(event) {
  event.preventDefault();
  const type = byId("mark-type").value;
  const start = byId("mark-start").value;
  const end = byId("mark-end").value || start;
  const activity = byId("mark-activity").value;
  const title = byId("mark-title").value.trim();
  if (end < start) {
    showToast("Дата «по» не может быть раньше даты «с».", true);
    return;
  }
  if (["cancel", "stop"].includes(type) && !activity) {
    showToast("Для отмены выберите занятие.", true);
    return;
  }
  if (type === "plan" && !title) {
    showToast("Напишите название события, каникул или поездки.", true);
    return;
  }
  if (type === "busy" && !byId("mark-busy-person").value) {
    showToast("Укажите, кто занят.", true);
    return;
  }
  const id = byId("mark-id").value;
  const row = {
    id: id || undefined,
    mark_type: type,
    busy_login_key: type === "busy" ? byId("mark-busy-person").value : null,
    child: byId("mark-child").value || null,
    start_date: start,
    end_date: end,
    activity: activity || null,
    substitute: byId("mark-substitute").value || null,
    title: title || null,
    note: byId("mark-note").value.trim() || null,
  };
  await mutate("calendar/save", row, byId("mark-dialog"), event.submitter, "Отметка сохранена.");
}

async function deleteMark() {
  const id = byId("mark-id").value;
  if (!id || !confirm("Удалить эту отметку?")) return;
  await mutate("calendar/delete", { id }, byId("mark-dialog"), byId("delete-mark-button"), "Отметка удалена.");
}

async function saveBase(event) {
  event.preventDefault();
  const button = event.submitter;
  const rows = [...byId("base-rows").querySelectorAll(".base-card")].map((card) => {
    const value = (name) => card.querySelector('[name="' + name + '"]').value;
    return {
      child: card.dataset.child,
      institution: value("institution").trim(),
      start_time: value("start_time"),
      end_time: value("end_time"),
      drop_person: value("drop_person") || null,
      pickup_person: value("pickup_person") || null,
      payer: value("payer") || null,
      travel_before_min: Number(value("travel_before_min") || 0),
      travel_after_min: Number(value("travel_after_min") || 0),
      amount: Number(value("amount") || 0),
      pay_date: value("pay_date") || null,
      drop_status: value("drop_status"),
      pickup_status: value("pickup_status"),
      payer_status: value("payer_status"),
    };
  });
  await mutate("base/save", { rows }, null, button, "Базовый режим сохранён.");
}

async function saveSettings(event) {
  event.preventDefault();
  if (minutes(byId("day-end").value) <= minutes(byId("day-start").value)) {
    showToast("Конец дня должен быть позже начала.", true);
    return;
  }
  await mutate("settings/save", {
    day_start: byId("day-start").value,
    day_end: byId("day-end").value,
  }, null, event.submitter, "Границы дня сохранены.");
}

function downloadBackup() {
  const backup = {
    format: "family-dispatcher-v1.8-protected",
    generated_at: new Date().toISOString(),
    events: state.events,
    payments: state.payments,
    base_schedule: state.base,
    calendar_marks: state.calendar,
    settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `family-dispatcher-backup-${todayIso()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Резервная копия скачана.");
}

async function mutate(route, body, dialog, button, successMessage) {
  setButtonBusy(button, true);
  try {
    await api(route, { body });
    if (dialog && dialog.open) dialog.close();
    await loadSnapshot(true);
    showToast(successMessage);
  } catch (error) {
    if (error.status === 401) {
      forgetSession();
      showLogin("Сессия закончилась. Войдите снова.");
    } else if (error.status === 403) {
      showToast("У этой учётной записи нет права менять данные.", true);
    } else {
      showToast(error.message || "Не удалось сохранить.", true);
    }
  } finally {
    setButtonBusy(button, false);
  }
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === "view-" + name));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  if (name === "day") renderDay();
  if (name === "calendar") renderCalendar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindEvents() {
  byId("login-form").addEventListener("submit", login);
  byId("logout-button").addEventListener("click", logout);
  byId("refresh-button").addEventListener("click", () => loadSnapshot());
  byId("overview-add-event").addEventListener("click", () => openEvent());
  byId("add-event-button").addEventListener("click", () => openEvent());
  byId("add-payment-button").addEventListener("click", () => openPayment());
  byId("add-mark-button").addEventListener("click", () => openMark());
  byId("event-form").addEventListener("submit", saveEvent);
  byId("payment-form").addEventListener("submit", savePayment);
  byId("mark-form").addEventListener("submit", saveMark);
  byId("base-form").addEventListener("submit", saveBase);
  byId("settings-form").addEventListener("submit", saveSettings);
  byId("delete-event-button").addEventListener("click", deleteEvent);
  byId("delete-payment-button").addEventListener("click", deletePayment);
  byId("delete-mark-button").addEventListener("click", deleteMark);
  byId("mark-type").addEventListener("change", toggleMarkFields);
  byId("mark-child").addEventListener("change", () => {
    fillSelect(byId("mark-activity"), regularActivityOptions(), "");
  });
  byId("event-type").addEventListener("change", toggleEventPaymentGroup);
  byId("day-select").addEventListener("change", renderDay);
  byId("child-filter").addEventListener("change", renderDay);
  byId("download-backup-button").addEventListener("click", downloadBackup);
  document.querySelectorAll(".dialog-close").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.token) loadSnapshot(true);
  });
}

async function boot() {
  bindEvents();
  fillSelect(byId("event-day"), DAYS.map((label, value) => ({ value: String(value), label })), String(mondayIndex()));
  fillSelect(byId("day-select"), DAYS.map((label, value) => ({ value: String(value), label })), String(mondayIndex()));
  if (!state.token || !state.member) {
    showLogin();
    return;
  }
  showApp();
  await loadSnapshot();
}

boot();
