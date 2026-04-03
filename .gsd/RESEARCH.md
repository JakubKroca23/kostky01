# RESEARCH.md — Project Research

> **Status**: `COMPLETED`

## Neon Styling (CSS)
Pro dosažení prvotřídního neonového vzhledu na webu bez negativního dopadu na výkon (zejména na mobilu) budeme postupovat následovně:

- **Vrstvení stínů**: Místo jednoho stínu budeme používat seznam čárkou oddělených `text-shadow` a `box-shadow`.
    - *Příklad*: `text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #bc13fe, 0 0 40px #bc13fe;`
- **Optimalizace výkonu**: Animace stínů jsou náročné. Budeme animovat primárně `opacity` a `transform` (GPU akcelerace). Pro "blikání" neonů budeme měnit průhlednost celého elementu, nikoliv přepočítávat rozmazání stínu v každém snímku.
- **Glassmorphism**: Pro karty v lobby a herní panely použijeme `backdrop-filter: blur()`, což v kombinaci s neonovými okraji vytvoří "premium" futuristický pocit.

## Real-time Architektura (Socket.io)
Pro lobby a herní místnosti implementujeme následující vzory:

- **Server jako "Source of Truth"**: Veškerá logika (házení kostek, výpočet kombinací, kontrola tahů) proběhne na serveru. Klient pouze posílá požadavky (např. 'roll-dice') a vykresluje stav, který mu server pošle.
- **Rooms (Místnosti)**: Každá hra bude mít svůj unikátní `roomId`. Socket.io nativně podporuje `join` a `leave`, což využijeme pro izolaci komunikace mezi hrami.
- **Lobby Management**: Server bude udržovat seznam aktivních místností (id, jméno, počet hráčů, stav hry). Při připojení do lobby klient obdrží tento seznam a bude odebírat aktualizace o změnách.

## Animace hodu kostkou
- **2D se "smyslem pro 3D"**: Místo těžkého Three.js (které by mohlo zpomalovat mobily) použijeme 2D kostky s CSS transformacemi a "blur" efektem během hodu. 
- **Sekvence hodu**:
    1. Klient pošle 'roll'.
    2. Server vygeneruje náhodná čísla a pošle je zpět.
    3. Klient spustí animaci "rozmazaného pohybu" (CSS keyframes).
    4. Po skončení animace se zobrazí finální hodnoty kostek se "glow" efektem pro ty, které tvoří kombinaci.

## Technologické rozhodnutí
- **Frontend**: Vite + React + Vanilla CSS (Modules).
- **Backend**: Node.js + Express + Socket.io.
- **State Management**: React `useState` / `useReducer` pro synchronizaci se stavem ze serveru.
