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
  <name>Neon Dice Component Creation</name>
  <files>client/src/components/Die.jsx</files>
  <action>
    Vytvořit komponentu `Die.jsx`.
    - Kostka bude mít 6 stěn realizovaných pomocí CSS Grid/Flex pro tečky (dots).
    - Design: `glassmorphism` (průhledné stěny), neonové tečky (glow), jemné zaoblení hran.
    - Props: `value` (1-6), `rolling` (boolean pro trigger animace).
  </action>
  <verify>Ruční náhled komponenty v GameRoom s fixními hodnotami.</verify>
  <done>Kostka vypadá jako prémiový herní prvek, nikoliv jen číslo v krabici.</done>
</task>

<task type="auto">
  <name>3D Cube Styling</name>
  <files>client/src/index.css</files>
  <action>
    Implementovat CSS pro 3D efekt kostky.
    - Využít `perspective` na kontejneru a `transform-style: preserve-3d` na kostce.
    - Definovat rotace pro každou stěnu tak, aby se kostka "otáčela" na správnou hodnotu.
  </action>
  <verify>Kontrola v prohlížeči: rotace kostky při změně hodnoty by měla být plynulá (transition).</verify>
  <done>Kostka se plynule otáčí na požadovanou hodnotu pomocí CSS transformací.</done>
</task>

## Success Criteria
- [ ] Kostky mají vizuální podobu s tečkami (1-6) namísto číslic.
- [ ] Design ladí s neonovým tématem (cyan/pink glow).
