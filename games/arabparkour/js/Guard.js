/**
 * Guard.js — Gardes du Sultan
 * IA de patrol, détection, poursuite, attaque
 */

class Guard {
    constructor(x, y, patrolRange) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.vx = 0;
        this.vy = 0;
        this.width = 22;
        this.height = 42;
        this.patrolRange = patrolRange || 200;
        this.speed = 2;
        this.chaseSpeed = 4.5;
        this.facingRight = true;

        this.state = 'patrol';
        this.alertLevel = 0;
        this.alertDecay = 0.005;
        this.sightRange = 280;
        this.sightAngle = Math.PI / 3;
        this.attackRange = 50;
        this.attackCooldown = 0;
        this.stunned = 0;

        this.animTime = Math.random() * 10;
        this.patrolDir = 1;
    }

    update(player, platforms) {
        this.animTime += 0.1;
        if (this.stunned > 0) {
            this.stunned--;
            this.state = 'stunned';
            this.vx *= 0.8;
            this.vy += 0.5;
            this.x += this.vx;
            this.y += this.vy;
            for (const p of platforms) {
                if (this.y + this.height > p.y && this.x + this.width > p.x && this.x < p.x + p.w) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                }
            }
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        switch (this.state) {
            case 'patrol':
                this.vx = this.patrolDir * this.speed;
                this.facingRight = this.patrolDir > 0;

                if (this.x > this.startX + this.patrolRange) this.patrolDir = -1;
                if (this.x < this.startX - this.patrolRange) this.patrolDir = 1;

                if (dist < this.sightRange && player.state !== 'dead') {
                    const angleToPlayer = Math.atan2(dy, dx);
                    const facingAngle = this.facingRight ? 0 : Math.PI;
                    let angleDiff = angleToPlayer - facingAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    if (Math.abs(angleDiff) < this.sightAngle || dist < 100) {
                        this.alertLevel = Math.min(1, this.alertLevel + 0.05);
                        if (this.alertLevel >= 0.7) {
                            this.state = 'chase';
                        }
                    }
                } else {
                    this.alertLevel = Math.max(0, this.alertLevel - this.alertDecay);
                }
                break;

            case 'chase':
                const chaseDir = dx > 0 ? 1 : -1;
                this.vx = chaseDir * this.chaseSpeed;
                this.facingRight = chaseDir > 0;

                if (dist > this.sightRange * 1.5 || player.state === 'dead') {
                    this.state = 'patrol';
                    this.alertLevel = 0.3;
                }

                if (dist < this.attackRange && this.attackCooldown <= 0) {
                    this.state = 'attack';
                }
                break;

            case 'attack':
                this.vx = 0;
                if (this.attackCooldown <= 0) {
                    if (dist < this.attackRange + 10) {
                        player.takeDamage(15);
                    }
                    this.attackCooldown = 45;
                }
                this.state = 'chase';
                break;
        }

        this.x += this.vx;
        this.vy += 0.5;
        this.y += this.vy;

        for (const p of platforms) {
            if (this.x + this.width > p.x && this.x < p.x + p.w &&
                this.y + this.height > p.y && this.y + this.height < p.y + p.h + 15 && this.vy >= 0) {
                this.y = p.y - this.height;
                this.vy = 0;
            }
        }
    }

    stun() {
        this.stunned = 60;
        this.vx = (this.facingRight ? -1 : 1) * 5;
        this.vy = -4;
        this.state = 'stunned';
    }

    draw(ctx, camera, time) {
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);

        ctx.save();
        const cx = sx + this.width / 2;
        if (!this.facingRight) {
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cx, 0);
        }

        const bob = this.state === 'patrol' ? Math.sin(time * 5) * 0.8 : 0;

        if (this.stunned > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(time * 20) * 0.3;
        }

        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(sx + this.width / 2, sy + this.height + 1, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(sx + 3, sy + 28 + bob, 6, 12);
        ctx.fillRect(sx + 13, sy + 28 + bob, 6, 12);

        ctx.fillStyle = '#5c1a1a';
        ctx.fillRect(sx + 2, sy + 15 + bob, 18, 15);

        ctx.fillStyle = '#d4a017';
        ctx.fillRect(sx + 2, sy + 27 + bob, 18, 3);

        ctx.fillStyle = '#d4a373';
        ctx.fillRect(sx + 7, sy + 11 + bob, 8, 5);

        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(sx + 11, sy + 6 + bob, 7, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(sx + 4, sy + 5 + bob, 14, 4);

        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(sx + 11, sy - 1 + bob, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 7, sy + 8 + bob, 2, 2);
        ctx.fillRect(sx + 13, sy + 8 + bob, 2, 2);

        if (this.state === 'chase' || this.state === 'attack') {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('!', sx + 8, sy - 4);
        }

        if (this.state === 'attack') {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(sx + 19, sy + 15 + bob, 14, 3);
            ctx.fillRect(sx + 32, sy + 14 + bob, 2, 5);
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
