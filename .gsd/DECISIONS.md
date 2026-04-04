# DECISIONS.md - Architecture Decision Records (ADR)

## Phase 1 Decisions

**Date:** 2026-04-03

### Scope
- Inicializace backendu (Express) a frontendu (Vite/React).
- Nastavení real-time komunikace přes Socket.io (Port 3001).

### Approach
- **Jazyk**: Standardní React (JSX) bez TypeScriptu. Vybráno pro maximalizaci čitelnosti a rychlost vývoje UI/animací.
- **Struktura**: Monorepo s `/client` a `/server`.
- **Styling**: Vanilla CSS (CSS Modules) s globálními neonovými tokens.

### Constraints
- Cílová orientace: Mobile Portrait.
- Vizuální styl: Neon Dark Mode.
## Phase 2 Decisions

**Date:** 2026-04-03

### Scope
- **Struktura**: Varianta A (Single Page s podmíněným vykreslováním). Zajišťuje plynulý "app-like" pocit a plynulé neonové přechody bez nutnosti URL routingu.
- **Identifikace**: Session-based, ale se server-side validací kolizí přezdívek (zákaz duplicitních jmen pro online hráče).
- **Místnosti**: Limit 2-6 hráčů na jednu herní místnost.
- **Odpojení/Rejoin**: Implementace mechanismu pro návrat hráče do probíhající hry při krátkodobém odpojení (rejoin na základě session/přezdívky).

### Approach
- **Frontend State**: Použití React `useState` v `App.jsx` pro globální řízení obrazovek (`nickname`, `lobby`, `room`).
- **Server State**: Kolekce `players` a `rooms` v paměti serveru (`Map`).

### Constraints
- Ověření unikátnosti jména probíhá asynchronně při odesílání "set-nickname".
- Rejoin je omezen na životnost session (dokud je hráč v paměti serveru nebo dokud neuplyne timeout).
## Phase 3 Decisions

**Date:** 2026-04-03

### Scope
- **Scoring Engine**: 
  - Tři dvojice = 700 bodů.
  - Velká postupka (1-6) = 2000 bodů.
  - Násobky (4, 5, 6 stejných): Standardní násobení x2 (např. 4x 2 = 400).
- **Vstupní limit 350b**: Minimální hranice 350 bodů musí být splněna nejpozději při 3. hodu v rámci aktuálního tahu, jinak tah končí nulou.
- **Herní tah**: Možnost odkládání kostek a vícenásobných hodů (dokud zbývají kostky a hráč neriskuje "Zelenáče").
- **Hot Dice**: Pokud hráč boduje všemi 6 kostkami (i postupně napříč hody), získává nárok na nový hod se všemi 6 kostkami ("znovuhod").

### Approach
- **Logic Location**: Veškerý výpočet skóre probíhá výhradně na serveru (`scoring.js`) pro zamezení podvádění.
- **Turn State**: Server udržuje dočasný stav aktuálního hodu (zbývající kostky, turn points, aktuální počet hodů v tahu).

### Constraints
- Hráč nemůže zapsat skóre (Stop), pokud nesplnil podmínku 350b v daném tahu (při prvním otevření).
## Phase 4 Decisions

**Date:** 2026-04-03

### Scope
- **Dostupnost**: Kostky budou **2D** s neonovým designem (SVG/CSS), nikoliv 3D.
- **Interakce**: Hráč si ručně klikáním vybírá ("odkládá"), které kostky z právě hozených chce započítat jako body.
- **Animace**: Hod trvá 1 sekundu. Kostky v "aréně" mají efekt odrážení od okrajů a od sebe navzájem, než se zastaví na náhodných pozicích.
- **UI**: Plynulé přechody (fade-in/out) mezi jednotlivými obrazovkami aplikace.

### Approach
- **Selection Logic**: Zaveden dočasný stav "vybraných kostek" na klientovi, který je odeslán na server k validaci až při potvrzení (další hod nebo Stop).
- **Physics**: Animace "odrážení" v aréně bude simulována pomocí CSS s mírně náhodným posunem koncových poloh pro realističtější dojem.
## Phase 6 Decisions

**Date:** 2026-04-04

### Scope
- **Scoring Overhaul**: Přechod na pevnou bodovací tabulku (např. 3x 2 = 200b, 4x 2 = 400b atd.) místo progresivního násobení.
- **350b Limit**: Hráč může ukončit tah a zapsat body pouze tehdy, pokud má v daném tahu odloženo minimálně **350 bodů**. Toto pravidlo platí bez výjimky pro každé ukončení tahu (Stop).
- **Čárky (Strikes)**: Systém trestných bodů za "Zelenáče" (Bust).
  - 1x Bust = 1 čárka.
  - 3x čárka = úplné vynulování herního konta (`totalScore = 0`).
  - Úspěšný zápis bodů (>0) nuluje aktuální počet čárek hráče.
- **Dohodit Mechanika**: Volitelná šance dohodit 6. kostku při hození 5/6 postupky nebo párů v 1. hodu.
  - Neúspěch při pokusu o dohození = 0b za tah + **čárka** (jako běžný Bust).
- **Hot Dice**: Bust po "hře do plných" (Hot Dice) se počítá jako běžný Bust → **přičítá se čárka**.
- **Physics Refinement**: Kostky se musí odrážet okraji (ne středy), aby se vizuálně nepřekrývaly s okraji arény ani mezi sebou.

### Approach
- **Scoring Logic**: Tabulkové vyhledávání (SCORE_TABLE) místo vzorců.
- **Validation**: Přísná server-side validace 350b limitu a "dohodit" rozhodnutí.
- **Physics**: Synchronizace `DIE_SIZE` konstanty v Matter.js s reálnými rozměry CSS komponenty (včetně borderu a marginu).

### Constraints
- Postupka a Páry jsou uznány pouze v 1. hodu tahu (nebo v 1. hodu po Hot Dice).
- Klient nesmí umožnit tlačítko "Stop", pokud není splněn limit 350b.
