import { createZaydAvatar, createJennaAvatar, createZedAvatar } from './entities/AdvancedAvatar.js';

export class UIManager {
    constructor() {
        this.player = null;
        this.score = 0;
        this.artifacts = 0;
        this.totalArtifacts = 0;
        this.timer = 0;
        this.guardsAlerted = 0;
        this.suspiciousGuards = 0;
        this.flowCombo = 0;
        this.avatars = {
            zayd: createZaydAvatar(),
            jenna: createJennaAvatar(),
            zed: createZedAvatar()
        };
        this.activeAvatar = null;
    }

    setPlayer(player) {
        this.player = player;
        if (player) {
            this.activeAvatar = this.avatars[player.name.toLowerCase()] || null;
        }
    }

    updateAvatars(dt) {
        for (const av of Object.values(this.avatars)) {
            av.update(dt);
        }
    }

    updateStats(score, artifacts, total, timer, guardsAlerted, suspiciousGuards, flowCombo) {
        this.score = score;
        this.artifacts = artifacts;
        this.totalArtifacts = total;
        this.timer = timer;
        this.guardsAlerted = guardsAlerted || 0;
        this.suspiciousGuards = suspiciousGuards || 0;
        this.flowCombo = flowCombo || 0;
    }

    draw(ctx) {
        if (!this.player) return;
        const p = this.player;

        ctx.save();

        if (this.activeAvatar) {
            this.activeAvatar.drawAvatarBox(ctx, 18, 18, 80);

            ctx.fillStyle = '#f4e8c1';
            ctx.font = 'bold 14px serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.name, 108, 42);

            ctx.fillStyle = '#c9a84c';
            ctx.font = '10px sans-serif';
            ctx.fillText(p.roleDesc || '', 108, 56);

            const barX = 108;
            const barW = 115;
            let barY = 64;

            ctx.fillStyle = '#999';
            ctx.font = '8px sans-serif';
            ctx.fillText('HP', barX, barY + 7);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 18, barY, barW, 6);
            ctx.fillStyle = '#c1121f';
            ctx.fillRect(barX + 18, barY, barW * Math.max(0, p.hp / p.maxHp), 6);

            barY += 10;
            ctx.fillStyle = '#999';
            ctx.fillText('STA', barX, barY + 7);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 18, barY, barW, 6);
            ctx.fillStyle = '#023e8a';
            ctx.fillRect(barX + 18, barY, barW * (p.stamina / p.maxStamina), 6);

            barY += 10;
            ctx.fillStyle = '#999';
            ctx.fillText('SPC', barX, barY + 7);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 18, barY, barW, 6);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(barX + 18, barY, barW * (p.special / p.maxSpecial), 6);
        } else {
            const px = 20, py = 20;
            ctx.fillStyle = 'rgba(10, 6, 18, 0.8)';
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(px, py, 245, 145, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 15px serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.name, px + 12, py + 20);

            ctx.fillStyle = '#c9a84c';
            ctx.font = '10px sans-serif';
            ctx.fillText(p.roleDesc || '', px + 12, py + 34);

            const barX = px + 12;
            const barW = 185;
            let barY = py + 44;

            ctx.fillStyle = '#999';
            ctx.font = '9px sans-serif';

            ctx.fillText('HP', barX, barY + 9);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 22, barY, barW, 7);
            ctx.fillStyle = '#c1121f';
            ctx.fillRect(barX + 22, barY, barW * Math.max(0, p.hp / p.maxHp), 7);
            ctx.strokeStyle = '#444'; ctx.lineWidth = 0.5;
            ctx.strokeRect(barX + 22, barY, barW, 7);

            barY += 14;
            ctx.fillStyle = '#999';
            ctx.fillText('STA', barX, barY + 9);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 22, barY, barW, 7);
            ctx.fillStyle = '#023e8a';
            ctx.fillRect(barX + 22, barY, barW * (p.stamina / p.maxStamina), 7);
            ctx.strokeRect(barX + 22, barY, barW, 7);

            barY += 14;
            ctx.fillStyle = '#999';
            ctx.fillText('SPC', barX, barY + 9);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX + 22, barY, barW, 7);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(barX + 22, barY, barW * (p.special / p.maxSpecial), 7);
            ctx.strokeRect(barX + 22, barY, barW, 7);
        }

        const statsY = this.activeAvatar ? 108 : 108;
        const statsX = 20;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🏆 ${this.score}`, statsX, statsY);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.fillText(`📦 ${this.artifacts}/${this.totalArtifacts}`, statsX + 70, statsY);
        ctx.fillStyle = '#888';
        ctx.fillText(`⏱ ${Math.floor(this.timer)}s`, statsX + 150, statsY);

        ctx.fillStyle = this.guardsAlerted > 0 ? '#ff4444' : '#44cc44';
        ctx.font = 'bold 10px sans-serif';
        if (this.guardsAlerted > 0) {
            ctx.fillText(`⚠ ${this.guardsAlerted} garde(s) en alerte!`, statsX, statsY + 15);
        } else {
            ctx.fillText('✓ Zone sécurisée', statsX, statsY + 15);
        }

        if (this.suspiciousGuards > 0 && this.guardsAlerted === 0) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(`? ${this.suspiciousGuards} garde(s) suspicieux...`, statsX, statsY + 28);
        }

        if (this.flowCombo > 1) {
            const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
            ctx.fillStyle = '#d4af37';
            ctx.globalAlpha = pulse;
            ctx.font = `bold ${12 + this.flowCombo * 2}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`${this.flowCombo}x FLOW`, 640, 35);
            ctx.globalAlpha = 1;
        }

        if (this.player && this.player.movement) {
            const stealthMult = this.player.movement.getStealthMultiplier();
            if (stealthMult < 0.8) {
                ctx.fillStyle = 'rgba(100, 80, 150, 0.7)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('● Furtif', 640, 55);
            }
        }

        ctx.fillStyle = '#ffd700';
        ctx.font = '11px serif';
        ctx.textAlign = 'right';
        ctx.fillText('E  Compétence', 1300, 35);

        ctx.strokeStyle = 'rgba(212,175,55,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(1280 - 160, 14, 145, 28, 5);
        ctx.stroke();

        ctx.restore();
    }
}
