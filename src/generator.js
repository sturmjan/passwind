(function (root) {
  'use strict';

  const SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
  };
  const AMBIGUOUS = /[Il1|O0o]/g;

  const DEFAULTS = {
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    symbolChars: '!@#$%^&*-_+=?',
    excludeAmbiguous: false,
    fillConfirm: true,
    autoCopy: true,
    offerMode: 'smart', // smart | always | icon | off
    clipboardClear: 30, // seconds, 0 = never
    historyMode: 'session', // session | local | off
    lang: 'auto',
    revealMode: 'hover', // off | hover | dblclick | focus | ctrl
  };

  // Uniform random integer in [0, max) without modulo bias.
  function randomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function pools(opts) {
    const list = [];
    for (const key of ['lower', 'upper', 'digits']) {
      if (opts[key]) list.push(SETS[key]);
    }
    if (opts.symbols && opts.symbolChars) {
      list.push(Array.from(new Set(opts.symbolChars)).join(''));
    }
    return list
      .map((p) => (opts.excludeAmbiguous ? p.replace(AMBIGUOUS, '') : p))
      .filter((p) => p.length > 0);
  }

  function generate(options) {
    const opts = { ...DEFAULTS, ...options };
    let list = pools(opts);
    if (!list.length) list = pools({ ...opts, lower: true, digits: true });
    const length = Math.min(128, Math.max(list.length, Number(opts.length) || DEFAULTS.length));
    const all = list.join('');

    // One guaranteed character from every selected group, the rest from the union.
    const chars = list.map((p) => p[randomInt(p.length)]);
    while (chars.length < length) chars.push(all[randomInt(all.length)]);

    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  function entropyBits(options) {
    const opts = { ...DEFAULTS, ...options };
    const list = pools(opts);
    const size = list.length ? list.join('').length : 36;
    return Math.round(Math.max(4, Number(opts.length) || 0) * Math.log2(size));
  }

  // level 1-4 (UI texts come from I18N: s1..s4)
  function strengthLabel(bits) {
    if (bits < 50) return { level: 1 };
    if (bits < 75) return { level: 2 };
    if (bits < 100) return { level: 3 };
    return { level: 4 };
  }

  root.PwGen = { DEFAULTS, generate, entropyBits, strengthLabel };
})(typeof self !== 'undefined' ? self : globalThis);
