---
phase: 5
plan: 2
wave: 2
---

# Plan 5.2: SFX Integration & UI Toggle

## Objective
Propojení všech herních akcí se zvukovým enginem a přidání tlačítka pro ztlumení (mute).

## Context
- client/src/components/GameRoom.jsx
- client/src/App.jsx

## Tasks

<task type="auto">
  <name>SFX Hookups (Roll, Select, Score)</name>
  <files>client/src/App.jsx, client/src/components/Die.jsx</files>
  <action>
    Triggerovat zvuky na správných místech.
    - `onRoll`: `playDiceRoll()`.
    - `onSelectDie`: `playClick()`.
    - `isBust`: `playBust()`.
    - `onStop`: `playScore()`.
  </action>
  <verify>Ruční ověření, že herní sezení "zní" dle akcí.</verify>
  <done>Uživatel má audiovizuální odezvu pro každou důležitou operaci.</done>
</task>

<task type="auto">
  <name>Sound Toggle Configuration</name>
  <files>client/src/App.jsx, client/src/index.css</files>
  <action>
    Přidat do záhlaví (App.jsx) ikonu/tlačítko pro zvuk.
    - Ukládat stav (on/off) do `localStorage`.
    - Pokud je off, `AudioManager` umlčí veškerou produkci.
  </action>
  <verify>Kliknutím na tlačítko se zvuky ihned zapnou/vypnou.</verify>
  <done>Respektuje se preference uživatele ohledně hluku.</done>
</task>

## Success Criteria
- [ ] Funkční přepínač zvuku v UI.
- [ ] Zvuk je synchronizovaný s vizuálními animacemi.
