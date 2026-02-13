// Renderer - draws the game world on the HTML5 Canvas
// Visual feedback: killen (fluttering sails), hellen (red glow + tilt)

const PIXELS_PER_METER = 14;

const ISLAND = { x: 0, y: 0, radius: 60 };
const WATER_COLOR = '#1a5276';
const ISLAND_COLOR = '#2ecc71';
const ISLAND_SHORE_COLOR = '#f4d03f';

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    render(boat, dt) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.time += dt || 0.016;

        const camX = boat.x;
        const camY = boat.y;

        ctx.save();

        // --- Water ---
        ctx.fillStyle = WATER_COLOR;
        ctx.fillRect(0, 0, w, h);
        this.drawWaves(ctx, w, h, camX, camY);

        // World transform: center on boat
        ctx.translate(w / 2, h / 2);
        ctx.scale(PIXELS_PER_METER, PIXELS_PER_METER);
        ctx.translate(-camX, -camY);

        this.drawIsland(ctx);
        this.drawWake(ctx, boat);
        this.drawBoat(ctx, boat);

        ctx.restore();

        // HUD in screen space
        this.drawWindArrow(ctx, w, h);
        this.drawSpeedometer(ctx, w, h, boat);
    }

    drawWaves(ctx, w, h, camX, camY) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        const spacing = 35;
        const offsetX = (camX * PIXELS_PER_METER) % spacing;
        const offsetY = (camY * PIXELS_PER_METER) % spacing;

        for (let y = -spacing; y < h + spacing; y += spacing) {
            ctx.beginPath();
            for (let x = -spacing; x < w + spacing; x += 8) {
                const waveY = y - offsetY + Math.sin((x - offsetX) * 0.02 + this.time * 0.8) * 4;
                if (x === -spacing) ctx.moveTo(x, waveY);
                else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
    }

    drawIsland(ctx) {
        // Shallow water ring
        ctx.beginPath();
        ctx.arc(ISLAND.x, ISLAND.y, ISLAND.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = '#1e6f8f';
        ctx.fill();

        // Sandy shore
        ctx.beginPath();
        ctx.arc(ISLAND.x, ISLAND.y, ISLAND.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = ISLAND_SHORE_COLOR;
        ctx.fill();

        // Green island
        ctx.beginPath();
        ctx.arc(ISLAND.x, ISLAND.y, ISLAND.radius, 0, Math.PI * 2);
        ctx.fillStyle = ISLAND_COLOR;
        ctx.fill();

        // Trees
        const trees = [
            [0,-20],[15,-10],[-18,5],[8,18],[-10,-15],
            [25,0],[-25,-8],[5,-30],[-15,25],[20,15],
            [0,10],[-30,-20],[10,-5],[-5,30],[30,-15],
            [-35,10],[35,-5],[0,-40],[12,30],[-20,-30]
        ];
        ctx.fillStyle = '#1e8449';
        for (const [tx, ty] of trees) {
            ctx.beginPath();
            ctx.arc(ISLAND.x + tx, ISLAND.y + ty, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
        // Darker tree centers
        ctx.fillStyle = '#145a32';
        for (const [tx, ty] of trees) {
            ctx.beginPath();
            ctx.arc(ISLAND.x + tx - 1, ISLAND.y + ty - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Wake trail behind the boat
    drawWake(ctx, boat) {
        if (boat.speed < 0.3) return;
        const wakeLen = Math.min(8, boat.speed * 2.5);
        const alpha = Math.min(0.3, boat.speed * 0.08);

        ctx.save();
        ctx.translate(boat.x, boat.y);
        ctx.rotate(boat.heading);

        const hL = boat.length / 2;
        const hB = boat.beam / 2;

        // V-shaped wake
        ctx.beginPath();
        ctx.moveTo(-hB * 0.3, hL * 0.8);
        ctx.lineTo(-hB * 1.5, hL * 0.8 + wakeLen);
        ctx.moveTo(hB * 0.3, hL * 0.8);
        ctx.lineTo(hB * 1.5, hL * 0.8 + wakeLen);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.15;
        ctx.stroke();

        // Center foam
        ctx.beginPath();
        ctx.moveTo(0, hL * 0.9);
        ctx.lineTo(0, hL * 0.9 + wakeLen * 0.7);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();

        ctx.restore();
    }

    drawBoat(ctx, boat) {
        ctx.save();
        ctx.translate(boat.x, boat.y);
        ctx.rotate(boat.heading);

        const hL = boat.length / 2;  // 3.25m
        const hB = boat.beam / 2;    // 1.0m

        // --- Visual heel: slight horizontal shift to simulate tilt ---
        const heelShift = boat.heel * boat.sailSide * hB * 0.4;
        const heelScale = 1 - boat.heel * 0.15; // Slight narrowing when heeling

        // --- Red glow when heeling ---
        if (boat.heel > 0.05) {
            const intensity = Math.min(0.7, boat.heel);
            ctx.fillStyle = `rgba(255, 30, 30, ${intensity * 0.25})`;
            ctx.beginPath();
            ctx.arc(heelShift, 0, hL * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(heelShift, 0);
        ctx.scale(heelScale, 1);

        // --- Hull ---
        ctx.beginPath();
        ctx.moveTo(-hB * 0.8, hL * 0.9);
        ctx.quadraticCurveTo(-hB, hL * 0.5, -hB, 0);
        ctx.quadraticCurveTo(-hB * 0.9, -hL * 0.6, 0, -hL);
        ctx.quadraticCurveTo(hB * 0.9, -hL * 0.6, hB, 0);
        ctx.quadraticCurveTo(hB, hL * 0.5, hB * 0.8, hL * 0.9);
        ctx.closePath();

        // Hull color: white -> pink -> red with heel
        if (boat.heel > 0.1) {
            const t = Math.min(1, boat.heel);
            const r = Math.min(255, Math.round(236 + t * 19));
            const g = Math.max(140, Math.round(240 - t * 100));
            const b = Math.max(140, Math.round(241 - t * 100));
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            ctx.fillStyle = '#ecf0f1';
        }
        ctx.fill();

        // Hull outline
        ctx.strokeStyle = boat.heel > 0.3 ? '#c0392b' : '#7f8c8d';
        ctx.lineWidth = 0.15;
        ctx.stroke();

        // Deck line (gunwale)
        ctx.beginPath();
        ctx.moveTo(-hB * 0.55, hL * 0.65);
        ctx.quadraticCurveTo(-hB * 0.65, 0, 0, -hL * 0.75);
        ctx.quadraticCurveTo(hB * 0.65, 0, hB * 0.55, hL * 0.65);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 0.08;
        ctx.stroke();

        // Cockpit area
        ctx.beginPath();
        ctx.moveTo(-hB * 0.4, hL * 0.55);
        ctx.lineTo(-hB * 0.4, hL * 0.1);
        ctx.lineTo(hB * 0.4, hL * 0.1);
        ctx.lineTo(hB * 0.4, hL * 0.55);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 0.06;
        ctx.stroke();

        ctx.restore(); // undo heel transform

        // --- Mast (fixed position, not affected by heel) ---
        const mastY = -hL * 0.1;
        ctx.beginPath();
        ctx.arc(heelShift * 0.3, mastY, 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();

        // --- Sails ---
        this.drawMainsail(ctx, boat, mastY, hL, hB, heelShift);
        this.drawJib(ctx, boat, mastY, hL, hB, heelShift);

        // --- Rudder ---
        const rudderAngle = -boat.turnRate * 0.35;
        ctx.save();
        ctx.translate(heelShift * 0.2, hL * 0.88);
        ctx.rotate(rudderAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, hL * 0.3);
        ctx.strokeStyle = '#6d4c2a';
        ctx.lineWidth = 0.13;
        ctx.stroke();
        // Tiller
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-Math.sin(rudderAngle) * hL * 0.25, -hL * 0.15);
        ctx.strokeStyle = '#8B5E3C';
        ctx.lineWidth = 0.08;
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // undo boat transform
    }

    drawMainsail(ctx, boat, mastY, hL, hB, heelShift) {
        const trim = boat.mainsailTrim;
        const state = boat.mainsailState;
        const error = boat.mainsailError;

        // Sail angle: 0% trim = 70° out, 100% = 5° in
        const maxAngle = 70 * Math.PI / 180;
        const minAngle = 5 * Math.PI / 180;
        const sailAngle = maxAngle - (trim / 100) * (maxAngle - minAngle);

        const sailLen = hL * 0.85; // Larger sail
        const mastX = heelShift * 0.3;
        const endX = mastX + Math.sin(sailAngle) * sailLen * boat.sailSide;
        const endY = mastY + Math.cos(sailAngle) * sailLen;

        if (state === 'KILLEN') {
            this.drawKillenSail(ctx, mastX, mastY, endX, endY, error, sailLen, 'main');
        } else {
            // Boom (giek) - solid line from mast to clew
            ctx.beginPath();
            ctx.moveTo(mastX, mastY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#4a3d2a';
            ctx.lineWidth = 0.18;
            ctx.stroke();

            // Sail as a curved surface (belly of the sail)
            const bellySide = boat.sailSide;
            const bellyAmount = 0.35 + (1 - trim / 100) * 0.25;
            const cp1x = mastX + (endX - mastX) * 0.3 + bellySide * bellyAmount * sailLen * 0.35;
            const cp1y = mastY + (endY - mastY) * 0.3;
            const cp2x = mastX + (endX - mastX) * 0.7 + bellySide * bellyAmount * sailLen * 0.25;
            const cp2y = mastY + (endY - mastY) * 0.7;

            // Sail fill — solid white, clearly visible
            ctx.beginPath();
            ctx.moveTo(mastX, mastY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.lineTo(mastX, endY * 0.9 + mastY * 0.1); // Leech
            ctx.closePath();

            if (state === 'HELLEN') {
                const red = Math.min(1, error);
                ctx.fillStyle = `rgba(255, ${Math.round(180 - red * 130)}, ${Math.round(180 - red * 130)}, 0.85)`;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
            }
            ctx.fill();

            // Sail outline
            ctx.beginPath();
            ctx.moveTo(mastX, mastY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.lineTo(mastX, endY * 0.9 + mastY * 0.1);
            ctx.closePath();
            if (state === 'HELLEN') {
                ctx.strokeStyle = `rgba(220, ${Math.max(40, Math.round(100 - error * 80))}, ${Math.max(40, Math.round(100 - error * 80))}, 1)`;
            } else {
                ctx.strokeStyle = 'rgba(180, 180, 190, 0.9)';
            }
            ctx.lineWidth = 0.18;
            ctx.stroke();

            // Battens (zeillatten) for detail
            for (let i = 1; i <= 3; i++) {
                const t = i / 4;
                const bx1 = mastX + (endX - mastX) * t * 0.1;
                const by1 = mastY + (endY - mastY) * t;
                const bx2 = mastX + (endX - mastX) * t + bellySide * bellyAmount * sailLen * 0.18 * (1 - Math.abs(t - 0.5));
                const by2 = by1;
                ctx.beginPath();
                ctx.moveTo(bx1, by1);
                ctx.lineTo(bx2, by2);
                ctx.strokeStyle = 'rgba(160, 160, 170, 0.5)';
                ctx.lineWidth = 0.06;
                ctx.stroke();
            }
        }
    }

    drawJib(ctx, boat, mastY, hL, hB, heelShift) {
        const trim = boat.jibTrim;
        const state = boat.jibState;
        const error = boat.jibError;

        const maxAngle = 65 * Math.PI / 180;
        const minAngle = 5 * Math.PI / 180;
        const sailAngle = maxAngle - (trim / 100) * (maxAngle - minAngle);

        const sailLen = hL * 0.65; // Larger jib sail
        const mastX = heelShift * 0.3;
        const bowX = 0;
        const bowY = -hL * 0.95; // Forestay attachment at bow
        const endX = mastX + Math.sin(sailAngle) * sailLen * boat.sailSide;
        const endY = mastY - Math.cos(sailAngle) * sailLen * 0.2;

        // Forestay (from masthead to bow)
        ctx.beginPath();
        ctx.moveTo(mastX, mastY - 0.3);
        ctx.lineTo(bowX, bowY);
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
        ctx.lineWidth = 0.07;
        ctx.stroke();

        // Jib: triangle from bow to mast to clew
        const clewX = endX;
        const clewY = mastY + sailLen * 0.1;

        if (state === 'KILLEN') {
            this.drawKillenSail(ctx, bowX, bowY, clewX, clewY, error, sailLen, 'jib');
            this.drawKillenSail(ctx, mastX, mastY - 0.2, clewX, clewY, error * 0.5, sailLen * 0.5, 'jib');
        } else {
            const bellySide = boat.sailSide;
            const bellyAmount = 0.3 + (1 - trim / 100) * 0.2;

            // Jib fill: triangle bow -> mast -> clew with belly curve
            ctx.beginPath();
            ctx.moveTo(bowX, bowY);
            // Luff (front edge, bow to mast area)
            ctx.lineTo(mastX, mastY - 0.2);
            // Leech (back edge with belly)
            const cpx = mastX + bellySide * bellyAmount * sailLen * 0.5;
            const cpy = (mastY + clewY) / 2;
            ctx.quadraticCurveTo(cpx, cpy, clewX, clewY);
            // Foot back to bow area
            ctx.lineTo(bowX, bowY);
            ctx.closePath();

            // Crème/beige tint to distinguish from white mainsail
            if (state === 'HELLEN') {
                const red = Math.min(1, error);
                ctx.fillStyle = `rgba(255, ${Math.round(180 - red * 130)}, ${Math.round(170 - red * 130)}, 0.8)`;
            } else {
                ctx.fillStyle = 'rgba(255, 248, 230, 0.78)';
            }
            ctx.fill();

            // Full outline of the jib
            ctx.beginPath();
            ctx.moveTo(bowX, bowY);
            ctx.lineTo(mastX, mastY - 0.2);
            ctx.quadraticCurveTo(cpx, cpy, clewX, clewY);
            ctx.lineTo(bowX, bowY);
            ctx.closePath();
            if (state === 'HELLEN') {
                ctx.strokeStyle = `rgba(220, ${Math.max(40, Math.round(100 - error * 80))}, ${Math.max(40, Math.round(80 - error * 60))}, 1)`;
            } else {
                ctx.strokeStyle = 'rgba(200, 190, 160, 0.9)';
            }
            ctx.lineWidth = 0.16;
            ctx.stroke();

            // Fok bak indicator: if jib is backing, draw it mirrored and darker
            if (boat.jibBak) {
                ctx.fillStyle = 'rgba(255, 100, 50, 0.3)';
                ctx.beginPath();
                ctx.moveTo(bowX, bowY);
                ctx.lineTo(mastX, mastY - 0.2);
                const bakCpx = mastX - bellySide * bellyAmount * sailLen * 0.5;
                ctx.quadraticCurveTo(bakCpx, cpy, mastX - bellySide * sailLen * 0.35, clewY);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 80, 30, 0.8)';
                ctx.lineWidth = 0.14;
                ctx.stroke();
            }
        }
    }

    drawKillenSail(ctx, startX, startY, endX, endY, severity, sailLen, type) {
        // Fluttering wavy sail (luffing/killen)
        const segments = 10;
        const dx = (endX - startX) / segments;
        const dy = (endY - startY) / segments;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return;

        // Higher frequency and amplitude for more dramatic killen
        const amplitude = (0.15 + severity * 0.5) * (sailLen / 3);
        const freq = 10 + severity * 8;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const baseX = startX + dx * i;
            const baseY = startY + dy * i;
            // Flutter builds up along the sail (more at the tip)
            const envelope = Math.sin(t * Math.PI) * t;
            const wave = Math.sin(this.time * freq + t * Math.PI * 4) * amplitude * envelope;
            ctx.lineTo(baseX + (-dy / len) * wave, baseY + (dx / len) * wave);
        }

        // Grey dashed line for killen
        const alpha = Math.max(0.2, 0.6 - severity * 0.3);
        ctx.strokeStyle = `rgba(180, 180, 190, ${alpha})`;
        ctx.lineWidth = type === 'main' ? 0.13 : 0.09;
        ctx.setLineDash([0.25, 0.2]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawWindArrow(ctx, w, h) {
        const cx = w - 60;
        const cy = 60;
        const r = 35;

        ctx.save();

        // Background
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Compass marks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', cx, cy - r + 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('Z', cx, cy + r - 10);
        ctx.fillText('O', cx + r - 10, cy);
        ctx.fillText('W', cx - r + 10, cy);

        // Arrow (wind blows from north = down)
        ctx.translate(cx, cy);
        ctx.rotate(Wind.direction + Math.PI);

        ctx.beginPath();
        ctx.moveTo(0, -r + 8);
        ctx.lineTo(0, r - 12);
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(0, r - 7);
        ctx.lineTo(-7, r - 17);
        ctx.lineTo(7, r - 17);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Source dot
        ctx.beginPath();
        ctx.arc(0, -r + 10, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Wind', cx, cy + r + 16);
    }

    drawSpeedometer(ctx, w, h, boat) {
        const x = w - 80;
        const y = h - 30;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x - 40, y - 16, 100, 28);

        const knots = (Math.max(0, boat.speed) * 1.944).toFixed(1);
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(knots + ' kn', x - 30, y + 4);
        ctx.restore();
    }
}
