// Main entry point - game loop with level system

(function() {
    const canvas = document.getElementById('gameCanvas');
    const renderer = new Renderer(canvas);
    const input = new Input();
    const physics = new Physics();

    const START_X = 0;
    const START_Y = 100;
    let boat = new Boat(START_X, START_Y);
    let gameOver = false;
    let currentLevel = 1;

    // Screen elements
    const startScreenEl = document.getElementById('start-screen');
    const hudEl = document.getElementById('hud');
    const courseNameEl = document.getElementById('course-name');
    const stateIndicatorEl = document.getElementById('state-indicator');
    const mainsailBarEl = document.getElementById('mainsail-bar');
    const mainsailPctEl = document.getElementById('mainsail-pct');
    const jibBarEl = document.getElementById('jib-bar');
    const jibPctEl = document.getElementById('jib-pct');
    const jibMeterEl = document.getElementById('jib-meter');
    const gameOverEl = document.getElementById('game-over');
    const restartBtn = document.getElementById('restart-btn');
    const controlsLegendEl = document.getElementById('controls-legend');
    const touchControlsEl = document.getElementById('touch-controls');

    // --- Level selection ---
    const levelBtns = document.querySelectorAll('.level-btn');
    levelBtns.forEach(btn => {
        btn.addEventListener('click', () => startLevel(parseInt(btn.dataset.level)));
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startLevel(parseInt(btn.dataset.level));
        }, { passive: false });
    });

    function startLevel(level) {
        currentLevel = level;
        boat = new Boat(START_X, START_Y);
        gameOver = false;

        // Configure UI for level
        startScreenEl.style.display = 'none';
        hudEl.style.display = 'flex';
        gameOverEl.style.display = 'none';

        // Show/hide jib controls based on level
        if (jibMeterEl) {
            jibMeterEl.style.display = (level >= 2) ? 'flex' : 'none';
        }

        // Update controls legend based on level
        updateControlsForLevel(level);

        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }

    function updateControlsForLevel(level) {
        // Update keyboard legend
        if (level === 1) {
            controlsLegendEl.innerHTML = `
                <div class="legend-title">Level 1: Grootzeil</div>
                <div class="legend-row"><kbd>&uarr;</kbd> Aantrekken (strakker)</div>
                <div class="legend-row"><kbd>&darr;</kbd> Vieren (losser)</div>
                <div class="legend-hint">Trim het grootzeil goed voor snelheid!</div>
            `;
        } else if (level === 2) {
            controlsLegendEl.innerHTML = `
                <div class="legend-title">Level 2: Twee zeilen</div>
                <div class="legend-row"><kbd>&uarr;</kbd> <kbd>&darr;</kbd> Grootzeil</div>
                <div class="legend-row"><kbd>W</kbd> <kbd>S</kbd> Fok</div>
                <div class="legend-hint">Trim beide zeilen goed voor snelheid!</div>
            `;
        } else {
            controlsLegendEl.innerHTML = `
                <div class="legend-title">Level 3: Vrij zeilen</div>
                <div class="legend-row"><kbd>&uarr;</kbd> <kbd>&darr;</kbd> Grootzeil</div>
                <div class="legend-row"><kbd>W</kbd> <kbd>S</kbd> Fok</div>
                <div class="legend-hint">Meer grootzeil = loeven (in de wind)</div>
                <div class="legend-hint">Meer fok = afvallen (van de wind)</div>
            `;
        }

        // Update touch controls
        const touchJibGroup = document.getElementById('touch-jib-group');
        if (touchJibGroup) {
            touchJibGroup.style.display = (level >= 2) ? 'flex' : 'none';
        }
    }

    // Restart button
    restartBtn.addEventListener('click', restartGame);
    restartBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        restartGame();
    }, { passive: false });

    function restartGame() {
        boat = new Boat(START_X, START_Y);
        gameOver = false;
        gameOverEl.style.display = 'none';
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }

    // Back to menu from game over
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', backToMenu);
        menuBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            backToMenu();
        }, { passive: false });
    }

    function backToMenu() {
        gameOver = true;
        gameOverEl.style.display = 'none';
        hudEl.style.display = 'none';
        startScreenEl.style.display = 'flex';
    }

    // Collision detection with island
    function checkIslandCollision() {
        const dx = boat.x - ISLAND.x;
        const dy = boat.y - ISLAND.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < ISLAND.radius + 5;
    }

    function triggerGameOver() {
        gameOver = true;
        boat.speed = 0;
        gameOverEl.style.display = 'flex';
    }

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
        mainsailBarEl.style.width = mainPct + '%';
        mainsailPctEl.textContent = mainPct + '%';
        mainsailBarEl.style.background = getSailBarColor(boat.mainsailState);

        if (currentLevel >= 2) {
            const jibPct = Math.round(boat.jibTrim);
            jibBarEl.style.width = jibPct + '%';
            jibPctEl.textContent = jibPct + '%';
            jibBarEl.style.background = getSailBarColor(boat.jibState);
        }

        // Bob's tips
        if (boat.state === 'IN_IRONS') {
            stateIndicatorEl.textContent = 'Bob zegt: In de wind! Geen vaart.';
            stateIndicatorEl.style.color = '#e74c3c';
        } else if (boat.mainsailState === 'KILLEN' || (currentLevel >= 2 && boat.jibState === 'KILLEN')) {
            stateIndicatorEl.textContent = 'Bob zegt: Zeilen killen - meer aantrekken!';
            stateIndicatorEl.style.color = '#f39c12';
        } else if (boat.mainsailState === 'HELLEN' || (currentLevel >= 2 && boat.jibState === 'HELLEN')) {
            stateIndicatorEl.textContent = 'Bob zegt: Boot helt! Zeilen vieren!';
            stateIndicatorEl.style.color = '#e74c3c';
        } else {
            stateIndicatorEl.textContent = 'Bob zegt: Goed getrimd!';
            stateIndicatorEl.style.color = '#2ecc71';
        }
    }

    let lastTime = 0;

    function gameLoop(timestamp) {
        if (gameOver) return;

        const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
        lastTime = timestamp;

        physics.update(boat, input, dt, currentLevel);

        // Check collision with island
        if (checkIslandCollision()) {
            triggerGameOver();
            renderer.render(boat, dt);
            return;
        }

        updateHUD();
        renderer.render(boat, dt);

        requestAnimationFrame(gameLoop);
    }

    console.log('Zeilcursus Simulator gestart!');
})();
