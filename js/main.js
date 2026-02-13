// Main entry point - game loop

(function() {
    const canvas = document.getElementById('gameCanvas');
    const renderer = new Renderer(canvas);
    const input = new Input();
    const physics = new Physics();
    const boat = new Boat(0, 100);

    // HUD elements
    const courseNameEl = document.getElementById('course-name');
    const stateIndicatorEl = document.getElementById('state-indicator');
    const mainsailBarEl = document.getElementById('mainsail-bar');
    const mainsailPctEl = document.getElementById('mainsail-pct');
    const jibBarEl = document.getElementById('jib-bar');
    const jibPctEl = document.getElementById('jib-pct');

    function getCourseName(absWindAngleDeg) {
        if (absWindAngleDeg < 30) return 'In de Wind';
        if (absWindAngleDeg < 60) return 'Aan de Wind';
        if (absWindAngleDeg < 110) return 'Halve Wind';
        if (absWindAngleDeg < 150) return 'Ruime Wind';
        return 'Voor de Wind';
    }

    function getSailBarColor(state) {
        if (state === 'KILLEN') return '#95a5a6';
        if (state === 'HELLEN') return '#e74c3c';
        return '#4fc3f7';
    }

    function updateHUD() {
        const absAngleDeg = (boat.absWindAngle * 180) / Math.PI;
        courseNameEl.textContent = getCourseName(absAngleDeg);

        const mainPct = Math.round(boat.mainsailTrim);
        const jibPct = Math.round(boat.jibTrim);
        mainsailBarEl.style.width = mainPct + '%';
        mainsailPctEl.textContent = mainPct + '%';
        jibBarEl.style.width = jibPct + '%';
        jibPctEl.textContent = jibPct + '%';

        mainsailBarEl.style.background = getSailBarColor(boat.mainsailState);
        jibBarEl.style.background = getSailBarColor(boat.jibState);

        if (boat.state === 'IN_IRONS') {
            stateIndicatorEl.textContent = 'Bob zegt: In de wind! Geen vaart.';
            stateIndicatorEl.style.color = '#e74c3c';
        } else if (boat.mainsailState === 'KILLEN' || boat.jibState === 'KILLEN') {
            stateIndicatorEl.textContent = 'Bob zegt: Zeilen killen - meer aantrekken!';
            stateIndicatorEl.style.color = '#f39c12';
        } else if (boat.mainsailState === 'HELLEN' || boat.jibState === 'HELLEN') {
            stateIndicatorEl.textContent = 'Bob zegt: Boot helt! Zeilen vieren!';
            stateIndicatorEl.style.color = '#e74c3c';
        } else {
            stateIndicatorEl.textContent = 'Bob zegt: Goed getrimd!';
            stateIndicatorEl.style.color = '#2ecc71';
        }
    }

    let lastTime = 0;

    function gameLoop(timestamp) {
        const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
        lastTime = timestamp;

        physics.update(boat, input, dt);
        updateHUD();
        renderer.render(boat, dt);

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
    console.log('Zeilcursus Simulator gestart!');
})();
