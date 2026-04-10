# Kostky 10000 — Multiplayer Dice Game

A real-time multiplayer web implementation of the traditional dice game "10 000" (Farkle).

## Architecture

- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: Node.js + Express + Socket.io, running on port 3001
- **Auth/DB**: Appwrite (optional — requires env vars for leaderboard features)
- **Physics**: Matter.js for dice rolling animations

## Project Structure

```
client/       # React/Vite frontend (port 5000)
server/       # Node.js/Express/Socket.io backend (port 3001)
shared/       # Shared scoring logic used by both client and server
```

## Running Locally

The "Start application" workflow runs both services:
- Backend: `node server/index.js` (port 3001)
- Frontend: Vite dev server (port 5000) with Socket.io proxied to backend

## Environment Variables (Optional)

For leaderboard/auth features, set these in Replit Secrets:
- `APPWRITE_ENDPOINT` — Appwrite API endpoint
- `APPWRITE_PROJECT_ID` — Appwrite project ID
- `APPWRITE_API_KEY` — Appwrite API key
- `APPWRITE_DB_ID` — Appwrite database ID
- `APPWRITE_COLLECTION_ID` — Appwrite collection ID

## Production Deployment

Build: `cd client && npm install && npm run build`
Run: `NODE_ENV=production node server/index.js` (serves built client + Socket.io)
Target: VM (required for persistent Socket.io connections)
