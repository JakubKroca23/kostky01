---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: Final Styling & UX Polishing

## Objective
Dotažení drobností, mobilní responzivity a plynulé navigace.

## Context
- client/src/index.css
- client/src/App.jsx

## Tasks

<task type="auto">
  <name>Mobile Layout Fine-Tuning</name>
  <files>client/src/index.css</files>
  <action>
    Optimalizovat zobrazení pro malé Portrait displeje (např. iPhone 13 Mini / SE).
    - Zajistit, aby 6 kostek v mřížce nezpůsobovalo přetečení (`overflow`).
    - Zmenšit mírně `font-size` scoreboardu pro lepší čitelnost v mobilu.
  </action>
  <verify>Ruční test v browseru (Responsive mode -> 375px šířka).</verify>
  <done>Celá herní místnost se vejde na 1 obrazovku bez nutnosti scrollování.</done>
</task>

<task type="auto">
  <name>App Transitions (Fades)</name>
  <files>client/src/index.css</files>
  <action>
    Přidat plynulé přechody mezi "Lobby" a "GameRoom" pomocí opacity (`fade-in`).
    - Vytvořit globální animaci pro celou `main` sekci při změně `screen` stavu.
  </action>
  <verify>Při vstupu do hry lobby nezmizí skokově, ale plynule se "rozpustí" do nové scény.</verify>
  <done>Single Page přechody jsou plynulé a prémiové.</done>
</task>

## Success Criteria
- [ ] UI vypadá pixel-perfect na šířce od 320px do 450px.
- [ ] Plynulé animace celého rozhraní při navigaci.
