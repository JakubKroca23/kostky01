---
phase: 7
plan: gap-closure-v1
wave: 1
gap_closure: true
---

# Plan: v1.0 Gap Closure

## Problem
The v1.0 audit identified several critical gaps:
1. **Scoring Drift**: Duplicated logic between client/server.
2. **Fragile State**: Room/Player data lost on server restart.
3. **Network Resilience**: UX suffers during minor socket flickers.

## Root Cause
- Rapid development focused on MVP features over infrastructure robustness.
- Initial decision to keep everything in-memory for simplicity.

## Tasks

<task type="auto">
  <name>Unify Scoring Engine (DRY)</name>
  <files>
    - server/utils/scoring.js
    - client/src/utils/scoring.js
  </files>
  <action>
    Create a root-level `shared/scoring.js` (or use a simple build-time sync) to ensure both sides use identical logic from a single source of truth.
  </action>
  <verify>Run `node server/tests/test-scoring.js` and ensure 11/11 tests pass.</verify>
  <done>Scoring logic is imported from a shared location or perfectly synced via automated script.</done>
</task>

<task type="auto">
  <name>Implement Simple Persistence</name>
  <files>
    - server/index.js
  </files>
  <action>
    Implement a simple file-based or memory-cache persistence layer (e.g., using `node-persist` or just JSON dump) to save/load the `rooms` and `players` maps on startup/shutdown.
  </action>
  <verify>Restart server during an active game and verify the room still exists upon reconnection.</verify>
  <done>Server state survives restarts.</done>
</task>

<task type="auto">
  <name>Enhance Socket Resilience</name>
  <files>
    - client/src/App.jsx
  </files>
  <action>
    Add "Reconnecting..." overlays and better use of Socket.io's auto-reconnection features. Ensure the client can re-fetch its room state after a flicker.
  </action>
  <verify>Disconnect network briefly and verify the game resumes without refreshing manually.</verify>
  <done>Improved UX during network instability.</done>
</task>
