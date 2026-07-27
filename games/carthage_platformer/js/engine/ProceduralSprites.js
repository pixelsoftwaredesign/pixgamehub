export class ProceduralSprites {
    constructor() {
        this.cache = {};
        this.palette = {
            skin: '#c68b59',
            skinLight: '#d8a870',
            skinShadow: '#9e6b3a',
            hair: '#4a2810',
            hairHighlight: '#6b3a18',
            tunic: '#4a154b',
            tunicLight: '#6a2570',
            tunicShadow: '#2e0a30',
            cape: '#3a0ca3',
            capeLight: '#5a2cd3',
            capeShadow: '#1a0060',
            gold: '#d4af37',
            goldLight: '#f0d060',
            goldShadow: '#a08020',
            white: '#e8e0d0',
            pants: '#d8d0c0',
            boot: '#5a3520',
            bootTrim: '#d4af37',
            eye: '#1a1a2e',
            eyeWhite: '#f8f4f0',
            mouth: '#c97a6a',
            outline: '#2a1a0a',
            parchment: '#c9a84c',
            parchmentDark: '#8b6914',
            ink: '#3a2010',
        };
    }

    generateAll() {
        this.cache.idle = this.generateIdle();
        this.cache.idleLeft = this.generateIdle(true);
        this.cache.run = this.generateRunFrames();
        this.cache.runLeft = this.generateRunFrames(true);
        this.cache.jump = this.generateJumpFrames();
        this.cache.jumpLeft = this.generateJumpFrames(true);
        this.cache.fall = this.generateFallFrames();
        this.cache.fallLeft = this.generateFallFrames(true);
        this.cache.wallRun = this.generateWallRunFrames();
        this.cache.wallRunLeft = this.generateWallRunFrames(true);
        this.cache.roll = this.generateRollFrames();
        this.cache.rollLeft = this.generateRollFrames(true);
        this.cache.grapple = this.generateGrappleFrames();
        this.cache.grappleLeft = this.generateGrappleFrames(true);
        this.cache.slide = this.generateSlideFrames();
        this.cache.slideLeft = this.generateSlideFrames(true);
        this.cache.airDash = this.generateAirDashFrames();
        this.cache.airDashLeft = this.generateAirDashFrames(true);
        this.cache.ledgeGrab = this.generateLedgeGrabFrames();
        this.cache.ledgeGrabLeft = this.generateLedgeGrabFrames(true);
        this.cache.guard = this.generateGuardSprite();
        this.cache.guardLeft = this.generateGuardSprite(true);

        return this.cache;
    }

    createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    inkStroke(ctx, fn, lineWidth = 2) {
        ctx.save();
        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        fn(ctx);
        ctx.stroke();
        ctx.restore();
    }

    parchmentFill(ctx, fn, color) {
        ctx.save();
        ctx.fillStyle = color;
        fn(ctx);
        ctx.fill();
        ctx.restore();
    }

    drawParchmentNoise(ctx, w, h, intensity = 0.03) {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * intensity;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    drawTunicPattern(ctx, x, y, w, h) {
        ctx.fillStyle = this.palette.gold;
        ctx.fillRect(x + 2, y + h * 0.3, w - 4, 2);
        ctx.fillRect(x + 2, y + h * 0.6, w - 4, 2);
        ctx.fillStyle = this.palette.goldLight;
        ctx.fillRect(x + w * 0.4, y + 4, w * 0.2, h - 8);
    }

    drawBootDetail(ctx, x, y, w, h) {
        ctx.fillStyle = this.palette.boot;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = this.palette.bootTrim;
        ctx.fillRect(x - 1, y, w + 2, 3);
        ctx.fillRect(x, y + h - 2, w, 2);
    }

    generateIdle(flipped = false) {
        const c = this.createCanvas(80, 110);
        const ctx = c.getContext('2d');

        this.drawCharacterBase(ctx, {
            pose: 'idle',
            capeAngle: 0,
            capeWave: 0,
            armAngle: 0,
            legSpread: 0,
            eyeState: 'open',
            breathOffset: 1,
        });

        this.drawParchmentNoise(ctx, 80, 110, 0.02);

        if (flipped) {
            return this.flipCanvas(c);
        }
        return c;
    }

    generateRunFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 6; i++) {
            const c = this.createCanvas(80, 110);
            const ctx = c.getContext('2d');
            const t = i / 6 * Math.PI * 2;

            this.drawCharacterBase(ctx, {
                pose: 'run',
                capeAngle: t * 0.5,
                capeWave: Math.sin(t) * 8,
                armAngle: Math.sin(t) * 0.6,
                legSpread: Math.sin(t) * 12,
                eyeState: 'open',
                breathOffset: Math.sin(t * 2) * 1,
                bodyTilt: Math.sin(t) * 2,
            });

            this.drawParchmentNoise(ctx, 80, 110, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateJumpFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 4; i++) {
            const c = this.createCanvas(85, 115);
            const ctx = c.getContext('2d');

            this.drawCharacterBase(ctx, {
                pose: 'jump',
                capeAngle: -0.3 + i * 0.1,
                capeWave: 10 + i * 3,
                armAngle: -0.8 + i * 0.2,
                legSpread: i * 3,
                eyeState: 'determined',
                breathOffset: 0,
                bodyTilt: -3,
            });

            this.drawParchmentNoise(ctx, 85, 115, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateFallFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 3; i++) {
            const c = this.createCanvas(80, 115);
            const ctx = c.getContext('2d');

            this.drawCharacterBase(ctx, {
                pose: 'fall',
                capeAngle: 0.5 + i * 0.2,
                capeWave: 15 + i * 5,
                armAngle: 0.3 + i * 0.15,
                legSpread: 5 + i * 2,
                eyeState: 'open',
                breathOffset: 0,
                bodyTilt: 2,
            });

            this.drawParchmentNoise(ctx, 80, 115, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateWallRunFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 4; i++) {
            const c = this.createCanvas(80, 115);
            const ctx = c.getContext('2d');
            const t = i / 4 * Math.PI * 2;

            ctx.save();
            ctx.translate(40, 55);
            ctx.rotate(Math.sin(t) * 0.15);
            ctx.translate(-40, -55);

            this.drawCharacterBase(ctx, {
                pose: 'wallRun',
                capeAngle: 0.8,
                capeWave: Math.sin(t) * 6 + 8,
                armAngle: -0.5,
                legSpread: Math.sin(t) * 8,
                eyeState: 'determined',
                breathOffset: 0,
                bodyTilt: 5,
            });

            ctx.restore();
            this.drawParchmentNoise(ctx, 80, 115, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateRollFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 5; i++) {
            const c = this.createCanvas(80, 80);
            const ctx = c.getContext('2d');
            const angle = (i / 5) * Math.PI * 2;

            ctx.save();
            ctx.translate(40, 40);
            ctx.rotate(angle);

            ctx.fillStyle = this.palette.cape;
            ctx.beginPath();
            ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.palette.outline;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = this.palette.gold;
            ctx.beginPath();
            ctx.arc(0, -18, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.palette.outline;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = this.palette.skin;
            ctx.beginPath();
            ctx.arc(0, -10, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            ctx.strokeStyle = this.palette.gold;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(40, 40, 32, 0, Math.PI * 0.5);
            ctx.stroke();
            ctx.setLineDash([]);

            this.drawParchmentNoise(ctx, 80, 80, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateGrappleFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 5; i++) {
            const c = this.createCanvas(90, 120);
            const ctx = c.getContext('2d');

            ctx.save();
            ctx.translate(45, 60);
            ctx.rotate(-0.2 + i * 0.05);
            ctx.translate(-45, -60);

            this.drawCharacterBase(ctx, {
                pose: 'grapple',
                capeAngle: -0.5,
                capeWave: 20 - i * 3,
                armAngle: -1.2 + i * 0.1,
                legSpread: 3,
                eyeState: 'determined',
                breathOffset: 0,
                bodyTilt: -5,
            });

            ctx.restore();

            const ropeEnd = { x: 70 + i * 3, y: 5 + i * 2 };
            ctx.strokeStyle = this.palette.gold;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(55, 30);
            ctx.lineTo(ropeEnd.x, ropeEnd.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = this.palette.gold;
            ctx.beginPath();
            ctx.moveTo(ropeEnd.x, ropeEnd.y - 5);
            ctx.lineTo(ropeEnd.x + 4, ropeEnd.y);
            ctx.lineTo(ropeEnd.x, ropeEnd.y + 5);
            ctx.lineTo(ropeEnd.x - 4, ropeEnd.y);
            ctx.closePath();
            ctx.fill();

            this.drawParchmentNoise(ctx, 90, 120, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateSlideFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 4; i++) {
            const c = this.createCanvas(90, 70);
            const ctx = c.getContext('2d');

            ctx.save();
            ctx.translate(45, 35);
            ctx.rotate(0.3);
            ctx.translate(-45, -35);

            ctx.fillStyle = this.palette.cape;
            ctx.beginPath();
            ctx.ellipse(35, 35, 30, 15, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.palette.outline;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = this.palette.skin;
            ctx.beginPath();
            ctx.arc(25, 22, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.palette.outline;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = this.palette.gold;
            ctx.fillRect(22, 14, 6, 6);

            ctx.restore();

            ctx.strokeStyle = 'rgba(212,175,55,0.3)';
            ctx.lineWidth = 1;
            for (let s = 0; s < 3; s++) {
                const sx = 60 + s * 10 + i * 5;
                ctx.beginPath();
                ctx.moveTo(sx, 40 + s * 5);
                ctx.lineTo(sx + 12, 42 + s * 5);
                ctx.stroke();
            }

            this.drawParchmentNoise(ctx, 90, 70, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateAirDashFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 4; i++) {
            const c = this.createCanvas(100, 100);
            const ctx = c.getContext('2d');

            ctx.save();
            ctx.translate(50, 50);
            ctx.scale(1 + Math.sin(i * 0.8) * 0.08, 1 - Math.sin(i * 0.8) * 0.05);
            ctx.translate(-50, -50);

            this.drawCharacterBase(ctx, {
                pose: 'airDash',
                capeAngle: -1.0,
                capeWave: 25,
                armAngle: -0.3,
                legSpread: 2,
                eyeState: 'determined',
                breathOffset: 0,
                bodyTilt: 8,
            });

            ctx.restore();

            ctx.globalAlpha = 0.3 - i * 0.06;
            ctx.strokeStyle = this.palette.capeLight;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(50, 50, 35 + i * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;

            for (let t = 0; t < 5; t++) {
                const tx = 20 + t * 15;
                const ty = 45 + Math.sin(tx * 0.1 + i) * 8;
                ctx.strokeStyle = `rgba(212,175,55,${0.4 - t * 0.07})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx + 10, ty);
                ctx.stroke();
            }

            this.drawParchmentNoise(ctx, 100, 100, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateLedgeGrabFrames(flipped = false) {
        const frames = [];
        for (let i = 0; i < 3; i++) {
            const c = this.createCanvas(70, 110);
            const ctx = c.getContext('2d');

            ctx.save();
            ctx.translate(35, 55);
            ctx.rotate(Math.sin(i * 1.2) * 0.05);
            ctx.translate(-35, -55);

            this.drawCharacterBase(ctx, {
                pose: 'ledgeGrab',
                capeAngle: 0.3,
                capeWave: 5 + i * 2,
                armAngle: -1.5,
                legSpread: 4,
                eyeState: 'determined',
                breathOffset: 0,
                bodyTilt: 3,
            });

            ctx.restore();

            ctx.fillStyle = this.palette.parchmentDark;
            ctx.fillRect(55, 20, 15, 90);

            this.drawParchmentNoise(ctx, 70, 110, 0.02);
            frames.push(flipped ? this.flipCanvas(c) : c);
        }
        return frames;
    }

    generateGuardSprite(flipped = false) {
        const c = this.createCanvas(70, 100);
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.moveTo(25, 28);
        ctx.quadraticCurveTo(5, 38 + Math.sin(Date.now() * 0.003) * 3, 2, 50);
        ctx.quadraticCurveTo(12, 44, 25, 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f0c090';
        ctx.beginPath();
        ctx.arc(35, 22, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#cc2222';
        ctx.fillRect(28, 14, 14, 10);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(30, 16, 10, 3);
        ctx.fillStyle = '#222';
        ctx.fillRect(31, 18, 2, 2);
        ctx.fillRect(35, 18, 2, 2);

        ctx.fillStyle = '#cc2222';
        ctx.fillRect(24, 32, 22, 28);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(24, 32, 22, 28);

        ctx.fillStyle = '#888';
        ctx.fillRect(28, 34, 14, 5);

        ctx.fillStyle = '#333';
        ctx.fillRect(26, 60, 18, 14);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(28, 72, 6, 8);
        ctx.fillRect(36, 72, 6, 8);

        ctx.fillStyle = '#ccc';
        ctx.fillRect(46, 36, 12, 3);
        ctx.fillRect(48, 34, 5, 8);

        this.drawParchmentNoise(ctx, 70, 100, 0.02);

        if (flipped) return this.flipCanvas(c);
        return c;
    }

    drawCharacterBase(ctx, opts) {
        const {
            pose = 'idle',
            capeAngle = 0,
            capeWave = 0,
            armAngle = 0,
            legSpread = 0,
            eyeState = 'open',
            breathOffset = 0,
            bodyTilt = 0,
        } = opts;

        const cx = 40;
        const cy = 55 + breathOffset;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(bodyTilt * Math.PI / 180);
        ctx.translate(-cx, -cy);

        this.drawCapeProc(ctx, cx - 10, cy - 20, capeAngle, capeWave);

        ctx.fillStyle = this.palette.pants;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 28, 13, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = this.palette.boot;
        ctx.fillRect(cx - 10 - legSpread, cy + 35, 8, 12);
        ctx.fillRect(cx + 2 + legSpread, cy + 35, 8, 12);
        ctx.fillStyle = this.palette.bootTrim;
        ctx.fillRect(cx - 11 - legSpread, cy + 35, 10, 3);
        ctx.fillRect(cx + 1 + legSpread, cy + 35, 10, 3);

        ctx.fillStyle = this.palette.tunic;
        ctx.fillRect(cx - 13, cy - 12, 26, 38);
        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 13, cy - 12, 26, 38);

        ctx.strokeStyle = this.palette.gold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy - 3);
        ctx.lineTo(cx + 11, cy - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy + 8);
        ctx.lineTo(cx + 11, cy + 8);
        ctx.stroke();

        ctx.fillStyle = this.palette.gold;
        ctx.beginPath();
        ctx.arc(cx - 6, cy + 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.palette.gold;
        ctx.fillRect(cx - 11, cy + 10, 22, 3);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy + 11.5, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.palette.tunic;
        const leftArmAngle = armAngle;
        const rightArmAngle = -armAngle;
        ctx.save();
        ctx.translate(cx - 15, cy - 6);
        ctx.rotate(leftArmAngle);
        ctx.fillRect(-3, 0, 7, 22);
        ctx.fillStyle = this.palette.skin;
        ctx.beginPath();
        ctx.arc(0.5, 24, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(cx + 15, cy - 6);
        ctx.rotate(rightArmAngle);
        ctx.fillStyle = this.palette.tunic;
        ctx.fillRect(-3, 0, 7, 22);
        ctx.fillStyle = this.palette.skin;
        ctx.beginPath();
        ctx.arc(-0.5, 24, 4, 0, Math.PI * 2);
        ctx.fill();

        if (pose === 'grapple') {
            ctx.fillStyle = this.palette.gold;
            ctx.fillRect(-1, 24, 2, 8);
            ctx.beginPath();
            ctx.moveTo(0, 32);
            ctx.lineTo(3, 28);
            ctx.lineTo(-3, 28);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = this.palette.skin;
        ctx.beginPath();
        ctx.arc(cx, cy - 22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = this.palette.hair;
        ctx.beginPath();
        ctx.arc(cx, cy - 25, 15, Math.PI + 0.3, -0.3, false);
        ctx.lineTo(cx + 15, cy - 22);
        ctx.quadraticCurveTo(cx + 15, cy - 16, cx + 10, cy - 14);
        ctx.lineTo(cx - 10, cy - 14);
        ctx.quadraticCurveTo(cx - 15, cy - 16, cx - 15, cy - 22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.palette.hairHighlight;
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 28, 5, Math.PI, 0, false);
        ctx.fill();

        ctx.fillStyle = this.palette.white;
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 23, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5, cy - 23, 4, 0, Math.PI * 2);
        ctx.fill();

        if (eyeState === 'open' || eyeState === 'idle') {
            ctx.fillStyle = this.palette.eye;
            ctx.beginPath();
            ctx.arc(cx - 5, cy - 23, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 5, cy - 23, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 24, 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 6, cy - 24, 0.8, 0, Math.PI * 2);
            ctx.fill();
        } else if (eyeState === 'determined') {
            ctx.fillStyle = this.palette.eye;
            ctx.fillRect(cx - 7, cy - 24, 4, 3);
            ctx.fillRect(cx + 3, cy - 24, 4, 3);

            ctx.strokeStyle = this.palette.hair;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 27);
            ctx.lineTo(cx - 2, cy - 26);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 2, cy - 26);
            ctx.lineTo(cx + 8, cy - 27);
            ctx.stroke();
        }

        ctx.strokeStyle = this.palette.hair;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 17);
        ctx.lineTo(cx - 2, cy - 17.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 17.5);
        ctx.lineTo(cx + 5, cy - 17);
        ctx.stroke();

        ctx.fillStyle = this.palette.mouth;
        ctx.beginPath();
        ctx.arc(cx, cy - 15, 2.5, 0.2, Math.PI - 0.2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,107,107,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx - 9, cy - 17, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 9, cy - 17, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.palette.white;
        ctx.fillRect(cx - 14, cy - 32, 28, 5);
        ctx.fillStyle = this.palette.gold;
        ctx.fillRect(cx - 3, cy - 37, 6, 6);
        ctx.fillStyle = '#03045e';
        ctx.fillRect(cx - 1.5, cy - 35.5, 3, 3);

        ctx.strokeStyle = this.palette.gold;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy - 29, 14, Math.PI + 0.3, -0.3, false);
        ctx.stroke();

        ctx.restore();
    }

    drawCapeProc(ctx, x, y, angle, wave) {
        ctx.fillStyle = this.palette.cape;
        ctx.beginPath();
        ctx.moveTo(x, y);

        const cp1x = x - 30 + wave * 0.5;
        const cp1y = y - 15 + Math.sin(angle) * 5;
        const cp2x = x - 55 + wave;
        const cp2y = y + 10 + Math.cos(angle) * 8;
        const endX = x - 80 + wave * 1.5;
        const endY = y + 30;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.quadraticCurveTo(x - 40 + wave * 0.8, y + 20, x - 5, y + 12);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.palette.outline;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.strokeStyle = this.palette.gold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 2);
        ctx.bezierCurveTo(cp1x + 2, cp1y + 2, cp2x + 2, cp2y, endX, endY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212,175,55,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.bezierCurveTo(cp1x - 5, cp1y, cp2x - 5, cp2y - 5, endX + 5, endY - 5);
        ctx.stroke();
    }

    flipCanvas(source) {
        const c = this.createCanvas(source.width, source.height);
        const ctx = c.getContext('2d');
        ctx.translate(source.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(source, 0, 0);
        return c;
    }
}
