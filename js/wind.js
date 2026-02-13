// Wind configuration - constant southerly wind
// Direction in radians: 0 = North (top of screen), clockwise
// Wind blows FROM the south (bottom of screen), so it pushes NORTH (up)

const Wind = {
    direction: Math.PI,
    force: 5,

    getDirectionDegrees() {
        return (this.direction * 180) / Math.PI;
    },

    getBlowDirection() {
        return this.direction + Math.PI;
    }
};
