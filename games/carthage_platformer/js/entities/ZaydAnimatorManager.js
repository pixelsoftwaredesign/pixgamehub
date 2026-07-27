export class ZaydAnimatorManager {
    constructor(assetLoader) {
        this.loader = assetLoader;

        this.animations = {
            idle: { frames: 1, width: 80, height: 110, speed: 10, key: 'idle', keyLeft: 'idleLeft' },
            run: { frames: 6, width: 80, height: 110, speed: 6, key: 'run', keyLeft: 'runLeft' },
            jump: { frames: 4, width: 85, height: 115, speed: 8, key: 'jump', keyLeft: 'jumpLeft' },
            fall: { frames: 3, width: 80, height: 115, speed: 10, key: 'fall', keyLeft: 'fallLeft' },
            wallRun: { frames: 4, width: 80, height: 115, speed: 7, key: 'wallRun', keyLeft: 'wallRunLeft' },
            roll: { frames: 5, width: 80, height: 80, speed: 5, key: 'roll', keyLeft: 'rollLeft' },
            grapple: { frames: 5, width: 90, height: 120, speed: 5, key: 'grapple', keyLeft: 'grappleLeft' },
            slide: { frames: 4, width: 90, height: 70, speed: 6, key: 'slide', keyLeft: 'slideLeft' },
            airDash: { frames: 4, width: 100, height: 100, speed: 4, key: 'airDash', keyLeft: 'airDashLeft' },
            ledgeGrab: { frames: 3, width: 70, height: 110, speed: 8, key: 'ledgeGrab', keyLeft: 'ledgeGrabLeft' },
        };

        this.currentAnim = 'idle';
        this.currentFrame = 0;
        this.animTimer = 0;
        this.lastState = '';
        this.facingRight = true;
    }

    mapState(movementState) {
        switch (movementState) {
            case 'IDLE': return 'idle';
            case 'RUN': return 'run';
            case 'JUMP': return 'jump';
            case 'FALL': return 'fall';
            case 'WALL_RUN': return 'wallRun';
            case 'ROLL': return 'roll';
            case 'GRAPPLING': return 'grapple';
            case 'SLIDE': return 'slide';
            case 'AIR_DASH': return 'airDash';
            case 'LEDGE_GRAB': return 'ledgeGrab';
            default: return 'idle';
        }
    }

    setAnimation(stateName) {
        if (this.currentAnim !== stateName) {
            this.currentAnim = stateName;
            this.currentFrame = 0;
            this.animTimer = 0;
        }
    }

    getFrames() {
        const anim = this.animations[this.currentAnim];
        if (!anim) return null;

        const dir = this.facingRight ? anim.key : anim.keyLeft;
        const sprites = this.loader.get(dir);
        if (!sprites) return null;

        if (Array.isArray(sprites)) {
            return { frames: sprites, width: anim.width, height: anim.height };
        }

        return { frames: [sprites], width: anim.width, height: anim.height };
    }

    draw(ctx, player, cameraX) {
        const stateName = this.mapState(player.movement ? player.movement.getState() : 'IDLE');
        this.setAnimation(stateName);
        this.facingRight = player.facingRight;

        const anim = this.animations[this.currentAnim];
        if (!anim) return;

        const screenX = Math.round(player.x - cameraX);
        const screenY = Math.round(player.y);
        if (screenX < -anim.width - 20 || screenX > 1320) return;

        const spriteData = this.getFrames();
        if (!spriteData || !spriteData.frames || spriteData.frames.length === 0) return;

        ctx.save();

        const drawX = Math.round(screenX + player.width / 2 - anim.width / 2);
        const drawY = Math.round(screenY + player.height - anim.height);

        if (player.damageFlash > 0 && player.damageFlash % 4 < 2) {
            ctx.globalAlpha = 0.4;
        }

        const stealthMult = player.movement ? player.movement.getStealthMultiplier() : 1;
        if (stealthMult < 0.8) {
            ctx.globalAlpha = Math.min(ctx.globalAlpha, stealthMult + 0.2);
        }

        this.animTimer++;
        if (this.animTimer >= anim.speed) {
            this.currentFrame = (this.currentFrame + 1) % spriteData.frames.length;
            this.animTimer = 0;
        }

        const frame = spriteData.frames[this.currentFrame];
        if (frame) {
            ctx.drawImage(frame, drawX, drawY, anim.width, anim.height);
        }

        ctx.restore();
    }
}
