/**
 * Logika pro bota ve hře Kostky 10000
 * Rozhoduje se na základě bodů v tahu a počtu zbývajících kostek.
 */
export function getBotDecision(turnPoints, diceCount, rollCount) {
    // Pokud má bot 1000 a víc, bankuje vždy
    if (turnPoints >= 1000) return 'stop';
    
    // Pokud má bot málo bodů (pod 350 po 3. hodu), musí házet dál (vynuceno pravidly)
    if (rollCount < 4 && turnPoints < 350) return 'roll';

    // Strategie:
    // Pokud má 3 a více kostek, hází dál dokud nemá 500 bodů
    if (diceCount >= 3) {
        return turnPoints < 500 ? 'roll' : 'stop';
    }

    // Pokud má jen 1-2 kostky, bankuje už při 350+ bodech
    if (diceCount < 3) {
        return turnPoints >= 350 ? 'stop' : 'roll';
    }

    return 'stop';
}
