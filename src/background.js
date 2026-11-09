importScripts('i18n.js', 'generator.js');

const MENU_ID = 'pwgen-fill';
const CLEAR_ALARM = 'pwgen-clear-clipboard';
const HISTORY_MAX = 25;
const G = self.PwGen;

function getSettings() {
  return chrome.storage.sync.get(G.DEFAULTS);
}

async function buildMenu() {
  const s = await getSettings();
  self.I18N.setLang(s.lang);
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: self.I18N.t('menuTitle'),
      contexts: ['editable'],
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.lang) buildMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || tab.id == null) return;
  chrome.tabs
    .sendMessage(tab.id, { type: 'fill-target' }, { frameId: info.frameId })
    .catch(() => {});
});

// ---------- toolbar icon animation ----------
// Chrome has no hover event for the toolbar button, so the logo animates when the popup opens
// and after a password was inserted. Frames are pre-rendered PNGs (service workers cannot render SVG).

const ANIM_FRAMES = 14;
const ANIM_STEP_MS = 90;
const RESTING_ICON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png' };
let animating = false;

function playIconAnimation() {
  if (animating) return;
  animating = true;
  let i = 0;
  const step = () => {
    if (i >= ANIM_FRAMES) {
      chrome.action.setIcon({ path: RESTING_ICON }).catch(() => {});
      animating = false;
      return;
    }
    const n = String(i++).padStart(2, '0');
    chrome.action
      .setIcon({ path: { 16: `icons/anim/f${n}-16.png`, 32: `icons/anim/f${n}-32.png` } })
      .catch(() => {});
    setTimeout(step, ANIM_STEP_MS);
  };
  step();
}

// ---------- history of inserted passwords ----------
// 'session' lives in memory only (gone when the browser closes), 'local' stays on disk.

let historyQueue = Promise.resolve();

function addHistory(password, host) {
  historyQueue = historyQueue
    .then(async () => {
      const s = await getSettings();
      if (s.historyMode !== 'session' && s.historyMode !== 'local') return;
      const area = s.historyMode === 'local' ? chrome.storage.local : chrome.storage.session;
      const { history } = await area.get({ history: [] });
      history.unshift({ pw: String(password), host: String(host || ''), t: Date.now() });
      await area.set({ history: history.slice(0, HISTORY_MAX) });
    })
    .catch(() => {});
}

// ---------- clipboard auto-clear ----------

async function scheduleClear() {
  const s = await getSettings();
  const seconds = Number(s.clipboardClear) || 0;
  await chrome.alarms.clear(CLEAR_ALARM);
  if (seconds > 0) chrome.alarms.create(CLEAR_ALARM, { when: Date.now() + seconds * 1000 });
}

async function clearClipboard() {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Clear the generated password from the clipboard after a delay.',
    });
  }
  try {
    await chrome.runtime.sendMessage({ type: 'offscreen-clear-clipboard' });
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CLEAR_ALARM) clearClipboard().catch(() => {});
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === 'history-add') {
    addHistory(msg.password, msg.host);
    playIconAnimation();
  } else if (msg.type === 'icon-anim') playIconAnimation();
  else if (msg.type === 'schedule-clear') scheduleClear().catch(() => {});
});
