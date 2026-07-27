/**
 * ArabianTheme.js — Style "Empereur Arabe"
 * Palais, arches, minarets, motifs zellige, bannières royales
 */

const ARABIAN_PALETTE = {
    gold: ['#d4a017', '#c5941a', '#b8860b', '#e6be44', '#ffd700'],
    copper: ['#b87333', '#cd7f32', '#da8a3e', '#a0522d', '#8b4513'],
    purple: ['#4a0e4e', '#6b1d6e', '#800080', '#5c1a7a', '#3d0c3e'],
    sapphire: ['#0f3d8c', '#1a4da0', '#2460b4', '#0a2d6b', '#153d8c'],
    emerald: ['#1a6b3a', '#228b22', '#2ea44e', '#145a32', '#1b7a3d'],
    ivory: ['#fffff0', '#fdf5e6', '#f5f5dc', '#eee8d5', '#e8e0cc'],
    sand: ['#d4a373', '#c68642', '#deb887', '#d2b48c', '#c4a265'],
    velvet: ['#722f37', '#8b0000', '#a02020', '#5c1a1a', '#6b1d1d'],
};

const ARABIAN_BUILDINGS = {
    dome: {
        draw(ctx, x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(x, y, w / 2, h, 0, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(x - w * 0.1, y - h * 0.3, w * 0.25, h * 0.4, 0, Math.PI, 0, false);
            ctx.fill();
        },
    },
    minaret: {
        draw(ctx, x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x - w / 2, y - h, w, h);
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.arc(x, y - h, w * 0.6, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = '#c5941a';
            ctx.fillRect(x - w * 0.3, y - h * 0.7, w * 0.6, 3);
            ctx.fillRect(x - w * 0.3, y - h * 0.4, w * 0.6, 3);
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y - h - w * 0.5, 3, 0, Math.PI * 2);
            ctx.fill();
        },
    },
    arch: {
        draw(ctx, x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x - w / 2, y - h, w * 0.15, h);
            ctx.fillRect(x + w * 0.35, y - h, w * 0.15, h);
            ctx.beginPath();
            ctx.moveTo(x - w / 2, y - h);
            ctx.quadraticCurveTo(x, y - h - w * 0.3, x + w / 2, y - h);
            ctx.lineTo(x + w * 0.35, y - h);
            ctx.quadraticCurveTo(x, y - h - w * 0.2, x - w * 0.35, y - h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - w / 2, y - h);
            ctx.quadraticCurveTo(x, y - h - w * 0.3, x + w / 2, y - h);
            ctx.stroke();
        },
    },
    wall: {
        draw(ctx, x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y - h, w, h);
            ctx.fillStyle = 'rgba(212,160,23,0.15)';
            const tileSize = 12;
            for (let tx = x; tx < x + w; tx += tileSize) {
                for (let ty = y - h; ty < y; ty += tileSize) {
                    if ((Math.floor(tx / tileSize) + Math.floor(ty / tileSize)) % 2 === 0) {
                        ctx.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);
                    }
                }
            }
        },
    },
    banner: {
        draw(ctx, x, y, w, h, color, time, windForce) {
            const sway = Math.sin(time * 2 + x * 0.01) * (windForce || 2) * 0.5;
            ctx.fillStyle = color || '#722f37';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + w * 0.3 + sway, y + h * 0.5, x + sway, y + h);
            ctx.lineTo(x + w + sway, y + h * 0.8);
            ctx.quadraticCurveTo(x + w * 0.7 + sway, y + h * 0.3, x + w, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x + w * 0.3 + sway * 0.5, y + h * 0.2, 4, 4);
            ctx.beginPath();
            ctx.arc(x + w * 0.5 + sway * 0.5, y + h * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
        },
    },
    carpet: {
        draw(ctx, x, y, w, h) {
            const gradient = ctx.createLinearGradient(x, y, x, y + h);
            gradient.addColorStop(0, '#8b0000');
            gradient.addColorStop(0.5, '#a02020');
            gradient.addColorStop(1, '#722f37');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#d4a017';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
            ctx.strokeStyle = '#c5941a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
            for (let i = 0; i < w; i += 16) {
                ctx.fillStyle = '#d4a017';
                ctx.fillRect(x + i + 4, y + 2, 2, h - 4);
            }
        },
    },
};

function drawZelligePattern(ctx, x, y, size, color1, color2) {
    const s = size;
    ctx.fillStyle = color1;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = color2;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y);
    ctx.lineTo(x + s, y + s / 2);
    ctx.lineTo(x + s / 2, y + s);
    ctx.lineTo(x, y + s / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
}

function drawMashrabiya(ctx, x, y, w, h) {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2a1a0a';
    const holeSize = 4;
    const gap = 8;
    for (let hx = x + gap; hx < x + w - gap; hx += gap) {
        for (let hy = y + gap; hy < y + h - gap; hy += gap) {
            ctx.beginPath();
            ctx.arc(hx, hy, holeSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = 'rgba(255,180,80,0.15)';
    for (let hx = x + gap; hx < x + w - gap; hx += gap) {
        for (let hy = y + gap; hy < y + h - gap; hy += gap) {
            ctx.beginPath();
            ctx.arc(hx, hy, holeSize / 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawCalligraphy(ctx, x, y, text, color, size) {
    ctx.save();
    ctx.fillStyle = color || '#d4a017';
    ctx.font = `bold ${size || 14}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text || '﷽', x, y);
    ctx.restore();
}

const ARABIAN_DECOR = {
    pillar(ctx, x, y, h, w) {
        w = w || 12;
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(x - w / 2, y - h, w, h);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - w / 2 - 2, y - h, w + 4, 6);
        ctx.fillRect(x - w / 2 - 2, y - 6, w + 4, 6);
        ctx.fillStyle = '#c5941a';
        for (let i = 0; i < h; i += 20) {
            ctx.fillRect(x - w / 2, y - i - 2, w, 2);
        }
    },

    fountain(ctx, x, y, time) {
        ctx.fillStyle = '#d4a373';
        ctx.beginPath();
        ctx.ellipse(x, y, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#48cae4';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 25, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(x - 3, y - 25, 6, 23);
        ctx.beginPath();
        ctx.arc(x, y - 28, 5, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
            const angle = time * 2 + i * Math.PI * 2 / 3;
            const fx = x + Math.cos(angle) * 8;
            const fy = y - 28 + Math.sin(time * 3 + i) * 3;
            ctx.fillStyle = 'rgba(72,202,228,0.5)';
            ctx.beginPath();
            ctx.arc(fx, fy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    lantern(ctx, x, y, time) {
        ctx.fillStyle = '#b87333';
        ctx.fillRect(x - 1, y - 20, 2, 10);
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 10);
        ctx.lineTo(x - 6, y - 20);
        ctx.lineTo(x + 6, y - 20);
        ctx.lineTo(x + 8, y - 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#da8a3e';
        ctx.fillRect(x - 6, y - 10, 12, 8);
        ctx.fillStyle = 'rgba(255,200,80,0.3)';
        const flicker = Math.sin(time * 8 + x) * 2;
        ctx.beginPath();
        ctx.arc(x, y - 6, 10 + flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - 1, y - 8, 2, 4);
    },

    sword(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-1, -30, 2, 25);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(-4, -6, 8, 4);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-2, -2, 4, 8);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-1, -32, 2, 3);
        ctx.restore();
    },

    shield(ctx, x, y) {
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x + Math.cos(a) * 7 - 1, y + Math.sin(a) * 7 - 1, 2, 2);
        }
    },

    camel(ctx, x, y, time) {
        const bob = Math.sin(time * 2) * 2;
        ctx.fillStyle = '#c4a265';
        ctx.beginPath();
        ctx.ellipse(x, y - 15 + bob, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(x - 5, y - 5, 4, 12);
        ctx.fillRect(x + 5, y - 5, 4, 12);
        ctx.fillStyle = '#c4a265';
        ctx.fillRect(x + 15, y - 25 + bob, 8, 12);
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(x + 14, y - 30 + bob, 3, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 20, y - 24 + bob, 2, 2);
        ctx.fillStyle = '#722f37';
        ctx.fillRect(x - 10, y - 20 + bob, 20, 3);
    },
};

if (typeof window !== 'undefined') {
    window.ARABIAN_PALETTE = ARABIAN_PALETTE;
    window.ARABIAN_BUILDINGS = ARABIAN_BUILDINGS;
    window.ARABIAN_DECOR = ARABIAN_DECOR;
    window.drawZelligePattern = drawZelligePattern;
    window.drawMashrabiya = drawMashrabiya;
    window.drawCalligraphy = drawCalligraphy;
}
