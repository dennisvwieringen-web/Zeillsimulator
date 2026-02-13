// Wind configuration - constant northerly wind
// Direction in radians: 0 = North (top of screen), clockwise
// Wind blows FROM the north, so it pushes SOUTH

const Wind = {
    direction: 0,
    force: 5,

    getDirectionDegrees() {
        return (this.direction * 180) / Math.PI;
    },

    getBlowDirection() {
        return this.direction + Math.PI;
    }
};
