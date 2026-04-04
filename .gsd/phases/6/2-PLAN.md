---
phase: 6
plan: 2
wave: 2
depends_on: [6-1]
files_modified:
  - server/index.js
autonomous: true
must_haves:
  truths:
    - "Hráč nemůže zastavit tah s méně než 350b pokud ještě nehodil 3x (pravidlo platí od 3. hodu)"
    - "Pokud hráč odloží všech 6 kostek (Hot Dice), hází znovu se všemi 6 bez přerušení tahu"
    - "Zelenáč (bust) přidá čárku, 3 čárky vynulují totalScore hráče"
    - "Čárky se vymažou při zapsání libovolných bodů > 0"
    - "Postupka a páry jsou přijímány POUZE pokud jde o 1. hod tahu (rollCount === 1)"
  artifacts:
    - "server/index.js — rozšířený turnInfo s čárkami, hot dice state"
---

# Plan 6.2: Server — Čárky, 350b pravidlo, Hot Dice

<objective>
Implementovat nové herní mechaniky na serveru: systém čárek, pravidlo 350b od 3. hodu,
Hot Dice (hráč hází znovu po odložení všech 6 kostek) a omezení postupky/párů na 1. hod.

Purpose: Server je single source of truth — veškerá herní logika musí být vynucena zde.
Output: Aktualizovaný server/index.js s robustní stavovou mašinou tahu.
</objective>

<context>
Load for context:
- server/index.js (kompletní — nutné pochopit stávající turnInfo strukturu)
- server/utils/scoring.js (po aktualizaci z Plan 6.1)
</context>

<tasks>

<task type="auto">
  <name>Rozšířit turnInfo strukturu o čárky a hot dice state</name>
  <files>server/index.js</files>
  <action>
    Rozšířit turnInfo v `create-room` handleru a funkci `nextTurn()`:

    NOVÁ POLE v turnInfo:
    ```js
    turnInfo: {
      // ... stávající pole
      rollCount: 0,          // Počet hodů v aktuálním tahu (důležité pro 350b pravidlo)
      turnPoints: 0,         // Odložené body v aktuálním tahu
      isHotDice: false,      // True = hráč právě odložil všech 6 kostek, hází znovu
      // Čárky jsou per-hráč, ne per-tah → přesunout do scores struktury
    }
    ```

    ČÁRKY — ukládat jako `strikes` vedle `scores`:
    ```js
    turnInfo.scores = { [socketId]: 0, ... }
    turnInfo.strikes = { [socketId]: 0, ... }  // NOVÉ
    ```

    Aktualizovat `nextTurn()`:
    - Resetovat rollCount, turnPoints, isHotDice, lastRoll, diceCount
    - NERESETOVAT strikes — ty přetrvávají přes celou hru

    Aktualizovat `join-room` handler — inicializovat strikes pro nového hráče.

    AVOID: Neukládat čárky do samostatné Map mimo room — musí být v turnInfo pro broadcasting.
  </action>
  <verify>Server se spustí bez chyb, nová pole jsou vidět v `room-joined` eventu.</verify>
  <done>turnInfo obsahuje strikes{}, isHotDice, rollCount je správně resetován v nextTurn.</done>
</task>

<task type="auto">
  <name>Implementovat herní pravidla: bust čárky, 350b limit, Hot Dice, stop-turn validace</name>
  <files>server/index.js</files>
  <action>
    Aktualizovat handlery `roll-dice`, `roll-again`, `stop-turn`:

    --- BUST LOGIKA (v bust větvích obou roll handlerů) ---
    ```js
    // Zelenáč: přidat čárku, zkontrolovat 3x čárku
    turnInfo.strikes[socket.id] = (turnInfo.strikes[socket.id] || 0) + 1;
    let scorePenalty = false;
    if (turnInfo.strikes[socket.id] >= 3) {
      turnInfo.scores[socket.id] = 0;  // Vynulovat celkové skóre
      turnInfo.strikes[socket.id] = 0; // Vynulovat čárky
      scorePenalty = true;
    }
    io.to(room.id).emit('dice-rolled', { roll, isBust: true, strikes: turnInfo.strikes, scorePenalty });
    ```

    --- HOT DICE (v roll-again handleru po výpočtu rem) ---
    ```js
    const rem = room.turnInfo.diceCount - selectedIndexes.length;
    if (rem === 0) {
      // Hráč odložil všechny kostky → Hot Dice, hází znovu se všemi 6
      room.turnInfo.diceCount = 6;
      room.turnInfo.isHotDice = true;
    } else {
      room.turnInfo.diceCount = rem;
      room.turnInfo.isHotDice = false;
    }
    ```

    --- STOP-TURN VALIDACE ---
    Handler stop-turn musí odmítnout zastavení pokud:
    1. `room.turnInfo.rollCount < 3 && turnPoints_after_this_stop < 350`
    2. `room.turnInfo.isHotDice === true` (nesmí zastavit před hodem po Hot Dice)

    ```js
    socket.on('stop-turn', (selectedIndexes) => {
      // ... stávající kód výpočtu score ...
      const newTurnPoints = room.turnInfo.turnPoints + extraScore;

      // Pravidlo: Hot Dice — nelze zastavit, musí hodit
      if (room.turnInfo.isHotDice) {
        socket.emit('stop-error', 'Musíš hodit — jdeš do plných!');
        return;
      }

      // Pravidlo: min 350b od 3. hodu dál
      if (room.turnInfo.rollCount < 3 && newTurnPoints < 350) {
        socket.emit('stop-error', `Minimum je 350b od 3. hodu. Máš ${newTurnPoints}b po ${room.turnInfo.rollCount}. hodu.`);
        return;
      }

      // ... zbytek stop-turn logiky (zapsání bodů, reset čárek při bonusových bodech) ...

      // Při zapsání > 0 bodů: vynulovat čárky hráče
      if (newTurnPoints > 0) {
        room.turnInfo.strikes[socket.id] = 0;
      }
    });
    ```

    --- POSTUPKA A PÁRY - ONLY 1. HOD ---
    V calculateScore() toto neřešit — vyřešit na úrovni allowedIndexes:
    Pokud rollCount > 1 a allowedIndexes vrátí 2000b za postupku nebo 700b za páry,
    tyto kombinace NEUZNAT a vynechat z bodování (server nedovolí uložit).

    AVOID: Neimplementovat "dohodit" mechaniku v tomto plánu — to je Plan 6.3.
    AVOID: Neposílat nextTurn automaticky při Hot Dice — hráč musí hodit sám.
  </action>
  <verify>
    Ručně otestovat:
    - Bust → čárka se přičte, po 3x bust → skóre na 0
    - stop-turn s < 350b a rollCount < 3 → error
    - Hot Dice → diceCount reset na 6, isHotDice true
  </verify>
  <done>
    Server správně odmítá stop < 350b (do 3. hodu), přidává čárky při bust, resetuje skóre při 3 čárkách,
    a umožňuje Hot Dice po odložení všech 6 kostek.
  </done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] room.turnInfo obsahuje `strikes` objekt
- [ ] Bust emituje `isBust: true` + `strikes` data
- [ ] stop-turn odmítne s < 350b pokud rollCount < 3
- [ ] Hot Dice: po odložení 6/6 kostek je diceCount = 6 a isHotDice = true
</verification>

<success_criteria>
- [ ] Herní logika vynucena na serveru (ne klientu)
- [ ] Čárky přežijí více kol
- [ ] Hot Dice umožňuje pokračovat v tahu bez přerušení
</success_criteria>
