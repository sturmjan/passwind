# Generátor hesel / Password Generator

Rozšíření pro Chrome: silná hesla jedním klikem, nabídka přímo u pole pro heslo, kontrola úniku, historie vložených hesel a mazání schránky. Všechno běží lokálně v prohlížeči.

*A Chrome extension: strong passwords in one click, an offer right at the password field, breach check, history of inserted passwords and clipboard clearing. Everything runs locally in the browser.*

**Prezentace a zásady ochrany osobních údajů / Website and privacy policy:** `docs/index.html` (GitHub Pages: https://sturmjan.github.io/generator-hesel/)

![Popup](docs/img/popup-main.png)

## Funkce / Features

- Délka 8-64 znaků, velká/malá písmena, čísla, speciální znaky, vlastní znaky, vynechání podobných znaků
- Nabídka u polí pro heslo (u registrace automaticky), vloží i potvrzení hesla
- Zobrazení hesla v poli (najetí myší, dvojklik, focus, Ctrl) a ikona kopírování přímo v poli
- Kontrola úniku přes Have I Been Pwned (k-anonymity, odesílá se jen 5 znaků otisku)
- Historie vložených hesel (do zavření prohlížeče / trvale / vypnuto)
- Automatické mazání schránky (30 s / 1 min / 2 min)
- 7 jazyků (cs, en, de, es, pt, fr, it), světlý a tmavý režim

## Instalace / Install

1. Stáhněte repozitář a rozbalte ho. / Download and unzip the repository.
2. `chrome://extensions` -> zapnout **Režim pro vývojáře** / **Developer mode**.
3. **Načíst rozbalené** / **Load unpacked** -> vyberte složku s `manifest.json`.

## Chyby a nápady / Bugs and ideas

Založte [issue](https://github.com/sturmjan/generator-hesel/issues/new/choose). Prosím **nikdy nevkládejte skutečná hesla**. / Please **never paste real passwords**.

## Struktura / Structure

| Cesta | Obsah |
| --- | --- |
| `manifest.json` | Manifest V3 |
| `src/` | `content.js` (pole na stránkách), `background.js` (menu, schránka), `generator.js`, `i18n.js`, `hibp.js`, `offscreen.*` |
| `popup/` | okno rozšíření |
| `_locales/` | název a popis pro obchod |
| `tools/` | skript na ikony, ukázková stránka `demo-signup.html` |
| `docs/` | prezentační stránka + screenshoty |
| `STORE.md` | podklady pro Chrome Web Store |

## Licence

MIT, viz `LICENSE`.
