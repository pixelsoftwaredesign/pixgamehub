export class GrappleSystem {
    constructor() {
        this.active = false;
        this.target = null;
        this.ropeLength = 0;
        this.maxDistance = 300;
        this.cooldown = 0;
        this.cooldownMax = 30;
    }

    tryActivate(zayd, inputState, anchorPoints) {
        if (this.cooldown > 0) this.cooldown--;

        const grabKey = inputState['KeyG'] || inputState['KeyE'];
        const releaseKey = inputState['Space'] || inputState['KeyS'];

        if (!this.active && grabKey && this.cooldown <= 0) {
            const cx = zayd.x + zayd.width / 2;
            const cy = zayd.y + zayd.height / 2;
            let closest = null;
            let minDist = this.maxDistance;

            for (const pt of anchorPoints) {
                const dx = pt.x - cx;
                const dy = pt.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist && dy < 0) {
                    minDist = dist;
                    closest = pt;
                }
            }

            if (closest) {
                this.target = closest;
                this.active = true;
                const dx = this.target.x - cx;
                const dy = this.target.y - cy;
                this.ropeLength = Math.sqrt(dx * dx + dy * dy);
                this.anchorAngle = Math.atan2(dy, dx);
                this.swingVelocity = 0;
                if (zayd.movement) zayd.movement.state = 'GRAPPLING';
                return true;
            }
        } else if (this.active && releaseKey) {
            this.release(zayd);
            return true;
        }
        return false;
    }

    update(zayd) {
        if (!this.active || !this.target) return;

        const cx = zayd.x + zayd.width / 2;
        const cy = zayd.y + zayd.height / 2;

        const dx = this.target.x - cx;
        const dy = this.target.y - cy;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        const gravity = 0.35;
        const damping = 0.985;

        const angle = Math.atan2(dy, dx);

        if (currentDist > this.ropeLength) {
            const stretch = currentDist - this.ropeLength;
            const forceX = Math.cos(angle) * stretch * 0.06;
            const forceY = Math.sin(angle) * stretch * 0.06;
            zayd.vx += forceX;
            zayd.vy += forceY;
        }

        zayd.vy += gravity;
        zayd.vx *= damping;
        zayd.vy *= damping;

        if (currentDist > this.ropeLength) {
            const correction = (currentDist - this.ropeLength) * 0.5;
            zayd.x += Math.cos(angle) * correction * 0.1;
            zayd.y += Math.sin(angle) * correction * 0.1;
        }
    }

    release(zayd) {
        this.active = false;
        this.cooldown = this.cooldownMax;

        if (this.target) {
            const cx = zayd.x + zayd.width / 2;
            const cy = zayd.y + zayd.height / 2;
            const dx = this.target.x - cx;
            const dy = this.target.y - cy;
            const angle = Math.atan2(dy, dx);

            const launchSpeed = Math.sqrt(zayd.vx * zayd.vx + zayd.vy * zayd.vy);
            const tangentAngle = angle - Math.PI / 2;

            const boost = Math.max(launchSpeed * 1.2, 6);
            zayd.vx = Math.cos(tangentAngle) * boost;
            zayd.vy = Math.sin(tangentAngle) * boost - 3;
        } else {
            zayd.vy -= 4;
        }

        this.target = null;
        if (zayd.movement) zayd.movement.state = 'JUMP';
    }

    render(ctx, zayd, cameraX) {
        if (!this.active || !this.target) return;

        const cx = Math.round(zayd.x + zayd.width / 2 - cameraX);
        const cy = Math.round(zayd.y + zayd.height / 3);
        const tx = Math.round(this.target.x - cameraX);
        const ty = Math.round(this.target.y);

        ctx.save();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
        ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tx, ty, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawAnchorPoints(ctx, anchorPoints, cameraX) {
        ctx.save();
        for (const pt of anchorPoints) {
            const sx = Math.round(pt.x - cameraX);
            if (sx < -50 || sx > ctx.canvas.width + 50) continue;

            const pulse = 0.4 + 0.2 * Math.sin(Date.now() * 0.003 + pt.x * 0.01);
            ctx.globalAlpha = pulse;

            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, pt.y, 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 209, 102, 0.15)';
            ctx.beginPath();
            ctx.arc(sx, pt.y, 12, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
