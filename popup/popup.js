(() => {
  'use strict';

  const G = self.PwGen;
  const I = self.I18N;
  const H = self.Hibp;
  const t = I.t;
  const $ = (id) => document.getElementById(id);
  const BOOLS = ['upper', 'lower', 'digits', 'symbols', 'excludeAmbiguous', 'fillConfirm', 'autoCopy'];
  const SELECTS = ['offerMode', 'revealMode', 'clipboardClear', 'historyMode', 'lang'];
  const GENERATION = new Set(['upper', 'lower', 'digits', 'symbols', 'excludeAmbiguous', 'length', 'symbolChars']);
  let settings = { ...G.DEFAULTS };
  let password = '';
  let statusTimer = 0;
  let showHistory = true;

  const COPY_SVG =
    '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>';

  const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // ---------- i18n ----------

  function applyI18n() {
    document.documentElement.lang = I.lang;
    document.title = t('appTitle');
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
    for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
    $('historyToggle').textContent = t(showHistory ? 'historyHide' : 'historyShow');
  }

  function fillLanguageList() {
    const select = $('lang');
    for (const [code, name] of Object.entries(I.LANGS)) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      select.appendChild(opt);
    }
  }

  // ---------- helpers ----------

  function say(text, isError) {
    const el = $('status');
    el.textContent = text;
    el.className = 'status' + (isError ? ' err' : '');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (el.textContent = ''), 2500);
  }

  function notify(message) {
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  async function writeClipboard(text) {
    await navigator.clipboard.writeText(text);
    notify({ type: 'schedule-clear' });
  }

  // ---------- password ----------

  function renderPassword() {
    const box = $('pw');
    box.replaceChildren();
    for (const ch of password) {
      const span = document.createElement('span');
      span.textContent = ch;
      if (/[0-9]/.test(ch)) span.className = 'd';
      else if (!/[A-Za-z]/.test(ch)) span.className = 's';
      box.appendChild(span);
    }
    const bits = G.entropyBits({ ...settings, length: password.length });
    const { level } = G.strengthLabel(bits);
    const colors = ['', '#ff3b30', '#ff9500', '#34c759', '#30b350'];
    $('bar').style.width = level * 25 + '%';
    $('bar').style.background = colors[level];
    $('strength').textContent = t('strengthLine', { label: t('s' + level), bits });
    // Keep the password on one line: shrink the font until it fits (long passwords scroll sideways).
    let size = 16;
    box.style.fontSize = size + 'px';
    while (box.scrollWidth > box.clientWidth && size > 9) {
      size -= 0.5;
      box.style.fontSize = size + 'px';
    }
  }

  function regenerate() {
    password = G.generate(settings);
    $('hibpResult').textContent = '';
    $('hibpResult').className = 'hibp';
    renderPassword();
  }

  // ---------- form ----------

  function paintRange() {
    const r = $('length');
    r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
  }

  function writeForm() {
    $('length').value = settings.length;
    $('lenVal').textContent = settings.length;
    $('settingsSummary').textContent = settings.length;
    paintRange();
    $('symbolChars').value = settings.symbolChars;
    $('symbolChars').disabled = !settings.symbols;
    for (const key of SELECTS) $(key).value = String(settings[key]);
    for (const key of BOOLS) $(key).checked = !!settings[key];
  }

  function readForm() {
    settings.length = Number($('length').value);
    settings.symbolChars = $('symbolChars').value;
    for (const key of SELECTS) settings[key] = $(key).value;
    settings.clipboardClear = Number(settings.clipboardClear);
    for (const key of BOOLS) settings[key] = $(key).checked;
    // At least one character group must stay enabled.
    if (!settings.upper && !settings.lower && !settings.digits && !(settings.symbols && settings.symbolChars)) {
      settings.lower = true;
      $('lower').checked = true;
    }
  }

  function save() {
    chrome.storage.sync.set(settings);
  }

  async function onChange(e) {
    const id = e.target.id;
    const previousHistoryMode = settings.historyMode;
    readForm();
    $('lenVal').textContent = settings.length;
    $('settingsSummary').textContent = settings.length;
    paintRange();
    $('symbolChars').disabled = !settings.symbols;
    save();
    if (GENERATION.has(id)) regenerate();
    if (id === 'lang') {
      I.setLang(settings.lang);
      applyI18n();
      renderPassword();
      renderHistory();
    }
    if (id === 'historyMode') await migrateHistory(previousHistoryMode);
  }

  // ---------- copy / insert ----------

  async function copy(showStatus = true) {
    try {
      await writeClipboard(password);
      if (showStatus) say(t('copied'));
      return true;
    } catch (e) {
      if (showStatus) say(t('copyFail'), true);
      return false;
    }
  }

  // Small tooltip to the left of the copy icon in the password field.
  let tipTimer = 0;
  function showTip(text, isError) {
    const tip = $('pwTip');
    tip.textContent = text;
    tip.classList.toggle('err', !!isError);
    tip.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip.classList.remove('show'), 1500);
  }

  async function insert() {
    await copy().catch(() => {});
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return say(t('noTab'), true);
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'insert', password });
      if (res && res.ok) {
        say(t('inserted'));
        let host = '';
        try {
          host = new URL(tab.url).hostname;
        } catch (e) {
          host = '';
        }
        notify({ type: 'history-add', password, host });
        setTimeout(renderHistory, 150);
      } else {
        say(t('noField'), true);
      }
    } catch (e) {
      say(t('noInsert'), true);
    }
  }

  // ---------- breach check (Have I Been Pwned, k-anonymity) ----------

  async function runCheck(pw, out, btn) {
    if (!pw) return;
    out.className = 'hibp';
    out.textContent = t('hibpChecking');
    btn.disabled = true;
    try {
      const count = await H.pwnedCount(pw);
      if (out === $('hibpResult') && pw !== password) return; // a new password was generated meanwhile
      if (count > 0) {
        out.className = 'hibp bad';
        out.textContent = t('hibpPwned', { n: count.toLocaleString(I.lang) });
      } else {
        out.className = 'hibp good';
        out.textContent = t('hibpSafe');
      }
    } catch (e) {
      out.className = 'hibp bad';
      out.textContent = t('hibpError');
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- history of inserted passwords ----------

  function historyArea(mode) {
    return mode === 'local' ? chrome.storage.local : chrome.storage.session;
  }

  async function loadHistory(mode) {
    if (mode === 'off') return [];
    const { history } = await historyArea(mode).get({ history: [] });
    return history;
  }

  async function migrateHistory(previousMode) {
    const old = await loadHistory(previousMode);
    if (previousMode !== 'off') await historyArea(previousMode).remove('history');
    if (settings.historyMode !== 'off' && old.length) await historyArea(settings.historyMode).set({ history: old });
    renderHistory();
  }

  async function renderHistory() {
    const list = $('historyList');
    const items = await loadHistory(settings.historyMode);
    list.replaceChildren();
    $('historyCount').textContent = items.length ? String(items.length) : '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'note';
      empty.textContent = t('historyEmpty');
      list.appendChild(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'hrow';
      const meta = document.createElement('div');
      meta.className = 'hmeta';
      const host = document.createElement('b');
      host.textContent = item.host || '-';
      const when = document.createElement('small');
      when.textContent = new Date(item.t).toLocaleString(I.lang, { dateStyle: 'short', timeStyle: 'short' });
      const pw = document.createElement('code');
      pw.textContent = showHistory ? item.pw : '••••••••••••';
      meta.append(host, when, pw);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-btn';
      btn.title = t('copyTitle');
      btn.setAttribute('aria-label', t('copyTitle'));
      btn.innerHTML = COPY_SVG;
      btn.addEventListener('click', async () => {
        try {
          await writeClipboard(item.pw);
          say(t('copied'));
        } catch (e) {
          say(t('copyFail'), true);
        }
      });
      row.append(meta, btn);
      list.appendChild(row);
    }
  }

  // ---------- wiring ----------

  $('regen').addEventListener('click', regenerate);
  $('copy').addEventListener('click', copy);
  $('pwCopy').innerHTML = COPY_SVG;
  $('pwCopy').addEventListener('click', async () => {
    const ok = await copy(false);
    showTip(t(ok ? 'copied' : 'copyFail'), !ok);
    $('pwCopy').innerHTML = CHECK_SVG;
    setTimeout(() => ($('pwCopy').innerHTML = COPY_SVG), 1200);
  });
  $('insert').addEventListener('click', insert);
  $('hibpBtn').addEventListener('click', () => runCheck(password, $('hibpResult'), $('hibpBtn')));
  $('hibpCustomBtn').addEventListener('click', () => runCheck($('hibpInput').value, $('hibpCustomResult'), $('hibpCustomBtn')));
  $('hibpInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('hibpCustomBtn').click();
  });
  $('historyToggle').addEventListener('click', () => {
    showHistory = !showHistory;
    $('historyToggle').textContent = t(showHistory ? 'historyHide' : 'historyShow');
    renderHistory();
  });
  $('historyClear').addEventListener('click', async () => {
    if (settings.historyMode !== 'off') await historyArea(settings.historyMode).remove('history');
    renderHistory();
  });
  function showSettings(open) {
    $('settingsPanel').hidden = !open;
    $('accBox').hidden = open;
  }
  $('openSettings').addEventListener('click', () => showSettings(true));
  $('closeSettings').addEventListener('click', () => showSettings(false));
  $('reset').addEventListener('click', async () => {
    const previousHistoryMode = settings.historyMode;
    settings = { ...G.DEFAULTS };
    I.setLang(settings.lang);
    applyI18n();
    writeForm();
    save();
    regenerate();
    await migrateHistory(previousHistoryMode);
    say(t('resetDone'));
  });
  for (const id of [...BOOLS, ...SELECTS, 'length', 'symbolChars']) {
    $(id).addEventListener(id === 'length' || id === 'symbolChars' ? 'input' : 'change', onChange);
  }

  fillLanguageList();
  chrome.storage.sync.get(G.DEFAULTS, (stored) => {
    settings = { ...G.DEFAULTS, ...stored };
    I.setLang(settings.lang);
    applyI18n();
    writeForm();
    regenerate();
    renderHistory();
  });
})();
