# Chrome Web Store listing notes

Primary listing language: **English**. Localized name/description live in `_locales/` (en, cs, de, es, pt_PT, fr, it). The UI language follows the browser and can be changed in the popup.

## Name
Passwind - Password Generator

## Short description (max 132 chars)
Strong passwords in one click. Detects password fields, fills the confirmation, checks for breaches and copies to the clipboard.

## Detailed description
Generate strong passwords right in your browser, with no accounts and no servers.

- Click the icon to generate a password: 8-64 characters, upper/lower case, digits, symbols, your own allowed characters, look-alike exclusion.
- A small icon appears in password fields. On sign-up forms the offer opens automatically, and one click fills the field and the confirmation field.
- Show the password in the field on hover, double click, focus or while holding Ctrl, with a copy icon right in the field.
- Breach check via Have I Been Pwned (k-anonymity): only the first 5 characters of the SHA-1 hash are sent, the password never leaves your browser.
- Optional history of inserted passwords (until the browser closes, permanent, or off) so a failed sign-up never loses a password.
- Automatic clipboard clearing after 30 s, 1 or 2 minutes.
- Also in the right-click menu: "Generate password and insert".
- English, Czech, German, Spanish, Portuguese, French and Italian. Light and dark mode.
- Open source (MIT): https://github.com/sturmjan/passwind

## Category
Productivity

## Privacy practices form
- Single purpose: generating strong passwords and inserting them into fields on web pages.
- Data usage: tick "Authentication information" (passwords are handled locally). Nothing is sold or transferred, nothing is used for purposes unrelated to the core function or for creditworthiness.
- Remote code: no.
- Privacy policy URL: https://sturmjan.github.io/passwind/#soukromi (GitHub Pages must be enabled; the page shows English by default).

## Permission justifications
- `storage`: settings and the optional history of inserted passwords.
- `clipboardWrite`: copy the password and wipe it from the clipboard later.
- `contextMenus`: "Generate password and insert" in the right-click menu.
- `alarms`, `offscreen`: timer and hidden document for the automatic clipboard wipe (service workers cannot access the clipboard).
- Content script on `http(s)://*/*`: detect password fields, show the offer, insert and reveal the password. Page content is neither read nor sent anywhere.
- Network: `https://api.pwnedpasswords.com/range/<5 hash chars>` only when the user clicks "Check for breaches".

## Graphics (still to do)
- Icon 128x128: `icons/icon128.png` (done)
- Screenshots 1280x800 (1-5): popup, in-page offer, filled fields (raw shots in `docs/img/`)
- Small promo tile 440x280 (optional)

## Package
ZIP containing `manifest.json`, `_locales/`, `src/`, `popup/`, `icons/` only (no `tools/`, `docs/`, `.github/`, `*.md`).
