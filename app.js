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
  renderOverview();
  renderWeek();
  renderPayments();
  renderCalendar();
  renderBase();
  renderChanges();
  refreshDynamicOptions();
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
  const metrics = [
    [state.events.length, "занятий в неделе"],
    [pending, "нужно подтвердить"],
    [due, "оплат требуют внимания"],
    [state.calendar.length, "отметок календаря"],
  ];
  const metricRoot = byId("metrics");
  metricRoot.replaceChildren(...metrics.map(([value, label]) => {
    const card = node("article", "metric-card");
    card.append(node("strong", "", value), node("span", "", label));
    return card;
  }));

  const attention = [];
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

function renderWeek() {
  const current = mondayIndex();
  const root = byId("week-grid");
  const columns = DAYS.map((dayName, dayIndex) => {
    const column = node("article", "day-column" + (dayIndex === current ? " today" : ""));
    const head = node("div", "day-head");
    head.append(node("strong", "", dayName), node("span", "", dayIndex === current ? "сегодня" : ""));
    column.append(head);

    if (dayIndex < 5) {
      state.base.forEach((base) => {
        const strip = node("div", "base-strip");
        strip.textContent = base.child + " · " + base.institution + " · " + shortTime(base.start_time) + "–" + shortTime(base.end_time);
        column.append(strip);
      });
    }

    const events = state.events
      .filter((item) => item.day_index === dayIndex)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    if (!events.length) column.append(emptyState("Нет занятий"));
    events.forEach((item) => {
      const card = node("button", "event-card " + (item.event_status || "pre"));
      card.type = "button";
      card.append(
        node("time", "", shortTime(item.start_time) + "–" + shortTime(item.end_time)),
        node("strong", "", item.child + " · " + item.title),
        node("small", "", [item.responsible, item.place].filter(Boolean).join(" · ") || "детали не указаны")
      );
      card.addEventListener("click", () => openEvent(item));
      column.append(card);
    });
    return column;
  });
  root.replaceChildren(...columns);
}

function paymentState(item) {
  if (item.payment_status === "paid") return "paid";
  if (isOverdue(item)) return "overdue";
  return "pending";
}

function renderPayments() {
  const root = byId("payments-list");
  const payments = [...state.payments].sort((a, b) => {
    const rank = { overdue: 0, pending: 1, paid: 2 };
    const diff = rank[paymentState(a)] - rank[paymentState(b)];
    return diff || String(a.pay_date || "9999").localeCompare(String(b.pay_date || "9999"));
  });
  if (!payments.length) {
    root.replaceChildren(emptyState("Оплат пока нет."));
    return;
  }
  root.replaceChildren(...payments.map((item) => {
    const status = paymentState(item);
    const card = node("button", "payment-card " + status);
    card.type = "button";
    const top = node("div", "card-top");
    top.append(node("h3", "", item.child + " · " + item.activity), node("span", "amount", formatMoney(item.amount)));
    const badge = node("span", "badge " + (status === "paid" ? "green" : status === "overdue" ? "red" : "amber"),
      status === "paid" ? "Оплачено" : status === "overdue" ? "Просрочено" : "Ожидает оплаты");
    const meta = node("div", "card-meta");
    meta.append(
      node("span", "", "Срок: " + formatDate(item.pay_date)),
      node("span", "", "Платит: " + (item.payer || "не назначено")),
      node("span", "", "Осталось занятий: " + Math.max(0, Number(item.purchased || 0) - Number(item.used || 0) - Number(item.burned || 0)))
    );
    card.append(top, badge, meta);
    card.addEventListener("click", () => openPayment(item));
    return card;
  }));
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

function renderCalendar() {
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
        field("Возврат подтверждён", select("pickup_status", confirmationOptions(item.pickup_status)))
      );
      card.append(grid);
      return card;
    }));
  }
  byId("day-start").value = shortTime(state.settings.day_start) || "07:30";
  byId("day-end").value = shortTime(state.settings.day_end) || "21:30";
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
  control.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    return option;
  }));
}

function refreshDynamicOptions() {
  fillSelect(byId("event-child"), state.children.map((value) => ({ value, label: value })), byId("event-child").value);
  fillSelect(byId("payment-child"), state.children.map((value) => ({ value, label: value })), byId("payment-child").value);
  fillSelect(byId("mark-child"), [{ value: "", label: "Не относится" }, ...state.children.map((value) => ({ value, label: value }))], byId("mark-child").value);
  fillSelect(byId("event-responsible"), peopleOptions(byId("event-responsible").value), byId("event-responsible").value);
  fillSelect(byId("event-payer"), payerOptions(byId("event-payer").value), byId("event-payer").value);
  fillSelect(byId("payment-payer"), payerOptions(byId("payment-payer").value), byId("payment-payer").value);
  const busy = byId("mark-busy-person");
  if (busy) fillSelect(busy, state.people.map((item) => ({ value: item.login_key, label: item.display_name })), busy.value);
}

function openEvent(item = null) {
  const existing = item || {};
  byId("event-dialog-title").textContent = item ? "Изменить занятие" : "Новое занятие";
  byId("event-id").value = existing.id || "";
  byId("event-day").value = existing.day_index ?? mondayIndex();
  refreshDynamicOptions();
  byId("event-child").value = existing.child || state.children[0] || "";
  byId("event-type").value = existing.event_type || "regular";
  byId("event-start").value = shortTime(existing.start_time) || "17:00";
  byId("event-end").value = shortTime(existing.end_time) || "18:00";
  byId("event-status").value = existing.event_status || "pre";
  byId("event-title").value = existing.title || "";
  byId("event-place").value = existing.place || "";
  byId("event-responsible").value = existing.responsible || "";
  byId("event-role").value = existing.responsibility_role || "";
  byId("event-responsible-status").value = existing.responsible_status || "pre";
  byId("event-before").value = existing.travel_before_min || 0;
  byId("event-after").value = existing.travel_after_min || 0;
  byId("event-buffer").value = existing.buffer_min || 0;
  byId("event-payer").value = existing.payer || "";
  byId("event-amount").value = existing.regular_amount || 0;
  byId("event-pay-date").value = existing.regular_pay_date || "";
  byId("event-note").value = existing.note || "";
  byId("delete-event-button").hidden = !item;
  byId("event-dialog").showModal();
}

async function saveEvent(event) {
  event.preventDefault();
  const submit = event.submitter;
  const id = byId("event-id").value;
  const original = state.events.find((item) => item.id === id) || {};
  const row = {
    ...original,
    id: id || undefined,
    day_index: Number(byId("event-day").value),
    child: byId("event-child").value,
    event_type: byId("event-type").value,
    start_time: byId("event-start").value,
    end_time: byId("event-end").value,
    event_status: byId("event-status").value,
    title: byId("event-title").value.trim(),
    place: byId("event-place").value.trim(),
    responsible: byId("event-responsible").value || null,
    responsibility_role: byId("event-role").value.trim(),
    responsible_status: byId("event-responsible-status").value,
    travel_before_min: Number(byId("event-before").value || 0),
    travel_after_min: Number(byId("event-after").value || 0),
    buffer_min: Number(byId("event-buffer").value || 0),
    payer: byId("event-payer").value || null,
    regular_amount: Number(byId("event-amount").value || 0),
    regular_pay_date: byId("event-pay-date").value || null,
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

function toggleBusyPerson() {
  const wrapper = byId("mark-busy-wrapper");
  if (wrapper) wrapper.hidden = byId("mark-type").value !== "busy";
}

function openMark(item = null) {
  const value = item || {};
  byId("mark-id").value = value.id || "";
  refreshDynamicOptions();
  byId("mark-type").value = value.mark_type || "plan";
  byId("mark-child").value = value.child || "";
  byId("mark-start").value = value.start_date || todayIso();
  byId("mark-end").value = value.end_date || value.start_date || todayIso();
  byId("mark-activity").value = value.activity || "";
  byId("mark-substitute").value = value.substitute || "";
  byId("mark-title").value = value.title || "";
  byId("mark-note").value = value.note || "";
  if (byId("mark-busy-person")) byId("mark-busy-person").value = value.busy_login_key || state.people[0]?.login_key || "";
  toggleBusyPerson();
  byId("delete-mark-button").hidden = !item;
  byId("mark-dialog").showModal();
}

async function saveMark(event) {
  event.preventDefault();
  const id = byId("mark-id").value;
  const row = {
    id: id || undefined,
    mark_type: byId("mark-type").value,
    busy_login_key: byId("mark-type").value === "busy" ? byId("mark-busy-person").value : null,
    child: byId("mark-child").value || null,
    start_date: byId("mark-start").value,
    end_date: byId("mark-end").value,
    activity: byId("mark-activity").value.trim() || null,
    substitute: byId("mark-substitute").value.trim() || null,
    title: byId("mark-title").value.trim() || null,
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
    };
  });
  await mutate("base/save", { rows }, null, button, "Базовый режим сохранён.");
}

async function saveSettings(event) {
  event.preventDefault();
  await mutate("settings/save", {
    day_start: byId("day-start").value,
    day_end: byId("day-end").value,
  }, null, event.submitter, "Границы дня сохранены.");
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
  byId("mark-type").addEventListener("change", toggleBusyPerson);
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
  if (!state.token || !state.member) {
    showLogin();
    return;
  }
  showApp();
  await loadSnapshot();
}

boot();
