// Physics engine - implements Dutch sailing theory from "Het Zeilboek"
//
// Fok bak rule: When tacking/gybing, the jib does NOT automatically switch sides.
// The player must ease the jib sheet to 0% (fully loose), then the wind pushes
// it to the new side, and the player sheets it in again on the new side.
// If they don't, the jib stands "bak" (backed) = against the wind on the wrong side.
// Consequence: massive drag, pushes the bow away from the wind.

const SAIL_TRIM_SPEED = 50;
const IN_IRONS_ANGLE = Math.PI / 4; // 45 degrees no-go zone
const JIB_BAK_RELEASE_THRESHOLD = 8; // Jib must be eased below this % to release bak

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// Optimal sail trim for a given absolute wind angle
function getOptimalTrim(absWindAngle) {
    const normalized = (absWindAngle - IN_IRONS_ANGLE) / (Math.PI - IN_IRONS_ANGLE);
    const optimal = 90 - normalized * 80;
    return Math.max(5, Math.min(95, optimal));
}

// Evaluate sail state: OK, KILLEN (too loose), or HELLEN (too tight)
function evaluateSail(currentTrim, optimalTrim) {
    const diff = currentTrim - optimalTrim;
    const absDiff = Math.abs(diff);
    const tolerance = 15;

    if (absDiff <= tolerance) {
        return {
            state: 'OK',
            efficiency: 1 - (absDiff / tolerance) * 0.3,
            error: absDiff / tolerance
        };
    } else if (diff < -tolerance) {
        const severity = Math.min(1, (absDiff - tolerance) / 40);
        return {
            state: 'KILLEN',
            efficiency: Math.max(0, 0.3 - severity * 0.3),
            error: severity
        };
    } else {
        const severity = Math.min(1, (absDiff - tolerance) / 40);
        return {
            state: 'HELLEN',
            efficiency: Math.max(0.1, 0.5 - severity * 0.4),
            error: severity
        };
    }
}

class Physics {
    update(boat, input, dt) {
        // === LEVEL 1: Trim both sails independently ===
        // Player adjusts grootzeil and fok separately.
        // Speed depends on how well BOTH sails are trimmed.
        // Boat heading stays mostly fixed (no loeven/afvallen yet).
        // Slight natural drift to keep it interesting.

        // --- Sail trimming (independent) ---
        const mainAdj = input.getMainsailAdjust();
        if (mainAdj !== 0) boat.adjustMainsail(mainAdj * SAIL_TRIM_SPEED * dt);
        const jibAdj = input.getJibAdjust();
        if (jibAdj !== 0) boat.adjustJib(jibAdj * SAIL_TRIM_SPEED * dt);

        // --- Wind angle ---
        const relativeWindAngle = normalizeAngle(Wind.direction - boat.heading);
        const absWindAngle = Math.abs(relativeWindAngle);

        boat.relativeWindAngle = relativeWindAngle;
        boat.absWindAngle = absWindAngle;

        // Determine sail side based on wind
        const newSailSide = relativeWindAngle > 0 ? -1 : 1;
        boat.sailSide = newSailSide;
        boat.prevSailSide = newSailSide;
        boat.jibBak = false; // No fok bak in level 1

        // --- In de wind (no-go zone) ---
        if (absWindAngle < IN_IRONS_ANGLE) {
            boat.state = 'IN_IRONS';
            boat.mainsailState = 'KILLEN';
            boat.jibState = 'KILLEN';
            boat.mainsailError = 1;
            boat.jibError = 1;
            boat.heel = 0;
            boat.optimalTrim = 0;

            // Decelerate
            boat.speed *= (1 - 1.0 * dt);
            if (boat.speed < 0.1) {
                boat.speed += -0.3 * dt;
                boat.speed = Math.max(-0.5, boat.speed);
            }
        } else {
            boat.state = 'SAILING';

            // Optimal trim for current wind angle
            const optimalTrim = getOptimalTrim(absWindAngle);
            boat.optimalTrim = optimalTrim;

            // Evaluate each sail independently
            const mainEval = evaluateSail(boat.mainsailTrim, optimalTrim);
            const jibEval = evaluateSail(boat.jibTrim, optimalTrim);

            boat.mainsailState = mainEval.state;
            boat.jibState = jibEval.state;
            boat.mainsailError = mainEval.error;
            boat.jibError = jibEval.error;

            // Combined efficiency (mainsail 60%, jib 40%)
            const totalEfficiency = Math.max(0, mainEval.efficiency * 0.6 + jibEval.efficiency * 0.4);

            // Heel from over-trimming
            let heelAmount = 0;
            if (mainEval.state === 'HELLEN') heelAmount += mainEval.error * 0.6;
            if (jibEval.state === 'HELLEN') heelAmount += jibEval.error * 0.4;
            boat.heel += (heelAmount - boat.heel) * 4 * dt;
            boat.drift += (heelAmount * 0.3 - boat.drift) * 2 * dt;

            // Speed: angle factor (how well this point of sail works)
            let angleFactor;
            if (absWindAngle < Math.PI / 3) {
                angleFactor = 0.5 + (absWindAngle - IN_IRONS_ANGLE) / (Math.PI / 3 - IN_IRONS_ANGLE) * 0.3;
            } else if (absWindAngle < 2 * Math.PI / 3) {
                angleFactor = 0.8 + (absWindAngle - Math.PI / 3) / (Math.PI / 3) * 0.2;
            } else if (absWindAngle < 5 * Math.PI / 6) {
                angleFactor = 1.0 - (absWindAngle - 2 * Math.PI / 3) / (Math.PI / 6) * 0.15;
            } else {
                angleFactor = 0.65;
            }

            const maxBoatSpeed = 4.5;
            const heelPenalty = 1 - heelAmount * 0.5;
            const finalTarget = Math.max(0, maxBoatSpeed * angleFactor * totalEfficiency * heelPenalty);

            // Momentum (600kg Valk)
            const rate = boat.speed < finalTarget ? 0.4 : 0.6;
            boat.speed += (finalTarget - boat.speed) * rate * dt;
        }

        // --- Slight natural heading drift (keeps it interesting) ---
        // Boat gently drifts, player must keep sails right to maintain course
        boat.turnRate *= (1 - 3 * dt);
        if (Math.abs(boat.turnRate) < 0.01) boat.turnRate = 0;
        boat.heading += boat.turnRate * dt;
        boat.heading = normalizeAngle(boat.heading);

        boat.speed = Math.max(-0.5, Math.min(4.5, boat.speed));

        // --- Movement ---
        const moveAngle = boat.heading + boat.drift * boat.sailSide;
        boat.x += Math.sin(moveAngle) * boat.speed * dt;
        boat.y -= Math.cos(moveAngle) * boat.speed * dt;
    }
}
