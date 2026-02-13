// Input handler - keyboard + touch controls

class Input {
    constructor() {
        this.keys = {};
        this.touchActions = {};

        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch buttons
        this.initTouch();
    }

    initTouch() {
        const buttons = document.querySelectorAll('.touch-btn');
        buttons.forEach(btn => {
            const action = btn.dataset.action;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchActions[action] = true;
                btn.classList.add('active');
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchActions[action] = false;
                btn.classList.remove('active');
            }, { passive: false });

            btn.addEventListener('touchcancel', () => {
                this.touchActions[action] = false;
                btn.classList.remove('active');
            });

            // Mouse fallback for testing touch UI on desktop
            btn.addEventListener('mousedown', () => {
                this.touchActions[action] = true;
                btn.classList.add('active');
            });

            btn.addEventListener('mouseup', () => {
                this.touchActions[action] = false;
                btn.classList.remove('active');
            });

            btn.addEventListener('mouseleave', () => {
                this.touchActions[action] = false;
                btn.classList.remove('active');
            });
        });
    }

    isPressed(code) {
        return !!this.keys[code];
    }

    isTouched(action) {
        return !!this.touchActions[action];
    }

    getSteering() {
        let dir = 0;
        if (this.isPressed('ArrowLeft') || this.isTouched('steer-left')) dir -= 1;
        if (this.isPressed('ArrowRight') || this.isTouched('steer-right')) dir += 1;
        return dir;
    }

    // +1 = aantrekken (strakker), -1 = vieren (losser)
    getMainsailAdjust() {
        let adj = 0;
        if (this.isPressed('ArrowUp') || this.isTouched('main-in')) adj += 1;
        if (this.isPressed('ArrowDown') || this.isTouched('main-out')) adj -= 1;
        return adj;
    }

    getJibAdjust() {
        let adj = 0;
        if (this.isPressed('KeyW') || this.isTouched('jib-in')) adj += 1;
        if (this.isPressed('KeyS') || this.isTouched('jib-out')) adj -= 1;
        return adj;
    }
}
