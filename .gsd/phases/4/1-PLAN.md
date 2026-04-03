---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Visual Dice Component

## Objective
Nahrazení textových čísel v herní místnosti vizuálně atraktivními 3D (nebo 3D-like) kostkami s neonovým designem.

## Context
- client/src/components/GameRoom.jsx
- client/src/index.css

## Tasks

<task type="auto">
  <name>Neon 2D Dice Component</name>
  <files>client/src/components/Die.jsx</files>
  <action>
    Vytvořit komponentu `Die.jsx` (2D).
    - Design: Čtverec s neonovým okrajem, tečky (dots) rozmístěné dle hodnoty.
    - Interakce: Přidat `onClick` pro výběr kostky. Vybraná kostka má jiný glow (např. pink).
    - Props: `value`, `isRolling`, `isSelected`, `onToggle`.
  </action>
  <verify>Náhled v GameRoom: Kostky lze kliknutím vybírat a měnit jejich barvu.</verify>
  <done>Kostka je interaktivní a vizuálně odpovídá neonovému stylu.</done>
</task>

<task type="auto">
  <name>Arena Bounce Animation</name>
  <files>client/src/index.css</files>
  <action>
    Implementovat 1s animaci "haze" v aréně.
    - Kostky se při hodu náhodně pohybují (translate/rotate) a simulují odrazy od hran kontejneru a od sebe.
    - Po 1s se zastaví na náhodném místě v aréně (absolutní pozice).
  </action>
  <verify>Vizuální plynulost: Kostky se během hodu "perou" v aréně.</verify>
  <done>Hod kostkami vypadá jako fyzikální interakce v neonovém poli.</done>
</task>

## Success Criteria
- [ ] Kostky mají vizuální podobu s tečkami (1-6) namísto číslic.
- [ ] Design ladí s neonovým tématem (cyan/pink glow).
