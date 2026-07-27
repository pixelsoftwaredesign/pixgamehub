export class Guard {
    constructor(x, y, patrolRange) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 60;
        this.startX = x;
        this.startY = y;
        this.patrolRange = patrolRange || 150;
        this.speed = 1 + Math.random() * 0.5;
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.alive = true;
        this.facingRight = this.dir > 0;

        this.state = 'PATROL';
        this.visionRange = 220;
        this.visionAngle = 0.6;
        this.losRange = 250;
        this.suspicionLevel = 0;
        this.suspicionThreshold = 30;
        this.alertThreshold = 80;
        this.alertTimer = 0;
        this.alertDuration = 180;
        this.searchTimer = 0;
        this.searchDuration = 120;
        this.lastSeenPlayerX = 0;
        this.lastSeenPlayerY = 0;
        this.lastKnownPlayerX = 0;
        this.lastKnownPlayerY = 0;
        this.returnTimer = 0;
        this.returnDuration = 60;

        this.attackCooldown = 0;
        this.attackRange = 40;
        this.attackDamage = 15;
        this.chaseSpeed = 2.5;
        this.searchSpeed = 1.5;
    }

    update(player, dt, platforms) {
        if (!this.alive) return;

        switch (this.state) {
            case 'PATROL':
                this.doPatrol(dt);
                break;
            case 'SUSPICIOUS':
                this.doSuspicious(dt);
                break;
            case 'ALERTED':
                this.doAlerted(dt, player);
                break;
            case 'SEARCHING':
                this.doSearching(dt);
                break;
            case 'RETURNING':
                this.doReturning(dt);
                break;
        }

        if (player && player.alive) {
            this.checkDetection(player, platforms);
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    doPatrol(dt) {
        this.x += this.speed * this.dir * dt;

        if (this.x > this.startX + this.patrolRange) {
            this.dir = -1;
            this.facingRight = false;
        }
        if (this.x < this.startX - this.patrolRange) {
            this.dir = 1;
            this.facingRight = true;
        }
    }

    doSuspicious(dt) {
        this.suspicionLevel += 0.8;
        if (this.facingRight) {
            this.x += this.speed * 0.3 * dt;
        } else {
            this.x -= this.speed * 0.3 * dt;
        }

        if (this.suspicionLevel >= this.alertThreshold) {
            this.setState('ALERTED');
        }

        if (this.suspicionLevel < 5) {
            this.setState('PATROL');
        }
    }

    doAlerted(dt, player) {
        this.alertTimer--;
        this.suspicionLevel = 100;

        if (player && player.alive) {
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            this.lastSeenPlayerX = player.x;
            this.lastSeenPlayerY = player.y;
            this.dir = dx > 0 ? 1 : -1;
            this.facingRight = this.dir > 0;

            const dist = Math.abs(dx);
            if (dist > this.attackRange) {
                this.x += this.dir * this.speed * this.chaseSpeed * dt;
            } else if (this.attackCooldown <= 0) {
                player.takeDamage(this.attackDamage);
                this.attackCooldown = 60;
            }
        }

        if (this.alertTimer <= 0) {
            this.lastKnownPlayerX = this.lastSeenPlayerX;
            this.lastKnownPlayerY = this.lastSeenPlayerY;
            this.setState('SEARCHING');
        }
    }

    doSearching(dt) {
        this.searchTimer--;
        this.dir = this.lastKnownPlayerX > this.x ? 1 : -1;
        this.facingRight = this.dir > 0;

        const distToLastKnown = Math.abs(this.lastKnownPlayerX - this.x);
        if (distToLastKnown > 10) {
            this.x += this.dir * this.speed * this.searchSpeed * dt;
        }

        if (this.searchTimer <= 0) {
            this.setState('RETURNING');
        }
    }

    doReturning(dt) {
        this.returnTimer--;
        const distToStart = Math.abs(this.startX - this.x);

        if (distToStart > 5) {
            this.dir = this.startX > this.x ? 1 : -1;
            this.facingRight = this.dir > 0;
            this.x += this.dir * this.speed * 0.8 * dt;
        } else {
            this.setState('PATROL');
        }

        if (this.returnTimer <= 0) {
            this.setState('PATROL');
        }
    }

    setState(newState) {
        this.state = newState;

        switch (newState) {
            case 'PATROL':
                this.suspicionLevel = 0;
                this.alerted = false;
                break;
            case 'SUSPICIOUS':
                this.alerted = false;
                break;
            case 'ALERTED':
                this.alertTimer = this.alertDuration;
                this.alerted = true;
                break;
            case 'SEARCHING':
                this.searchTimer = this.searchDuration;
                this.alerted = false;
                break;
            case 'RETURNING':
                this.returnTimer = this.returnDuration;
                this.alerted = false;
                break;
        }
    }

    checkDetection(player, platforms) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.losRange) {
            if (this.state === 'SUSPICIOUS') {
                this.suspicionLevel -= 1;
            }
            return;
        }

        const dirToPlayer = Math.atan2(dy, dx);
        const guardAngle = this.facingRight ? 0 : Math.PI;
        let angleDiff = Math.abs(dirToPlayer - guardAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff > this.visionAngle && dist > 50) {
            if (this.state === 'SUSPICIOUS') this.suspicionLevel -= 0.5;
            return;
        }

        let blocked = false;
        if (platforms) {
            for (const p of platforms) {
                if (this.lineIntersectsRect(
                    this.x + this.width / 2, this.y + this.height / 2,
                    player.x + player.width / 2, player.y + player.height / 2,
                    p.x, p.y - (p.wallHeight || 0), p.w, (p.wallHeight || 60) + (p.h || 30)
                )) {
                    blocked = true;
                    break;
                }
            }
        }

        if (blocked) return;

        let stealthMult = 1.0;
        if (player.movement) {
            stealthMult = player.movement.getStealthMultiplier();
        }

        const effectiveDist = dist / stealthMult;
        const detectChance = (1 - effectiveDist / this.losRange) * (1 - angleDiff / this.visionAngle);

        if (effectiveDist < 60) {
            if (this.state !== 'ALERTED') this.setState('ALERTED');
            return;
        }

        if (detectChance > 0.3) {
            if (this.state === 'PATROL') {
                this.suspicionLevel += detectChance * 3;
                if (this.suspicionLevel >= this.suspicionThreshold) {
                    this.setState('SUSPICIOUS');
                }
            }
        } else if (this.state === 'SUSPICIOUS') {
            this.suspicionLevel -= 0.3;
        }
    }

    lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        const left = this.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
        const right = this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
        const top = this.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
        const bottom = this.lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
        return left || right || top || bottom;
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    draw(ctx, camera) {
        if (!this.alive) return;
        const x = Math.round(this.x - camera.x);
        const y = Math.round(this.y);
        if (x < -50 || x > 1350) return;

        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        if (!this.facingRight) ctx.scale(-1, 1);

        const t = performance.now() * 0.003;
        const bobY = this.state === 'PATROL' ? Math.sin(t * 2) * 1.5 : 0;
        ctx.translate(0, bobY);

        if (this.state === 'SUSPICIOUS') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const coneGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.visionRange * 0.5);
            coneGrad.addColorStop(0, 'rgba(255, 200, 0, 0.12)');
            coneGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(-this.visionRange * 0.4, this.visionRange * 0.3);
            ctx.lineTo(this.visionRange * 0.4, this.visionRange * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        if (this.state === 'ALERTED' || this.state === 'SEARCHING') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const alertGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.visionRange * 0.6);
            alertGrad.addColorStop(0, 'rgba(255, 50, 50, 0.1)');
            alertGrad.addColorStop(1, 'rgba(255, 50, 50, 0)');
            ctx.fillStyle = alertGrad;
            ctx.beginPath();
            ctx.arc(0, 0, this.visionRange * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 30, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-10, 18, 20, 12);

        ctx.fillStyle = '#cc2222';
        ctx.fillRect(-11, -12, 22, 32);

        ctx.fillStyle = '#aa1a1a';
        ctx.fillRect(-11, -12, 22, 4);

        ctx.fillStyle = '#dd3333';
        ctx.fillRect(-9, -8, 18, 2);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-8, -6, 16, 3);

        ctx.fillStyle = '#888';
        ctx.fillRect(-9, -3, 18, 6);

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(5, -12, 6, 32);

        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.moveTo(-5, -15);
        ctx.quadraticCurveTo(-28, -6 + Math.sin(t) * 3, -35, 10);
        ctx.quadraticCurveTo(-20, 4, -5, 8);
        ctx.fill();

        ctx.fillStyle = '#f0c090';
        ctx.beginPath();
        ctx.arc(0, -20, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cc2222';
        ctx.fillRect(-9, -32, 18, 14);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-7, -30, 14, 4);

        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -25, 3, 3);
        ctx.fillRect(1, -25, 3, 3);

        ctx.fillStyle = '#fff';
        ctx.fillRect(-3, -25, 1.5, 1.5);
        ctx.fillRect(2, -25, 1.5, 1.5);

        ctx.fillStyle = '#c68b59';
        ctx.beginPath();
        ctx.arc(-6, -17, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -17, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.fillRect(-11, 20, 22, 12);

        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-9, 32, 7, 10);
        ctx.fillRect(2, 32, 7, 10);

        ctx.fillStyle = '#4a3020';
        ctx.fillRect(-10, 40, 8, 4);
        ctx.fillRect(2, 40, 8, 4);

        ctx.fillStyle = '#ccc';
        ctx.fillRect(10, -2, 12, 3);
        ctx.fillStyle = '#999';
        ctx.fillRect(11, 0, 3, 8);

        ctx.fillStyle = 'rgba(255,200,50,0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        this.drawIndicator(ctx, x, y);
    }

    drawIndicator(ctx, x, y) {
        const centerX = x + this.width / 2;

        if (this.state === 'ALERTED') {
            ctx.save();
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', centerX, y - 18);
            ctx.restore();
        } else if (this.state === 'SUSPICIOUS') {
            ctx.save();
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', centerX, y - 15);

            ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
            const barW = 30;
            const barH = 4;
            ctx.fillRect(centerX - barW / 2, y - 12, barW, barH);
            ctx.fillStyle = '#ffcc00';
            const fill = Math.min(this.suspicionLevel / this.alertThreshold, 1);
            ctx.fillRect(centerX - barW / 2, y - 12, barW * fill, barH);

            ctx.restore();
        } else if (this.state === 'SEARCHING') {
            ctx.save();
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            const dots = '.'.repeat(Math.floor(Date.now() / 300) % 4);
            ctx.fillText('...' + dots, centerX, y - 15);
            ctx.restore();
        } else if (this.state === 'RETURNING') {
            ctx.save();
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('z z z', centerX, y - 12);
            ctx.restore();
        }
    }
}
