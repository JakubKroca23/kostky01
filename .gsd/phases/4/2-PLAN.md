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
  <name>Roll Animation Logic</name>
  <files>client/src/App.jsx, client/src/components/Die.jsx</files>
  <action>
    Triggerovat animaci při socket eventu `dice-rolled`.
    - Přidat `isRolling` flag na celou sadu kostek.
    - Při `roll-dice` zapnout animaci (shake/random spin).
    - Zobrazit skutečné hodnoty se zpožděním (např. 800ms až 1s) po animaci.
  </action>
  <verify>Při kliknutí na "HODIT" se kostky nejdřív točí a pak teprve ukáží výsledek.</verify>
  <done>Hod působí dynamicky a má "napětí" před ukázáním bodů.</done>
</task>

<task type="auto">
  <name>Combination Glow Effects</name>
  <files>client/src/index.css</files>
  <action>
    Animovat kostky tvořící kombinaci.
    - Získat informaci, které indexy byly použity (usedIndexes) - nutno poslat ze serveru v roll-dice.
    - Přidat těmto kostkám pulsní glow efekt (`animation: scorePulse`).
  </action>
  <verify>Ruční ověření, že bodované kostky (např. trojice) blikají růžově nebo zeleně.</verify>
  <done>Hráč okamžitě vizuálně vidí, které kostky mu přinesly body.</done>
</task>

## Success Criteria
- [ ] Animace trvá dostatečně dlouho pro "napětí", ale ne obtěžuje.
- [ ] Bodující kostky jsou vizuálně odlišené.
