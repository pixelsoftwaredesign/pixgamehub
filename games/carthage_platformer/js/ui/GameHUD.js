export class GameHUD {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.comboDisplayTimer = 0;
        this.comboDisplayValue = 0;
        this.comboMaxTimer = 1.5;
        this.lastCombo = 0;
        this.time = 0;
    }

    draw(zayd, score, artifacts, timer, combo, alertedCount, suspiciousCount, stealthMultiplier) {
        this.time += 0.016;
        const ctx = this.ctx;
        const W = this.canvas.width;
        ctx.save();

        this.drawParchmentPanel(ctx, 16, 16, 240, 82);
        this.drawPlayerPanel(ctx, zayd);

        this.drawParchmentPanel(ctx, W - 206, 16, 190, 60);
        this.drawToolsPanel(ctx, W, zayd);

        this.drawStealthIndicator(ctx, W, stealthMultiplier, alertedCount, suspiciousCount);
        this.drawCombo(ctx, combo);

        this.drawParchmentPanel(ctx, W - 206, 84, 190, 40);
        this.drawMiniStats(ctx, W, score, artifacts, timer);

        this.drawParchmentPanel(ctx, 16, this.canvas.height - 80, 320, 64);
        this.drawControlsPanel(ctx);

        ctx.restore();
    }

    drawParchmentPanel(ctx, x, y, w, h) {
        ctx.save();

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(50, 30, 15, 0.88)');
        grad.addColorStop(0.5, 'rgba(40, 22, 10, 0.92)');
        grad.addColorStop(1, 'rgba(35, 18, 8, 0.88)');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 3);
        ctx.stroke();

        ctx.fillStyle = 'rgba(212, 175, 55, 0.06)';
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 2);
        ctx.fill();

        ctx.restore();
    }

    drawPlayerPanel(ctx, zayd) {
        ctx.fillStyle = '#f4a261';
        ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText('ZAYD', 30, 38);

        ctx.fillStyle = '#d4af37';
        ctx.font = '10px Georgia, serif';
        ctx.fillText("L'Agile Acrobate", 30, 52);

        ctx.fillStyle = '#c9b06b';
        ctx.font = '10px Georgia, serif';
        const state = zayd.movement ? zayd.movement.state : (zayd.state || 'idle');
        ctx.fillText(`État: ${state}`, 30, 66);

        if (zayd.stamina !== undefined) {
            this.drawBar(ctx, 30, 74, 200, 6, zayd.stamina / (zayd.maxStamina || 100), '#2a9d8f', '#1a4a40');
        }
        if (zayd.special !== undefined) {
            this.drawBar(ctx, 30, 84, 200, 4, zayd.special / (zayd.maxSpecial || 100), '#e9c46a', '#6a5a2a');
        }
    }

    drawBar(ctx, x, y, w, h, ratio, fillColor, bgColor) {
        ratio = Math.max(0, Math.min(1, ratio));

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.fill();

        if (ratio > 0) {
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, fillColor);
            grad.addColorStop(1, this.darkenColor(fillColor, 0.7));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, w * ratio, h, h / 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.roundRect(x, y, w * ratio, h / 2, h / 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(212,175,55,0.25)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.stroke();
    }

    darkenColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
    }

    drawToolsPanel(ctx, W, zayd) {
        const toolsX = W - 200;

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.fillText('Outils Rapides', toolsX + 14, 36);

        ctx.fillStyle = '#c9b06b';
        ctx.font = '9px Georgia, serif';
        ctx.fillText('[Shift] Dash Aérien', toolsX + 14, 50);
        ctx.fillText('[G] Grappin  [S] Glissade', toolsX + 14, 62);
    }

    drawStealthIndicator(ctx, W, multiplier, alertedCount, suspiciousCount) {
        if (multiplier === undefined || multiplier === null) return;
        const sx = W / 2 - 65;
        const sy = 14;

        this.drawParchmentPanel(ctx, sx, sy, 130, 32);

        const stealthPct = Math.round(multiplier * 100);
        const color = multiplier < 0.3 ? '#2a9d8f' : multiplier < 0.6 ? '#e9c46a' : '#e76f51';
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Furtif ${stealthPct}%`, sx + 65, sy + 20);

        if (alertedCount > 0) {
            ctx.fillStyle = '#e76f51';
            ctx.font = '9px Georgia, serif';
            ctx.fillText(`! ${alertedCount} en alerte`, sx + 65, sy + 40);
        } else if (suspiciousCount > 0) {
            ctx.fillStyle = '#e9c46a';
            ctx.font = '9px Georgia, serif';
            ctx.fillText(`? ${suspiciousCount} suspicieux`, sx + 65, sy + 40);
        }
        ctx.textAlign = 'left';
    }

    drawCombo(ctx, combo) {
        if (combo < 2) return;

        this.comboDisplayValue = combo;
        this.comboDisplayTimer = this.comboMaxTimer;

        const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.008);
        const fontSize = Math.min(16 + combo * 2, 32);

        ctx.save();
        ctx.globalAlpha = Math.min(combo / 8, 1) * pulse;

        ctx.fillStyle = 'rgba(43, 25, 16, 0.8)';
        ctx.beginPath();
        ctx.roundRect(this.canvas.width / 2 - 80, 55, 160, fontSize + 20, 8);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(this.canvas.width / 2 - 80, 55, 160, fontSize + 20, 8);
        ctx.stroke();

        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${fontSize}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${combo}x COMBO`, this.canvas.width / 2, 55 + fontSize + 8);

        if (combo >= 5) {
            ctx.fillStyle = '#f4a261';
            ctx.font = `${11 + combo}px Georgia, serif`;
            ctx.fillText('FLOW MASTER', this.canvas.width / 2, 55 + fontSize + 24);
        }
        if (combo >= 8) {
            ctx.fillStyle = '#e76f51';
            ctx.font = `${10 + combo}px Georgia, serif`;
            ctx.fillText('LÉGENDE DE CARTHAGE', this.canvas.width / 2, 55 + fontSize + 38);
        }
        ctx.restore();
    }

    drawMiniStats(ctx, W, score, artifacts, timer) {
        const sx = W - 200;

        ctx.fillStyle = '#f4a261';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.fillText('Score', sx + 14, 100);
        ctx.fillStyle = '#d4af37';
        ctx.font = '12px Georgia, serif';
        ctx.fillText(`${Math.floor(score)}`, sx + 14, 114);

        ctx.fillStyle = '#f4a261';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.fillText('Artéfacts', sx + 90, 100);
        ctx.fillStyle = '#d4af37';
        ctx.font = '12px Georgia, serif';
        ctx.fillText(`${artifacts.collected}/${artifacts.total}`, sx + 90, 114);

        const mins = Math.floor(timer / 60);
        const secs = Math.floor(timer % 60);
        ctx.fillStyle = '#f4a261';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.fillText('Temps', sx + 145, 100);
        ctx.fillStyle = '#d4af37';
        ctx.font = '12px Georgia, serif';
        ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, sx + 145, 114);
    }

    drawControlsPanel(ctx) {
        const px = 28;
        const py = this.canvas.height - 72;

        ctx.fillStyle = '#f4a261';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.fillText('Contrôles', px, py + 12);

        ctx.fillStyle = '#c9b06b';
        ctx.font = '9px Georgia, serif';
        ctx.fillText('[←/→] ou [A/D] Courir', px, py + 26);
        ctx.fillText('[Espace] Sauter  |  [↓] Glisser', px, py + 38);
        ctx.fillText('[G] Grappin  |  [Shift] Dash Aérien', px, py + 50);
    }

    update(dt) {
        if (this.comboDisplayTimer > 0) {
            this.comboDisplayTimer -= dt;
        }
    }
}
