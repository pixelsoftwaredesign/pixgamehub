/**
 * ZelligePattern.js — Générateur procédural de motifs géométriques islamiques
 * Art islamique, zellige, motifs entrelacés, rosaces
 */

class ZelligePattern {
    constructor(size = 50) {
        this.size = size;
        this.cache = new Map();
    }

    _cacheKey(x, y, s) {
        return `${x}_${y}_${s}`;
    }

    drawPattern(ctx, startX, startY, width, height, opts = {}) {
        const s = opts.size || this.size;
        const gold = opts.gold || '#d4af37';
        const bg = opts.bg || 'rgba(74,21,75,0.25)';
        const lineW = opts.lineWidth || 1.2;
        const patternType = opts.pattern || 'star8';

        ctx.save();
        ctx.strokeStyle = gold;
        ctx.lineWidth = lineW;

        for (let x = startX; x < startX + width; x += s) {
            for (let y = startY; y < startY + height; y += s) {
                ctx.save();
                ctx.translate(x + s / 2, y + s / 2);

                switch (patternType) {
                    case 'star8':
                        this._drawStar8(ctx, s, gold, bg);
                        break;
                    case 'interlace':
                        this._drawInterlace(ctx, s, gold, bg);
                        break;
                    case 'rosette':
                        this._drawRosette(ctx, s, gold, bg);
                        break;
                    case 'diamond':
                        this._drawDiamond(ctx, s, gold, bg);
                        break;
                    default:
                        this._drawStar8(ctx, s, gold, bg);
                }

                ctx.restore();
            }
        }
        ctx.restore();
    }

    _drawStar8(ctx, s, gold, bg) {
        const r = s / 2 - 2;

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const rx = Math.cos(angle) * r;
            const ry = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const midAngle = angle + Math.PI / 8;
            const innerR = r * 0.45;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            ctx.lineTo(Math.cos(midAngle) * innerR, Math.sin(midAngle) * innerR);
            ctx.closePath();
            ctx.fillStyle = 'rgba(212,175,55,0.08)';
            ctx.fill();
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212,175,55,0.15)';
        ctx.fill();
        ctx.stroke();
    }

    _drawInterlace(ctx, s, gold, bg) {
        const h = s / 2 - 2;

        ctx.fillStyle = bg;
        ctx.fillRect(-h, -h, s - 4, s - 4);
        ctx.strokeRect(-h, -h, s - 4, s - 4);

        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(-h, -h);
        ctx.lineTo(h, h);
        ctx.moveTo(h, -h);
        ctx.lineTo(-h, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(0, h);
        ctx.moveTo(-h, 0);
        ctx.lineTo(h, 0);
        ctx.stroke();

        const ir = h * 0.35;
        ctx.beginPath();
        ctx.moveTo(-h, -h + ir);
        ctx.lineTo(-h + ir, -h);
        ctx.moveTo(h - ir, -h);
        ctx.lineTo(h, -h + ir);
        ctx.moveTo(h, h - ir);
        ctx.lineTo(h - ir, h);
        ctx.moveTo(-h + ir, h);
        ctx.lineTo(-h, h - ir);
        ctx.stroke();
    }

    _drawRosette(ctx, s, gold, bg) {
        const r = s / 2 - 3;
        const petals = 6;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const px = Math.cos(angle) * r * 0.55;
            const py = Math.sin(angle) * r * 0.55;

            ctx.beginPath();
            ctx.ellipse(px, py, r * 0.35, r * 0.2, angle, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(212,175,55,0.1)';
            ctx.fill();
            ctx.strokeStyle = gold;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212,175,55,0.25)';
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    _drawDiamond(ctx, s, gold, bg) {
        const h = s / 2 - 2;

        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(h, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-h, 0);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const ih = h * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, -ih);
        ctx.lineTo(ih, 0);
        ctx.lineTo(0, ih);
        ctx.lineTo(-ih, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, h * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212,175,55,0.2)';
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(0, h);
        ctx.moveTo(-h, 0);
        ctx.lineTo(h, 0);
        ctx.stroke();
    }

    drawWallZellige(ctx, x, y, w, h, opts = {}) {
        const tileSize = opts.tileSize || 20;
        const color1 = opts.color1 || 'rgba(10,40,80,0.4)';
        const color2 = opts.color2 || 'rgba(212,175,55,0.15)';

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        for (let tx = x; tx < x + w; tx += tileSize) {
            for (let ty = y; ty < y + h; ty += tileSize) {
                const col = Math.floor((tx - x) / tileSize);
                const row = Math.floor((ty - y) / tileSize);

                ctx.fillStyle = (col + row) % 2 === 0 ? color1 : color2;
                ctx.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);

                if ((col + row) % 3 === 0) {
                    ctx.strokeStyle = 'rgba(212,175,55,0.25)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    drawFloorPattern(ctx, x, y, w, h, opts = {}) {
        const tileSize = opts.tileSize || 30;
        const baseColor = opts.base || '#c68642';
        const accentColor = opts.accent || '#d4a017';

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        for (let tx = x; tx < x + w; tx += tileSize) {
            for (let ty = y; ty < y + h; ty += tileSize) {
                ctx.fillStyle = baseColor;
                ctx.fillRect(tx, ty, tileSize, tileSize);

                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 0.8;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.ZelligePattern = ZelligePattern;
}
