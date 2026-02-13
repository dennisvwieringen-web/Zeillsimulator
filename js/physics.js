// Physics engine - implements Dutch sailing theory from "Het Zeilboek"
//
// Level 1: Only mainsail, fok auto-follows at optimal. No steering.
// Level 2: Mainsail + fok independently. No steering.
// Level 3: Mainsail + fok + loeven/afvallen via sail asymmetry.

const SAIL_TRIM_SPEED = 50;
const IN_IRONS_ANGLE = Math.PI / 4; // 45 degrees no-go zone
const JIB_BAK_RELEASE_THRESHOLD = 8;

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
    update(boat, input, dt, level) {
        level = level || 1;

        // --- Sail trimming ---
        const mainAdj = input.getMainsailAdjust();
        if (mainAdj !== 0) boat.adjustMainsail(mainAdj * SAIL_TRIM_SPEED * dt);

        if (level >= 2) {
            // Level 2+: fok is independently controlled
            const jibAdj = input.getJibAdjust();
            if (jibAdj !== 0) boat.adjustJib(jibAdj * SAIL_TRIM_SPEED * dt);
        }
        // Level 1: fok will be set to optimal automatically below

        // --- Wind angle ---
        const relativeWindAngle = normalizeAngle(Wind.direction - boat.heading);
        const absWindAngle = Math.abs(relativeWindAngle);

        boat.relativeWindAngle = relativeWindAngle;
        boat.absWindAngle = absWindAngle;

        // Determine sail side based on wind
        const newSailSide = relativeWindAngle > 0 ? -1 : 1;

        // --- Fok bak detection (Level 3 only) ---
        if (level >= 3) {
            if (newSailSide !== boat.prevSailSide && boat.prevSailSide !== 0) {
                if (boat.jibTrim > JIB_BAK_RELEASE_THRESHOLD) {
                    boat.jibBak = true;
                }
            }
            if (boat.jibBak && boat.jibTrim <= JIB_BAK_RELEASE_THRESHOLD) {
                boat.jibBak = false;
            }
        } else {
            boat.jibBak = false;
        }

        boat.sailSide = newSailSide;
        boat.prevSailSide = newSailSide;

        // --- Steering ---
        if (level === 1) {
            // Level 1: Mainsail trim affects heading.
            // More trim (aantrekken) = boat turns into the wind (loeven)
            // Less trim (vieren) = boat falls off the wind (afvallen)
            const optTrim = (absWindAngle >= IN_IRONS_ANGLE) ? getOptimalTrim(absWindAngle) : 50;
            const trimOffset = (boat.mainsailTrim - optTrim) / 100;
            const speedFactor = Math.min(1, 0.2 + Math.abs(boat.speed) * 0.4);
            const sailTurnForce = trimOffset * 1.2 * speedFactor;
            boat.turnRate += sailTurnForce * boat.sailSide * dt;
        } else if (level === 2) {
            // Level 2: Both sails, combined trim affects heading
            const optTrim = (absWindAngle >= IN_IRONS_ANGLE) ? getOptimalTrim(absWindAngle) : 50;
            const avgTrim = (boat.mainsailTrim * 0.6 + boat.jibTrim * 0.4);
            const trimOffset = (avgTrim - optTrim) / 100;
            const speedFactor = Math.min(1, 0.2 + Math.abs(boat.speed) * 0.4);
            const sailTurnForce = trimOffset * 1.0 * speedFactor;
            boat.turnRate += sailTurnForce * boat.sailSide * dt;
        } else {
            // Level 3: Sail asymmetry steering (loeven/afvallen)
            const trimDiff = (boat.mainsailTrim - boat.jibTrim) / 100;
            const speedFactor = Math.min(1, 0.2 + Math.abs(boat.speed) * 0.4);
            const sailTurnForce = trimDiff * 0.9 * speedFactor;
            boat.turnRate += sailTurnForce * boat.sailSide * dt;

            // Fok bak: backed jib pushes bow away from wind
            if (boat.jibBak && boat.jibTrim > JIB_BAK_RELEASE_THRESHOLD) {
                boat.turnRate += boat.sailSide * 0.8 * dt;
            }
        }

        // Turn rate damping
        boat.turnRate = Math.max(-boat.maxTurnRate, Math.min(boat.maxTurnRate, boat.turnRate));
        boat.turnRate *= (1 - 2.5 * dt);
        if (Math.abs(boat.turnRate) < 0.01) boat.turnRate = 0;

        boat.heading += boat.turnRate * dt;
        boat.heading = normalizeAngle(boat.heading);

        // --- In de wind (no-go zone) ---
        if (absWindAngle < IN_IRONS_ANGLE) {
            boat.state = 'IN_IRONS';
            boat.mainsailState = 'KILLEN';
            boat.jibState = 'KILLEN';
            boat.mainsailError = 1;
            boat.jibError = 1;
            boat.heel = 0;
            boat.optimalTrim = 0;

            // Decelerate and drift backward
            boat.speed *= (1 - 1.0 * dt);
            if (boat.speed < 0.1) {
                boat.speed += -0.3 * dt;
                boat.speed = Math.max(-0.5, boat.speed);
            }
        } else {
            boat.state = 'SAILING';

            const optimalTrim = getOptimalTrim(absWindAngle);
            boat.optimalTrim = optimalTrim;

            // Level 1: fok auto-trims to optimal
            if (level === 1) {
                // Smoothly move fok toward optimal
                const jibDiff = optimalTrim - boat.jibTrim;
                boat.jibTrim += jibDiff * 3 * dt;
            }

            // Evaluate sails
            const mainEval = evaluateSail(boat.mainsailTrim, optimalTrim);

            let jibEval;
            if (boat.jibBak) {
                jibEval = {
                    state: 'KILLEN',
                    efficiency: -0.3,
                    error: 1
                };
            } else {
                jibEval = evaluateSail(boat.jibTrim, optimalTrim);
            }

            boat.mainsailState = mainEval.state;
            boat.jibState = jibEval.state;
            boat.mainsailError = mainEval.error;
            boat.jibError = jibEval.error;

            // Combined efficiency
            const mainWeight = (level === 1) ? 0.85 : 0.6;
            const jibWeight = (level === 1) ? 0.15 : 0.4;
            const totalEfficiency = Math.max(0, mainEval.efficiency * mainWeight + jibEval.efficiency * jibWeight);

            // Heel from over-trimming
            let heelAmount = 0;
            if (mainEval.state === 'HELLEN') heelAmount += mainEval.error * 0.6;
            if (!boat.jibBak && jibEval.state === 'HELLEN') heelAmount += jibEval.error * 0.4;
            boat.heel += (heelAmount - boat.heel) * 4 * dt;
            boat.drift += (heelAmount * 0.3 - boat.drift) * 2 * dt;

            // Speed: angle factor
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
            let targetSpeed = maxBoatSpeed * angleFactor * totalEfficiency;

            // Fok bak penalty (level 3)
            if (boat.jibBak && boat.jibTrim > JIB_BAK_RELEASE_THRESHOLD) {
                const bakDrag = (boat.jibTrim / 100) * 0.7;
                targetSpeed *= (1 - bakDrag);
            }

            const heelPenalty = 1 - heelAmount * 0.5;
            const finalTarget = Math.max(0, targetSpeed * heelPenalty);

            // Momentum (600kg Valk)
            const rate = boat.speed < finalTarget ? 0.4 : 0.6;
            boat.speed += (finalTarget - boat.speed) * rate * dt;
        }

        boat.speed = Math.max(-0.5, Math.min(4.5, boat.speed));

        // --- Movement ---
        const moveAngle = boat.heading + boat.drift * boat.sailSide;
        boat.x += Math.sin(moveAngle) * boat.speed * dt;
        boat.y -= Math.cos(moveAngle) * boat.speed * dt;
    }
}
