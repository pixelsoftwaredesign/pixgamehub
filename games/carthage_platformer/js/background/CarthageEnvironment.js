export class CarthageEnvironment {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.timeOfDay = 0.5;
        this.timeSpeed = 0.0005;

        this.stars = Array.from({ length: 50 }, () => ({
            x: Math.random() * width * 2,
            y: Math.random() * (height * 0.5),
            size: Math.random() * 2 + 1,
            alpha: Math.random()
        }));

        this.waveOffset = 0;
    }

    update() {
        this.timeOfDay += this.timeSpeed;
        if (this.timeOfDay > 1) this.timeOfDay = 0;
        this.waveOffset += 0.02;
    }

    render(ctx, cameraX) {
        this.renderSky(ctx);
        this.renderStars(ctx, cameraX);
        this.renderCelestialBody(ctx);
        this.renderLandscape(ctx, cameraX);
        this.renderSeaWaves(ctx);
        this.renderCothon(ctx, cameraX);
        this.renderPunicArchitecture(ctx, cameraX);
    }

    renderSky(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);

        let topColor, midColor, bottomColor;

        if (this.timeOfDay < 0.2) {
            topColor = '#0b0f19';
            midColor = '#151d30';
            bottomColor = '#221e3b';
        } else if (this.timeOfDay < 0.35) {
            topColor = '#151d30';
            midColor = '#3a506b';
            bottomColor = '#6b4c7a';
        } else if (this.timeOfDay < 0.5) {
            topColor = '#3a506b';
            midColor = '#5c8a9e';
            bottomColor = '#ffb703';
        } else if (this.timeOfDay < 0.65) {
            topColor = '#1d3557';
            midColor = '#457b9d';
            bottomColor = '#ffb703';
        } else if (this.timeOfDay < 0.8) {
            topColor = '#1d3557';
            midColor = '#e07a5f';
            bottomColor = '#f4a261';
        } else {
            topColor = '#2b0930';
            midColor = '#1a0a2e';
            bottomColor = '#0b0f19';
        }

        gradient.addColorStop(0, topColor);
        gradient.addColorStop(0.5, midColor);
        gradient.addColorStop(1, bottomColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        const hazeAlpha = this.timeOfDay > 0.35 && this.timeOfDay < 0.8 ? 0.3 : 0.05;
        const hazeGrad = ctx.createLinearGradient(0, this.height * 0.35, 0, this.height * 0.65);
        hazeGrad.addColorStop(0, `rgba(244, 162, 97, 0)`);
        hazeGrad.addColorStop(1, `rgba(238, 155, 0, ${hazeAlpha})`);
        ctx.fillStyle = hazeGrad;
        ctx.fillRect(0, this.height * 0.35, this.width, this.height * 0.3);
    }

    renderStars(ctx, cameraX) {
        if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) return;

        let alpha = 0;
        if (this.timeOfDay <= 0.25) alpha = (0.25 - this.timeOfDay) * 4;
        else alpha = (this.timeOfDay - 0.75) * 4;

        ctx.fillStyle = '#ffffff';
        for (const star of this.stars) {
            ctx.globalAlpha = star.alpha * Math.min(alpha, 1) * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + star.x));
            ctx.fillRect(star.x - cameraX * 0.05, star.y, star.size, star.size);
        }
        ctx.globalAlpha = 1;
    }

    renderCelestialBody(ctx) {
        const progress = this.timeOfDay;
        const cx = this.width * 0.5 + Math.cos(progress * Math.PI * 2 - Math.PI * 0.5) * this.width * 0.35;
        const cy = this.height * 0.5 - Math.sin(progress * Math.PI * 2) * this.height * 0.35;

        if (cy > this.height * 0.8) return;

        const isSun = progress > 0.25 && progress < 0.75;

        if (isSun) {
            const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
            glowGrad.addColorStop(0, 'rgba(255, 209, 102, 0.6)');
            glowGrad.addColorStop(0.5, 'rgba(244, 162, 97, 0.15)');
            glowGrad.addColorStop(1, 'rgba(244, 162, 97, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(cx - 80, cy - 80, 160, 160);

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(cx, cy, 25, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 240, 180, 0.8)';
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#f1faee';
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ccd6e0';
            ctx.beginPath();
            ctx.arc(cx + 3, cy - 2, 14, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderLandscape(ctx, cameraX) {
        const p1 = cameraX * 0.15;

        ctx.fillStyle = '#1e3a2f';
        ctx.beginPath();
        ctx.moveTo(-100, 430);
        ctx.lineTo(100, 350);
        ctx.lineTo(300, 310);
        ctx.lineTo(500, 340);
        ctx.lineTo(700, 290);
        ctx.lineTo(900, 320);
        ctx.lineTo(1100, 280);
        ctx.lineTo(1400, 350);
        ctx.lineTo(1700, 430);
        ctx.lineTo(1700, this.height);
        ctx.lineTo(-100, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2a4a3a';
        ctx.beginPath();
        ctx.moveTo(-100, 440);
        ctx.lineTo(200, 380);
        ctx.lineTo(500, 360);
        ctx.lineTo(800, 370);
        ctx.lineTo(1100, 340);
        ctx.lineTo(1400, 380);
        ctx.lineTo(1700, 440);
        ctx.lineTo(1700, this.height);
        ctx.lineTo(-100, this.height);
        ctx.closePath();
        ctx.fill();

        this.renderSeaWaves(ctx);
    }

    renderSeaWaves(ctx) {
        const seaGradient = ctx.createLinearGradient(0, 430, 0, this.height);
        seaGradient.addColorStop(0, '#1d3557');
        seaGradient.addColorStop(0.3, '#162d50');
        seaGradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = seaGradient;
        ctx.fillRect(0, 430, this.width, this.height - 430);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let w = 0; w < 6; w++) {
            ctx.beginPath();
            const baseY = 445 + w * 25;
            for (let x = 0; x < this.width; x += 5) {
                const y = baseY + Math.sin(x * 0.02 + this.waveOffset + w * 0.8) * 3;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        const isEvening = this.timeOfDay > 0.6 && this.timeOfDay < 0.85;
        if (isEvening) {
            ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
            for (let i = 0; i < 50; i++) {
                const rx = (i * 73 + Math.sin(this.waveOffset + i) * 15) % this.width;
                const ry = 450 + (i * 11) % 160;
                const rw = 20 + (i % 7) * 5;
                ctx.fillRect(rx, ry, rw, 1.5);
            }
        }
    }

    renderCothon(ctx, cameraX) {
        const p = cameraX * 0.35;
        ctx.save();
        ctx.translate(-p, 0);

        const cx = 900;
        const cy = 430;

        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.arc(cx, cy + 30, 100, Math.PI, 0, false);
        ctx.lineTo(cx + 100, cy + 60);
        ctx.lineTo(cx - 100, cy + 60);
        ctx.closePath();
        ctx.fill();

        const waterGrad = ctx.createRadialGradient(cx, cy + 20, 10, cx, cy + 20, 90);
        waterGrad.addColorStop(0, '#1a4a6e');
        waterGrad.addColorStop(1, '#1d3557');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 85, Math.PI, 0, false);
        ctx.lineTo(cx + 85, cy + 55);
        ctx.lineTo(cx - 85, cy + 55);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx - 5, cy - 15, 10, 20);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 25);
        ctx.lineTo(cx + 8, cy - 15);
        ctx.lineTo(cx - 8, cy - 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a3525';
        for (let angle = Math.PI; angle < Math.PI * 2; angle += 0.3) {
            const bx = cx + Math.cos(angle) * 90;
            const by = cy + 30 + Math.sin(angle) * 30;
            ctx.fillRect(bx - 4, by - 15, 8, 15);
        }

        ctx.fillStyle = 'rgba(255, 209, 102, 0.15)';
        for (let i = 0; i < 20; i++) {
            const rx = cx - 60 + (i * 7) % 120;
            const ry = cy + 25 + Math.sin(this.waveOffset + i * 0.5) * 2;
            ctx.fillRect(rx, ry, 8, 1);
        }

        ctx.restore();
    }

    renderPunicArchitecture(ctx, cameraX) {
        const p2 = cameraX * 0.5;
        ctx.save();
        ctx.translate(-p2, 0);

        this.renderByrsaHill(ctx);
        this.renderRamparts(ctx);
        this.renderPunicBuildings(ctx);

        ctx.restore();
    }

    renderByrsaHill(ctx) {
        ctx.fillStyle = '#2a3b4c';
        ctx.beginPath();
        ctx.moveTo(50, 420);
        ctx.lineTo(200, 320);
        ctx.lineTo(400, 290);
        ctx.lineTo(600, 310);
        ctx.lineTo(800, 270);
        ctx.lineTo(1000, 300);
        ctx.lineTo(1200, 340);
        ctx.lineTo(1400, 420);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#354d5e';
        ctx.beginPath();
        ctx.moveTo(100, 420);
        ctx.lineTo(300, 350);
        ctx.lineTo(500, 340);
        ctx.lineTo(700, 360);
        ctx.lineTo(900, 330);
        ctx.lineTo(1100, 370);
        ctx.lineTo(1300, 420);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(500, 290, 160, 50);
        ctx.fillStyle = '#111';
        for (let c = 510; c < 650; c += 18) {
            ctx.fillRect(c, 295, 6, 40);
        }
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(500, 285, 160, 8);

        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(800, 250, 120, 45);
        ctx.fillStyle = '#111';
        for (let c = 808; c < 912; c += 15) {
            ctx.fillRect(c, 255, 5, 35);
        }
        ctx.fillStyle = '#c9a84c';
        ctx.fillRect(800, 246, 120, 6);
    }

    renderRamparts(ctx) {
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(200, 340, 300, 110);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(200, 340, 20, 110);

        ctx.fillStyle = '#2c1d0c';
        for (let x = 200; x < 500; x += 28) {
            ctx.fillRect(x, 318, 16, 22);
            ctx.fillRect(x + 18, 318, 10, 22);
        }

        ctx.fillStyle = '#4a3525';
        ctx.fillRect(350, 300, 30, 50);
        ctx.fillRect(370, 290, 20, 10);

        ctx.fillStyle = '#3d2817';
        ctx.fillRect(650, 350, 250, 100);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(650, 350, 18, 100);

        ctx.fillStyle = '#2c1d0c';
        for (let x = 650; x < 900; x += 28) {
            ctx.fillRect(x, 332, 16, 18);
        }

        ctx.fillStyle = '#4a3525';
        ctx.fillRect(760, 310, 28, 50);
        ctx.fillRect(778, 300, 18, 10);
    }

    renderPunicBuildings(ctx) {
        const buildings = [
            { x: 150, y: 370, w: 80, h: 80, color: '#b08d57' },
            { x: 560, y: 360, w: 70, h: 90, color: '#c9a84c' },
            { x: 950, y: 375, w: 90, h: 75, color: '#a07d4f' },
            { x: 1150, y: 355, w: 75, h: 95, color: '#b89c5a' },
        ];

        for (const b of buildings) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(b.x, b.y, b.w * 0.15, b.h);

            ctx.fillStyle = '#2c1d0c';
            const doorW = b.w * 0.25;
            const doorH = b.h * 0.4;
            ctx.fillRect(b.x + b.w * 0.37, b.y + b.h - doorH, doorW, doorH);

            ctx.fillStyle = '#0b0f19';
            for (let wy = b.y + 12; wy < b.y + b.h - doorH - 5; wy += 22) {
                for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                    if (wx > b.x + b.w * 0.3 && wx < b.x + b.w * 0.65) continue;
                    ctx.fillRect(wx, wy, 10, 14);
                }
            }

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(b.x, b.y - 4, b.w, 6);

            ctx.fillStyle = '#3d2817';
            ctx.beginPath();
            ctx.moveTo(b.x - 5, b.y);
            ctx.lineTo(b.x + b.w / 2, b.y - 20);
            ctx.lineTo(b.x + b.w + 5, b.y);
            ctx.closePath();
            ctx.fill();
        }
    }
}
