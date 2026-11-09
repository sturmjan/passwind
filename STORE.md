# Podklady pro Chrome Web Store

## Název
Generátor hesel (lokalizováno: cs, en, de, es, pt_PT, fr, it přes `_locales/`)

## Krátký popis (max 132 znaků)
Silná hesla jedním klikem. Rozpozná pole pro heslo, vloží heslo i do potvrzení, zkontroluje únik a zkopíruje ho do schránky.

## Dlouhý popis
Jednoduchý generátor silných hesel přímo v prohlížeči.

- Kliknutím na ikonu vygenerujete heslo s nastavitelnou délkou a sadou znaků (velká/malá písmena, čísla, speciální znaky, vlastní povolené znaky, vynechání podobných znaků).
- Výchozí nastavení je silné (20 znaků, všechny skupiny znaků).
- U polí pro heslo na stránce se zobrazí malá ikona. U registračních formulářů se nabídka otevře automaticky.
- Jedním kliknutím se heslo vloží do pole, do pole pro potvrzení hesla (jde vypnout) a zkopíruje do schránky.
- Funguje i přes pravé tlačítko myši: "Vygenerovat heslo a vložit".
- Kontrola úniku přes Have I Been Pwned (k-anonymity): odesílá se jen prvních 5 znaků SHA-1 otisku, heslo prohlížeč neopustí. Jde zkontrolovat vygenerované i vlastní heslo.
- Zobrazení hesla v poli na stránce: při najetí myší, dvojklikem, po kliknutí do pole nebo při držení Ctrl (nebo vypnuto).
- Automatické vymazání schránky po 30 s / 1 min / 2 min.
- Historie vložených hesel: do zavření prohlížeče (výchozí), trvale, nebo vůbec.
- Světlý i tmavý vzhled podle systému. Jazyky: čeština, angličtina, němčina, španělština, portugalština, francouzština, italština.
- Hesla se generují lokálně kryptograficky bezpečným generátorem (Web Crypto).

## Zdůvodnění oprávnění (do formuláře "Privacy practices")
- `storage`: uložení nastavení generátoru a historie vložených hesel (podle volby uživatele jen v paměti prohlížeče, nebo místně).
- `clipboardWrite`: kopírování vygenerovaného hesla do schránky a její pozdější vymazání.
- `contextMenus`: položka "Vygenerovat heslo a vložit" v kontextové nabídce.
- `alarms`: časovač pro automatické vymazání schránky.
- `offscreen`: vymazání schránky (service worker k ní nemá přístup).
- Content script na `http(s)://*/*`: rozpoznání polí pro heslo, vložení hesla a jeho zobrazení v poli. Stránky se nečtou ani neodesílají.
- Síťový dotaz na `https://api.pwnedpasswords.com/range/<5 znaků>` jen po kliknutí uživatele na "Zkontrolovat únik".

Single purpose: generování a vkládání hesel.
Data usage: žádná data se neshromažďují. Remote code: ne.

## Zásady ochrany osobních údajů
Rozšíření Generátor hesel neshromažďuje ani nepředává žádné osobní údaje vývojáři.
Hesla se generují výhradně lokálně v prohlížeči.
Uložena jsou nastavení generátoru (synchronizované úložiště prohlížeče) a volitelně historie vložených hesel (výchozí: jen v paměti do zavření prohlížeče, na přání trvale v místním úložišti, nebo vůbec).
Při ručním spuštění kontroly úniku se na službu Have I Been Pwned odešle pouze prvních 5 znaků SHA-1 otisku hesla; samotné heslo ani celý otisk se neodesílá.
Rozšíření nečte obsah stránek kromě zjištění, zda na stránce existuje pole pro heslo.

## Grafika (zbývá vytvořit)
- Ikona 128x128: `icons/icon128.png` (hotovo, modrá)
- Screenshoty 1280x800: min. 1 (popup + nabídka u pole pro heslo)
- Malá promo dlaždice 440x280 (volitelné, doporučeno)

## Balíček
ZIP obsahující `manifest.json`, `_locales/`, `src/`, `popup/`, `icons/` (bez `tools/`, `STORE.md`).
