export class ZaydMovement {
    constructor() {
        this.state = 'IDLE';
        this.wallRunTimer = 0;
        this.wallRunMaxTime = 45;
        this.rollTimer = 0;
        this.rollDuration = 25;
        this.grappleTarget = null;
        this.grappleSpeed = 0.15;
        this.lastWallSide = 0;
        this.canWallRun = true;
        this.wallRunCooldown = 0;
        this.rollInvincible = false;

        this.coyoteTimer = 0;
        this.coyoteMaxTime = 7;
        this.jumpBufferTimer = 0;
        this.jumpBufferMaxTime = 8;
        this.jumpHeld = false;
        this.jumpReleased = true;
        this.variableJumpCut = 0.4;

        this.airDashTimer = 0;
        this.airDashDuration = 8;
        this.airDashSpeed = 14;
        this.airDashCooldown = 0;
        this.airDashMaxCooldown = 45;
        this.canAirDash = true;

        this.ledgeGrabbing = false;
        this.ledgeX = 0;
        this.ledgeY = 0;
        this.ledgeTimer = 0;
        this.ledgeMaxTime = 60;
        this.canLedgeGrab = true;
        this.ledgeCooldown = 0;

        this.slideTimer = 0;
        this.slideDuration = 20;

        this.crouchHeight = 0.6;

        this.stealthAlpha = 1.0;
        this.isCrouching = false;
        this.isInShadow = false;

        this.flowCombo = 0;
        this.flowTimer = 0;
        this.flowDecayTime = 90;
        this.flowScore = 0;

        this.lastGroundTime = 0;
        this.totalAirTime = 0;
    }

    update(player, inputState, platforms, shadowZones) {
        if (!player.alive) return;

        this.updateCooldowns();
        this.updateFlow();

        if (shadowZones) {
            this.isInShadow = this.checkShadow(player, shadowZones);
        }

        if (this.ledgeGrabbing) {
            this.handleLedgeGrab(player, inputState);
            return;
        }

        switch (this.state) {
            case 'IDLE':
            case 'RUN':
                this.handleGroundMovement(player, inputState, platforms);
                break;
            case 'JUMP':
            case 'FALL':
                this.handleAirMovement(player, inputState, platforms);
                break;
            case 'WALL_RUN':
                this.handleWallRun(player, inputState);
                break;
            case 'ROLL':
                this.handleRoll(player);
                break;
            case 'SLIDE':
                this.handleSlide(player, inputState);
                break;
            case 'AIR_DASH':
                this.handleAirDash(player);
                break;
            case 'GRAPPLING':
                this.handleGrapple(player);
                break;
        }

        this.updateCoyoteTime(player);
        this.updateJumpBuffer(player, inputState);
    }

    updateCooldowns() {
        if (this.wallRunCooldown > 0) this.wallRunCooldown--;
        if (this.airDashCooldown > 0) this.airDashCooldown--;
        if (this.ledgeCooldown > 0) this.ledgeCooldown--;
    }

    updateCoyoteTime(player) {
        if (player.isGrounded) {
            this.coyoteTimer = this.coyoteMaxTime;
            this.lastGroundTime = 0;
            this.canAirDash = true;
            this.canLedgeGrab = true;
        } else {
            if (this.coyoteTimer > 0) this.coyoteTimer--;
        }
    }

    updateJumpBuffer(player, inputState) {
        const jumpPressed = inputState['Space'] || inputState['ArrowUp'] || inputState['KeyZ'];
        if (jumpPressed && !this.jumpHeld) {
            this.jumpBufferTimer = this.jumpBufferMaxTime;
        }
        this.jumpHeld = jumpPressed;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;
    }

    canConsumeJumpBuffer() {
        return this.jumpBufferTimer > 0;
    }

    consumeJumpBuffer() {
        this.jumpBufferTimer = 0;
    }

    handleGroundMovement(player, inputState, platforms) {
        let moving = false;
        const accel = 0.85;
        const decel = 0.75;

        if (inputState['ArrowRight'] || inputState['KeyD']) {
            player.vx += (player.speed - player.vx) * accel;
            player.facingRight = true;
            moving = true;
        } else if (inputState['ArrowLeft'] || inputState['KeyQ']) {
            player.vx += (-player.speed - player.vx) * accel;
            player.facingRight = false;
            moving = true;
        }

        if (!moving) {
            player.vx *= decel;
            if (Math.abs(player.vx) < 0.3) {
                player.vx = 0;
                this.state = 'IDLE';
            } else {
                this.state = Math.abs(player.vx) > 1 ? 'RUN' : 'IDLE';
            }
        } else {
            this.state = 'RUN';
        }

        if (inputState['KeyS'] || inputState['ArrowDown']) {
            this.isCrouching = true;
            player.vx *= 0.6;
        } else {
            this.isCrouching = false;
        }

        if (this.canConsumeJumpBuffer() && player.isGrounded && player.stamina > 10) {
            player.vy = player.jumpForce;
            player.vx *= 1.15;
            player.isGrounded = false;
            player.consumeStamina(10);
            this.state = 'JUMP';
            this.consumeJumpBuffer();
            this.jumpReleased = false;
            player.setExpression('determined', 20);
            this.addFlow('jump');
        }

        if (inputState['Shift'] && player.stamina > 20 && Math.abs(player.vx) > 3) {
            if (player.isGrounded) {
                this.startRoll(player);
            }
        }

        if (inputState['KeyS'] && player.isGrounded && Math.abs(player.vx) > 4 && player.stamina > 15) {
            this.startSlide(player);
        }

        if (inputState['KeyG'] && player.special >= 30 && player.abilityCooldown <= 0) {
            this.startGrapple(player);
        }
    }

    handleAirMovement(player, inputState, platforms) {
        player.vy += 0.55;
        if (player.vy > 12) player.vy = 12;
        this.totalAirTime++;

        if (player.vy > 0 && this.state === 'JUMP') this.state = 'FALL';

        const jumpPressed = inputState['Space'] || inputState['ArrowUp'] || inputState['KeyZ'];
        if (!jumpPressed && !this.jumpReleased && player.vy < 0) {
            player.vy *= this.variableJumpCut;
            this.jumpReleased = true;
        }
        if (jumpPressed) this.jumpReleased = false;

        if (this.canConsumeJumpBuffer() && this.coyoteTimer > 0 && player.stamina > 10) {
            player.vy = player.jumpForce;
            player.vx *= 1.1;
            player.consumeStamina(10);
            this.coyoteTimer = 0;
            this.consumeJumpBuffer();
            this.jumpReleased = false;
            this.state = 'JUMP';
            player.setExpression('determined', 15);
            this.addFlow('jump');
        }

        if (inputState['Shift'] && this.canAirDash && this.airDashCooldown <= 0 && player.stamina > 20) {
            this.startAirDash(player);
            return;
        }

        if (inputState['KeyW'] && this.canWallRun && this.wallRunCooldown <= 0) {
            const wallSide = this.detectWall(player, platforms);
            if (wallSide !== 0) {
                this.startWallRun(player, wallSide);
                return;
            }
        }

        if (inputState['KeyG'] && player.special >= 30 && player.abilityCooldown <= 0) {
            this.startGrapple(player);
        }

        if (!this.ledgeGrabbing && this.canLedgeGrab && this.ledgeCooldown <= 0 && player.vy > 0) {
            const ledge = this.detectLedge(player, platforms);
            if (ledge) {
                this.grabLedge(player, ledge);
                return;
            }
        }

        if (player.isGrounded) {
            this.totalAirTime = 0;
            if (this.totalAirTime > 5) this.addFlow('landing');
        }
    }

    detectWall(player, platforms) {
        for (const p of platforms) {
            if (!p.wallHeight) continue;
            const wallTop = p.y - (p.wallHeight || 0);
            if (player.y + player.height > wallTop && player.y < p.y + (p.h || 0)) {
                if (p.wallSide === 'left' || p.wallSide === undefined) {
                    if (Math.abs(player.x + player.width - p.x) < 15) return 1;
                }
                if (p.wallSide === 'right') {
                    if (Math.abs(player.x - (p.x + p.w)) < 15) return -1;
                }
            }
        }

        for (const p of platforms) {
            if (player.y + player.height > p.y && player.y < p.y + 30) {
                if (Math.abs(player.x + player.width - p.x) < 12) return 1;
                if (Math.abs(player.x - (p.x + p.w)) < 12) return -1;
            }
        }
        return 0;
    }

    detectLedge(player, platforms) {
        for (const p of platforms) {
            if (p.w < 40) continue;
            const pTop = p.y;
            const pLeft = p.x;
            const pRight = p.x + p.w;

            const feetY = player.y + player.height;
            const headY = player.y;

            if (feetY > pTop - 10 && feetY < pTop + 20) {
                if (Math.abs(player.x + player.width - pLeft) < 20 && player.vx < 0) {
                    return { x: pLeft, y: pTop, side: 'right' };
                }
                if (Math.abs(player.x - pRight) < 20 && player.vx > 0) {
                    return { x: pRight, y: pTop, side: 'left' };
                }
            }
        }
        return null;
    }

    grabLedge(player, ledge) {
        this.ledgeGrabbing = true;
        this.ledgeX = ledge.x;
        this.ledgeY = ledge.y;
        this.ledgeSide = ledge.side;
        this.ledgeTimer = this.ledgeMaxTime;
        this.canLedgeGrab = false;
        this.ledgeCooldown = 20;
        player.vx = 0;
        player.vy = 0;
        player.isGrounded = false;
        this.state = 'LEDGE_GRAB';
        player.setExpression('determined', 15);
    }

    handleLedgeGrab(player, inputState) {
        this.ledgeTimer--;
        player.vy = -0.5;

        if (this.ledgeTimer <= 0) {
            this.releaseLedge(player);
            return;
        }

        const jumpPressed = inputState['Space'] || inputState['ArrowUp'] || inputState['KeyZ'];
        if (jumpPressed) {
            player.vy = player.jumpForce * 0.85;
            const dir = this.ledgeSide === 'right' ? -1 : 1;
            player.vx = dir * player.speed * 0.8;
            player.x = this.ledgeX + (this.ledgeSide === 'right' ? -player.width : 0);
            player.y = this.ledgeY - player.height;
            this.releaseLedge(player);
            this.addFlow('ledge_jump');
            player.setExpression('smile', 15);
            return;
        }

        if (inputState['ArrowDown'] || inputState['KeyS']) {
            this.releaseLedge(player);
            return;
        }
    }

    releaseLedge(player) {
        this.ledgeGrabbing = false;
        this.state = 'FALL';
    }

    startWallRun(player, side) {
        this.state = 'WALL_RUN';
        this.wallRunTimer = this.wallRunMaxTime;
        this.lastWallSide = side;
        this.canWallRun = false;
        player.vy = -3;
        player.vx = side * 4;
        player.consumeStamina(15);
        player.setExpression('determined', 30);
        this.addFlow('wall_run');
    }

    handleWallRun(player, inputState) {
        this.wallRunTimer--;
        player.vy = -1.5;
        player.vx = this.lastWallSide * 4;

        if (inputState['ArrowLeft'] || inputState['KeyQ']) {
            player.vx = -player.speed * 0.5;
            player.facingRight = false;
            if (player.vx * this.lastWallSide < 0) {
                this.state = 'JUMP';
                player.vy = -6;
                player.vx = this.lastWallSide * 7;
                this.wallRunCooldown = 30;
                this.addFlow('wall_kick');
                player.setExpression('smile', 15);
                return;
            }
        }
        if (inputState['ArrowRight'] || inputState['KeyD']) {
            player.vx = player.speed * 0.5;
            player.facingRight = true;
            if (player.vx * this.lastWallSide < 0) {
                this.state = 'JUMP';
                player.vy = -6;
                player.vx = this.lastWallSide * 7;
                this.wallRunCooldown = 30;
                this.addFlow('wall_kick');
                player.setExpression('smile', 15);
                return;
            }
        }

        const jumpPressed = inputState['Space'] || inputState['ArrowUp'] || inputState['KeyZ'];
        if (!inputState['KeyW'] || this.wallRunTimer <= 0 || player.stamina <= 0 || jumpPressed) {
            this.state = 'JUMP';
            player.vy = -7;
            player.vx = this.lastWallSide * 7;
            this.wallRunCooldown = 30;
            this.addFlow('wall_kick');
            player.setExpression('smile', 15);
        }

        player.consumeStamina(0.5);
    }

    startRoll(player) {
        this.state = 'ROLL';
        this.rollTimer = this.rollDuration;
        this.rollInvincible = true;
        player.consumeStamina(15);
        player.setExpression('smile', 10);
        this.addFlow('roll');
    }

    handleRoll(player) {
        this.rollTimer--;
        player.vx *= 0.92;

        if (this.rollTimer <= 0) {
            this.state = player.isGrounded ? 'IDLE' : 'FALL';
            this.rollInvincible = false;
        }
    }

    startSlide(player) {
        this.state = 'SLIDE';
        this.slideTimer = this.slideDuration;
        this.rollInvincible = true;
        player.consumeStamina(12);
        this.addFlow('slide');
    }

    handleSlide(player, inputState) {
        this.slideTimer--;
        player.vx *= 0.96;

        if (this.slideTimer <= 0) {
            this.state = player.isGrounded ? 'IDLE' : 'FALL';
            this.rollInvincible = false;
        }

        if (inputState && (inputState['Space'] || inputState['ArrowUp'] || inputState['KeyZ'])) {
            player.vy = player.jumpForce;
            this.state = 'JUMP';
            this.rollInvincible = false;
            this.addFlow('slide_jump');
        }
    }

    startAirDash(player) {
        this.state = 'AIR_DASH';
        this.airDashTimer = this.airDashDuration;
        this.canAirDash = false;
        this.airDashCooldown = this.airDashMaxCooldown;
        this.rollInvincible = true;
        player.vy = 0;
        player.vx = player.facingRight ? this.airDashSpeed : -this.airDashSpeed;
        player.consumeStamina(20);
        player.setExpression('determined', 12);
        this.addFlow('air_dash');
    }

    handleAirDash(player) {
        this.airDashTimer--;
        player.vy = 0;

        if (this.airDashTimer <= 0) {
            this.state = 'FALL';
            this.rollInvincible = false;
            player.vx *= 0.6;
        }
    }

    startGrapple(player) {
        this.state = 'GRAPPLING';
        this.grappleTarget = {
            x: player.x + (player.facingRight ? 180 : -180),
            y: player.y - 200
        };
        player.special -= 30;
        player.abilityCooldown = 30;
        player.isUsingAbility = true;
        player.setExpression('determined', 25);
        this.addFlow('grapple');
    }

    handleGrapple(player) {
        if (!this.grappleTarget) {
            this.state = 'JUMP';
            return;
        }

        const dx = this.grappleTarget.x - player.x;
        const dy = this.grappleTarget.y - player.y;

        player.vx = dx * this.grappleSpeed;
        player.vy = dy * this.grappleSpeed;

        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
            this.state = 'JUMP';
            player.vy = -5;
            player.isUsingAbility = false;
            player.setExpression('smile', 20);
        }
    }

    checkShadow(player, shadowZones) {
        for (const zone of shadowZones) {
            if (
                player.x + player.width > zone.x &&
                player.x < zone.x + zone.w &&
                player.y + player.height > zone.y &&
                player.y < zone.y + zone.h
            ) {
                return true;
            }
        }
        return false;
    }

    addFlow(action) {
        this.flowCombo++;
        this.flowTimer = this.flowDecayTime;
        const scoreMap = {
            'jump': 50,
            'roll': 75,
            'slide': 75,
            'slide_jump': 150,
            'wall_run': 100,
            'wall_kick': 125,
            'ledge_jump': 125,
            'grapple': 150,
            'air_dash': 200,
            'landing': 25
        };
        const baseScore = scoreMap[action] || 50;
        const comboMultiplier = Math.min(this.flowCombo, 10);
        this.flowScore += baseScore * comboMultiplier;
    }

    updateFlow() {
        if (this.flowTimer > 0) {
            this.flowTimer--;
            if (this.flowTimer <= 0) {
                this.flowCombo = 0;
            }
        }
    }

    canDamage() {
        return (this.state === 'ROLL' || this.state === 'SLIDE') && this.rollInvincible;
    }

    getState() {
        return this.state;
    }

    isInvincible() {
        return this.rollInvincible;
    }

    isCrouching() {
        return this.isCrouching;
    }

    getStealthMultiplier() {
        let mult = 1.0;
        if (this.isCrouching) mult *= 0.5;
        if (this.isInShadow) mult *= 0.3;
        if (this.state === 'ROLL' || this.state === 'SLIDE') mult *= 0.4;
        return mult;
    }

    getFlowCombo() {
        return this.flowCombo;
    }

    getFlowScore() {
        return this.flowScore;
    }
}
