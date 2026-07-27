/**
 * ClothSimulator.js — Simulation de tissu flottant au vent
 * Bannières, capes, caftans — ondulation sinusoïdale combinée au vent
 */

class ClothSimulator {
    constructor(segmentCount = 10) {
        this.segments = segmentCount;
        this.points = [];
    }

    renderWavingCloth(ctx, startX, startY, segmentLength, height, windForce, time, opts = {}) {
        const segs = opts.segments || this.segments;
        const mainColor = opts.color || '#4a154b';
        const strokeColor = opts.gold || '#d4af37';
        const lineW = opts.lineWidth || 2;
        const waveAmp = opts.waveAmplitude || 1;
        const verticalWave = opts.verticalWave !== false;

        ctx.save();
        ctx.fillStyle = mainColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineW;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        const totalWidth = segmentLength * segs;
        ctx.lineTo(startX + totalWidth, startY);

        this.points = [];

        for (let i = segs; i >= 0; i--) {
            const x = startX + segmentLength * i;
            const progress = 1 - (i / segs);
            const windAmp = progress * progress * windForce * waveAmp;
            const waveX = Math.sin(time * 3 + i * 0.6) * windAmp * 0.5;
            const waveY = Math.sin(time * 2.5 + i * 0.45) * windAmp;
            const flutter = Math.sin(time * 6 + i * 1.2) * windForce * progress * 0.15;

            const px = x + waveX;
            const py = startY + height + waveY + flutter;

            this.points.push({ x: px, y: py });

            if (i === segs) {
                ctx.lineTo(px, py);
            } else {
                const nextX = startX + segmentLength * (i + 1);
                const cpx = (px + nextX) / 2;
                const cpy = py + Math.sin(time * 3 + (i + 0.5) * 0.6) * windAmp * 0.3;
                ctx.quadraticCurveTo(cpx, cpy, px, py);
            }
        }

        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;

        this._drawFringe(ctx, this.points, strokeColor, time);
        this._drawEmblem(ctx, startX + totalWidth * 0.5, startY + height * 0.5, Math.min(height, totalWidth) * 0.2, opts);

        ctx.restore();
    }

    renderCape(ctx, x, y, width, height, windForce, time, opts = {}) {
        const mainColor = opts.color || '#722f37';
        const gold = opts.gold || '#d4a017';
        const segments = opts.segments || 8;

        ctx.save();
        ctx.fillStyle = mainColor;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(x, y);

        ctx.lineTo(x + width, y);

        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const px = x + width * t;
            const windAmp = (1 - t) * windForce * 3;
            const wave = Math.sin(time * 3.5 + i * 0.7) * windAmp;
            const flutter = Math.sin(time * 7 + i * 1.5) * windForce * (1 - t) * 0.2;
            const py = y + height + wave + flutter;

            if (i === segments) {
                ctx.lineTo(px, py);
            } else {
                const prevX = x + width * (i + 1) / segments;
                const cpx = (px + prevX) / 2;
                const cpy = py + Math.sin(time * 3 + i) * windAmp * 0.4;
                ctx.quadraticCurveTo(cpx, cpy, px, py);
            }
        }

        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const stripeCount = 3;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let s = 1; s <= stripeCount; s++) {
            const sy = y + (height * s) / (stripeCount + 1);
            ctx.beginPath();
            ctx.moveTo(x + 4, sy);
            for (let i = segments; i >= 0; i--) {
                const t = i / segments;
                const px = x + width * t + 4;
                const windAmp = (1 - t) * windForce * 3 * (s / (stripeCount + 1));
                const wave = Math.sin(time * 3.5 + i * 0.7 + s * 0.3) * windAmp;
                const py = sy + wave;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    renderWaistCloth(ctx, x, y, width, height, windForce, time, opts = {}) {
        const mainColor = opts.color || '#d4a373';
        const gold = opts.gold || '#d4a017';
        const segments = opts.segments || 6;

        ctx.save();
        ctx.fillStyle = mainColor;
        ctx.beginPath();

        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);

        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const px = x + width * t;
            const wave = Math.sin(time * 2.5 + i * 0.5) * windForce * (1 - t) * 1.5;
            const py = y + height + wave;
            ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = gold;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    _drawFringe(ctx, points, color, time) {
        if (points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;

        for (let i = 0; i < points.length - 1; i++) {
            const p = points[i];
            const fringeLen = 6 + Math.sin(time * 4 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + Math.sin(time * 3 + i * 0.8) * 2, p.y + fringeLen);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    _drawEmblem(ctx, x, y, r, opts = {}) {
        const gold = opts.gold || '#d4a017';

        ctx.save();
        ctx.globalAlpha = 0.4;

        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = gold;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * r * 0.5, y + Math.sin(angle) * r * 0.5);
            ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.ClothSimulator = ClothSimulator;
}
