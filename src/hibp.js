(function (root) {
  'use strict';

  async function sha1Hex(text) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  // Have I Been Pwned range API (k-anonymity): only the first 5 hex chars of the SHA-1
  // leave the browser, the suffix is matched locally. Returns how many times it leaked.
  async function pwnedCount(password) {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch('https://api.pwnedpasswords.com/range/' + prefix, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.text();
    for (const line of body.split(/\r?\n/)) {
      const [candidate, count] = line.split(':');
      if (candidate === suffix) return Number(count) || 0; // padded decoys have count 0
    }
    return 0;
  }

  root.Hibp = { pwnedCount };
})(typeof self !== 'undefined' ? self : globalThis);
