(() => {
  'use strict';

  const G = self.PwGen;
  const I = self.I18N;
  if (!G || !I || self.__pwgenContent) return;
  self.__pwgenContent = true;
  const t = I.t;

  let settings = { ...G.DEFAULTS };
  chrome.storage.sync.get(G.DEFAULTS, (s) => {
    settings = { ...settings, ...s };
    I.setLang(settings.lang);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue;
    if (changes.lang) I.setLang(settings.lang);
    if (changes.revealMode) hideRevealed();
  });

  function notify(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {});
    } catch (e) {
      /* extension was reloaded, ignore */
    }
  }

  // ---------- field detection ----------

  const REVEALED = 'data-pwgen-revealed';

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  function isUsable(el) {
    return (
      el instanceof HTMLInputElement &&
      (el.type === 'password' || el.hasAttribute(REVEALED)) &&
      !el.disabled &&
      !el.readOnly &&
      isVisible(el)
    );
  }

  function passwordFieldsIn(scope) {
    return Array.from(scope.querySelectorAll(`input[type="password"], input[${REVEALED}]`)).filter(isUsable);
  }

  function isRegistration(el) {
    const ac = (el.autocomplete || '').toLowerCase();
    if (ac.includes('current-password')) return false;
    if (ac.includes('new-password')) return true;
    return passwordFieldsIn(el.form || document).length >= 2;
  }

  // The confirmation field is the next password field after this one.
  function findConfirm(el) {
    const all = passwordFieldsIn(el.form || document);
    const next = all.slice(all.indexOf(el) + 1).find((f) => !/current-password/i.test(f.autocomplete));
    return next || null;
  }

  // ---------- filling ----------

  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  function setValue(el, value) {
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  async function applyPassword(el, password) {
    setValue(el, password);
    let filled = 1;
    if (settings.fillConfirm) {
      const confirm = findConfirm(el);
      if (confirm) {
        setValue(confirm, password);
        filled++;
      }
    }
    pinField(el);
    if (filled > 1) pinField(findConfirm(el));
    const copied = settings.autoCopy ? await copyText(password) : false;
    if (copied) notify({ type: 'schedule-clear' });
    notify({ type: 'history-add', password, host: location.hostname });
    return { filled, copied };
  }

  // ---------- UI (closed shadow DOM so page styles cannot touch it) ----------

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; }
    .icon { position: fixed; display: none; width: 24px; height: 24px; padding: 0; border: 0;
      border-radius: 5px; cursor: pointer; z-index: 2147483647; background: #007aff; }
    .icon svg { width: 16px; height: 16px; margin: 4px; display: block; }
    .copy { position: fixed; display: none; width: 24px; height: 24px; padding: 0; border: 0;
      border-radius: 5px; cursor: pointer; z-index: 2147483647; color: #007aff; background: #e9e9ee; }
    .copy:hover { background: #dcdce2; }
    .copy.done { background: #34c759; color: #fff; }
    .copy svg { width: 15px; height: 15px; margin: 4.5px; display: block; fill: none; stroke: currentColor;
      stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .pop { position: fixed; display: none; width: 300px; padding: 16px; z-index: 2147483647;
      background: #fff; color: #000; font-size: 14px; line-height: 1.4;
      border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.22), 0 0 0 .5px rgba(0,0,0,.1); }
    .title { font-weight: 600; font-size: 15px; margin-bottom: 10px; }
    .pw { font: 15px/1.4 ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace; word-break: break-all;
      background: #f2f2f7; border-radius: 6px; padding: 11px 12px; margin-bottom: 10px; user-select: all; text-align: center; }
    .pw .d { color: #007aff; } .pw .s { color: #ff3b30; }
    .hint { color: #8a8a8e; font-size: 12.5px; margin-bottom: 12px; }
    .row { display: flex; gap: 8px; }
    button.btn { flex: 1; border: 0; border-radius: 6px; padding: 10px 12px; font-size: 15px; cursor: pointer;
      background: #007aff; color: #fff; font-weight: 600; transition: background .15s, transform .1s; }
    button.btn:hover { background: #0a6ee0; }
    button.btn:active { transform: scale(.97); }
    button.alt { flex: 0 0 auto; background: #e9e9ee; color: #007aff; }
    button.alt:hover { background: #dcdce2; }
    .ok { color: #248a3d; font-weight: 600; margin-bottom: 8px; }
    .warn { color: #c93400; font-weight: 600; margin-bottom: 8px; }
    @media (prefers-color-scheme: dark) {
      .pop { background: #1c1c1e; color: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.6), 0 0 0 .5px rgba(255,255,255,.14); }
      .pw { background: #000; }
      .pw .d { color: #0a84ff; } .pw .s { color: #ff453a; }
      .hint { color: #98989f; }
      .icon { background: #0a84ff; }
      .copy { background: #2c2c2e; color: #0a84ff; } .copy:hover { background: #3a3a3c; }
      button.btn { background: #0a84ff; } button.btn:hover { background: #409cff; }
      button.alt { background: #2c2c2e; color: #0a84ff; } button.alt:hover { background: #3a3a3c; }
      .ok { color: #30d158; } .warn { color: #ff9f0a; }
    }
  `;



  const ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="5" y="11" width="14" height="10" rx="2" fill="#fff" stroke="none"/>' +
    '<path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  const COPY_SVG = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  let host = null;
  let root = null;
  let iconEl = null;
  let popEl = null;
  let field = null;
  let password = '';
  let popOpen = false;
  const dismissed = new WeakSet();
  let frame = 0;

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function ensureUI() {
    if (host) return;
    host = document.createElement('div');
    root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    iconEl = h('button', 'icon');
    iconEl.type = 'button';
    iconEl.title = t('iconTitle');
    iconEl.innerHTML = ICON_SVG;
    // The icon always (re)opens the offer with a fresh password; Esc or a click elsewhere closes it.
    iconEl.addEventListener('click', openPopover);
    popEl = h('div', 'pop');
    root.append(style, iconEl, popEl);
    // Keep focus in the page field while clicking inside our UI.
    root.addEventListener('mousedown', (e) => e.preventDefault());
    host.addEventListener('mouseleave', onUiLeave);
    document.documentElement.appendChild(host);
  }

  function colorized(text) {
    const box = h('div', 'pw');
    for (const ch of text) {
      const span = document.createElement('span');
      span.textContent = ch;
      if (/[0-9]/.test(ch)) span.className = 'd';
      else if (!/[A-Za-z]/.test(ch)) span.className = 's';
      box.appendChild(span);
    }
    return box;
  }

  function hintText() {
    const key = settings.fillConfirm
      ? settings.autoCopy ? 'hintFillConfirmCopy' : 'hintFillConfirm'
      : settings.autoCopy ? 'hintFillCopy' : 'hintFill';
    return t(key);
  }

  function renderOffer() {
    popEl.replaceChildren();
    const useBtn = h('button', 'btn', t('use'));
    useBtn.type = 'button';
    useBtn.addEventListener('click', async () => {
      const result = await applyPassword(field, password);
      renderDone(result);
    });
    const regen = h('button', 'btn alt', '↻');
    regen.type = 'button';
    regen.title = t('regenTitle');
    regen.addEventListener('click', () => {
      password = G.generate(settings);
      renderOffer();
    });
    const row = h('div', 'row');
    row.append(useBtn, regen);
    popEl.append(h('div', 'title', t('offerTitle')), colorized(password), h('div', 'hint', hintText()), row);
    position();
  }

  function renderDone({ filled, copied }) {
    popEl.replaceChildren();
    const msg = settings.autoCopy && !copied ? t('doneCopyFail') : null;
    popEl.append(
      h('div', msg ? 'warn' : 'ok', msg || (copied ? t('doneCopied') : t('doneOnly'))),
      colorized(password),
      h('div', 'hint', filled > 1 ? t('doneTwo') : t('doneOne'))
    );
    position();
  }

  function position() {
    positionCopies();
    if (!field || !host) return;
    if (!field.isConnected || !isVisible(field)) return hideAll();
    const r = field.getBoundingClientRect();
    iconEl.style.left = Math.max(0, r.right - 30) + 'px';
    iconEl.style.top = r.top + (r.height - 24) / 2 + 'px';
    iconEl.style.display = 'block';
    if (popOpen) {
      popEl.style.display = 'block';
      const w = popEl.offsetWidth;
      const hgt = popEl.offsetHeight;
      popEl.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
      // Above the field by default: Chrome's own password dropdown opens below it.
      const above = r.top - hgt - 6;
      popEl.style.top = (above >= 8 ? above : r.bottom + 6) + 'px';
    } else {
      popEl.style.display = 'none';
    }
  }

  function schedulePosition() {
    if (frame || (!field && !copyButtons.size)) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (field) position();
      else positionCopies();
    });
  }

  function openPopover() {
    ensureUI();
    password = G.generate(settings);
    popOpen = true;
    renderOffer();
  }

  function closePopover(markDismissed) {
    popOpen = false;
    if (markDismissed && field) dismissed.add(field);
    position();
  }

  function hideAll() {
    popOpen = false;
    if (iconEl) iconEl.style.display = 'none';
    if (popEl) popEl.style.display = 'none';
    field = null;
  }

  function showFor(el) {
    ensureUI();
    field = el;
    position();
  }

  // ---------- copy button inside every field whose password is visible ----------

  const pinned = new Set(); // autofilled by us: stay visible until the form is submitted
  const copyButtons = new Map(); // field -> copy button
  const revealed = new Set();
  let hovered = null;

  function ensureCopy(el) {
    if (copyButtons.has(el)) return;
    ensureUI();
    const btn = h('button', 'copy');
    btn.type = 'button';
    btn.title = t('copyTitle');
    btn.innerHTML = COPY_SVG;
    btn.addEventListener('click', async () => {
      if (await copyText(el.value)) notify({ type: 'schedule-clear' });
      btn.classList.add('done');
      btn.innerHTML = CHECK_SVG;
      setTimeout(() => {
        btn.classList.remove('done');
        btn.innerHTML = COPY_SVG;
      }, 1200);
    });
    root.appendChild(btn);
    copyButtons.set(el, btn);
  }

  function dropCopy(el) {
    const btn = copyButtons.get(el);
    if (btn) btn.remove();
    copyButtons.delete(el);
  }

  function pinField(el) {
    revealField(el);
    pinned.add(el);
    ensureCopy(el);
    positionCopies();
  }

  function unpinField(el) {
    pinned.delete(el);
    hideField(el, true);
    dropCopy(el);
  }

  function unpinAll() {
    for (const el of Array.from(pinned)) unpinField(el);
    hideRevealed(true);
  }

  function positionCopies() {
    for (const [el, btn] of copyButtons) {
      if (!el.isConnected || !isVisible(el)) {
        unpinField(el);
        continue;
      }
      if (el.value === '') {
        if (pinned.has(el)) unpinField(el);
        else btn.style.display = 'none';
        continue;
      }
      const r = el.getBoundingClientRect();
      // Our lock icon sits at the right edge of the focused field, so the copy button goes left of it.
      btn.style.left = Math.max(0, r.right - (el === field ? 58 : 30)) + 'px';
      btn.style.top = r.top + (r.height - 24) / 2 + 'px';
      btn.style.display = 'block';
    }
  }

  // ---------- reveal password (hover / double click / focus / Ctrl) ----------

  function revealField(el) {
    if (!(el instanceof HTMLInputElement) || el.type !== 'password' || el.disabled || revealed.has(el)) return;
    el.setAttribute(REVEALED, '');
    el.type = 'text';
    revealed.add(el);
    ensureCopy(el);
    positionCopies();
  }

  function hideField(el, force) {
    if (!revealed.has(el) || (pinned.has(el) && !force)) return;
    revealed.delete(el);
    el.type = 'password';
    el.removeAttribute(REVEALED);
    dropCopy(el);
  }

  function hideRevealed(force) {
    for (const el of Array.from(revealed)) hideField(el, force);
  }

  // The mouse left our copy button without going back to the field: hide again (hover mode).
  function onUiLeave() {
    hovered = null;
    if (settings.revealMode !== 'hover') return;
    for (const el of Array.from(revealed)) if (document.activeElement !== el) hideField(el);
    for (const el of Array.from(copyButtons.keys())) releaseCopy(el);
  }

  // The copy button stays while the field is hovered, focused, revealed or autofilled by us.
  function releaseCopy(el) {
    if (revealed.has(el) || pinned.has(el) || el === hovered || el === document.activeElement) return;
    dropCopy(el);
  }

  // Clicking into a password field shows the copy button regardless of the reveal mode.
  document.addEventListener(
    'focusin',
    (e) => {
      if (!isPwField(e.target)) return;
      ensureCopy(e.target);
      positionCopies();
    },
    true
  );

  document.addEventListener(
    'input',
    (e) => {
      if (copyButtons.has(e.target)) positionCopies();
    },
    true
  );

  const isPwField = (el) => el instanceof HTMLInputElement && (el.type === 'password' || revealed.has(el));

  document.addEventListener(
    'mouseover',
    (e) => {
      if (!isPwField(e.target)) return;
      hovered = e.target;
      if (settings.revealMode === 'hover') revealField(e.target);
      ensureCopy(e.target);
      positionCopies();
    },
    true
  );
  document.addEventListener(
    'mouseout',
    (e) => {
      if (e.target !== hovered) return;
      if (e.relatedTarget === host) return; // moving onto our copy button
      hovered = null;
      if (settings.revealMode === 'hover' && document.activeElement !== e.target) hideField(e.target);
      releaseCopy(e.target);
    },
    true
  );
  document.addEventListener(
    'dblclick',
    (e) => {
      if (settings.revealMode === 'dblclick' && isPwField(e.target)) revealField(e.target);
    },
    true
  );
  document.addEventListener(
    'focusin',
    (e) => {
      if (settings.revealMode === 'focus' && isPwField(e.target)) revealField(e.target);
    },
    true
  );
  document.addEventListener(
    'focusout',
    (e) => {
      // Re-hide on blur in every mode except hover while the mouse is still over the field.
      if (settings.revealMode !== 'hover' || e.target !== hovered) hideField(e.target);
      releaseCopy(e.target);
    },
    true
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Control' || settings.revealMode !== 'ctrl') return;
      const el = isPwField(document.activeElement) ? document.activeElement : hovered;
      if (el) revealField(el);
    },
    true
  );
  document.addEventListener(
    'keyup',
    (e) => {
      if (e.key === 'Control' && settings.revealMode === 'ctrl') hideRevealed();
    },
    true
  );
  // Never submit (or let a password manager save) a field that is temporarily a text input.
  document.addEventListener('submit', unpinAll, true);
  window.addEventListener('blur', () => {
    if (settings.revealMode === 'ctrl') hideRevealed();
  });

  // ---------- events ----------

  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target;
      if (!isUsable(el)) {
        if (host && e.target !== host) hideAll();
        return;
      }
      const mode = settings.offerMode;
      if (mode === 'off') return;
      showFor(el);
      const auto = mode === 'always' || (mode === 'smart' && isRegistration(el));
      if (auto && el.value === '' && !dismissed.has(el)) openPopover();
    },
    true
  );

  document.addEventListener(
    'focusout',
    (e) => {
      if (e.target === field) {
        // Delay so a focus move to another password field keeps the UI alive.
        setTimeout(() => {
          if (field === e.target && document.activeElement !== e.target) hideAll();
        }, 0);
      }
    },
    true
  );

  document.addEventListener(
    'mousedown',
    (e) => {
      if (popOpen && e.target !== host && e.target !== field) closePopover(true);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && popOpen) closePopover(true);
    },
    true
  );

  window.addEventListener('scroll', schedulePosition, true);
  window.addEventListener('resize', schedulePosition);

  // ---------- context menu + popup messages ----------

  let lastContextTarget = null;
  document.addEventListener('contextmenu', (e) => (lastContextTarget = e.target), true);

  function pickTarget(preferred) {
    if (isUsable(preferred)) return preferred;
    if (isUsable(document.activeElement)) return document.activeElement;
    return passwordFieldsIn(document)[0] || null;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'fill-target') {
      const target = pickTarget(lastContextTarget);
      if (!target) return;
      showFor(target);
      password = G.generate(settings);
      popOpen = true;
      applyPassword(target, password).then((result) => {
        renderDone(result);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.type === 'insert') {
      const target = pickTarget(null);
      if (!target) return;
      const value = String(msg.password || '');
      setValue(target, value);
      if (settings.fillConfirm) {
        const confirm = findConfirm(target);
        if (confirm) {
          setValue(confirm, value);
          pinField(confirm);
        }
      }
      pinField(target);
      sendResponse({ ok: true });
    }
  });
})();
