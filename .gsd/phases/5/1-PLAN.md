---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Web Audio Synthesis & Utility

## Objective
Implementace zvukové vrstvy aplikace bez nutnosti externích MP3 souborů pomocí Web Audio API (syntéza zvuků).

## Context
- client/src/utils/audio.js

## Tasks

<task type="auto">
  <name>Synthesized SFX Utility</name>
  <files>client/src/utils/audio.js</files>
  <action>
    Vytvořit utilitu pro generování zvuků.
    - Metoda `playDiceRoll()`: Bílý šum (white noise) filtrovaný na nízké frekvence pro simulaci hodu a dopadu.
    - Metoda `playClick()`: Krátký sinusový puls (blip) pro výběr kostky.
    - Metoda `playBust()`: Klesající frekvence (buzzer) pro neúspěšný hod (Zelenáč).
    - Metoda `playScore()`: Stoupající akord pro zisk bodů.
  </action>
  <verify>Ruční spuštění metod v konzoli prohlížeče.</verify>
  <done>Aplikace má "nativní" zvukovou engine připravenou k použití.</done>
</task>

## Success Criteria
- [ ] Zvuky jsou čisté, nekručí a odpovídají neonovému stylu (synthy).
- [ ] Audio engine neblokuje hlavní vlákno (asynchronní).
