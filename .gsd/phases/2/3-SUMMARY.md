# Summary Plan 2.3: Join & Room View

## Objective Complete
Implementace připojení k místnosti a základního herního náhledu s přítomnými hráči.

## Tasks Completed
- **Join Room Logic & Navigation**: Implementováno asynchronní připojení k existujícím místnostem s kontrolou kapacity (2-6 hráčů).
- **Room Navigation & Rejoin Logic**: Vytvořena komponenta `GameRoom.jsx` se seznamem hráčů. Implementováno uchování session (rejoin) při odpojení/refreshu (30s timeout na straně serveru).

## Verification Result
- Join: Úspěšný vstup a aktualizace seznamu hráčů u všech v místnosti.
- Leave: Funkční odchod zpět do lobby.
- Rejoin: Refresh browseru v místnosti zachová nick i pozici v místnosti.
- Max Players: Pokus o vstup do plné místnosti vrací chybu (např. > 6).

## Next Step
Phase 3: Herní mechaniky (Game Logic).
