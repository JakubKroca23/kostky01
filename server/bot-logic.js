/**
 * Rozšířená logika pro různé typy botů
 */
export function getBotDecision(turnPoints, diceCount, rollCount, strategy = 'average', allowedCount = 0) {
    // Pokud máme 0 nebo 6 kostek, MUSÍME házet dál
    if (diceCount === 0 || diceCount === 6) return 'roll';

    // DŮLEŽITÉ: Pokud by odložení všech 'allowed' kostek vedlo k 0 zbývajícím, MUSÍME pokračovat
    if (allowedCount > 0 && (diceCount - allowedCount === 0)) return 'roll';

    // Pravidlo 7: Pokud má bot málo bodů (pod 350 po 3. hodu), musí házet dál
    if (rollCount < 4 && turnPoints < 350) return 'roll';

    switch (strategy) {
        case 'cautious': // OPATRNÝ - bere od 350
            if (turnPoints >= 350) return 'stop';
            return (diceCount >= 3) ? 'roll' : 'stop';

        case 'gambler': // GAMBLER - pod 1000 nejde domů
            if (turnPoints >= 1000) return 'stop';
            if (diceCount >= 1) return 'roll';
            return 'stop';

        case 'average': // PRŮMĚRNÝ - zlatá střední (600)
        default:
            if (turnPoints >= 600) return 'stop';
            if (diceCount <= 2 && turnPoints >= 450) return 'stop';
            return (diceCount >= 3) ? 'roll' : 'stop';
    }
}
