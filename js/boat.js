// Boat class - represents the Valk (Dutch open keelboat)
// Dimensions: 6.50m length, 2.00m beam
// Mass: ~600kg (hull 300kg + crew + equipment)

class Boat {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        // Heading in radians (0 = north/up, clockwise)
        this.heading = 0; // Start facing north (up)

        this.speed = 0; // m/s

        // Valk dimensions in meters
        this.length = 6.5;
        this.beam = 2.0;

        // Sail trim (0% = fully eased/los, 100% = fully sheeted in/strak)
        this.mainsailTrim = 50;
        this.jibTrim = 50;

        // Sail side: -1 = port (left), 1 = starboard (right)
        this.sailSide = 1;

        // Physics properties
        this.mass = 600;
        this.turnRate = 0;
        this.maxTurnRate = 1.2;
        this.turnAccel = 1.5;

        // State
        this.state = 'SAILING';

        // Wind angle (set by physics)
        this.relativeWindAngle = 0;
        this.absWindAngle = 0;

        // Sail state feedback (set by physics, used by renderer)
        this.mainsailState = 'OK';
        this.jibState = 'OK';
        this.mainsailError = 0;
        this.jibError = 0;

        this.heel = 0;
        this.drift = 0;

        // Fok bak state (jib on wrong side after tack/gybe)
        this.jibBak = false;
        // Track which side the jib was sheeted to, for detecting tack/gybe
        this.prevSailSide = this.sailSide;

        // Optimal trim (set by physics, used by HUD)
        this.optimalTrim = 50;
    }

    adjustMainsail(delta) {
        this.mainsailTrim = Math.max(0, Math.min(100, this.mainsailTrim + delta));
    }

    adjustJib(delta) {
        this.jibTrim = Math.max(0, Math.min(100, this.jibTrim + delta));
    }
}
