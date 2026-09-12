import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const INDEX_HTML = "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n  <meta name=\"theme-color\" content=\"#3d4c3f\">\n  <meta name=\"robots\" content=\"noindex,nofollow,noarchive\">\n  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; connect-src 'self' https://iymstmgtmkquhgypfqlg.supabase.co; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\">\n  <title>Семейный диспетчер</title>\n  <link rel=\"manifest\" href=\"manifest.webmanifest\">\n  <link rel=\"icon\" href=\"icon.svg\" type=\"image/svg+xml\">\n  <link rel=\"stylesheet\" href=\"styles.css\">\n  <script src=\"app.js\" defer></script>\n</head>\n<body>\n  <noscript>Для работы приложения нужен JavaScript.</noscript>\n\n  <section id=\"login-screen\" class=\"login-screen\">\n    <form id=\"login-form\" class=\"login-card\" autocomplete=\"on\">\n      <div class=\"brand-mark\" aria-hidden=\"true\">✓</div>\n      <p class=\"eyebrow\">Закрытая семейная версия</p>\n      <h1>Семейный диспетчер</h1>\n      <p class=\"muted\">Введите имя входа и личный код. Семейные данные появятся только после проверки.</p>\n      <label>\n        Имя входа\n        <input id=\"login-key\" name=\"username\" autocomplete=\"username\" autocapitalize=\"none\" spellcheck=\"false\" required maxlength=\"32\" placeholder=\"Ваше имя входа\">\n      </label>\n      <label>\n        Личный код\n        <input id=\"login-code\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required maxlength=\"80\" placeholder=\"••••••••••••\">\n      </label>\n      <button id=\"login-button\" class=\"button primary wide\" type=\"submit\">Войти</button>\n      <p id=\"login-message\" class=\"form-message\" role=\"status\" aria-live=\"polite\"></p>\n      <p class=\"tiny\">Код не отправляется в GitHub и не сохраняется в открытом коде.</p>\n    </form>\n  </section>\n\n  <div id=\"app\" class=\"app\" hidden>\n    <header class=\"topbar\">\n      <div>\n        <p class=\"eyebrow light-text\">Общая рабочая версия</p>\n        <h1 id=\"dispatcher-title\">Семейный диспетчер</h1>\n        <p class=\"version-note\">V1.8 · календарь и цельные временные плашки</p>\n      </div>\n      <div class=\"account\">\n        <span id=\"member-name\"></span>\n        <span id=\"sync-state\" class=\"sync-state\">загрузка…</span>\n        <button id=\"refresh-button\" class=\"icon-button\" type=\"button\" title=\"Обновить\" aria-label=\"Обновить\">↻</button>\n        <button id=\"logout-button\" class=\"button ghost\" type=\"button\">Выйти</button>\n      </div>\n    </header>\n\n    <nav class=\"tabs\" aria-label=\"Разделы\">\n      <button class=\"tab active\" data-view=\"overview\" type=\"button\">Главная</button>\n      <button class=\"tab\" data-view=\"week\" type=\"button\">Неделя</button>\n      <button class=\"tab\" data-view=\"day\" type=\"button\">По дням</button>\n      <button class=\"tab\" data-view=\"calendar\" type=\"button\">Календарь до НГ</button>\n      <button class=\"tab\" data-view=\"base\" type=\"button\">Базовый режим</button>\n      <button class=\"tab\" data-view=\"conflicts\" type=\"button\">Накладки</button>\n      <button class=\"tab\" data-view=\"payments\" type=\"button\">Оплаты</button>\n      <button class=\"tab\" data-view=\"settings\" type=\"button\">Настройки</button>\n      <button class=\"tab\" data-view=\"changes\" type=\"button\">Изменения</button>\n    </nav>\n\n    <main>\n      <section id=\"view-overview\" class=\"view active\">\n        <div class=\"hero-card\">\n          <div>\n            <p class=\"eyebrow\">На сегодня</p>\n            <h2 id=\"today-title\">Загрузка…</h2>\n            <p id=\"today-summary\" class=\"muted\"></p>\n          </div>\n          <button id=\"overview-add-event\" class=\"button primary\" type=\"button\">+ Занятие</button>\n        </div>\n        <div id=\"metrics\" class=\"metrics\"></div>\n        <div class=\"content-grid\">\n          <article class=\"panel\">\n            <div class=\"panel-head\"><h2>Требует внимания</h2></div>\n            <div id=\"attention-list\" class=\"stack\"></div>\n          </article>\n          <article class=\"panel\">\n            <div class=\"panel-head\"><h2>Ближайшие занятия</h2></div>\n            <div id=\"next-events\" class=\"stack\"></div>\n          </article>\n        </div>\n      </section>\n\n      <section id=\"view-week\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Расписание</p><h2>Неделя</h2></div>\n          <button id=\"add-event-button\" class=\"button primary\" type=\"button\">+ Занятие</button>\n        </div>\n        <p class=\"muted\">Базовый режим показан серым. Карточки учитывают дорогу, подтверждения и оплаты.</p>\n        <div id=\"people-legend\" class=\"legend people-legend\" aria-label=\"Участники\"></div>\n        <div id=\"week-grid\" class=\"week-grid\"></div>\n      </section>\n\n      <section id=\"view-day\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Полная сетка</p><h2>Расписание по дням</h2></div>\n        </div>\n        <div class=\"panel day-controls\">\n          <div class=\"form-grid two\">\n            <label>День<select id=\"day-select\"></select></label>\n            <label>Показать<select id=\"child-filter\"><option value=\"all\">Всех детей</option></select></label>\n          </div>\n          <p class=\"muted\">Нажмите на свободную клетку, чтобы добавить занятие. Цветная плашка занимает всё время занятия; дорога и буфер учитываются при поиске накладок.</p>\n        </div>\n        <div class=\"schedule-table-wrap\">\n          <table class=\"day-table\">\n            <thead><tr id=\"day-table-head\"><th>Время</th></tr></thead>\n            <tbody id=\"day-table-body\"></tbody>\n          </table>\n        </div>\n      </section>\n\n      <section id=\"view-payments\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Учёт</p><h2>Оплаты</h2></div>\n          <button id=\"add-payment-button\" class=\"button primary\" type=\"button\">+ Оплата</button>\n        </div>\n        <div id=\"payments-list\" class=\"cards-list\"></div>\n      </section>\n\n      <section id=\"view-calendar\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Исключения и планы</p><h2>Календарь до Нового года</h2></div>\n          <button id=\"add-mark-button\" class=\"button primary\" type=\"button\">+ Отметка</button>\n        </div>\n        <p id=\"calendar-range-label\" class=\"muted\">Сентябрь–декабрь 2026. Здесь видны постоянные занятия, каникулы, поездки и исключения.</p>\n        <div class=\"legend\" aria-label=\"Легенда\">\n          <span class=\"legend-pill plan\"><i class=\"dot plan\"></i>Событие, каникулы или поездка</span>\n          <span class=\"legend-pill cancel\"><i class=\"dot cancel\"></i>Оранжевый — разовая отмена</span>\n          <span class=\"legend-pill stop\"><i class=\"dot stop\"></i>Красный — больше не ходит</span>\n          <span id=\"busy-legend-primary\" class=\"legend-pill busy-primary\"></span>\n          <span id=\"busy-legend-secondary\" class=\"legend-pill busy-secondary\"></span>\n        </div>\n        <div id=\"months-wrap\" class=\"months-wrap\"></div>\n        <div class=\"section-head sub-section-head\"><div><p class=\"eyebrow\">Редактирование</p><h2>Все отметки</h2></div></div>\n        <div id=\"calendar-list\" class=\"cards-list\"></div>\n      </section>\n\n      <section id=\"view-base\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Будни</p><h2>Базовый режим</h2></div>\n        </div>\n        <form id=\"base-form\" class=\"stack\">\n          <div id=\"base-rows\" class=\"cards-list\"></div>\n          <button class=\"button primary\" type=\"submit\">Сохранить базовый режим</button>\n        </form>\n      </section>\n\n      <section id=\"view-conflicts\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Контроль логистики</p><h2>Накладки</h2></div>\n        </div>\n        <div id=\"conflicts-list\" class=\"stack\"></div>\n      </section>\n\n      <section id=\"view-settings\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Рабочий диапазон</p><h2>Настройки</h2></div>\n        </div>\n        <form id=\"settings-form\" class=\"panel settings-panel\">\n          <div class=\"panel-head\"><h2>Границы дня</h2></div>\n          <div class=\"form-grid two\">\n            <label>Начало дня<input id=\"day-start\" type=\"time\" required></label>\n            <label>Конец дня<input id=\"day-end\" type=\"time\" required></label>\n          </div>\n          <button class=\"button secondary\" type=\"submit\">Сохранить время</button>\n        </form>\n        <div class=\"panel settings-panel\">\n          <div class=\"panel-head\"><h2>Личная резервная копия</h2></div>\n          <p class=\"muted\">Скачивается только после входа. Почты и коды доступа в файл не попадают.</p>\n          <button id=\"download-backup-button\" class=\"button secondary\" type=\"button\">Скачать копию данных</button>\n        </div>\n      </section>\n\n      <section id=\"view-changes\" class=\"view\">\n        <div class=\"section-head\">\n          <div><p class=\"eyebrow\">Прозрачность</p><h2>Последние изменения</h2></div>\n        </div>\n        <div id=\"changes-list\" class=\"timeline\"></div>\n      </section>\n    </main>\n\n    <footer>\n      <span>Данные хранятся в закрытой базе.</span>\n      <span id=\"last-loaded\"></span>\n    </footer>\n  </div>\n\n  <dialog id=\"event-dialog\">\n    <form id=\"event-form\" method=\"dialog\" class=\"dialog-form\">\n      <div class=\"dialog-head\"><div><p class=\"eyebrow\">Расписание</p><h2 id=\"event-dialog-title\">Занятие</h2></div><button class=\"dialog-close\" type=\"button\" aria-label=\"Закрыть\">×</button></div>\n      <input id=\"event-id\" type=\"hidden\">\n      <div class=\"form-grid three\">\n        <label>День<select id=\"event-day\" required></select></label>\n        <label>Ребёнок<select id=\"event-child\" required></select></label>\n        <label>Тип<select id=\"event-type\"><option value=\"regular\">Регулярное занятие</option><option value=\"oneoff\">Разовое событие</option><option value=\"doctor\">Врач</option><option value=\"family\">Семейное мероприятие</option></select></label>\n        <label>Начало<input id=\"event-start\" type=\"time\" required></label>\n        <label>Конец<input id=\"event-end\" type=\"time\" required></label>\n        <label>Статус<select id=\"event-status\"><option value=\"pre\">Предварительно</option><option value=\"confirmed\">Подтверждено</option><option value=\"moved\">Перенесено</option><option value=\"cancelled\">Отменено</option></select></label>\n      </div>\n      <label>Занятие<input id=\"event-title\" required maxlength=\"160\"></label>\n      <label>Место<input id=\"event-place\" maxlength=\"240\"></label>\n      <div class=\"form-grid three\">\n        <label>Кто сопровождает<select id=\"event-responsible\"></select></label>\n        <label>Роль<select id=\"event-role\"><option>Привозит и забирает</option><option>Привозит</option><option>Забирает</option><option>Сопровождает</option><option>Только контролирует</option></select></label>\n        <label>Подтверждение<select id=\"event-responsible-status\"><option value=\"pre\">Предварительно</option><option value=\"confirmed\">Подтверждено</option></select></label>\n        <label>Дорога туда, мин<input id=\"event-before\" type=\"number\" min=\"0\" max=\"300\"></label>\n        <label>Дорога обратно, мин<input id=\"event-after\" type=\"number\" min=\"0\" max=\"300\"></label>\n        <label>Буфер, мин<input id=\"event-buffer\" type=\"number\" min=\"0\" max=\"300\"></label>\n        <label>Кто платит<select id=\"event-payer\"></select></label>\n        <label>Статус плательщика<select id=\"event-payer-status\"><option value=\"pre\">Предварительно</option><option value=\"confirmed\">Подтверждено</option></select></label>\n        <label>Доп. расход, ₽<input id=\"event-extra-cost\" type=\"number\" min=\"0\" max=\"10000000\" step=\"1\"></label>\n      </div>\n      <fieldset id=\"event-payment-group\" class=\"dialog-group\">\n        <legend>Оплата постоянного занятия</legend>\n        <p class=\"muted\">Для кружка или секции. Эти данные видны и во вкладке «Оплаты».</p>\n        <div class=\"form-grid three\">\n          <label>Стоимость пакета / месяца, ₽<input id=\"event-amount\" type=\"number\" min=\"0\" max=\"10000000\" step=\"1\"></label>\n          <label>Следующая оплата<input id=\"event-pay-date\" type=\"date\"></label>\n          <label>Занятий оплачено<input id=\"event-purchased\" type=\"number\" min=\"0\" max=\"1000\"></label>\n          <label>Использовано<input id=\"event-used\" type=\"number\" min=\"0\" max=\"1000\"></label>\n          <label>Пропущено, но сохранено<input id=\"event-saved\" type=\"number\" min=\"0\" max=\"1000\"></label>\n          <label>Пропущено и сгорело<input id=\"event-burned\" type=\"number\" min=\"0\" max=\"1000\"></label>\n          <label>При пропуске<select id=\"event-policy\"><option value=\"burn\">Сгорает</option><option value=\"shift\">Переносится</option><option value=\"case\">Индивидуально</option></select></label>\n          <label>Посещение<select id=\"event-attendance\"><option value=\"planned\">Запланировано</option><option value=\"attended\">Был</option><option value=\"missed\">Пропустил</option><option value=\"orgcancel\">Отменено организацией</option></select></label>\n        </div>\n      </fieldset>\n      <label>Комментарий<textarea id=\"event-note\" maxlength=\"1200\"></textarea></label>\n      <div class=\"dialog-actions\">\n        <button id=\"delete-event-button\" class=\"button danger\" type=\"button\">Удалить</button>\n        <button class=\"button primary\" type=\"submit\">Сохранить</button>\n      </div>\n    </form>\n  </dialog>\n\n  <dialog id=\"payment-dialog\">\n    <form id=\"payment-form\" method=\"dialog\" class=\"dialog-form\">\n      <div class=\"dialog-head\"><div><p class=\"eyebrow\">Учёт</p><h2>Оплата</h2></div><button class=\"dialog-close\" type=\"button\" aria-label=\"Закрыть\">×</button></div>\n      <input id=\"payment-id\" type=\"hidden\">\n      <div class=\"form-grid two\">\n        <label>Ребёнок<select id=\"payment-child\" required></select></label>\n        <label>Занятие<input id=\"payment-activity\" required maxlength=\"160\"></label>\n        <label>Сумма, ₽<input id=\"payment-amount\" type=\"number\" min=\"0\" max=\"10000000\" required></label>\n        <label>Оплатить до<input id=\"payment-date\" type=\"date\"></label>\n        <label>Кто платит<select id=\"payment-payer\"></select></label>\n        <label>Подтверждение<select id=\"payment-payer-status\"><option value=\"pre\">Предварительно</option><option value=\"confirmed\">Подтверждено</option></select></label>\n        <label>Статус оплаты<select id=\"payment-status\"><option value=\"pending\">Не оплачено</option><option value=\"paid\">Оплачено</option></select></label>\n        <label>Правило пропуска<select id=\"payment-policy\"><option value=\"burn\">Сгорает</option><option value=\"shift\">Переносится</option><option value=\"case\">По ситуации</option></select></label>\n        <label>Куплено занятий<input id=\"payment-purchased\" type=\"number\" min=\"0\" max=\"1000\"></label>\n        <label>Использовано<input id=\"payment-used\" type=\"number\" min=\"0\" max=\"1000\"></label>\n        <label>Сохранено<input id=\"payment-saved\" type=\"number\" min=\"0\" max=\"1000\"></label>\n        <label>Сгорело<input id=\"payment-burned\" type=\"number\" min=\"0\" max=\"1000\"></label>\n      </div>\n      <label>Комментарий<textarea id=\"payment-note\" maxlength=\"1200\"></textarea></label>\n      <div class=\"dialog-actions\">\n        <button id=\"delete-payment-button\" class=\"button danger\" type=\"button\">Удалить</button>\n        <button class=\"button primary\" type=\"submit\">Сохранить</button>\n      </div>\n    </form>\n  </dialog>\n\n  <dialog id=\"mark-dialog\">\n    <form id=\"mark-form\" method=\"dialog\" class=\"dialog-form\">\n      <div class=\"dialog-head\"><div><p class=\"eyebrow\">Календарь</p><h2>Отметка</h2></div><button class=\"dialog-close\" type=\"button\" aria-label=\"Закрыть\">×</button></div>\n      <input id=\"mark-id\" type=\"hidden\">\n      <div class=\"form-grid two\">\n        <label>Тип<select id=\"mark-type\"><option value=\"plan\">Запланированное событие</option><option value=\"cancel\">Разовая отмена</option><option value=\"stop\">Больше не ходит</option><option value=\"busy\">Взрослый занят</option></select></label>\n        <label id=\"mark-busy-wrapper\" hidden>Кто занят<select id=\"mark-busy-person\"></select></label>\n        <label>Ребёнок<select id=\"mark-child\"></select></label>\n        <label>С<input id=\"mark-start\" type=\"date\" min=\"2026-09-01\" max=\"2026-12-31\" required></label>\n        <label>По<input id=\"mark-end\" type=\"date\" min=\"2026-09-01\" max=\"2026-12-31\" required></label>\n        <label>Занятие<select id=\"mark-activity\"></select></label>\n        <label>Кто подменяет<select id=\"mark-substitute\"></select></label>\n      </div>\n      <label>Название<input id=\"mark-title\" maxlength=\"200\" placeholder=\"Например: каникулы, поездка, театр, врач\"></label>\n      <label>Комментарий<textarea id=\"mark-note\" maxlength=\"1200\"></textarea></label>\n      <div class=\"dialog-actions\">\n        <button id=\"delete-mark-button\" class=\"button danger\" type=\"button\">Удалить</button>\n        <button class=\"button primary\" type=\"submit\">Сохранить</button>\n      </div>\n    </form>\n  </dialog>\n\n  <div id=\"toast\" class=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n</body>\n</html>\n";
const STYLES_CSS = ":root {\n  color-scheme: light;\n  --ink: #263128;\n  --muted: #68736b;\n  --paper: #fbfaf6;\n  --panel: #ffffff;\n  --wash: #eef2eb;\n  --line: #d9dfd7;\n  --forest: #3d4c3f;\n  --forest-2: #526757;\n  --sage: #9eb19d;\n  --clay: #c77d5d;\n  --amber: #d9a441;\n  --red: #b44c45;\n  --blue: #5279a3;\n  --shadow: 0 14px 34px rgba(38, 49, 40, 0.08);\n  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { min-height: 100%; background: var(--paper); }\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n  background:\n    radial-gradient(circle at top left, rgba(158, 177, 157, 0.18), transparent 34rem),\n    linear-gradient(180deg, #f8f6ef 0%, #edf1eb 100%);\n  color: var(--ink);\n}\n\nbutton, input, select, textarea { font: inherit; }\n\nbutton { cursor: pointer; }\n\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible {\n  outline: 3px solid rgba(82, 121, 163, 0.35);\n  outline-offset: 2px;\n}\n\n[hidden] { display: none !important; }\n\n.login-screen {\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));\n}\n\n.login-card {\n  width: min(430px, 100%);\n  display: grid;\n  gap: 16px;\n  padding: clamp(24px, 6vw, 40px);\n  border: 1px solid rgba(61, 76, 63, 0.14);\n  border-radius: 28px;\n  background: rgba(255, 255, 255, 0.94);\n  box-shadow: 0 28px 70px rgba(38, 49, 40, 0.14);\n  backdrop-filter: blur(18px);\n}\n\n.login-card h1,\n.topbar h1 {\n  margin: 0;\n  letter-spacing: -0.035em;\n}\n\n.login-card h1 { font-size: clamp(32px, 8vw, 48px); line-height: 1.02; }\n\n.brand-mark {\n  width: 56px;\n  height: 56px;\n  display: grid;\n  place-items: center;\n  border-radius: 18px;\n  background: var(--forest);\n  color: #fff;\n  font-size: 30px;\n  font-weight: 900;\n  box-shadow: 0 12px 24px rgba(61, 76, 63, 0.22);\n}\n\n.eyebrow {\n  margin: 0 0 5px;\n  color: var(--forest-2);\n  font-size: 12px;\n  font-weight: 850;\n  letter-spacing: 0.11em;\n  text-transform: uppercase;\n}\n\n.light-text { color: rgba(255, 255, 255, 0.72); }\n\n.muted { color: var(--muted); line-height: 1.55; }\n\n.tiny { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }\n\nlabel {\n  display: grid;\n  gap: 7px;\n  color: var(--ink);\n  font-size: 13px;\n  font-weight: 750;\n}\n\ninput, select, textarea {\n  width: 100%;\n  border: 1px solid var(--line);\n  border-radius: 12px;\n  background: #fff;\n  color: var(--ink);\n  padding: 11px 12px;\n  min-height: 44px;\n}\n\ntextarea { min-height: 86px; resize: vertical; }\n\ninput:disabled, select:disabled, textarea:disabled {\n  background: #f0f1ee;\n  color: #777;\n}\n\n.button {\n  min-height: 42px;\n  border: 1px solid transparent;\n  border-radius: 12px;\n  padding: 10px 15px;\n  font-weight: 800;\n  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;\n}\n\n.button:hover { transform: translateY(-1px); }\n.button:disabled { cursor: wait; opacity: 0.55; transform: none; }\n.button.wide { width: 100%; }\n.button.primary { background: var(--forest); color: #fff; }\n.button.secondary { background: var(--wash); color: var(--forest); border-color: var(--line); }\n.button.ghost { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.3); }\n.button.danger { background: #fff1f0; color: var(--red); border-color: #efc3c0; }\n\n.form-message { min-height: 20px; margin: 0; font-size: 13px; color: var(--red); }\n\n.app { min-height: 100vh; }\n\n.topbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  padding: max(18px, env(safe-area-inset-top)) clamp(16px, 4vw, 46px) 18px;\n  background: linear-gradient(125deg, #28352c, #536957);\n  color: #fff;\n  box-shadow: 0 6px 24px rgba(38, 49, 40, 0.2);\n}\n\n.topbar h1 { font-size: clamp(23px, 4vw, 36px); }\n\n.account {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 9px;\n  flex-wrap: wrap;\n  font-size: 13px;\n}\n\n#member-name { font-weight: 850; }\n\n.sync-state {\n  padding: 5px 9px;\n  border-radius: 999px;\n  background: rgba(255,255,255,0.12);\n  color: rgba(255,255,255,0.84);\n  font-size: 11px;\n}\n\n.sync-state.ok { background: rgba(191, 230, 198, 0.18); color: #dff5e3; }\n.sync-state.error { background: rgba(255, 193, 188, 0.18); color: #ffe1de; }\n\n.icon-button {\n  width: 40px;\n  height: 40px;\n  border: 1px solid rgba(255,255,255,0.28);\n  border-radius: 12px;\n  background: rgba(255,255,255,0.1);\n  color: #fff;\n  font-size: 22px;\n  line-height: 1;\n}\n\n.tabs {\n  position: sticky;\n  top: 0;\n  z-index: 20;\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 12px clamp(14px, 4vw, 46px);\n  background: rgba(248, 246, 239, 0.94);\n  border-bottom: 1px solid rgba(61, 76, 63, 0.1);\n  backdrop-filter: blur(15px);\n  scrollbar-width: none;\n}\n\n.tabs::-webkit-scrollbar { display: none; }\n\n.tab {\n  flex: 0 0 auto;\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  background: #fff;\n  color: var(--forest);\n  padding: 9px 14px;\n  font-weight: 800;\n}\n\n.tab.active { background: var(--forest); border-color: var(--forest); color: #fff; }\n\nmain {\n  width: min(1180px, calc(100% - 28px));\n  margin: 0 auto;\n  padding: 20px 0 42px;\n}\n\n.view { display: none; }\n.view.active { display: block; }\n\n.hero-card,\n.panel,\n.base-card,\n.payment-card,\n.mark-card,\n.event-card,\n.metric-card {\n  border: 1px solid rgba(61, 76, 63, 0.13);\n  background: rgba(255,255,255,0.92);\n  box-shadow: var(--shadow);\n}\n\n.hero-card {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  padding: clamp(20px, 4vw, 34px);\n  border-radius: 24px;\n}\n\n.hero-card h2 { margin: 0; font-size: clamp(25px, 5vw, 40px); letter-spacing: -0.035em; }\n\n.metrics {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 12px;\n  margin: 15px 0;\n}\n\n.metric-card {\n  padding: 16px;\n  border-radius: 18px;\n}\n\n.metric-card strong {\n  display: block;\n  margin-bottom: 4px;\n  color: var(--forest);\n  font-size: clamp(25px, 5vw, 38px);\n  letter-spacing: -0.04em;\n}\n\n.metric-card span { color: var(--muted); font-size: 12px; font-weight: 750; }\n\n.content-grid {\n  display: grid;\n  grid-template-columns: 1.05fr 0.95fr;\n  gap: 15px;\n}\n\n.panel {\n  padding: 18px;\n  border-radius: 20px;\n}\n\n.panel-head,\n.section-head,\n.dialog-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 14px;\n}\n\n.panel-head h2,\n.section-head h2,\n.dialog-head h2 { margin: 0; color: var(--ink); letter-spacing: -0.025em; }\n\n.section-head { margin: 4px 0 15px; }\n.section-head h2 { font-size: clamp(27px, 5vw, 38px); }\n\n.stack { display: grid; gap: 9px; }\n\n.notice,\n.list-item {\n  border: 1px solid var(--line);\n  border-radius: 14px;\n  background: #fff;\n  padding: 12px;\n}\n\n.notice.attention { border-left: 5px solid var(--amber); }\n.notice.urgent { border-left: 5px solid var(--red); background: #fff7f6; }\n.notice.good { border-left: 5px solid var(--sage); }\n\n.list-item {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n}\n\n.list-item time { color: var(--forest); font-weight: 900; white-space: nowrap; }\n.list-item h3 { margin: 0 0 4px; font-size: 15px; }\n.list-item p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }\n\n.week-grid {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(210px, 1fr));\n  gap: 12px;\n  overflow-x: auto;\n  padding: 2px 2px 18px;\n  scroll-snap-type: x proximity;\n}\n\n.day-column {\n  min-height: 230px;\n  padding: 12px;\n  border: 1px solid var(--line);\n  border-radius: 18px;\n  background: rgba(255,255,255,0.72);\n  scroll-snap-align: start;\n}\n\n.day-column.today { border-color: var(--forest); box-shadow: 0 0 0 2px rgba(61,76,63,0.1); }\n\n.day-head {\n  display: flex;\n  justify-content: space-between;\n  gap: 8px;\n  margin-bottom: 10px;\n}\n\n.day-head strong { font-size: 17px; }\n.day-head span { color: var(--muted); font-size: 11px; }\n\n.base-strip {\n  margin-bottom: 9px;\n  padding: 8px;\n  border-radius: 10px;\n  background: var(--wash);\n  color: var(--forest-2);\n  font-size: 11px;\n  line-height: 1.4;\n}\n\n.event-card {\n  width: 100%;\n  margin: 7px 0;\n  padding: 10px;\n  border-radius: 13px;\n  text-align: left;\n  color: var(--ink);\n}\n\n.event-card.confirmed { border-left: 5px solid var(--sage); }\n.event-card.pre { border-left: 5px solid var(--amber); }\n.event-card.cancelled { border-left: 5px solid var(--red); opacity: 0.68; }\n.event-card time { display: block; margin-bottom: 4px; color: var(--forest); font-weight: 900; }\n.event-card strong { display: block; font-size: 13px; }\n.event-card small { display: block; margin-top: 4px; color: var(--muted); line-height: 1.35; }\n\n.cards-list {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));\n  gap: 13px;\n}\n\n.payment-card,\n.mark-card,\n.base-card {\n  position: relative;\n  padding: 16px;\n  border-radius: 18px;\n}\n\n.payment-card { cursor: pointer; text-align: left; color: inherit; }\n.payment-card.pending { border-left: 5px solid var(--amber); }\n.payment-card.overdue { border-left: 5px solid var(--red); background: #fff8f7; }\n.payment-card.paid { border-left: 5px solid var(--sage); }\n\n.card-top {\n  display: flex;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 9px;\n}\n\n.card-top h3 { margin: 0; font-size: 17px; }\n.amount { color: var(--forest); font-size: 20px; font-weight: 900; white-space: nowrap; }\n\n.badge {\n  display: inline-flex;\n  align-items: center;\n  border-radius: 999px;\n  padding: 4px 8px;\n  background: var(--wash);\n  color: var(--forest);\n  font-size: 11px;\n  font-weight: 850;\n}\n\n.badge.red { background: #fde7e5; color: #8e302b; }\n.badge.green { background: #e3f2e5; color: #316541; }\n.badge.amber { background: #fff0cb; color: #7a5916; }\n\n.card-meta {\n  display: grid;\n  gap: 5px;\n  color: var(--muted);\n  font-size: 12px;\n  line-height: 1.4;\n}\n\n.legend {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n  margin: -4px 0 14px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.legend span { display: inline-flex; align-items: center; gap: 6px; }\n\n.dot { width: 10px; height: 10px; border-radius: 999px; background: var(--sage); }\n.dot.cancel { background: var(--amber); }\n.dot.stop { background: var(--red); }\n.dot.busy { background: var(--blue); }\n\n.mark-card { cursor: pointer; }\n.mark-card.plan { border-top: 4px solid var(--sage); }\n.mark-card.cancel { border-top: 4px solid var(--amber); }\n.mark-card.stop { border-top: 4px solid var(--red); }\n.mark-card.busy { border-top: 4px solid var(--blue); }\n\n.base-card .form-grid { margin-top: 12px; }\n\n.form-grid {\n  display: grid;\n  gap: 12px;\n  margin: 12px 0;\n}\n\n.form-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.form-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }\n\n.settings-panel { margin-top: 16px; }\n.settings-panel .button { margin-top: 4px; }\n\n.timeline { display: grid; gap: 0; }\n\n.timeline-item {\n  position: relative;\n  margin-left: 11px;\n  padding: 0 0 20px 24px;\n  border-left: 2px solid var(--line);\n}\n\n.timeline-item::before {\n  content: \"\";\n  position: absolute;\n  left: -6px;\n  top: 4px;\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n  background: var(--sage);\n  box-shadow: 0 0 0 4px var(--paper);\n}\n\n.timeline-item:last-child { border-left-color: transparent; }\n.timeline-item h3 { margin: 0 0 4px; font-size: 14px; }\n.timeline-item p { margin: 0; color: var(--muted); font-size: 12px; }\n\n.empty-state {\n  padding: 22px;\n  border: 1px dashed #bdc7bd;\n  border-radius: 16px;\n  color: var(--muted);\n  text-align: center;\n  background: rgba(255,255,255,0.55);\n}\n\nfooter {\n  display: flex;\n  justify-content: space-between;\n  gap: 15px;\n  padding: 18px clamp(16px, 4vw, 46px) max(22px, env(safe-area-inset-bottom));\n  color: var(--muted);\n  font-size: 11px;\n}\n\ndialog {\n  width: min(760px, calc(100% - 24px));\n  max-height: calc(100vh - 24px);\n  padding: 0;\n  border: 0;\n  border-radius: 24px;\n  background: var(--paper);\n  color: var(--ink);\n  box-shadow: 0 32px 90px rgba(25, 31, 26, 0.3);\n}\n\ndialog::backdrop { background: rgba(25, 31, 26, 0.58); backdrop-filter: blur(5px); }\n\n.dialog-form {\n  display: grid;\n  gap: 13px;\n  padding: clamp(18px, 4vw, 28px);\n  overflow: auto;\n}\n\n.dialog-close {\n  width: 42px;\n  height: 42px;\n  border: 1px solid var(--line);\n  border-radius: 13px;\n  background: #fff;\n  color: var(--muted);\n  font-size: 28px;\n  line-height: 1;\n}\n\n.dialog-actions {\n  display: flex;\n  justify-content: flex-end;\n  gap: 10px;\n  margin-top: 4px;\n}\n\n.dialog-actions .danger { margin-right: auto; }\n\n.toast {\n  position: fixed;\n  right: 18px;\n  bottom: max(18px, env(safe-area-inset-bottom));\n  z-index: 100;\n  max-width: min(380px, calc(100% - 36px));\n  transform: translateY(24px);\n  opacity: 0;\n  pointer-events: none;\n  border-radius: 14px;\n  background: #253028;\n  color: #fff;\n  padding: 12px 15px;\n  box-shadow: 0 16px 40px rgba(25,31,26,0.28);\n  transition: 0.22s ease;\n}\n\n.toast.show { transform: translateY(0); opacity: 1; }\n.toast.error { background: #7f302c; }\n\n.version-note {\n  margin: 4px 0 0;\n  color: rgba(255,255,255,0.72);\n  font-size: 11px;\n  font-weight: 700;\n}\n\n.people-legend { margin-top: 12px; }\n\n.legend-pill {\n  min-height: 28px;\n  padding: 5px 9px;\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  background: rgba(255,255,255,0.84);\n}\n\n.person-swatch {\n  width: 12px;\n  height: 12px;\n  border-radius: 4px;\n  background: #a8afa9;\n}\n\n.person-swatch.person-tone-0 { background: #8f72ad; }\n.person-swatch.person-tone-1 { background: #61937d; }\n.person-swatch.person-tone-2 { background: #b6855c; }\n.person-swatch.taxi-tone { background: #738093; }\n\n.event-card.person-tone-0,\n.occupied-block.person-tone-0 { background: #f6f0fb; border-color: #cbb7df; }\n.event-card.person-tone-1,\n.occupied-block.person-tone-1 { background: #eef8f2; border-color: #a8cbb9; }\n.event-card.person-tone-2,\n.occupied-block.person-tone-2 { background: #fbf4ec; border-color: #ddbea2; }\n.event-card.taxi-tone,\n.occupied-block.taxi-tone { background: #f0f3f6; border-color: #b5bfca; }\n.event-card.oneoff { border-style: dashed; }\n.event-card.conflict { outline: 3px solid rgba(180,76,69,0.55); outline-offset: 1px; }\n.event-card.moved { border-left: 5px solid var(--blue); }\n\n.status-line {\n  display: flex;\n  gap: 5px;\n  flex-wrap: wrap;\n  margin-top: 7px;\n}\n\n.base-strip {\n  display: grid;\n  gap: 3px;\n}\n\n.base-strip strong { color: var(--ink); }\n\n.day-controls { margin-bottom: 14px; }\n\n.schedule-table-wrap {\n  overflow: auto;\n  max-height: min(72vh, 850px);\n  border: 1px solid var(--line);\n  border-radius: 18px;\n  background: #fff;\n  box-shadow: var(--shadow);\n}\n\n.day-table {\n  width: 100%;\n  min-width: 690px;\n  border-collapse: separate;\n  border-spacing: 0;\n  table-layout: fixed;\n}\n\n.day-table th,\n.day-table td {\n  border-right: 1px solid var(--line);\n  border-bottom: 1px solid var(--line);\n}\n\n.day-table th {\n  position: sticky;\n  top: 0;\n  z-index: 4;\n  height: 44px;\n  padding: 9px;\n  background: #eef2eb;\n  color: var(--forest);\n  text-align: left;\n}\n\n.day-table th:first-child,\n.time-cell {\n  width: 72px;\n  min-width: 72px;\n}\n\n.day-table th:first-child { left: 0; z-index: 6; }\n\n.time-cell {\n  position: sticky;\n  left: 0;\n  z-index: 3;\n  padding: 8px;\n  background: #f8f7f2;\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 850;\n  vertical-align: top;\n}\n\n.day-slot-cell { height: 54px; padding: 0; }\n\n.day-slot {\n  width: 100%;\n  min-height: 53px;\n  display: grid;\n  place-items: center;\n  border: 0;\n  background: transparent;\n  color: var(--muted);\n}\n\n.day-slot:hover { background: #f1f5ef; }\n.day-slot.base-slot { background: repeating-linear-gradient(135deg, #f0f2ef, #f0f2ef 8px, #e8ebe7 8px, #e8ebe7 16px); }\n.mini-base { max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }\n\n.occupied-cell { padding: 5px; vertical-align: top; background: #fafbf8; }\n.occupied-group { display: grid; gap: 5px; min-height: 100%; }\n.occupied-block { min-height: 100%; margin: 0; }\n.empty-table { padding: 30px; color: var(--muted); text-align: center; }\n\n.months-wrap { display: grid; gap: 18px; }\n\n.month-card {\n  overflow: hidden;\n  border: 1px solid var(--line);\n  border-radius: 20px;\n  background: rgba(255,255,255,0.92);\n  box-shadow: var(--shadow);\n}\n\n.month-card > h3 { margin: 0; padding: 15px 17px; font-size: 21px; }\n.month-scroll { overflow-x: auto; }\n\n.month-grid {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(112px, 1fr));\n  min-width: 810px;\n  border-left: 1px solid var(--line);\n  border-top: 1px solid var(--line);\n}\n\n.month-head {\n  padding: 8px;\n  border-right: 1px solid var(--line);\n  border-bottom: 1px solid var(--line);\n  background: #edf1eb;\n  color: var(--forest);\n  font-size: 11px;\n  font-weight: 900;\n  text-align: center;\n}\n\n.month-day {\n  min-height: 116px;\n  padding: 7px;\n  border-right: 1px solid var(--line);\n  border-bottom: 1px solid var(--line);\n  background: #fff;\n}\n\n.month-day.empty { background: #f4f4f0; }\n.month-day.busy-primary { background: #f0f7f2; box-shadow: inset 4px 0 0 #61937d; }\n.month-day.busy-secondary { background: #f4f0f8; box-shadow: inset 4px 0 0 #8f72ad; }\n.month-day.busy-both { background: linear-gradient(135deg, #eef7f1 0 50%, #f4eff8 50% 100%); box-shadow: inset 4px 0 0 #61937d, inset -4px 0 0 #8f72ad; }\n.month-day.busy-other { background: #f7f3ed; box-shadow: inset 4px 0 0 #b6855c; }\n.day-num { margin-bottom: 6px; color: var(--forest); font-size: 12px; font-weight: 900; }\n\n.cal-chip {\n  width: 100%;\n  display: block;\n  margin: 4px 0;\n  padding: 5px 6px;\n  border: 0;\n  border-radius: 7px;\n  color: var(--ink);\n  font-size: 10px;\n  line-height: 1.3;\n  text-align: left;\n  white-space: normal;\n}\n\nbutton.cal-chip { cursor: pointer; }\n.cal-regular { background: #eef2eb; }\n.cal-plan { background: #dcebdc; }\n.cal-cancel { background: #ffe3b5; color: #6f4c0e; }\n.cal-stop { background: #f8d5d2; color: #7e2b27; }\n.busy-note-primary { background: #d9ede0; }\n.busy-note-secondary { background: #e7dbf0; }\n.busy-note-other { background: #efe2d4; }\n\n.legend-pill.plan { border-color: #a8c4a8; background: #eaf4ea; }\n.legend-pill.cancel { border-color: #eccb86; background: #fff2d7; }\n.legend-pill.stop { border-color: #e0a29d; background: #fde7e5; }\n.legend-pill.busy-primary { border-color: #9bc0ad; background: #e7f3eb; }\n.legend-pill.busy-secondary { border-color: #bea7d1; background: #f0e8f6; }\n\n.sub-section-head { margin-top: 24px; }\n\n.dialog-group {\n  min-width: 0;\n  margin: 2px 0;\n  padding: 13px;\n  border: 1px solid var(--line);\n  border-radius: 15px;\n}\n\n.dialog-group legend { padding: 0 6px; color: var(--forest); font-weight: 850; }\n.dialog-group.inactive { opacity: 0.55; }\n.base-payment { border-left: 5px solid var(--blue); }\n\n@media (max-width: 840px) {\n  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .content-grid { grid-template-columns: 1fr; }\n  .form-grid.three { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n}\n\n@media (max-width: 600px) {\n  .topbar { align-items: flex-start; padding-left: 15px; padding-right: 15px; }\n  .topbar .eyebrow { display: none; }\n  .topbar h1 { font-size: 22px; }\n  .account { max-width: 190px; }\n  #sync-state { order: 3; }\n  .tabs { padding-left: 12px; padding-right: 12px; }\n  main { width: min(100% - 20px, 1180px); }\n  .hero-card { align-items: flex-start; flex-direction: column; }\n  .hero-card .button { width: 100%; }\n  .section-head { align-items: flex-end; }\n  .form-grid.two,\n  .form-grid.three { grid-template-columns: 1fr; }\n  .week-grid { grid-template-columns: repeat(7, minmax(82vw, 1fr)); }\n  .schedule-table-wrap { max-height: 68vh; }\n  .month-day { min-height: 105px; }\n  .dialog-actions { position: sticky; bottom: -1px; padding-top: 10px; background: var(--paper); }\n  footer { flex-direction: column; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }\n}\n";
const APP_JS = "\"use strict\";\n\nconst EDGE_ORIGIN = \"https://iymstmgtmkquhgypfqlg.supabase.co\";\nconst EDGE_BASE = EDGE_ORIGIN + \"/functions/v1/family-dispatcher\";\nconst API_BASE = location.hostname.endsWith(\".supabase.co\")\n  ? location.pathname.replace(/\\/$/, \"\") + \"/api\"\n  : EDGE_BASE + \"/api\";\n\nconst STORAGE_TOKEN = \"family_dispatcher_session_v2\";\nconst STORAGE_MEMBER = \"family_dispatcher_member_v2\";\nconst STORAGE_LOGIN = \"family_dispatcher_login_v2\";\nconst DAYS = [\"Понедельник\", \"Вторник\", \"Среда\", \"Четверг\", \"Пятница\", \"Суббота\", \"Воскресенье\"];\nconst SHORT_DAYS = [\"Пн\", \"Вт\", \"Ср\", \"Чт\", \"Пт\", \"Сб\", \"Вс\"];\nconst MONTH_NAMES = [\"\", \"Январь\", \"Февраль\", \"Март\", \"Апрель\", \"Май\", \"Июнь\", \"Июль\", \"Август\", \"Сентябрь\", \"Октябрь\", \"Ноябрь\", \"Декабрь\"];\nconst CALENDAR_YEAR = 2026;\nconst CALENDAR_MONTHS = [9, 10, 11, 12];\n\nconst state = {\n  token: localStorage.getItem(STORAGE_TOKEN) || \"\",\n  member: readStoredMember(),\n  events: [],\n  payments: [],\n  base: [],\n  calendar: [],\n  changes: [],\n  settings: {},\n  people: [],\n  children: [],\n  loading: false,\n  poller: null,\n};\n\nconst byId = (id) => document.getElementById(id);\n\nfunction readStoredMember() {\n  try {\n    return JSON.parse(localStorage.getItem(STORAGE_MEMBER) || \"null\");\n  } catch {\n    return null;\n  }\n}\n\nfunction node(tag, className, text) {\n  const item = document.createElement(tag);\n  if (className) item.className = className;\n  if (text !== undefined && text !== null) item.textContent = String(text);\n  return item;\n}\n\nfunction formatMoney(value) {\n  return new Intl.NumberFormat(\"ru-RU\", {\n    style: \"currency\",\n    currency: \"RUB\",\n    maximumFractionDigits: 0,\n  }).format(Number(value || 0));\n}\n\nfunction formatDate(value, options = { day: \"numeric\", month: \"long\" }) {\n  if (!value) return \"дата не указана\";\n  const date = new Date(value + (value.length === 10 ? \"T12:00:00\" : \"\"));\n  if (Number.isNaN(date.getTime())) return value;\n  return new Intl.DateTimeFormat(\"ru-RU\", options).format(date);\n}\n\nfunction formatDateTime(value) {\n  if (!value) return \"\";\n  const date = new Date(value);\n  if (Number.isNaN(date.getTime())) return value;\n  return new Intl.DateTimeFormat(\"ru-RU\", {\n    day: \"2-digit\",\n    month: \"short\",\n    hour: \"2-digit\",\n    minute: \"2-digit\",\n  }).format(date);\n}\n\nfunction shortTime(value) {\n  return String(value || \"\").slice(0, 5);\n}\n\nfunction todayIso() {\n  const now = new Date();\n  const offset = now.getTimezoneOffset() * 60000;\n  return new Date(now.getTime() - offset).toISOString().slice(0, 10);\n}\n\nfunction mondayIndex(date = new Date()) {\n  return (date.getDay() + 6) % 7;\n}\n\nfunction minutes(value) {\n  const [hours = 0, mins = 0] = shortTime(value).split(\":\").map(Number);\n  return hours * 60 + mins;\n}\n\nfunction hhmm(value) {\n  const total = Math.max(0, Math.min(1439, Math.round(Number(value) || 0)));\n  return String(Math.floor(total / 60)).padStart(2, \"0\") + \":\" + String(total % 60).padStart(2, \"0\");\n}\n\nfunction isoDate(year, month, day) {\n  return `${year}-${String(month).padStart(2, \"0\")}-${String(day).padStart(2, \"0\")}`;\n}\n\nfunction dateUtc(value) {\n  const [year, month, day] = String(value || \"\").split(\"-\").map(Number);\n  return new Date(Date.UTC(year, month - 1, day));\n}\n\nfunction dayIndexFromIso(value) {\n  return (dateUtc(value).getUTCDay() + 6) % 7;\n}\n\nfunction inRange(value, start, end) {\n  return Boolean(value && start && value >= start && value <= (end || start));\n}\n\nfunction eventInterval(item) {\n  const buffer = Number(item.buffer_min || 0);\n  return {\n    start: minutes(item.start_time) - Number(item.travel_before_min || 0) - buffer,\n    end: minutes(item.end_time) + Number(item.travel_after_min || 0) + buffer,\n  };\n}\n\nfunction actualOverlap(first, second) {\n  return minutes(first.start_time) < minutes(second.end_time) && minutes(second.start_time) < minutes(first.end_time);\n}\n\nfunction travelOverlap(first, second) {\n  const firstInterval = eventInterval(first);\n  const secondInterval = eventInterval(second);\n  return firstInterval.start < secondInterval.end && secondInterval.start < firstInterval.end;\n}\n\nfunction confirmationText(value) {\n  return value === \"confirmed\" ? \"Подтверждено\" : \"Предварительно\";\n}\n\nfunction eventStatusText(value) {\n  return {\n    pre: \"Предварительно\",\n    confirmed: \"Подтверждено\",\n    moved: \"Перенесено\",\n    cancelled: \"Отменено\",\n  }[value] || \"Предварительно\";\n}\n\nfunction policyText(value) {\n  return { burn: \"Сгорает\", shift: \"Переносится\", case: \"Индивидуально\" }[value] || \"Сгорает\";\n}\n\nfunction eventTypeText(value) {\n  return {\n    regular: \"Регулярное\",\n    oneoff: \"Разовое\",\n    doctor: \"Врач\",\n    family: \"Семейное\",\n  }[value] || \"Событие\";\n}\n\nfunction personTone(name) {\n  if (!name) return \"person-tone-none\";\n  if (name === \"Такси\") return \"taxi-tone\";\n  const index = state.people.findIndex((item) => item.display_name === name);\n  return index >= 0 ? `person-tone-${index % 3}` : \"person-tone-none\";\n}\n\nfunction baseForChild(child) {\n  return state.base.find((item) => item.child === child) || null;\n}\n\nfunction conflicts() {\n  const active = state.events.filter((item) => item.event_status !== \"cancelled\");\n  const result = [];\n  for (let firstIndex = 0; firstIndex < active.length; firstIndex += 1) {\n    for (let secondIndex = firstIndex + 1; secondIndex < active.length; secondIndex += 1) {\n      const first = active[firstIndex];\n      const second = active[secondIndex];\n      if (Number(first.day_index) !== Number(second.day_index)) continue;\n      if (first.child === second.child && actualOverlap(first, second)) {\n        result.push({ type: \"child\", first, second, message: `У ${first.child} пересекаются два события` });\n      }\n      if (first.responsible && first.responsible === second.responsible && first.responsible !== \"Такси\" && travelOverlap(first, second)) {\n        result.push({ type: \"adult\", first, second, message: `${first.responsible}: два дела одновременно с учётом дороги` });\n      }\n    }\n  }\n  return result;\n}\n\nfunction conflictIds() {\n  const ids = new Set();\n  conflicts().forEach((item) => {\n    ids.add(item.first.id);\n    ids.add(item.second.id);\n  });\n  return ids;\n}\n\nfunction isOverdue(payment) {\n  return payment.payment_status !== \"paid\" && payment.pay_date && payment.pay_date < todayIso();\n}\n\nfunction isDueSoon(payment) {\n  if (payment.payment_status === \"paid\" || !payment.pay_date) return false;\n  const due = new Date(payment.pay_date + \"T12:00:00\");\n  const now = new Date(todayIso() + \"T12:00:00\");\n  const days = Math.ceil((due - now) / 86400000);\n  return days >= 0 && days <= 7;\n}\n\nfunction tableLabel(value) {\n  return {\n    schedule_events: \"расписание\",\n    payments: \"оплаты\",\n    base_schedule: \"базовый режим\",\n    calendar_marks: \"календарь\",\n    app_settings: \"настройки\",\n  }[value] || \"данные\";\n}\n\nfunction actionLabel(value) {\n  return { INSERT: \"добавлено\", UPDATE: \"изменено\", DELETE: \"удалено\" }[value] || String(value || \"\").toLowerCase();\n}\n\nfunction personByKey(key) {\n  const person = state.people.find((item) => item.login_key === key);\n  return person ? person.display_name : \"Участник\";\n}\n\nfunction showToast(message, isError = false) {\n  const toast = byId(\"toast\");\n  toast.textContent = message;\n  toast.className = \"toast show\" + (isError ? \" error\" : \"\");\n  clearTimeout(showToast.timer);\n  showToast.timer = setTimeout(() => {\n    toast.className = \"toast\";\n  }, 3400);\n}\n\nfunction setSync(message, kind = \"\") {\n  const sync = byId(\"sync-state\");\n  sync.textContent = message;\n  sync.className = \"sync-state\" + (kind ? \" \" + kind : \"\");\n}\n\nfunction setButtonBusy(button, busy, label) {\n  if (!button) return;\n  if (busy) {\n    button.dataset.originalLabel = button.textContent;\n    button.textContent = label || \"Сохраняю…\";\n    button.disabled = true;\n  } else {\n    button.textContent = button.dataset.originalLabel || button.textContent;\n    button.disabled = false;\n  }\n}\n\nasync function api(route, options = {}) {\n  const headers = { \"Content-Type\": \"application/json\" };\n  if (options.auth !== false && state.token) headers.Authorization = \"Bearer \" + state.token;\n  const response = await fetch(API_BASE + \"/\" + route, {\n    method: options.method || \"POST\",\n    headers,\n    body: options.body === undefined ? \"{}\" : JSON.stringify(options.body),\n    cache: \"no-store\",\n  });\n  let payload = null;\n  const text = await response.text();\n  if (text) {\n    try { payload = JSON.parse(text); } catch { payload = { error: text }; }\n  }\n  if (!response.ok) {\n    const error = new Error(payload && payload.error ? payload.error : \"Ошибка соединения\");\n    error.status = response.status;\n    throw error;\n  }\n  return payload;\n}\n\nfunction rememberSession(token, member, loginKey) {\n  state.token = token;\n  state.member = member;\n  localStorage.setItem(STORAGE_TOKEN, token);\n  localStorage.setItem(STORAGE_MEMBER, JSON.stringify(member));\n  localStorage.setItem(STORAGE_LOGIN, loginKey);\n}\n\nfunction forgetSession() {\n  state.token = \"\";\n  state.member = null;\n  localStorage.removeItem(STORAGE_TOKEN);\n  localStorage.removeItem(STORAGE_MEMBER);\n}\n\nfunction showLogin(message = \"\") {\n  clearInterval(state.poller);\n  byId(\"app\").hidden = true;\n  byId(\"login-screen\").hidden = false;\n  byId(\"login-message\").textContent = message;\n  byId(\"login-key\").value = localStorage.getItem(STORAGE_LOGIN) || \"\";\n  byId(\"login-code\").value = \"\";\n  setTimeout(() => (byId(\"login-key\").value ? byId(\"login-code\") : byId(\"login-key\")).focus(), 50);\n}\n\nfunction showApp() {\n  byId(\"login-screen\").hidden = true;\n  byId(\"app\").hidden = false;\n  byId(\"member-name\").textContent = state.member ? state.member.display_name : \"\";\n  clearInterval(state.poller);\n  state.poller = setInterval(() => {\n    if (!document.hidden && state.token && !state.loading) loadSnapshot(true);\n  }, 30000);\n}\n\nasync function login(event) {\n  event.preventDefault();\n  const button = byId(\"login-button\");\n  const loginKey = byId(\"login-key\").value.trim().toLowerCase();\n  const code = byId(\"login-code\").value.trim();\n  byId(\"login-message\").textContent = \"\";\n  if (!loginKey || !code) return;\n  setButtonBusy(button, true, \"Проверяю…\");\n  try {\n    const result = await api(\"login\", {\n      auth: false,\n      body: { login_key: loginKey, code },\n    });\n    rememberSession(result.token, result.member, loginKey);\n    byId(\"login-code\").value = \"\";\n    showApp();\n    await loadSnapshot();\n  } catch (error) {\n    byId(\"login-message\").textContent =\n      error.status === 429\n        ? \"Слишком много попыток. Подождите 15 минут.\"\n        : \"Имя входа или код не подошли.\";\n  } finally {\n    setButtonBusy(button, false);\n  }\n}\n\nasync function logout() {\n  const token = state.token;\n  forgetSession();\n  try {\n    if (token) {\n      state.token = token;\n      await api(\"logout\");\n    }\n  } catch {\n    // The local session is removed even if the server is temporarily unavailable.\n  } finally {\n    forgetSession();\n    showLogin(\"Вы вышли из общей версии.\");\n  }\n}\n\nasync function loadSnapshot(quiet = false) {\n  if (state.loading) return;\n  state.loading = true;\n  if (!quiet) setSync(\"загрузка…\");\n  try {\n    const data = await api(\"snapshot\");\n    state.member = data.member;\n    state.events = data.events || [];\n    state.payments = data.payments || [];\n    state.base = data.base || [];\n    state.calendar = data.calendar || [];\n    state.changes = data.changes || [];\n    state.settings = data.settings || {};\n    state.people = data.people || [];\n    state.children = data.children || [];\n    localStorage.setItem(STORAGE_MEMBER, JSON.stringify(state.member));\n    showApp();\n    renderAll();\n    setSync(\"всё синхронно\", \"ok\");\n    byId(\"last-loaded\").textContent = \"Обновлено \" + new Date().toLocaleTimeString(\"ru-RU\", { hour: \"2-digit\", minute: \"2-digit\" });\n  } catch (error) {\n    if (error.status === 401) {\n      forgetSession();\n      showLogin(\"Сессия закончилась. Войдите снова.\");\n      return;\n    }\n    setSync(\"нет связи\", \"error\");\n    if (!quiet) showToast(\"Не удалось загрузить данные. Проверьте интернет.\", true);\n  } finally {\n    state.loading = false;\n  }\n}\n\nfunction renderAll() {\n  const childSuffix = state.children.length ? \" · \" + state.children.join(\" и \") : \"\";\n  byId(\"dispatcher-title\").textContent = \"Семейный диспетчер\" + childSuffix;\n  refreshDynamicOptions();\n  renderPeopleLegend();\n  renderOverview();\n  renderWeek();\n  renderDay();\n  renderPayments();\n  renderCalendar();\n  renderBase();\n  renderConflicts();\n  renderChanges();\n}\n\nfunction renderPeopleLegend() {\n  const root = byId(\"people-legend\");\n  const items = state.people.map((person) => {\n    const item = node(\"span\", \"legend-pill\");\n    item.append(node(\"i\", \"person-swatch \" + personTone(person.display_name)), document.createTextNode(person.display_name));\n    return item;\n  });\n  const taxi = node(\"span\", \"legend-pill\");\n  taxi.append(node(\"i\", \"person-swatch taxi-tone\"), document.createTextNode(\"Такси\"));\n  items.push(taxi);\n  root.replaceChildren(...items);\n}\n\nfunction renderOverview() {\n  const today = new Date();\n  const day = mondayIndex(today);\n  const todayEvents = state.events\n    .filter((item) => item.day_index === day && item.event_status !== \"cancelled\")\n    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));\n  byId(\"today-title\").textContent = new Intl.DateTimeFormat(\"ru-RU\", {\n    weekday: \"long\",\n    day: \"numeric\",\n    month: \"long\",\n  }).format(today);\n  byId(\"today-summary\").textContent = todayEvents.length\n    ? \"Сегодня занятий: \" + todayEvents.length\n    : \"На сегодня занятий в расписании нет.\";\n\n  const pending = state.events.filter((item) =>\n    item.event_status === \"pre\" || item.responsible_status === \"pre\"\n  ).length;\n  const due = state.payments.filter((item) => isOverdue(item) || isDueSoon(item)).length;\n  const conflictRows = conflicts();\n  const metrics = [\n    [state.events.length, \"занятий в неделе\"],\n    [conflictRows.length, \"накладок\"],\n    [pending, \"нужно подтвердить\"],\n    [due, \"оплат требуют внимания\"],\n  ];\n  const metricRoot = byId(\"metrics\");\n  metricRoot.replaceChildren(...metrics.map(([value, label]) => {\n    const card = node(\"article\", \"metric-card\");\n    card.append(node(\"strong\", \"\", value), node(\"span\", \"\", label));\n    return card;\n  }));\n\n  const attention = [];\n  conflictRows.slice(0, 5).forEach((item) => {\n    attention.push({\n      kind: \"urgent\",\n      title: item.message,\n      text: `${DAYS[item.first.day_index]} · ${item.first.title} / ${item.second.title}`,\n    });\n  });\n  state.payments\n    .filter((item) => isOverdue(item))\n    .sort((a, b) => String(a.pay_date).localeCompare(String(b.pay_date)))\n    .forEach((item) => {\n      attention.push({\n        kind: \"urgent\",\n        title: \"Просрочена оплата: \" + item.activity,\n        text: formatDate(item.pay_date) + \" · \" + formatMoney(item.amount),\n      });\n    });\n  state.payments\n    .filter((item) => isDueSoon(item))\n    .sort((a, b) => String(a.pay_date).localeCompare(String(b.pay_date)))\n    .forEach((item) => {\n      attention.push({\n        kind: \"attention\",\n        title: \"Скоро оплата: \" + item.activity,\n        text: formatDate(item.pay_date) + \" · \" + formatMoney(item.amount),\n      });\n    });\n  state.events\n    .filter((item) => item.responsible_status === \"pre\" && item.event_status !== \"cancelled\")\n    .slice(0, 5)\n    .forEach((item) => {\n      attention.push({\n        kind: \"attention\",\n        title: \"Нужно подтвердить сопровождающего\",\n        text: SHORT_DAYS[item.day_index] + \" · \" + shortTime(item.start_time) + \" · \" + item.title,\n      });\n    });\n\n  const attentionRoot = byId(\"attention-list\");\n  if (!attention.length) {\n    attentionRoot.replaceChildren(emptyState(\"Сейчас ничего не горит.\"));\n  } else {\n    attentionRoot.replaceChildren(...attention.slice(0, 8).map((item) => {\n      const card = node(\"div\", \"notice \" + item.kind);\n      card.append(node(\"strong\", \"\", item.title), node(\"div\", \"tiny\", item.text));\n      return card;\n    }));\n  }\n\n  const nextRoot = byId(\"next-events\");\n  if (!todayEvents.length) {\n    nextRoot.replaceChildren(emptyState(\"Сегодня свободный день.\"));\n  } else {\n    nextRoot.replaceChildren(...todayEvents.map((item) => eventListItem(item)));\n  }\n}\n\nfunction eventListItem(item) {\n  const row = node(\"div\", \"list-item\");\n  const text = node(\"div\");\n  text.append(\n    node(\"h3\", \"\", item.title),\n    node(\"p\", \"\", [item.child, item.responsible || \"сопровождающий не назначен\"].join(\" · \"))\n  );\n  row.append(node(\"time\", \"\", shortTime(item.start_time)), text);\n  return row;\n}\n\nfunction badge(text, tone = \"\") {\n  return node(\"span\", \"badge\" + (tone ? \" \" + tone : \"\"), text);\n}\n\nfunction baseStrip(item) {\n  const strip = node(\"div\", \"base-strip\");\n  strip.append(\n    node(\"strong\", \"\", `${shortTime(item.start_time)}–${shortTime(item.end_time)} ${item.child}`),\n    node(\"span\", \"\", \"🏫 \" + item.institution),\n    node(\"span\", \"\", `→ ${item.drop_person || \"не назначено\"} (${confirmationText(item.drop_status)}) · ← ${item.pickup_person || \"не назначено\"} (${confirmationText(item.pickup_status)})`)\n  );\n  if (Number(item.amount || 0) || item.pay_date || item.payer) {\n    strip.append(node(\"span\", \"\", `💳 ${formatMoney(item.amount)} · ${item.payer || \"не назначено\"} (${confirmationText(item.payer_status)})`));\n  }\n  return strip;\n}\n\nfunction eventCard(item, badIds, compact = false) {\n  const special = [\"oneoff\", \"doctor\", \"family\"].includes(item.event_type) ? \" oneoff\" : \"\";\n  const conflict = badIds.has(item.id) ? \" conflict\" : \"\";\n  const card = node(\"button\", `event-card ${item.event_status || \"pre\"} ${personTone(item.responsible)}${special}${conflict}`);\n  card.type = \"button\";\n  card.append(\n    node(\"time\", \"\", `${shortTime(item.start_time)}–${shortTime(item.end_time)}`),\n    node(\"strong\", \"\", `${item.child} · ${item.title}`),\n    node(\"small\", \"\", `👤 ${item.responsible || \"не назначено\"} · ${confirmationText(item.responsible_status)}`)\n  );\n  const statusLine = node(\"div\", \"status-line\");\n  statusLine.append(\n    badge(eventStatusText(item.event_status), item.event_status === \"confirmed\" ? \"green\" : item.event_status === \"cancelled\" ? \"red\" : \"amber\"),\n    badge(eventTypeText(item.event_type))\n  );\n  card.append(statusLine);\n  if (!compact && item.payer) card.append(node(\"small\", \"\", `💳 ${item.payer} · ${confirmationText(item.payer_status)}`));\n  card.addEventListener(\"click\", () => openEvent(item));\n  return card;\n}\n\nfunction renderWeek() {\n  const current = mondayIndex();\n  const badIds = conflictIds();\n  const columns = DAYS.map((dayName, dayIndex) => {\n    const column = node(\"article\", \"day-column\" + (dayIndex === current ? \" today\" : \"\"));\n    const head = node(\"div\", \"day-head\");\n    head.append(node(\"strong\", \"\", dayName), node(\"span\", \"\", dayIndex === current ? \"сегодня\" : \"\"));\n    column.append(head);\n    if (dayIndex < 5) state.base.forEach((item) => column.append(baseStrip(item)));\n    const events = state.events\n      .filter((item) => Number(item.day_index) === dayIndex)\n      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));\n    if (!events.length) column.append(emptyState(\"Нет занятий\"));\n    events.forEach((item) => column.append(eventCard(item, badIds)));\n    return column;\n  });\n  byId(\"week-grid\").replaceChildren(...columns);\n}\n\nfunction clusterEvents(items) {\n  const clusters = [];\n  const sorted = [...items].sort((a, b) => minutes(a.start_time) - minutes(b.start_time));\n  sorted.forEach((item) => {\n    const start = minutes(item.start_time);\n    const end = Math.max(start + 30, minutes(item.end_time));\n    const last = clusters[clusters.length - 1];\n    if (last && start < last.end) {\n      last.events.push(item);\n      last.end = Math.max(last.end, end);\n    } else {\n      clusters.push({ start, end, events: [item] });\n    }\n  });\n  return clusters;\n}\n\nfunction renderDay() {\n  const day = Number(byId(\"day-select\").value || 0);\n  const selected = byId(\"child-filter\").value || \"all\";\n  const visibleChildren = selected === \"all\" ? state.children : state.children.filter((child) => child === selected);\n  byId(\"day-table-head\").replaceChildren(node(\"th\", \"\", \"Время\"), ...visibleChildren.map((child) => node(\"th\", \"\", child)));\n  const body = byId(\"day-table-body\");\n  if (!visibleChildren.length) {\n    const row = node(\"tr\");\n    const cell = node(\"td\", \"empty-table\", \"Пока нет данных о детях.\");\n    cell.colSpan = 2;\n    row.append(cell);\n    body.replaceChildren(row);\n    return;\n  }\n  const configuredStart = minutes(state.settings.day_start || \"07:00\");\n  const configuredEnd = minutes(state.settings.day_end || \"22:00\");\n  const dayStart = Math.floor(configuredStart / 30) * 30;\n  const dayEnd = Math.max(dayStart + 30, Math.ceil(configuredEnd / 30) * 30);\n  const clusterMaps = new Map();\n  visibleChildren.forEach((child) => {\n    const map = new Map();\n    clusterEvents(state.events.filter((item) => Number(item.day_index) === day && item.child === child)).forEach((cluster) => {\n      const start = Math.max(dayStart, Math.floor(cluster.start / 30) * 30);\n      const end = Math.min(dayEnd, Math.ceil(cluster.end / 30) * 30);\n      if (start < end) map.set(start, { ...cluster, start, end });\n    });\n    clusterMaps.set(child, map);\n  });\n  const skips = new Map(visibleChildren.map((child) => [child, 0]));\n  const badIds = conflictIds();\n  const rows = [];\n  for (let time = dayStart; time < dayEnd; time += 30) {\n    const row = node(\"tr\");\n    row.append(node(\"td\", \"time-cell\", hhmm(time)));\n    visibleChildren.forEach((child) => {\n      const skip = skips.get(child) || 0;\n      if (skip > 0) {\n        skips.set(child, skip - 1);\n        return;\n      }\n      const cluster = clusterMaps.get(child).get(time);\n      if (cluster) {\n        const span = Math.max(1, Math.ceil((cluster.end - cluster.start) / 30));\n        skips.set(child, span - 1);\n        const cell = node(\"td\", \"occupied-cell\");\n        cell.rowSpan = span;\n        const group = node(\"div\", \"occupied-group\");\n        cluster.events.forEach((item) => {\n          const block = eventCard(item, badIds, true);\n          block.classList.add(\"occupied-block\");\n          const interval = eventInterval(item);\n          block.append(node(\"small\", \"\", `С дорогой: ${hhmm(interval.start)}–${hhmm(interval.end)}`));\n          group.append(block);\n        });\n        cell.append(group);\n        row.append(cell);\n        return;\n      }\n      const cell = node(\"td\", \"day-slot-cell\");\n      const base = day < 5 ? baseForChild(child) : null;\n      const insideBase = base && time >= minutes(base.start_time) && time < minutes(base.end_time);\n      const slot = node(\"button\", \"day-slot\" + (insideBase ? \" base-slot\" : \"\"));\n      slot.type = \"button\";\n      slot.setAttribute(\"aria-label\", `Добавить событие: ${DAYS[day]}, ${child}, ${hhmm(time)}`);\n      if (insideBase) slot.append(node(\"span\", \"mini-base\", \"🏫 \" + base.institution));\n      slot.addEventListener(\"click\", () => openEvent(null, { dayIndex: day, child, startTime: hhmm(time) }));\n      cell.append(slot);\n      row.append(cell);\n    });\n    rows.push(row);\n  }\n  body.replaceChildren(...rows);\n}\n\nfunction paymentState(item) {\n  if (item.payment_status === \"paid\") return \"paid\";\n  if (isOverdue(item)) return \"overdue\";\n  return \"pending\";\n}\n\nfunction makePaymentCard(item) {\n  const status = paymentState(item);\n  const card = node(\"button\", \"payment-card \" + status);\n  card.type = \"button\";\n  const top = node(\"div\", \"card-top\");\n  top.append(node(\"h3\", \"\", item.child + \" · \" + item.activity), node(\"span\", \"amount\", formatMoney(item.amount)));\n  const statusBadge = badge(\n    status === \"paid\" ? \"Оплачено\" : status === \"overdue\" ? \"Просрочено\" : \"Ожидает оплаты\",\n    status === \"paid\" ? \"green\" : status === \"overdue\" ? \"red\" : \"amber\"\n  );\n  const purchased = Number(item.purchased || 0);\n  const used = Number(item.used || 0);\n  const saved = Number(item.saved || 0);\n  const burned = Number(item.burned || 0);\n  const remaining = Math.max(0, purchased - used - burned);\n  const meta = node(\"div\", \"card-meta\");\n  meta.append(\n    node(\"span\", \"\", \"Срок: \" + formatDate(item.pay_date)),\n    node(\"span\", \"\", `Платит: ${item.payer || \"не назначено\"} · ${confirmationText(item.payer_status)}`),\n    node(\"span\", \"\", `Куплено: ${purchased} · использовано: ${used} · сохранено: ${saved} · сгорело: ${burned}`),\n    node(\"span\", \"\", `Осталось: ${remaining} · при пропуске: ${policyText(item.policy)}`)\n  );\n  if (item.note) meta.append(node(\"span\", \"\", item.note));\n  card.append(top, statusBadge, meta);\n  card.addEventListener(\"click\", () => openPayment(item));\n  return card;\n}\n\nfunction makeBasePaymentCard(item) {\n  const card = node(\"article\", \"payment-card base-payment\");\n  const top = node(\"div\", \"card-top\");\n  top.append(node(\"h3\", \"\", item.child + \" · \" + item.institution), node(\"span\", \"amount\", formatMoney(item.amount)));\n  const meta = node(\"div\", \"card-meta\");\n  meta.append(\n    node(\"span\", \"\", \"Базовый режим\"),\n    node(\"span\", \"\", \"Срок: \" + formatDate(item.pay_date)),\n    node(\"span\", \"\", `Платит: ${item.payer || \"не назначено\"} · ${confirmationText(item.payer_status)}`),\n    node(\"span\", \"\", \"Править во вкладке «Базовый режим»\")\n  );\n  card.append(top, meta);\n  return card;\n}\n\nfunction renderPayments() {\n  const cards = state.base\n    .filter((item) => Number(item.amount || 0) > 0 || item.pay_date || item.payer)\n    .map((item) => makeBasePaymentCard(item));\n  const payments = [...state.payments].sort((a, b) => {\n    const rank = { overdue: 0, pending: 1, paid: 2 };\n    const difference = rank[paymentState(a)] - rank[paymentState(b)];\n    return difference || String(a.pay_date || \"9999\").localeCompare(String(b.pay_date || \"9999\"));\n  });\n  cards.push(...payments.map((item) => makePaymentCard(item)));\n  byId(\"payments-list\").replaceChildren(...(cards.length ? cards : [emptyState(\"Оплат пока нет.\")]));\n}\n\nfunction markKind(item) {\n  return item.mark_type === \"busy\" ? \"busy\" : item.mark_type;\n}\n\nfunction markTitle(item) {\n  if (item.title) return item.title;\n  if (item.mark_type === \"busy\") return personByKey(item.busy_login_key) + \" занят(а)\";\n  return {\n    plan: \"Запланированное событие\",\n    cancel: \"Разовая отмена\",\n    stop: \"Больше не ходит\",\n  }[item.mark_type] || \"Отметка\";\n}\n\nfunction activityKey(item) {\n  return `${item.child} — ${item.title}`;\n}\n\nfunction markMatchesEvent(mark, item) {\n  if (mark.child && mark.child !== item.child) return false;\n  return mark.activity === activityKey(item) || mark.activity === item.title;\n}\n\nfunction regularEventsOnDate(value) {\n  const day = dayIndexFromIso(value);\n  return state.events.filter((item) =>\n    item.event_type === \"regular\" && Number(item.day_index) === day && item.event_status !== \"cancelled\"\n  );\n}\n\nfunction cancelMarkFor(value, item) {\n  return state.calendar.find((mark) =>\n    mark.mark_type === \"cancel\" && inRange(value, mark.start_date, mark.end_date) && markMatchesEvent(mark, item)\n  );\n}\n\nfunction stopMarkFor(value, item) {\n  return state.calendar.find((mark) =>\n    mark.mark_type === \"stop\" && value >= mark.start_date && markMatchesEvent(mark, item)\n  );\n}\n\nfunction calendarChip(text, className, mark = null) {\n  const chip = node(mark ? \"button\" : \"span\", \"cal-chip \" + className, text);\n  if (mark) {\n    chip.type = \"button\";\n    chip.addEventListener(\"click\", (event) => {\n      event.stopPropagation();\n      openMark(mark);\n    });\n  }\n  return chip;\n}\n\nfunction renderMonths() {\n  const primary = state.people[0] || null;\n  const secondary = state.people[1] || null;\n  const primaryLegend = byId(\"busy-legend-primary\");\n  const secondaryLegend = byId(\"busy-legend-secondary\");\n  primaryLegend.hidden = !primary;\n  secondaryLegend.hidden = !secondary;\n  if (primary) primaryLegend.textContent = primary.display_name + \" занят(а)\";\n  if (secondary) secondaryLegend.textContent = secondary.display_name + \" занят(а)\";\n\n  const monthCards = CALENDAR_MONTHS.map((month) => {\n    const card = node(\"article\", \"month-card\");\n    card.append(node(\"h3\", \"\", `${MONTH_NAMES[month]} ${CALENDAR_YEAR}`));\n    const scroll = node(\"div\", \"month-scroll\");\n    const grid = node(\"div\", \"month-grid\");\n    SHORT_DAYS.forEach((day) => grid.append(node(\"div\", \"month-head\", day)));\n    const first = new Date(Date.UTC(CALENDAR_YEAR, month - 1, 1));\n    const offset = (first.getUTCDay() + 6) % 7;\n    const dayCount = new Date(Date.UTC(CALENDAR_YEAR, month, 0)).getUTCDate();\n    for (let index = 0; index < offset; index += 1) grid.append(node(\"div\", \"month-day empty\"));\n    for (let day = 1; day <= dayCount; day += 1) {\n      const value = isoDate(CALENDAR_YEAR, month, day);\n      const busyMarks = state.calendar.filter((mark) => mark.mark_type === \"busy\" && inRange(value, mark.start_date, mark.end_date));\n      const primaryBusy = primary && busyMarks.some((mark) => mark.busy_login_key === primary.login_key);\n      const secondaryBusy = secondary && busyMarks.some((mark) => mark.busy_login_key === secondary.login_key);\n      const busyClass = primaryBusy && secondaryBusy\n        ? \" busy-both\"\n        : primaryBusy\n          ? \" busy-primary\"\n          : secondaryBusy\n            ? \" busy-secondary\"\n            : busyMarks.length\n              ? \" busy-other\"\n              : \"\";\n      const cell = node(\"div\", \"month-day\" + busyClass);\n      cell.append(node(\"div\", \"day-num\", day));\n\n      regularEventsOnDate(value).forEach((item) => {\n        const stopMark = stopMarkFor(value, item);\n        const cancelMark = cancelMarkFor(value, item);\n        if (stopMark) cell.append(calendarChip(`⛔ ${item.child}: ${item.title}`, \"cal-stop\", stopMark));\n        else if (cancelMark) cell.append(calendarChip(`↶ ${item.child}: ${item.title} — разово отменено`, \"cal-cancel\", cancelMark));\n        else cell.append(calendarChip(`${shortTime(item.start_time)} ${item.child} · ${item.title}`, \"cal-regular\"));\n      });\n\n      state.calendar.filter((mark) => inRange(value, mark.start_date, mark.end_date)).forEach((mark) => {\n        if (mark.mark_type === \"plan\") {\n          cell.append(calendarChip(`📌 ${mark.title || \"Событие\"}${mark.child ? \" · \" + mark.child : \"\"}`, \"cal-plan\", mark));\n        }\n        if (mark.mark_type === \"busy\") {\n          const tone = primary && mark.busy_login_key === primary.login_key\n            ? \"busy-note-primary\"\n            : secondary && mark.busy_login_key === secondary.login_key\n              ? \"busy-note-secondary\"\n              : \"busy-note-other\";\n          const substitute = mark.substitute ? ` · подмена: ${mark.substitute}` : \"\";\n          cell.append(calendarChip(`${personByKey(mark.busy_login_key)} занят(а)${substitute}`, tone, mark));\n        }\n        if (mark.mark_type === \"cancel\") {\n          const projected = regularEventsOnDate(value).some((item) => markMatchesEvent(mark, item));\n          if (!projected) cell.append(calendarChip(`↶ ${mark.activity || \"Занятие\"} — разовая отмена`, \"cal-cancel\", mark));\n        }\n        if (mark.mark_type === \"stop\" && value === mark.start_date) {\n          cell.append(calendarChip(`⛔ С ${formatDate(mark.start_date)}: ${mark.activity || \"занятие\"}`, \"cal-stop\", mark));\n        }\n      });\n      grid.append(cell);\n    }\n    const trailing = (7 - ((offset + dayCount) % 7)) % 7;\n    for (let index = 0; index < trailing; index += 1) grid.append(node(\"div\", \"month-day empty\"));\n    scroll.append(grid);\n    card.append(scroll);\n    return card;\n  });\n  byId(\"months-wrap\").replaceChildren(...monthCards);\n}\n\nfunction renderCalendar() {\n  renderMonths();\n  const root = byId(\"calendar-list\");\n  const marks = [...state.calendar].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));\n  if (!marks.length) {\n    root.replaceChildren(emptyState(\"Отметок календаря пока нет.\"));\n    return;\n  }\n  root.replaceChildren(...marks.map((item) => {\n    const card = node(\"article\", \"mark-card \" + markKind(item));\n    card.tabIndex = 0;\n    card.setAttribute(\"role\", \"button\");\n    const top = node(\"div\", \"card-top\");\n    top.append(node(\"h3\", \"\", markTitle(item)), node(\"span\", \"badge\", item.child || \"для всех\"));\n    const dateText = item.start_date === item.end_date\n      ? formatDate(item.start_date)\n      : formatDate(item.start_date) + \" — \" + formatDate(item.end_date);\n    const meta = node(\"div\", \"card-meta\");\n    meta.append(\n      node(\"span\", \"\", dateText),\n      node(\"span\", \"\", [item.activity, item.substitute ? \"подмена: \" + item.substitute : \"\"].filter(Boolean).join(\" · \")),\n      node(\"span\", \"\", item.note || \"\")\n    );\n    card.append(top, meta);\n    card.addEventListener(\"click\", () => openMark(item));\n    card.addEventListener(\"keydown\", (event) => {\n      if (event.key === \"Enter\" || event.key === \" \") openMark(item);\n    });\n    return card;\n  }));\n}\n\nfunction renderBase() {\n  const root = byId(\"base-rows\");\n  if (!state.base.length) {\n    root.replaceChildren(emptyState(\"Базовый режим ещё не заполнен.\"));\n  } else {\n    root.replaceChildren(...state.base.map((item) => {\n      const card = node(\"article\", \"base-card\");\n      card.dataset.child = item.child;\n      card.append(node(\"h3\", \"\", item.child));\n      const grid = node(\"div\", \"form-grid three\");\n      grid.append(\n        field(\"Учреждение\", input(\"text\", \"institution\", item.institution)),\n        field(\"Начало\", input(\"time\", \"start_time\", shortTime(item.start_time))),\n        field(\"Конец\", input(\"time\", \"end_time\", shortTime(item.end_time))),\n        field(\"Кто отвозит\", select(\"drop_person\", peopleOptions(item.drop_person))),\n        field(\"Кто забирает\", select(\"pickup_person\", peopleOptions(item.pickup_person))),\n        field(\"Кто платит\", select(\"payer\", payerOptions(item.payer))),\n        field(\"Дорога туда, мин\", input(\"number\", \"travel_before_min\", item.travel_before_min, { min: \"0\", max: \"300\" })),\n        field(\"Дорога обратно, мин\", input(\"number\", \"travel_after_min\", item.travel_after_min, { min: \"0\", max: \"300\" })),\n        field(\"Сумма, ₽\", input(\"number\", \"amount\", item.amount, { min: \"0\", max: \"10000000\" })),\n        field(\"Дата оплаты\", input(\"date\", \"pay_date\", item.pay_date || \"\")),\n        field(\"Отвоз подтверждён\", select(\"drop_status\", confirmationOptions(item.drop_status))),\n        field(\"Возврат подтверждён\", select(\"pickup_status\", confirmationOptions(item.pickup_status))),\n        field(\"Плательщик подтверждён\", select(\"payer_status\", confirmationOptions(item.payer_status)))\n      );\n      card.append(grid);\n      return card;\n    }));\n  }\n  byId(\"day-start\").value = shortTime(state.settings.day_start) || \"07:00\";\n  byId(\"day-end\").value = shortTime(state.settings.day_end) || \"22:00\";\n}\n\nfunction renderConflicts() {\n  const rows = conflicts();\n  const root = byId(\"conflicts-list\");\n  if (!rows.length) {\n    const good = node(\"div\", \"notice good\");\n    good.append(\n      node(\"strong\", \"\", \"Накладок нет.\"),\n      node(\"div\", \"tiny\", \"Проверены дети и сопровождающие с учётом дороги и буфера.\")\n    );\n    root.replaceChildren(good);\n    return;\n  }\n  root.replaceChildren(...rows.map((item) => {\n    const notice = node(\"div\", \"notice urgent\");\n    const firstInterval = item.type === \"adult\"\n      ? eventInterval(item.first)\n      : { start: minutes(item.first.start_time), end: minutes(item.first.end_time) };\n    const secondInterval = item.type === \"adult\"\n      ? eventInterval(item.second)\n      : { start: minutes(item.second.start_time), end: minutes(item.second.end_time) };\n    notice.append(\n      node(\"strong\", \"\", item.message),\n      node(\"div\", \"tiny\", `${DAYS[item.first.day_index]} · ${item.first.child} ${item.first.title} (${hhmm(firstInterval.start)}–${hhmm(firstInterval.end)})`),\n      node(\"div\", \"tiny\", `${item.second.child} ${item.second.title} (${hhmm(secondInterval.start)}–${hhmm(secondInterval.end)})`)\n    );\n    return notice;\n  }));\n}\n\nfunction renderChanges() {\n  const root = byId(\"changes-list\");\n  if (!state.changes.length) {\n    root.replaceChildren(emptyState(\"Пока нет новых изменений.\"));\n    return;\n  }\n  root.replaceChildren(...state.changes.map((item) => {\n    const row = node(\"article\", \"timeline-item\");\n    row.append(\n      node(\"h3\", \"\", (item.changed_by || \"Система\") + \" · \" + actionLabel(item.action)),\n      node(\"p\", \"\", tableLabel(item.table_name) + \" · \" + formatDateTime(item.changed_at))\n    );\n    return row;\n  }));\n}\n\nfunction emptyState(text) {\n  return node(\"div\", \"empty-state\", text);\n}\n\nfunction field(labelText, control) {\n  const label = node(\"label\");\n  label.append(document.createTextNode(labelText), control);\n  return label;\n}\n\nfunction input(type, name, value, attrs = {}) {\n  const control = document.createElement(\"input\");\n  control.type = type;\n  control.name = name;\n  control.value = value ?? \"\";\n  Object.entries(attrs).forEach(([key, val]) => control.setAttribute(key, val));\n  return control;\n}\n\nfunction select(name, options) {\n  const control = document.createElement(\"select\");\n  control.name = name;\n  options.forEach(({ value, label, selected }) => {\n    const option = document.createElement(\"option\");\n    option.value = value;\n    option.textContent = label;\n    option.selected = Boolean(selected);\n    control.append(option);\n  });\n  return control;\n}\n\nfunction peopleOptions(selected = \"\") {\n  return [\n    { value: \"\", label: \"Не назначено\", selected: !selected },\n    ...state.people.map((item) => ({\n      value: item.display_name,\n      label: item.display_name,\n      selected: item.display_name === selected,\n    })),\n    { value: \"Такси\", label: \"Такси\", selected: selected === \"Такси\" },\n  ];\n}\n\nfunction payerOptions(selected = \"\") {\n  return [\n    { value: \"\", label: \"Не назначено\", selected: !selected },\n    ...state.people.map((item) => ({\n      value: item.display_name,\n      label: item.display_name,\n      selected: item.display_name === selected,\n    })),\n    { value: \"Совместно\", label: \"Совместно\", selected: selected === \"Совместно\" },\n  ];\n}\n\nfunction confirmationOptions(selected = \"pre\") {\n  return [\n    { value: \"pre\", label: \"Предварительно\", selected: selected !== \"confirmed\" },\n    { value: \"confirmed\", label: \"Подтверждено\", selected: selected === \"confirmed\" },\n  ];\n}\n\nfunction fillSelect(control, options, selected = \"\") {\n  if (!control) return;\n  control.replaceChildren(...options.map(({ value, label }) => {\n    const option = document.createElement(\"option\");\n    option.value = String(value);\n    option.textContent = label;\n    option.selected = String(value) === String(selected);\n    return option;\n  }));\n}\n\nfunction regularActivityOptions(selected = \"\") {\n  const child = byId(\"mark-child\") ? byId(\"mark-child\").value : \"\";\n  const values = [...new Set(state.events\n    .filter((item) => item.event_type === \"regular\" && (!child || item.child === child))\n    .map((item) => activityKey(item)))];\n  if (selected && !values.includes(selected)) values.push(selected);\n  return [{ value: \"\", label: \"— выберите занятие —\" }, ...values.sort().map((value) => ({ value, label: value }))];\n}\n\nfunction refreshDynamicOptions() {\n  const eventChild = byId(\"event-child\");\n  const paymentChild = byId(\"payment-child\");\n  const markChild = byId(\"mark-child\");\n  const childFilter = byId(\"child-filter\");\n  const eventResponsible = byId(\"event-responsible\");\n  const eventPayer = byId(\"event-payer\");\n  const paymentPayer = byId(\"payment-payer\");\n  const busy = byId(\"mark-busy-person\");\n  const substitute = byId(\"mark-substitute\");\n  const activity = byId(\"mark-activity\");\n  fillSelect(eventChild, state.children.map((value) => ({ value, label: value })), eventChild ? eventChild.value : \"\");\n  fillSelect(paymentChild, state.children.map((value) => ({ value, label: value })), paymentChild ? paymentChild.value : \"\");\n  fillSelect(markChild, [{ value: \"\", label: \"Не относится\" }, ...state.children.map((value) => ({ value, label: value }))], markChild ? markChild.value : \"\");\n  fillSelect(childFilter, [{ value: \"all\", label: \"Всех детей\" }, ...state.children.map((value) => ({ value, label: value }))], childFilter ? childFilter.value : \"all\");\n  fillSelect(eventResponsible, peopleOptions(eventResponsible ? eventResponsible.value : \"\"), eventResponsible ? eventResponsible.value : \"\");\n  fillSelect(eventPayer, payerOptions(eventPayer ? eventPayer.value : \"\"), eventPayer ? eventPayer.value : \"\");\n  fillSelect(paymentPayer, payerOptions(paymentPayer ? paymentPayer.value : \"\"), paymentPayer ? paymentPayer.value : \"\");\n  fillSelect(busy, state.people.map((item) => ({ value: item.login_key, label: item.display_name })), busy ? busy.value : \"\");\n  fillSelect(substitute, peopleOptions(substitute ? substitute.value : \"\"), substitute ? substitute.value : \"\");\n  fillSelect(activity, regularActivityOptions(activity ? activity.value : \"\"), activity ? activity.value : \"\");\n}\n\nfunction toggleEventPaymentGroup() {\n  const group = byId(\"event-payment-group\");\n  const regular = byId(\"event-type\").value === \"regular\";\n  group.classList.toggle(\"inactive\", !regular);\n  group.querySelectorAll(\"input, select\").forEach((control) => {\n    control.disabled = !regular;\n  });\n}\n\nfunction openEvent(item = null, defaults = {}) {\n  const existing = item || {};\n  byId(\"event-dialog-title\").textContent = item ? \"Изменить занятие\" : \"Новое занятие\";\n  byId(\"event-id\").value = existing.id || \"\";\n  refreshDynamicOptions();\n  const dayIndex = existing.day_index ?? defaults.dayIndex ?? mondayIndex();\n  const startTime = shortTime(existing.start_time) || defaults.startTime || \"17:00\";\n  byId(\"event-day\").value = String(dayIndex);\n  byId(\"event-child\").value = existing.child || defaults.child || state.children[0] || \"\";\n  byId(\"event-type\").value = existing.event_type || \"regular\";\n  byId(\"event-start\").value = startTime;\n  byId(\"event-end\").value = shortTime(existing.end_time) || hhmm(minutes(startTime) + 60);\n  byId(\"event-status\").value = existing.event_status || \"pre\";\n  byId(\"event-title\").value = existing.title || \"\";\n  byId(\"event-place\").value = existing.place || \"\";\n  byId(\"event-responsible\").value = existing.responsible || \"\";\n  byId(\"event-role\").value = existing.responsibility_role || \"Привозит и забирает\";\n  byId(\"event-responsible-status\").value = existing.responsible_status || \"pre\";\n  byId(\"event-before\").value = existing.travel_before_min || 0;\n  byId(\"event-after\").value = existing.travel_after_min || 0;\n  byId(\"event-buffer\").value = existing.buffer_min || 0;\n  byId(\"event-payer\").value = existing.payer || \"\";\n  byId(\"event-payer-status\").value = existing.payer_status || \"pre\";\n  byId(\"event-extra-cost\").value = existing.extra_cost || 0;\n  byId(\"event-amount\").value = existing.regular_amount || 0;\n  byId(\"event-pay-date\").value = existing.regular_pay_date || \"\";\n  byId(\"event-purchased\").value = existing.regular_purchased || 0;\n  byId(\"event-used\").value = existing.regular_used || 0;\n  byId(\"event-saved\").value = existing.regular_saved || 0;\n  byId(\"event-burned\").value = existing.regular_burned || 0;\n  byId(\"event-policy\").value = existing.regular_policy || \"burn\";\n  byId(\"event-attendance\").value = existing.attendance_status || \"planned\";\n  byId(\"event-note\").value = existing.note || \"\";\n  byId(\"delete-event-button\").hidden = !item;\n  toggleEventPaymentGroup();\n  byId(\"event-dialog\").showModal();\n}\n\nasync function saveEvent(event) {\n  event.preventDefault();\n  const start = byId(\"event-start\").value;\n  const end = byId(\"event-end\").value;\n  if (minutes(end) <= minutes(start)) {\n    showToast(\"Время окончания должно быть позже начала.\", true);\n    return;\n  }\n  const submit = event.submitter;\n  const id = byId(\"event-id\").value;\n  const original = state.events.find((item) => item.id === id) || {};\n  const row = {\n    ...original,\n    id: id || undefined,\n    day_index: Number(byId(\"event-day\").value),\n    child: byId(\"event-child\").value,\n    event_type: byId(\"event-type\").value,\n    start_time: start,\n    end_time: end,\n    event_status: byId(\"event-status\").value,\n    title: byId(\"event-title\").value.trim(),\n    place: byId(\"event-place\").value.trim(),\n    responsible: byId(\"event-responsible\").value || null,\n    responsibility_role: byId(\"event-role\").value,\n    responsible_status: byId(\"event-responsible-status\").value,\n    travel_before_min: Number(byId(\"event-before\").value || 0),\n    travel_after_min: Number(byId(\"event-after\").value || 0),\n    buffer_min: Number(byId(\"event-buffer\").value || 0),\n    payer: byId(\"event-payer\").value || null,\n    payer_status: byId(\"event-payer-status\").value,\n    extra_cost: Number(byId(\"event-extra-cost\").value || 0),\n    regular_amount: Number(byId(\"event-amount\").value || 0),\n    regular_pay_date: byId(\"event-pay-date\").value || null,\n    regular_purchased: Number(byId(\"event-purchased\").value || 0),\n    regular_used: Number(byId(\"event-used\").value || 0),\n    regular_saved: Number(byId(\"event-saved\").value || 0),\n    regular_burned: Number(byId(\"event-burned\").value || 0),\n    regular_policy: byId(\"event-policy\").value,\n    attendance_status: byId(\"event-attendance\").value,\n    note: byId(\"event-note\").value.trim(),\n  };\n  await mutate(\"event/save\", row, byId(\"event-dialog\"), submit, \"Занятие сохранено.\");\n}\n\nasync function deleteEvent() {\n  const id = byId(\"event-id\").value;\n  if (!id || !confirm(\"Удалить это занятие?\")) return;\n  await mutate(\"event/delete\", { id }, byId(\"event-dialog\"), byId(\"delete-event-button\"), \"Занятие удалено.\");\n}\n\nfunction openPayment(item = null) {\n  const value = item || {};\n  byId(\"payment-id\").value = value.id || \"\";\n  refreshDynamicOptions();\n  byId(\"payment-child\").value = value.child || state.children[0] || \"\";\n  byId(\"payment-activity\").value = value.activity || \"\";\n  byId(\"payment-amount\").value = value.amount || 0;\n  byId(\"payment-date\").value = value.pay_date || \"\";\n  byId(\"payment-payer\").value = value.payer || \"\";\n  byId(\"payment-payer-status\").value = value.payer_status || \"pre\";\n  byId(\"payment-status\").value = value.payment_status || \"pending\";\n  byId(\"payment-policy\").value = value.policy || \"burn\";\n  byId(\"payment-purchased\").value = value.purchased || 0;\n  byId(\"payment-used\").value = value.used || 0;\n  byId(\"payment-saved\").value = value.saved || 0;\n  byId(\"payment-burned\").value = value.burned || 0;\n  byId(\"payment-note\").value = value.note || \"\";\n  byId(\"delete-payment-button\").hidden = !item;\n  byId(\"payment-dialog\").showModal();\n}\n\nasync function savePayment(event) {\n  event.preventDefault();\n  const id = byId(\"payment-id\").value;\n  const original = state.payments.find((item) => item.id === id) || {};\n  const row = {\n    ...original,\n    id: id || undefined,\n    child: byId(\"payment-child\").value,\n    activity: byId(\"payment-activity\").value.trim(),\n    amount: Number(byId(\"payment-amount\").value || 0),\n    pay_date: byId(\"payment-date\").value || null,\n    payer: byId(\"payment-payer\").value || null,\n    payer_status: byId(\"payment-payer-status\").value,\n    payment_status: byId(\"payment-status\").value,\n    policy: byId(\"payment-policy\").value,\n    purchased: Number(byId(\"payment-purchased\").value || 0),\n    used: Number(byId(\"payment-used\").value || 0),\n    saved: Number(byId(\"payment-saved\").value || 0),\n    burned: Number(byId(\"payment-burned\").value || 0),\n    note: byId(\"payment-note\").value.trim(),\n  };\n  await mutate(\"payment/save\", row, byId(\"payment-dialog\"), event.submitter, \"Оплата сохранена.\");\n}\n\nasync function deletePayment() {\n  const id = byId(\"payment-id\").value;\n  if (!id || !confirm(\"Удалить эту оплату?\")) return;\n  await mutate(\"payment/delete\", { id }, byId(\"payment-dialog\"), byId(\"delete-payment-button\"), \"Оплата удалена.\");\n}\n\nfunction toggleMarkFields() {\n  byId(\"mark-busy-wrapper\").hidden = byId(\"mark-type\").value !== \"busy\";\n}\n\nfunction openMark(item = null) {\n  const value = item || {};\n  byId(\"mark-id\").value = value.id || \"\";\n  byId(\"mark-child\").value = value.child || \"\";\n  byId(\"mark-activity\").value = value.activity || \"\";\n  refreshDynamicOptions();\n  byId(\"mark-type\").value = value.mark_type || \"plan\";\n  byId(\"mark-child\").value = value.child || \"\";\n  fillSelect(byId(\"mark-activity\"), regularActivityOptions(value.activity || \"\"), value.activity || \"\");\n  byId(\"mark-start\").value = value.start_date || todayIso();\n  byId(\"mark-end\").value = value.end_date || value.start_date || todayIso();\n  byId(\"mark-substitute\").value = value.substitute || \"\";\n  byId(\"mark-title\").value = value.title || \"\";\n  byId(\"mark-note\").value = value.note || \"\";\n  byId(\"mark-busy-person\").value = value.busy_login_key || (state.people[0] ? state.people[0].login_key : \"\");\n  toggleMarkFields();\n  byId(\"delete-mark-button\").hidden = !item;\n  byId(\"mark-dialog\").showModal();\n}\n\nasync function saveMark(event) {\n  event.preventDefault();\n  const type = byId(\"mark-type\").value;\n  const start = byId(\"mark-start\").value;\n  const end = byId(\"mark-end\").value || start;\n  const activity = byId(\"mark-activity\").value;\n  const title = byId(\"mark-title\").value.trim();\n  if (end < start) {\n    showToast(\"Дата «по» не может быть раньше даты «с».\", true);\n    return;\n  }\n  if ([\"cancel\", \"stop\"].includes(type) && !activity) {\n    showToast(\"Для отмены выберите занятие.\", true);\n    return;\n  }\n  if (type === \"plan\" && !title) {\n    showToast(\"Напишите название события, каникул или поездки.\", true);\n    return;\n  }\n  if (type === \"busy\" && !byId(\"mark-busy-person\").value) {\n    showToast(\"Укажите, кто занят.\", true);\n    return;\n  }\n  const id = byId(\"mark-id\").value;\n  const row = {\n    id: id || undefined,\n    mark_type: type,\n    busy_login_key: type === \"busy\" ? byId(\"mark-busy-person\").value : null,\n    child: byId(\"mark-child\").value || null,\n    start_date: start,\n    end_date: end,\n    activity: activity || null,\n    substitute: byId(\"mark-substitute\").value || null,\n    title: title || null,\n    note: byId(\"mark-note\").value.trim() || null,\n  };\n  await mutate(\"calendar/save\", row, byId(\"mark-dialog\"), event.submitter, \"Отметка сохранена.\");\n}\n\nasync function deleteMark() {\n  const id = byId(\"mark-id\").value;\n  if (!id || !confirm(\"Удалить эту отметку?\")) return;\n  await mutate(\"calendar/delete\", { id }, byId(\"mark-dialog\"), byId(\"delete-mark-button\"), \"Отметка удалена.\");\n}\n\nasync function saveBase(event) {\n  event.preventDefault();\n  const button = event.submitter;\n  const rows = [...byId(\"base-rows\").querySelectorAll(\".base-card\")].map((card) => {\n    const value = (name) => card.querySelector('[name=\"' + name + '\"]').value;\n    return {\n      child: card.dataset.child,\n      institution: value(\"institution\").trim(),\n      start_time: value(\"start_time\"),\n      end_time: value(\"end_time\"),\n      drop_person: value(\"drop_person\") || null,\n      pickup_person: value(\"pickup_person\") || null,\n      payer: value(\"payer\") || null,\n      travel_before_min: Number(value(\"travel_before_min\") || 0),\n      travel_after_min: Number(value(\"travel_after_min\") || 0),\n      amount: Number(value(\"amount\") || 0),\n      pay_date: value(\"pay_date\") || null,\n      drop_status: value(\"drop_status\"),\n      pickup_status: value(\"pickup_status\"),\n      payer_status: value(\"payer_status\"),\n    };\n  });\n  await mutate(\"base/save\", { rows }, null, button, \"Базовый режим сохранён.\");\n}\n\nasync function saveSettings(event) {\n  event.preventDefault();\n  if (minutes(byId(\"day-end\").value) <= minutes(byId(\"day-start\").value)) {\n    showToast(\"Конец дня должен быть позже начала.\", true);\n    return;\n  }\n  await mutate(\"settings/save\", {\n    day_start: byId(\"day-start\").value,\n    day_end: byId(\"day-end\").value,\n  }, null, event.submitter, \"Границы дня сохранены.\");\n}\n\nfunction downloadBackup() {\n  const backup = {\n    format: \"family-dispatcher-v1.8-protected\",\n    generated_at: new Date().toISOString(),\n    events: state.events,\n    payments: state.payments,\n    base_schedule: state.base,\n    calendar_marks: state.calendar,\n    settings: state.settings,\n  };\n  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: \"application/json\" });\n  const url = URL.createObjectURL(blob);\n  const link = document.createElement(\"a\");\n  link.href = url;\n  link.download = `family-dispatcher-backup-${todayIso()}.json`;\n  document.body.append(link);\n  link.click();\n  link.remove();\n  setTimeout(() => URL.revokeObjectURL(url), 1000);\n  showToast(\"Резервная копия скачана.\");\n}\n\nasync function mutate(route, body, dialog, button, successMessage) {\n  setButtonBusy(button, true);\n  try {\n    await api(route, { body });\n    if (dialog && dialog.open) dialog.close();\n    await loadSnapshot(true);\n    showToast(successMessage);\n  } catch (error) {\n    if (error.status === 401) {\n      forgetSession();\n      showLogin(\"Сессия закончилась. Войдите снова.\");\n    } else if (error.status === 403) {\n      showToast(\"У этой учётной записи нет права менять данные.\", true);\n    } else {\n      showToast(error.message || \"Не удалось сохранить.\", true);\n    }\n  } finally {\n    setButtonBusy(button, false);\n  }\n}\n\nfunction switchView(name) {\n  document.querySelectorAll(\".view\").forEach((view) => view.classList.toggle(\"active\", view.id === \"view-\" + name));\n  document.querySelectorAll(\".tab\").forEach((tab) => tab.classList.toggle(\"active\", tab.dataset.view === name));\n  if (name === \"day\") renderDay();\n  if (name === \"calendar\") renderCalendar();\n  window.scrollTo({ top: 0, behavior: \"smooth\" });\n}\n\nfunction bindEvents() {\n  byId(\"login-form\").addEventListener(\"submit\", login);\n  byId(\"logout-button\").addEventListener(\"click\", logout);\n  byId(\"refresh-button\").addEventListener(\"click\", () => loadSnapshot());\n  byId(\"overview-add-event\").addEventListener(\"click\", () => openEvent());\n  byId(\"add-event-button\").addEventListener(\"click\", () => openEvent());\n  byId(\"add-payment-button\").addEventListener(\"click\", () => openPayment());\n  byId(\"add-mark-button\").addEventListener(\"click\", () => openMark());\n  byId(\"event-form\").addEventListener(\"submit\", saveEvent);\n  byId(\"payment-form\").addEventListener(\"submit\", savePayment);\n  byId(\"mark-form\").addEventListener(\"submit\", saveMark);\n  byId(\"base-form\").addEventListener(\"submit\", saveBase);\n  byId(\"settings-form\").addEventListener(\"submit\", saveSettings);\n  byId(\"delete-event-button\").addEventListener(\"click\", deleteEvent);\n  byId(\"delete-payment-button\").addEventListener(\"click\", deletePayment);\n  byId(\"delete-mark-button\").addEventListener(\"click\", deleteMark);\n  byId(\"mark-type\").addEventListener(\"change\", toggleMarkFields);\n  byId(\"mark-child\").addEventListener(\"change\", () => {\n    fillSelect(byId(\"mark-activity\"), regularActivityOptions(), \"\");\n  });\n  byId(\"event-type\").addEventListener(\"change\", toggleEventPaymentGroup);\n  byId(\"day-select\").addEventListener(\"change\", renderDay);\n  byId(\"child-filter\").addEventListener(\"change\", renderDay);\n  byId(\"download-backup-button\").addEventListener(\"click\", downloadBackup);\n  document.querySelectorAll(\".dialog-close\").forEach((button) => {\n    button.addEventListener(\"click\", () => button.closest(\"dialog\").close());\n  });\n  document.querySelectorAll(\".tab\").forEach((tab) => tab.addEventListener(\"click\", () => switchView(tab.dataset.view)));\n  document.addEventListener(\"visibilitychange\", () => {\n    if (!document.hidden && state.token) loadSnapshot(true);\n  });\n}\n\nasync function boot() {\n  bindEvents();\n  fillSelect(byId(\"event-day\"), DAYS.map((label, value) => ({ value: String(value), label })), String(mondayIndex()));\n  fillSelect(byId(\"day-select\"), DAYS.map((label, value) => ({ value: String(value), label })), String(mondayIndex()));\n  if (!state.token || !state.member) {\n    showLogin();\n    return;\n  }\n  showApp();\n  await loadSnapshot();\n}\n\nboot();\n";
const MANIFEST = "{\n  \"name\": \"Семейный диспетчер\",\n  \"short_name\": \"Диспетчер\",\n  \"description\": \"Закрытый общий семейный календарь и учёт.\",\n  \"start_url\": \"./\",\n  \"scope\": \"./\",\n  \"display\": \"standalone\",\n  \"background_color\": \"#f8f6ef\",\n  \"theme_color\": \"#3d4c3f\",\n  \"icons\": [\n    {\n      \"src\": \"icon.svg\",\n      \"sizes\": \"any\",\n      \"type\": \"image/svg+xml\",\n      \"purpose\": \"any maskable\"\n    }\n  ]\n}\n";
const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n  <rect width=\"512\" height=\"512\" rx=\"112\" fill=\"#3d4c3f\"/>\n  <path d=\"M104 258 256 126l152 132v146a40 40 0 0 1-40 40H144a40 40 0 0 1-40-40Z\" fill=\"#f8f6ef\"/>\n  <path d=\"m191 291 43 43 91-101\" fill=\"none\" stroke=\"#c77d5d\" stroke-width=\"34\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>\n";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase server environment");
}

const root = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const allowedOrigins = new Set([
  "https://eva-afonina.github.io",
  new URL(SUPABASE_URL).origin,
]);
const functionSlug = "/family-dispatcher";
const encoder = new TextEncoder();

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function commonHeaders(
  req: Request,
  contentType = "application/json; charset=utf-8",
) {
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  });
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-headers", "authorization, content-type");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-max-age", "600");
  }
  return headers;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: commonHeaders(req),
  });
}

function staticResponse(req: Request, body: string, contentType: string) {
  const headers = commonHeaders(req, contentType);
  if (contentType.startsWith("text/html")) {
    headers.set(
      "content-security-policy",
      "default-src 'self'; connect-src 'self' https://iymstmgtmkquhgypfqlg.supabase.co; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
  }
  return new Response(body, { headers });
}

function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    throw new HttpError(403, "Origin not allowed");
  }
}

async function bodyJson(req: Request) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 100000) throw new HttpError(413, "Request is too large");
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function randomHex(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) {
    different |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return different === 0;
}

function text(value: unknown, max: number, required = false) {
  const result = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (required && !result) {
    throw new HttpError(400, "Required field is missing");
  }
  return result || null;
}

function integer(value: unknown, min: number, max: number, fallback = 0) {
  const result = Number(value ?? fallback);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new HttpError(400, "Invalid number");
  }
  return result;
}

function amount(value: unknown) {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result) || result < 0 || result > 10000000) {
    throw new HttpError(400, "Invalid amount");
  }
  return result;
}

function oneOf(value: unknown, values: string[], fallback: string) {
  const result = typeof value === "string" ? value : fallback;
  if (!values.includes(result)) throw new HttpError(400, "Invalid option");
  return result;
}

function date(value: unknown, required = false) {
  const result = text(value, 10, required);
  if (result && !/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new HttpError(400, "Invalid date");
  }
  return result;
}

function time(value: unknown) {
  const result = text(value, 8, true) as string;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(result)) {
    throw new HttpError(400, "Invalid time");
  }
  return result;
}

function uuid(value: unknown, required = false) {
  const result = text(value, 36, required);
  if (
    result &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(result)
  ) {
    throw new HttpError(400, "Invalid id");
  }
  return result;
}

async function login(req: Request) {
  const body = await bodyJson(req);
  const loginKey = String(body.login_key || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  if (
    !/^[a-z0-9_-]{2,32}$/.test(loginKey) || code.length < 10 || code.length > 80
  ) {
    throw new HttpError(401, "Имя входа или код не подошли.");
  }

  const forwarded = (req.headers.get("x-forwarded-for") || "unknown").split(
    ",",
  )[0].trim();
  const ipHash = await sha256Hex("family-dispatcher:" + forwarded);
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error: countError } = await root
    .from("family_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("login_key", loginKey)
    .eq("ip_hash", ipHash)
    .eq("succeeded", false)
    .gte("attempted_at", since);
  if (countError) throw countError;
  if ((count || 0) >= 5) {
    throw new HttpError(429, "Слишком много попыток. Подождите 15 минут.");
  }

  const { data: member, error: memberError } = await root
    .from("family_members")
    .select("email, display_name, role, access_code_hash, is_active")
    .eq("login_key", loginKey)
    .maybeSingle();
  if (memberError) throw memberError;

  const suppliedHash = await sha256Hex(code);
  const valid = Boolean(
    member &&
      member.is_active &&
      member.access_code_hash &&
      safeEqual(suppliedHash, member.access_code_hash),
  );

  await root.from("family_login_attempts").insert({
    login_key: loginKey,
    ip_hash: ipHash,
    succeeded: valid,
  });

  if (!valid) throw new HttpError(401, "Имя входа или код не подошли.");

  const rawToken = randomHex();
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + 45 * 86400000);
  const { error: sessionError } = await root.from("family_sessions").insert({
    token_hash: tokenHash,
    email: member.email,
    expires_at: expires.toISOString(),
    last_seen_at: now.toISOString(),
  });
  if (sessionError) throw sessionError;

  await Promise.all([
    root.from("family_sessions").delete().lt("expires_at", now.toISOString()),
    root.from("family_login_attempts").delete().lt(
      "attempted_at",
      new Date(now.getTime() - 7 * 86400000).toISOString(),
    ),
  ]);

  return json(req, {
    token: rawToken,
    member: { display_name: member.display_name, role: member.role },
    expires_at: expires.toISOString(),
  });
}

async function authenticate(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new HttpError(401, "Требуется вход.");
  }
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const { data: session, error: sessionError } = await root
    .from("family_sessions")
    .select("email, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new HttpError(401, "Сессия закончилась.");

  const { data: member, error: memberError } = await root
    .from("family_members")
    .select("email, display_name, role, login_key, is_active")
    .eq("email", session.email)
    .eq("is_active", true)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new HttpError(401, "Участник отключён.");

  const extended = new Date(now.getTime() + 45 * 86400000).toISOString();
  await root
    .from("family_sessions")
    .update({ last_seen_at: now.toISOString(), expires_at: extended })
    .eq("token_hash", tokenHash);

  return { member, tokenHash };
}

function requireEditor(member: { role: string }) {
  if (!["owner", "editor"].includes(member.role)) {
    throw new HttpError(403, "Только просмотр.");
  }
}

function actorClient(email: string) {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-family-actor": email } },
  });
}

function unwrap<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

async function snapshot(req: Request, member: any) {
  const [events, payments, base, calendar, settings, changes, people] =
    await Promise.all([
      root.from("schedule_events").select("*").order("day_index").order(
        "start_time",
      ),
      root.from("payments").select("*").order("pay_date", {
        ascending: true,
        nullsFirst: false,
      }),
      root.from("base_schedule").select("*").order("child"),
      root.from("calendar_marks").select("*").order("start_date"),
      root.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      root.from("change_log").select(
        "id, table_name, record_id, action, changed_at, changed_by_email",
      ).order("changed_at", { ascending: false }).limit(80),
      root.from("family_members").select("login_key, display_name").eq(
        "is_active",
        true,
      ).order("login_key"),
    ]);
  const eventRows = unwrap(events) || [];
  const paymentRows = unwrap(payments) || [];
  const baseRows = unwrap(base) || [];
  const calendarRows = unwrap(calendar) || [];
  const settingsRow = unwrap(settings) || {};
  const changeRows = unwrap(changes) || [];
  const peopleRows = unwrap(people) || [];
  const displayByEmail = new Map<string, string>();
  const { data: memberRows, error: memberRowsError } = await root
    .from("family_members")
    .select("email, display_name")
    .eq("is_active", true);
  if (memberRowsError) throw memberRowsError;
  for (const item of memberRows || []) {
    displayByEmail.set(item.email, item.display_name);
  }
  const safeChanges = changeRows.map((item: any) => ({
    id: item.id,
    table_name: item.table_name,
    record_id: item.record_id,
    action: item.action,
    changed_at: item.changed_at,
    changed_by: displayByEmail.get(item.changed_by_email) || "Система",
  }));
  const children = Array.from(
    new Set([
      ...baseRows.map((item: any) => item.child),
      ...eventRows.map((item: any) => item.child),
      ...paymentRows.map((item: any) => item.child),
    ].filter(Boolean)),
  ).sort();

  return json(req, {
    member: { display_name: member.display_name, role: member.role },
    people: peopleRows,
    children,
    events: eventRows,
    payments: paymentRows,
    base: baseRows,
    calendar: calendarRows,
    settings: settingsRow,
    changes: safeChanges,
  });
}

async function saveEvent(req: Request, member: any) {
  requireEditor(member);
  const body = await bodyJson(req);
  const row = {
    id: uuid(body.id) || crypto.randomUUID(),
    day_index: integer(body.day_index, 0, 6),
    child: text(body.child, 60, true),
    event_type: oneOf(
      body.event_type,
      ["regular", "oneoff", "doctor", "family"],
      "regular",
    ),
    start_time: time(body.start_time),
    end_time: time(body.end_time),
    title: text(body.title, 160, true),
    place: text(body.place, 240) || "",
    travel_before_min: integer(body.travel_before_min, 0, 300),
    travel_after_min: integer(body.travel_after_min, 0, 300),
    buffer_min: integer(body.buffer_min, 0, 300),
    responsible: text(body.responsible, 120),
    responsible_status: oneOf(
      body.responsible_status,
      ["pre", "confirmed"],
      "pre",
    ),
    responsibility_role: text(body.responsibility_role, 120) || "",
    payer: text(body.payer, 120),
    payer_status: oneOf(body.payer_status, ["pre", "confirmed"], "pre"),
    extra_cost: amount(body.extra_cost),
    event_status: oneOf(body.event_status, [
      "pre",
      "confirmed",
      "moved",
      "cancelled",
    ], "pre"),
    attendance_status: oneOf(
      body.attendance_status,
      ["planned", "attended", "missed", "orgcancel"],
      "planned",
    ),
    note: text(body.note, 1200) || "",
    regular_amount: amount(body.regular_amount),
    regular_pay_date: date(body.regular_pay_date),
    regular_purchased: integer(body.regular_purchased, 0, 1000),
    regular_used: integer(body.regular_used, 0, 1000),
    regular_saved: integer(body.regular_saved, 0, 1000),
    regular_burned: integer(body.regular_burned, 0, 1000),
    regular_policy: oneOf(
      body.regular_policy,
      ["burn", "shift", "case"],
      "burn",
    ),
  };
  const client = actorClient(member.email);
  const result = await client.from("schedule_events").upsert(row, {
    onConflict: "id",
  }).select("id").single();
  const savedId = unwrap(result).id;

  const hasLinkedPayment = row.event_type === "regular" && (
    Number(row.regular_amount || 0) > 0 ||
    Boolean(row.regular_pay_date) ||
    Number(row.regular_purchased || 0) > 0 ||
    Number(row.regular_used || 0) > 0 ||
    Number(row.regular_saved || 0) > 0 ||
    Number(row.regular_burned || 0) > 0
  );
  if (hasLinkedPayment) {
    const existingResult = await client.from("payments")
      .select("id, payment_status, note")
      .eq("source_event_id", savedId)
      .limit(1)
      .maybeSingle();
    const existing = unwrap(existingResult) as {
      id?: string;
      payment_status?: string;
      note?: string;
    } | null;
    const paymentResult = await client.from("payments").upsert({
      id: existing?.id || crypto.randomUUID(),
      source_event_id: savedId,
      child: row.child,
      activity: row.title,
      amount: row.regular_amount,
      purchased: row.regular_purchased,
      used: row.regular_used,
      pay_date: row.regular_pay_date,
      payer: row.payer,
      payer_status: row.payer_status,
      payment_status: existing?.payment_status || "pending",
      policy: row.regular_policy,
      saved: row.regular_saved,
      burned: row.regular_burned,
      note: existing?.note || "Из карточки постоянного занятия",
    }, { onConflict: "id" });
    unwrap(paymentResult);
  }
  return json(req, { id: savedId });
}

async function savePayment(req: Request, member: any) {
  requireEditor(member);
  const body = await bodyJson(req);
  const row = {
    id: uuid(body.id) || crypto.randomUUID(),
    source_event_id: uuid(body.source_event_id),
    child: text(body.child, 60, true),
    activity: text(body.activity, 160, true),
    amount: amount(body.amount),
    purchased: integer(body.purchased, 0, 1000),
    used: integer(body.used, 0, 1000),
    pay_date: date(body.pay_date),
    payer: text(body.payer, 120),
    payer_status: oneOf(body.payer_status, ["pre", "confirmed"], "pre"),
    payment_status: oneOf(body.payment_status, ["pending", "paid"], "pending"),
    policy: oneOf(body.policy, ["burn", "shift", "case"], "burn"),
    saved: integer(body.saved, 0, 1000),
    burned: integer(body.burned, 0, 1000),
    note: text(body.note, 1200) || "",
  };
  const client = actorClient(member.email);
  const result = await client.from("payments").upsert(row, { onConflict: "id" })
    .select("id").single();
  return json(req, { id: unwrap(result).id });
}

async function saveCalendar(req: Request, member: any) {
  requireEditor(member);
  const body = await bodyJson(req);
  const markType = oneOf(
    body.mark_type,
    ["plan", "cancel", "stop", "busy"],
    "plan",
  );
  const row = {
    id: uuid(body.id) || crypto.randomUUID(),
    mark_type: markType,
    busy_login_key: markType === "busy"
      ? text(body.busy_login_key, 32, true)
      : null,
    start_date: date(body.start_date, true),
    end_date: date(body.end_date, true),
    child: text(body.child, 60),
    activity: text(body.activity, 160),
    substitute: text(body.substitute, 120),
    title: text(body.title, 200),
    note: text(body.note, 1200),
  };
  if (row.end_date! < row.start_date!) {
    throw new HttpError(400, "Дата окончания раньше начала.");
  }
  const client = actorClient(member.email);
  const result = await client.from("calendar_marks").upsert(row, {
    onConflict: "id",
  }).select("id").single();
  return json(req, { id: unwrap(result).id });
}

async function saveBase(req: Request, member: any) {
  requireEditor(member);
  const body = await bodyJson(req);
  if (
    !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 10
  ) throw new HttpError(400, "Invalid base rows");
  const rows = body.rows.map((item: any) => ({
    child: text(item.child, 60, true),
    institution: text(item.institution, 160, true),
    start_time: time(item.start_time),
    end_time: time(item.end_time),
    travel_before_min: integer(item.travel_before_min, 0, 300),
    drop_person: text(item.drop_person, 120),
    drop_status: oneOf(item.drop_status, ["pre", "confirmed"], "pre"),
    travel_after_min: integer(item.travel_after_min, 0, 300),
    pickup_person: text(item.pickup_person, 120),
    pickup_status: oneOf(item.pickup_status, ["pre", "confirmed"], "pre"),
    amount: amount(item.amount),
    pay_date: date(item.pay_date),
    payer: text(item.payer, 120),
    payer_status: oneOf(item.payer_status, ["pre", "confirmed"], "pre"),
  }));
  const client = actorClient(member.email);
  const result = await client.from("base_schedule").upsert(rows, {
    onConflict: "child",
  });
  unwrap(result);
  return json(req, { ok: true });
}

async function saveSettings(req: Request, member: any) {
  requireEditor(member);
  const body = await bodyJson(req);
  const client = actorClient(member.email);
  const result = await client.from("app_settings").update({
    day_start: time(body.day_start),
    day_end: time(body.day_end),
  }).eq("id", 1);
  unwrap(result);
  return json(req, { ok: true });
}

async function deleteById(req: Request, member: any, table: string) {
  requireEditor(member);
  const body = await bodyJson(req);
  const id = uuid(body.id, true);
  const client = actorClient(member.email);
  const result = await client.from(table).delete().eq("id", id);
  unwrap(result);
  return json(req, { ok: true });
}

async function logout(req: Request, tokenHash: string) {
  const { error } = await root.from("family_sessions").delete().eq(
    "token_hash",
    tokenHash,
  );
  if (error) throw error;
  return json(req, { ok: true });
}

function routeSuffix(pathname: string) {
  const index = pathname.lastIndexOf(functionSlug);
  return index >= 0 ? pathname.slice(index + functionSlug.length) : pathname;
}

function staticRoute(req: Request, suffix: string) {
  if (suffix === "") {
    const target = new URL(req.url);
    target.pathname += "/";
    return new Response(null, {
      status: 308,
      headers: { location: target.toString(), "cache-control": "no-store" },
    });
  }
  if (suffix === "/") {
    return staticResponse(req, INDEX_HTML, "text/html; charset=utf-8");
  }
  if (suffix === "/styles.css") {
    return staticResponse(req, STYLES_CSS, "text/css; charset=utf-8");
  }
  if (suffix === "/app.js") {
    return staticResponse(req, APP_JS, "application/javascript; charset=utf-8");
  }
  if (suffix === "/manifest.webmanifest") {
    return staticResponse(
      req,
      MANIFEST,
      "application/manifest+json; charset=utf-8",
    );
  }
  if (suffix === "/icon.svg" || suffix === "/favicon.ico") {
    return staticResponse(req, ICON_SVG, "image/svg+xml");
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const pathname = new URL(req.url).pathname;
  const suffix = routeSuffix(pathname);
  const staticResult = req.method === "GET" ? staticRoute(req, suffix) : null;
  if (staticResult) return staticResult;

  if (req.method === "OPTIONS") {
    try {
      checkOrigin(req);
      return new Response(null, { status: 204, headers: commonHeaders(req) });
    } catch (error) {
      return json(req, {
        error: error instanceof Error ? error.message : "Forbidden",
      }, 403);
    }
  }

  try {
    checkOrigin(req);
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    if (!suffix.startsWith("/api/")) throw new HttpError(404, "Not found");
    const route = suffix.slice("/api/".length);
    if (route === "login") return await login(req);

    const auth = await authenticate(req);
    if (route === "snapshot") return await snapshot(req, auth.member);
    if (route === "logout") return await logout(req, auth.tokenHash);
    if (route === "event/save") return await saveEvent(req, auth.member);
    if (route === "event/delete") {
      return await deleteById(req, auth.member, "schedule_events");
    }
    if (route === "payment/save") return await savePayment(req, auth.member);
    if (route === "payment/delete") {
      return await deleteById(req, auth.member, "payments");
    }
    if (route === "calendar/save") return await saveCalendar(req, auth.member);
    if (route === "calendar/delete") {
      return await deleteById(req, auth.member, "calendar_marks");
    }
    if (route === "base/save") return await saveBase(req, auth.member);
    if (route === "settings/save") return await saveSettings(req, auth.member);
    throw new HttpError(404, "Not found");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) {
      console.error(
        error instanceof Error
          ? error.message
          : "Family Dispatcher server error",
      );
    }
    return json(req, {
      error: status >= 500
        ? "Сервер временно недоступен."
        : (error as Error).message,
    }, status);
  }
});
