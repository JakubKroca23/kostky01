# REQUIREMENTS.md

## Funkční požadavky (Functional Requirements)
| ID | Požadavek | Zdroj | Status |
2: |----|-----------|-------|--------|
3: | REQ-01 | Systém lobby pro vytváření a připojování k herním místnostem | SPEC goal 1 | Complete |
4: | REQ-02 | Real-time synchronizace tahů hráčů přes Socket.io | SPEC goal 1 | Complete |
5: | REQ-03 | Implementace hry 10 000 (350 bodů vstup, kombinace, závěrečné kolo) | SPEC goal 3 | Complete |
6: | REQ-04 | Validace tahů na straně serveru (Source of Truth) | RESEARCH | Complete |
7: | REQ-05 | Podpora 2-6 hráčů v jedné místnosti | SPEC goal 3 | Complete |
8: | REQ-06 | Možnost odchodu z rozehrané hry | SPEC goal 1 | Complete |
9: | REQ-07 | Session-based identita (Nickname) bez registrace | SPEC goal 2 | Complete |
10: 
11: ## Vizuální a UX požadavky
12: | ID | Požadavek | Zdroj | Status |
13: |----|-----------|-------|--------|
14: | REQ-08 | Neonový design systém s využitím CSS Variables | SPEC goal 2 | Complete |
15: | REQ-09 | Plynulé ("smooth") animace hodu kostkou | SPEC goal 2 | Complete |
16: | REQ-10 | Layout optimalizovaný na výšku (Mobile Portrait) | SPEC goal 4 | Complete |
17: | REQ-11 | Zobrazování kombinací se "glow" efektem | RESEARCH | Complete |
18: | REQ-12 | Responzivní design pro různé velikosti mobilních displejů | SPEC goal 4 | Complete |
19: 
20: ## Technické požadavky
21: | ID | Požadavek | Zdroj | Status |
22: |----|-----------|-------|--------|
23: | REQ-13 | Frontend postavený na React + Vite | SPEC constraints | Complete |
24: | REQ-14 | Styling pomocí Vanilla CSS (Modules) | SPEC constraints | Complete |
25: | REQ-15 | Backend Node.js s Express a Socket.io | SPEC constraints | Complete |
