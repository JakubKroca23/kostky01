# SPEC.md — Projekt Kostky 10000: Stabilizace a UI Refresh

> **Status**: `FINALIZED`

## Vize
Proměnit stávající prototyp hry Kostky 10000 v profesionálně vyhlížející a stabilní aplikaci. Důraz je kladen na odstranění kritických chyb v logice herních místností (zombie místnosti, odpojování hráčů) a celkové povýšení designu (UI/UX) na prémiovou úroveň.

## Cíle
1.  **Stabilizace herních místností**: Vyřešit problém s "duchovními" místnostmi po obnovení stránky a zajistit plynulé pokračování hry při odpojení hráčů (pokud zůstanou aspoň 2).
2.  **Audit a oprava UI/UX**: Provést kompletní revizi rozhraní, zmenšit naddimenzovaná tlačítka a odstranit zbytečné prvky (např. tlačítko "Upravit" pro adminy).
3.  **Profesionalizace formulářů**: Kompletně předělat formuláře pro hlášení chyb a návrhy funkcí, aby nepůsobily amatérsky.
4.  **Vylepšení informovanosti**: Přidat verzi k changelogu na hlavní stránce.

## Ne-cíle (Mimo rozsah této fáze)
- Implementace zcela nových herních mechanik (např. nové karty akcí).
- Přepisování celého backendu na jinou technologii než Appwrite/Socket.io.

## Uživatelé
Hráči kostek, kteří hledají stabilní a vizuálně atraktivní online hru pro více hráčů.

## Kritéria úspěchu
- [ ] Místnosti se automaticky uklízejí nebo správně obnovují po refresh stránky.
- [ ] Hra pokračuje i po odchodu hráče, pokud zůstane dostatečný počet účastníků.
- [ ] Tlačítka a menu mají konzistentní a profesionální velikost/styl.
- [ ] Formuláře zpětné vazby jsou moderní, přehledné a nevyžadují okamžité psaní po otevření.
- [ ] Changelog zobrazuje aktuální verzi projektu.
