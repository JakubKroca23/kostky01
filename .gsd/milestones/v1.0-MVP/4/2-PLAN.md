---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: Throwing & Landing Animations

## Objective
Implementace pocitu hodu kostkami: náhodné točení před "přistáním" na výsledek ze serveru.

## Context
- client/src/App.jsx
- client/src/index.css

## Tasks

<task type="auto">
  <name>Manual Selection Coordination</name>
  <files>client/src/App.jsx, server/index.js</files>
  <action>
    Upravit workflow tahu.
    - Klient umožňuje klikat na "scoring" kostky (lokální state `selectedIndexes`).
    - Při kliknutí na "HODIT DALŠÍ" nebo "STOP" se na server pošlou `selectedIndexes`.
    - Server: Validuje, že vybrané kostky tvoří body, přidá je k `turnPoints` a pak buď hodí zbytkem, nebo ukončí tah.
  </action>
  <verify>Hráč vybere kostky -> Klikne na Stop -> Server potvrdí body a přepne tah.</verify>
  <done>Interaktivní výběr kostek je plně synchronizovaný a validovaný serverem.</done>
</task>

<task type="auto">
  <name>Visual Throw Delay</name>
  <files>client/src/App.jsx</files>
  <action>
    Synchronizovat zobrazení výsledku hodu s vizuální animací.
    - Při hodu server odpoví okamžitě, ale klient zobrazí nové hodnoty až po skončení 1s animace.
  </action>
  <verify>Uživatel vidí trvat animaci hodu, než se "vyklube" skutečná hodnota.</verify>
  <done>Zpoždění hodu umocňuje pocit reálného hraní.</done>
</task>

## Success Criteria
- [ ] Animace trvá dostatečně dlouho pro "napětí", ale ne obtěžuje.
- [ ] Bodující kostky jsou vizuálně odlišené.
