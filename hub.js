// Animated preview canvases for each game card
document.addEventListener('DOMContentLoaded', () => {
    const previews = document.querySelectorAll('.preview-canvas');
    previews.forEach(c => {
        c.width = 480;
        c.height = 180;
    });

    let frame = 0;

    function drawPlatformPreview(c) {
        const ctx = c.getContext('2d');
        // Desert bg
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#1a0800'); g.addColorStop(1, '#4a2800');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Dunes
        ctx.fillStyle = '#3a2200';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(i * 140 + 40, 180, 80, 30, 0, Math.PI, 0);
            ctx.fill();
        }

        // Ground
        ctx.fillStyle = '#b89040'; ctx.fillRect(0, 170, 480, 30);

        // Platforms
        ctx.fillStyle = '#c8a050';
        ctx.fillRect(80, 140, 60, 10);
        ctx.fillRect(200, 110, 50, 10);
        ctx.fillRect(320, 130, 60, 10);
        ctx.fillRect(400, 100, 50, 10);

        // Character (child)
        const px = 100 + Math.sin(frame * 0.03) * 80;
        const py = 130 + Math.sin(frame * 0.05) * 5;
        ctx.fillStyle = '#e8a040'; ctx.fillRect(px - 8, py - 10, 16, 18);
        ctx.fillStyle = '#f0c890'; ctx.fillRect(px - 6, py - 18, 12, 10);
        ctx.fillStyle = '#8a6a30'; ctx.fillRect(px - 8, py - 22, 16, 5);

        // Scorpion
        const sx = 300 + Math.sin(frame * 0.02) * 40;
        ctx.fillStyle = '#8a2a00';
        ctx.beginPath(); ctx.ellipse(sx, 160, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cc0000'; ctx.beginPath(); ctx.arc(sx + 12, 155, 3, 0, Math.PI * 2); ctx.fill();

        // Gems
        ctx.fillStyle = '#ff8800';
        [160, 240, 360].forEach(gx => {
            const gy = 95 + Math.sin(frame * 0.06 + gx) * 3;
            ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 6); ctx.lineTo(gx - 5, gy); ctx.fill();
        });

        // Stars
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        for (let i = 0; i < 8; i++) ctx.fillRect((i * 67 + 20) % 480, (i * 31 + 10) % 80, 1, 1);
    }

    function drawFightPreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a0a2e'); g.addColorStop(1, '#1a1040');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Stage
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 165, 480, 35);
        ctx.fillStyle = '#6a5030'; ctx.fillRect(10, 163, 460, 6);

        // Lanterns
        for (let i = 0; i < 5; i++) {
            const lx = 60 + i * 90;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath(); ctx.arc(lx, 130, 6 + Math.sin(frame * 0.05 + i), 0, Math.PI * 2); ctx.fill();
        }

        // P1 - blue fighter
        const p1x = 140 + Math.sin(frame * 0.04) * 30;
        ctx.fillStyle = '#4488ff'; ctx.fillRect(p1x - 10, 110, 20, 30);
        ctx.fillStyle = '#f0c890'; ctx.beginPath(); ctx.arc(p1x, 100, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd700'; ctx.fillRect(p1x - 10, 92, 20, 4);

        // P2 - red fighter
        const p2x = 340 + Math.sin(frame * 0.04 + 2) * 30;
        ctx.fillStyle = '#ff4444'; ctx.fillRect(p2x - 10, 110, 20, 30);
        ctx.fillStyle = '#f0c890'; ctx.beginPath(); ctx.arc(p2x, 100, 8, 0, Math.PI * 2); ctx.fill();

        // Hit effect
        if (frame % 30 < 5) {
            const hx = (p1x + p2x) / 2;
            ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + frame * 0.1;
                ctx.fillRect(hx + Math.cos(a) * 15 - 2, 105 + Math.sin(a) * 15 - 2, 4, 4);
            }
        }

        // HP bars
        ctx.fillStyle = '#333'; ctx.fillRect(30, 15, 150, 10); ctx.fillRect(300, 15, 150, 10);
        ctx.fillStyle = '#44ff44'; ctx.fillRect(30, 15, 120, 10);
        ctx.fillStyle = '#44ff44'; ctx.fillRect(300, 15, 100, 10);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px monospace'; ctx.fillText('VS', 228, 25);
    }

    function drawBattlePreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a2a1a'); g.addColorStop(1, '#1a4a2a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Map
        ctx.fillStyle = '#3a7a2a'; ctx.fillRect(0, 160, 480, 40);

        // Buildings
        ctx.fillStyle = '#4a3a2a';
        for (let i = 0; i < 5; i++) {
            const bh = 40 + Math.sin(i * 2) * 30;
            ctx.fillRect(40 + i * 90, 160 - bh, 50, bh);
        }

        // Trees
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = '#2a5a1a';
            ctx.beginPath(); ctx.arc(70 + i * 80, 140, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4a3a1a'; ctx.fillRect(68 + i * 80, 148, 4, 14);
        }

        // Player
        const px = 200 + Math.sin(frame * 0.03) * 60;
        ctx.fillStyle = '#2266cc'; ctx.fillRect(px - 6, 140, 12, 18);
        ctx.fillStyle = '#f0c890'; ctx.beginPath(); ctx.arc(px, 135, 5, 0, Math.PI * 2); ctx.fill();

        // Storm zone
        ctx.strokeStyle = '#8844cc'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(240, 100, 90 + Math.sin(frame * 0.02) * 10, 0, Math.PI * 2); ctx.stroke();

        // Bullets
        ctx.fillStyle = '#ff4444';
        for (let i = 0; i < 3; i++) {
            const bx = (frame * 3 + i * 160) % 480;
            ctx.fillRect(bx, 130 + i * 15, 6, 2);
        }

        // Alive count
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
        ctx.fillText('👤 25 vivants', 20, 20);
        ctx.fillStyle = '#ffd700'; ctx.fillText('💀 5 kills', 380, 20);

        // Minimap
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(400, 10, 60, 60);
        ctx.strokeStyle = '#8844cc'; ctx.beginPath(); ctx.arc(430, 40, 25, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#44ff44'; ctx.fillRect(428, 38, 4, 4);
    }

    function drawAnimePreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a0a2e'); g.addColorStop(1, '#2a1030');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Torii
        ctx.fillStyle = 'rgba(200,40,40,0.3)';
        ctx.fillRect(220, 50, 8, 120); ctx.fillRect(252, 50, 8, 120);
        ctx.fillRect(215, 50, 50, 8);

        // Cherry blossoms
        for (let i = 0; i < 6; i++) {
            const px = (i * 85 + 30) % 480;
            const py = ((frame * 0.5 + i * 40) % 180) + 10;
            ctx.fillStyle = 'rgba(255,150,170,0.4)'; ctx.fillRect(px, py, 3, 2);
        }

        // Ground
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 165, 480, 35);

        // Naruto (left)
        const nx = 130 + Math.sin(frame * 0.04) * 20;
        ctx.fillStyle = '#ff6600'; ctx.fillRect(nx - 8, 120, 16, 30);
        ctx.fillStyle = '#f0c890'; ctx.beginPath(); ctx.arc(nx, 110, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.moveTo(nx - 8, 102); ctx.lineTo(nx - 4, 92); ctx.lineTo(nx, 100);
        ctx.lineTo(nx + 4, 90); ctx.lineTo(nx + 8, 102); ctx.fill();
        ctx.fillStyle = '#335'; ctx.fillRect(nx - 9, 104, 18, 3);

        // Zoro (right)
        const zx = 350 + Math.sin(frame * 0.04 + 2) * 20;
        ctx.fillStyle = '#eee'; ctx.fillRect(zx - 8, 120, 16, 30);
        ctx.fillStyle = '#22aa44'; ctx.fillRect(zx - 8, 132, 16, 8);
        ctx.fillStyle = '#e0b080'; ctx.beginPath(); ctx.arc(zx, 110, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22aa33';
        ctx.beginPath(); ctx.moveTo(zx - 7, 102); ctx.lineTo(zx - 3, 93); ctx.lineTo(zx + 3, 102); ctx.fill();
        ctx.fillStyle = '#ddd'; ctx.fillRect(zx + 8, 105, 2, 25);

        // Clash effect in center
        if (frame % 20 < 10) {
            const cx = 240, cy = 120;
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, 15 + Math.sin(frame * 0.3) * 5, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,0,0.1)'; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
        }

        // VS text
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
        ctx.fillText('VS', 240, 115); ctx.textAlign = 'left';

        // Names
        ctx.fillStyle = '#ff8800'; ctx.font = 'bold 11px monospace'; ctx.fillText('NARUTO', 105, 190);
        ctx.fillStyle = '#44cc44'; ctx.fillText('ZORO', 340, 190);
    }

    function drawPixelPreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a0a1e'); g.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Ground
        ctx.fillStyle = '#3a3a4e'; ctx.fillRect(0, 170, 480, 30);
        ctx.fillStyle = '#ff4400'; ctx.fillRect(0, 170, 480, 3);

        // Platforms
        ctx.fillStyle = '#3a3a4e';
        ctx.fillRect(80, 140, 80, 10);
        ctx.fillRect(250, 120, 80, 10);
        ctx.fillRect(400, 145, 70, 10);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(80, 140, 80, 2);
        ctx.fillRect(250, 120, 80, 2);
        ctx.fillRect(400, 145, 70, 2);

        // Fighter 1 (blue knight)
        const f1x = 140 + Math.sin(frame * 0.04) * 30;
        drawPixelPreviewChar(ctx, f1x, 130, '#4488ff', '#ffcc88');

        // Fighter 2 (red berserker)
        const f2x = 360 + Math.sin(frame * 0.04 + 2) * 30;
        drawPixelPreviewChar(ctx, f2x, 130, '#ff4444', '#ffcc88');

        // Attack sparks
        if (frame % 25 < 6) {
            const cx = (f1x + f2x) / 2;
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2 + frame * 0.15;
                ctx.fillRect(cx + Math.cos(a) * 12, 125 + Math.sin(a) * 12, 3, 3);
            }
        }

        // HUD elements
        ctx.fillStyle = '#222'; ctx.fillRect(20, 15, 160, 12); ctx.fillRect(300, 15, 160, 12);
        ctx.fillStyle = '#44dd44'; ctx.fillRect(20, 15, 130, 12);
        ctx.fillStyle = '#dd4444'; ctx.fillRect(300, 15, 110, 12);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
        ctx.fillText('P1', 25, 25); ctx.fillText('P2', 305, 25);
        ctx.fillStyle = '#ff4400'; ctx.fillText('VS', 224, 28);

        // "MULTI" label
        ctx.fillStyle = '#ff4400'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('4 JOUEURS', 240, 195);
        ctx.textAlign = 'left';

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 10; i++) {
            ctx.globalAlpha = 0.2 + Math.sin(frame * 0.03 + i) * 0.15;
            ctx.fillRect((i * 53 + 10) % 480, (i * 29 + 5) % 100, 2, 2);
        }
        ctx.globalAlpha = 1;
    }

    function drawPixelPreviewChar(ctx, x, y, bodyColor, skinColor) {
        const ps = 3;
        // Legs
        const walk = Math.sin(frame * 0.15) * 2;
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - 4, y + 4, 3, 6 + walk);
        ctx.fillRect(x + 1, y + 4, 3, 6 - walk);
        // Body
        ctx.fillRect(x - 5, y - 5, 10, 10);
        // Head
        ctx.fillStyle = skinColor;
        ctx.fillRect(x - 4, y - 12, 8, 7);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 3, y - 10, 2, 2);
        ctx.fillRect(x + 1, y - 10, 2, 2);
    }

    function drawJunglePreview(c) {
        const ctx = c.getContext('2d');
        // Sky gradient
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#1a3a2a'); g.addColorStop(1, '#3a3a1a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Sun
        ctx.fillStyle = 'rgba(255,200,100,0.15)';
        ctx.beginPath(); ctx.arc(420, 40, 25, 0, Math.PI * 2); ctx.fill();

        // Trees
        for (let i = 0; i < 3; i++) {
            const tx = 50 + i * 160;
            ctx.fillStyle = '#1a3a0a';
            ctx.fillRect(tx - 3, 120, 6, 60);
            ctx.fillStyle = '#2a5a1a';
            ctx.beginPath(); ctx.arc(tx, 115, 18, 0, Math.PI * 2); ctx.fill();
        }

        // Ground
        ctx.fillStyle = '#3a5a1a'; ctx.fillRect(0, 175, 480, 25);
        ctx.fillStyle = '#2a4a0a'; ctx.fillRect(0, 175, 480, 3);

        // Hero
        const hx = 160 + Math.sin(frame * 0.03) * 20;
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(hx - 6, 145, 12, 18);
        ctx.fillStyle = '#f5d0a9';
        ctx.fillRect(hx - 5, 130, 10, 14);
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(hx - 5, 128, 10, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(hx - 3, 134, 2, 2);
        ctx.fillRect(hx + 1, 134, 2, 2);
        // Sword
        ctx.fillStyle = '#ccc';
        ctx.fillRect(hx + 8, 140, 12, 2);

        // Scorpions
        for (let i = 0; i < 3; i++) {
            const sx = 280 + i * 60 + Math.sin(frame * 0.02 + i * 2) * 15;
            const sy = 165;
            ctx.fillStyle = '#cc8833';
            ctx.beginPath(); ctx.ellipse(sx, sy, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#cc3322';
            ctx.beginPath(); ctx.arc(sx + 6, sy - 4, 2, 0, Math.PI * 2); ctx.fill();
            // Legs
            ctx.strokeStyle = '#cc8833'; ctx.lineWidth = 1;
            for (let j = 0; j < 3; j++) {
                ctx.beginPath(); ctx.moveTo(sx - 4 + j * 3, sy + 4);
                ctx.lineTo(sx - 6 + j * 3, sy + 8); ctx.stroke();
            }
        }

        // VAGUE text
        ctx.fillStyle = '#c8a050'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('🦂 VAGUE 1', 240, 100);
        ctx.textAlign = 'left';

        // HP bar
        ctx.fillStyle = '#333'; ctx.fillRect(20, 15, 120, 10);
        ctx.fillStyle = '#44dd44'; ctx.fillRect(20, 15, 95, 10);
        ctx.fillStyle = '#c8a050'; ctx.font = '9px monospace'; ctx.fillText('RANGER', 22, 14);
    }

    function drawMangaPreview(c) {
        const ctx = c.getContext('2d');
        // Dark bg
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a0a1a'); g.addColorStop(1, '#1a0a1a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Moon
        ctx.fillStyle = 'rgba(255,200,150,0.1)';
        ctx.beginPath(); ctx.arc(400, 50, 25, 0, Math.PI * 2); ctx.fill();

        // Ground
        ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 170, 480, 30);
        ctx.fillStyle = '#ff4444'; ctx.fillRect(0, 170, 480, 2);

        // Platforms
        ctx.fillStyle = '#2a1a3a';
        ctx.fillRect(100, 140, 80, 8);
        ctx.fillRect(300, 120, 80, 8);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(100, 140, 80, 2);
        ctx.fillRect(300, 120, 80, 2);

        // Fighter 1 (white gi)
        const f1x = 160 + Math.sin(frame * 0.04) * 25;
        drawMangaPreviewChar(ctx, f1x, 130, '#fff', '#1a1a1a', '#cc0000');

        // Fighter 2 (dark gi)
        const f2x = 340 + Math.sin(frame * 0.04 + 2) * 25;
        drawMangaPreviewChar(ctx, f2x, 130, '#2a2a2a', '#1a1a1a', '#ff0000');

        // Speed lines
        if (frame % 20 < 6) {
            const cx = (f1x + f2x) / 2;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + frame * 0.1;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 8, 125 + Math.sin(a) * 8);
                ctx.lineTo(cx + Math.cos(a) * 25, 125 + Math.sin(a) * 25);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Impact text
        if (frame % 40 < 10) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('HIT!', 240, 110);
            ctx.textAlign = 'left';
        }

        // HUD
        ctx.fillStyle = '#222'; ctx.fillRect(20, 15, 160, 10); ctx.fillRect(300, 15, 160, 10);
        ctx.fillStyle = '#4488ff'; ctx.fillRect(20, 15, 120, 10);
        ctx.fillStyle = '#ff4444'; ctx.fillRect(300, 15, 100, 10);
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('VS', 240, 24);
        ctx.textAlign = 'left';

        // JP text
        ctx.fillStyle = '#ff4444'; ctx.globalAlpha = 0.4; ctx.font = '10px monospace';
        ctx.fillText('格闘アリーナ', 20, 195);
        ctx.globalAlpha = 1;
    }

    function drawMangaPreviewChar(ctx, x, y, giColor, hairColor, bandColor) {
        // Legs
        ctx.fillStyle = giColor;
        ctx.fillRect(x - 5, y + 6, 4, 10);
        ctx.fillRect(x + 1, y + 6, 4, 10);
        // Body
        ctx.fillStyle = giColor;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        // Belt
        ctx.fillStyle = bandColor;
        ctx.fillRect(x - 8, y + 6, 16, 2);
        // Arms
        ctx.fillStyle = '#f5d0a9';
        ctx.fillRect(x - 12, y - 4, 4, 10);
        ctx.fillRect(x + 8, y - 4, 4, 10);
        // Head
        ctx.fillStyle = '#f5d0a9';
        ctx.fillRect(x - 6, y - 22, 12, 14);
        // Eyes (big manga)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 5, y - 18, 4, 4);
        ctx.fillRect(x + 1, y - 18, 4, 4);
        ctx.fillStyle = '#2244aa';
        ctx.fillRect(x - 4, y - 17, 3, 2);
        ctx.fillRect(x + 2, y - 17, 3, 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 3, y - 16, 1, 1);
        ctx.fillRect(x + 3, y - 16, 1, 1);
        // Hair
        ctx.fillStyle = hairColor;
        ctx.fillRect(x - 7, y - 26, 14, 5);
        ctx.fillRect(x - 5, y - 28, 4, 3);
        ctx.fillRect(x - 1, y - 30, 3, 4);
        ctx.fillRect(x + 3, y - 28, 4, 3);
        // Headband
        ctx.fillStyle = bandColor;
        ctx.fillRect(x - 7, y - 22, 14, 2);
    }

    function drawArabParkourPreview(c) {
        const ctx = c.getContext('2d');
        const t = frame * 0.03;

        const g = ctx.createLinearGradient(0, 0, 0, 180);
        g.addColorStop(0, '#2a0a3a');
        g.addColorStop(0.4, '#5c1a4a');
        g.addColorStop(0.7, '#d4601a');
        g.addColorStop(1, '#f0b848');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 180);

        const sunX = 400, sunY = 40;
        ctx.fillStyle = '#ffcc44';
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const blds = [
            { x: 30, w: 60, h: 80 },
            { x: 110, w: 40, h: 110 },
            { x: 170, w: 70, h: 65 },
            { x: 260, w: 50, h: 95 },
            { x: 330, w: 65, h: 75 },
            { x: 410, w: 55, h: 90 },
        ];
        for (const b of blds) {
            ctx.fillStyle = '#c68642';
            ctx.fillRect(b.x, 160 - b.h, b.w, b.h);
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.ellipse(b.x + b.w / 2, 160 - b.h, b.w * 0.35, 12, 0, Math.PI, 0, false);
            ctx.fill();
        }

        ctx.fillStyle = '#c68642';
        ctx.fillRect(0, 160, 480, 20);

        const playerX = 200 + Math.sin(t * 2) * 80;
        const playerY = 130 + Math.abs(Math.sin(t * 3)) * -30;
        ctx.fillStyle = '#4a154b';
        ctx.fillRect(playerX - 5, playerY - 2, 10, 14);
        ctx.fillStyle = '#e9d8a6';
        ctx.beginPath();
        ctx.arc(playerX, playerY - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(playerX, playerY - 11, 6, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playerX - 4, playerY + 10, 3, 8);
        ctx.fillRect(playerX + 1, playerY + 10, 3, 8);

        if (frame % 30 < 8) {
            ctx.strokeStyle = '#d4a373';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 4; i++) {
                const sx = playerX + 8 + i * 4;
                const sy = playerY + 2 + Math.random() * 6;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = '#8b0000';
        const guardX = 350 + Math.sin(t * 0.5) * 30;
        ctx.fillRect(guardX - 6, 130, 12, 18);
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(guardX, 125, 6, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('!', guardX - 3, 118);

        ctx.fillStyle = '#ff6b6b';
        for (let i = 0; i < 3; i++) {
            const gx = 100 + i * 140;
            const gy = 110 + Math.sin(t * 3 + i * 2) * 3;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(t * 2 + i);
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(3, 0);
            ctx.lineTo(0, 4);
            ctx.lineTo(-3, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PARKOUR', 240, 175);
        ctx.textAlign = 'left';
    }

    function drawShadowsPreview(c) {
        const ctx = c.getContext('2d');
        const t = frame * 0.03;

        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#06060e');
        g.addColorStop(0.5, '#0e0e1a');
        g.addColorStop(1, '#14141e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 200);

        for (let i = 0; i < 6; i++) {
            const bx = 20 + i * 80;
            const bh = 50 + Math.sin(i * 1.7) * 25;
            ctx.fillStyle = '#12121c';
            ctx.fillRect(bx, 180 - bh, 50, bh);
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(bx + 10, 180 - bh + 8, 8, 6);
            ctx.fillRect(bx + 28, 180 - bh + 8, 8, 6);
            const lit = Math.sin(t + i * 2) > 0.2;
            if (lit) {
                ctx.fillStyle = 'rgba(255,200,100,0.25)';
                ctx.fillRect(bx + 10, 180 - bh + 8, 8, 6);
            }
        }

        ctx.fillStyle = '#0c0c16';
        ctx.fillRect(0, 175, 480, 25);

        for (let i = 0; i < 4; i++) {
            const lx = 60 + i * 120;
            const flicker = 0.5 + 0.3 * Math.sin(t * 2 + i);
            ctx.fillStyle = `rgba(255,180,80,${flicker * 0.1})`;
            ctx.beginPath();
            ctx.arc(lx, 170, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,200,100,${flicker})`;
            ctx.beginPath();
            ctx.arc(lx, 170, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        const assassinX = 120 + Math.sin(t) * 40;
        ctx.fillStyle = '#662222';
        ctx.beginPath();
        ctx.arc(assassinX, 155, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(assassinX + 2, 154, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ccc';
        ctx.fillRect(assassinX + 7, 150, 8, 1.5);

        const policeX = 340 + Math.cos(t * 0.7) * 30;
        ctx.fillStyle = '#2244aa';
        ctx.beginPath();
        ctx.arc(policeX, 155, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(policeX, 155, 9, 0, Math.PI * 2);
        ctx.stroke();
        const flAngle = Math.atan2(155 - 155, assassinX - policeX);
        const flx = policeX + Math.cos(flAngle) * 12;
        const fly = 155 + Math.sin(flAngle) * 12;
        const flGrad = ctx.createRadialGradient(flx, fly, 0, flx, fly, 50);
        flGrad.addColorStop(0, 'rgba(255,255,180,0.08)');
        flGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flGrad;
        ctx.beginPath();
        ctx.moveTo(flx, fly);
        ctx.arc(flx, fly, 50, flAngle - 0.3, flAngle + 0.3);
        ctx.closePath();
        ctx.fill();

        const citizenX = 240 + Math.sin(t * 0.5 + 1) * 20;
        ctx.fillStyle = '#228844';
        ctx.beginPath();
        ctx.arc(citizenX, 155, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const visionGrad = ctx.createRadialGradient(240, 155, 0, 240, 155, 100);
        visionGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
        visionGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = visionGrad;
        ctx.fillRect(0, 0, 480, 200);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        ctx.fillStyle = '#ff4444';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2);
        ctx.beginPath();
        ctx.arc(assassinX, 143, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WHO IS THE KILLER?', 240, 30);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ff4444';
        ctx.globalAlpha = 0.3;
        ctx.font = '9px monospace';
        ctx.fillText('3 ROLES | COUTEAU | PISTOLET | GRENADE', 120, 195);
        ctx.globalAlpha = 1;
    }

    function drawEnginePreview(c) {
        const ctx = c.getContext('2d');
        const t = frame * 0.02;
        const themeIdx = Math.floor(frame / 120) % 5;

        const themes = [
            { sky1: '#1a0800', sky2: '#4a2800', ground: '#b89040', accent: '#c8a050', name: 'Désert' },
            { sky1: '#1a3a2a', sky2: '#3a3a1a', ground: '#3a5a1a', accent: '#44aa44', name: 'Jungle' },
            { sky1: '#1a0a0a', sky2: '#3a1a0a', ground: '#4a2a0a', accent: '#ff4400', name: 'Lave' },
            { sky1: '#0a1a2a', sky2: '#2a4a6a', ground: '#88ccdd', accent: '#aaeeff', name: 'Glace' },
            { sky1: '#2a0a3a', sky2: '#5c1a4a', ground: '#d4a373', accent: '#d4a017', name: 'Empire Arabe' },
        ];
        const th = themes[themeIdx];

        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, th.sky1);
        g.addColorStop(1, th.sky2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 200);

        // Stars
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect((i * 43 + 15) % 480, (i * 29 + 8) % 80, 1, 1);
        }

        // Sun
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(400, 50, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(400, 50, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Mountains
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 140);
        for (let i = 0; i < 6; i++) {
            const mx = i * 90 + Math.sin(t + i) * 10;
            const mh = 30 + Math.sin(i * 1.5) * 20;
            ctx.lineTo(mx, 140 - mh);
        }
        ctx.lineTo(480, 140);
        ctx.closePath();
        ctx.fill();

        // Ground
        ctx.fillStyle = th.ground;
        ctx.fillRect(0, 165, 480, 35);
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 165, 480, 3);
        ctx.globalAlpha = 1;

        // Empire Arabe special elements
        if (themeIdx === 4) {
            // Dome
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.ellipse(200, 140, 40, 25, 0, Math.PI, 0, false);
            ctx.fill();
            // Minaret
            ctx.fillStyle = '#c68642';
            ctx.fillRect(340, 100, 10, 65);
            ctx.fillStyle = '#d4a017';
            ctx.beginPath();
            ctx.arc(345, 100, 8, Math.PI, 0, false);
            ctx.fill();
            // Banners waving
            ctx.fillStyle = '#722f37';
            for (let i = 0; i < 3; i++) {
                const bx = 120 + i * 120;
                const sway = Math.sin(t * 3 + i * 2) * 6;
                ctx.beginPath();
                ctx.moveTo(bx, 130);
                ctx.lineTo(bx + sway, 165);
                ctx.lineTo(bx + 8 + sway, 165);
                ctx.lineTo(bx + 8, 130);
                ctx.closePath();
                ctx.fill();
            }
            // Golden dust
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 8; i++) {
                const dx = (i * 65 + frame * 0.8) % 480;
                const dy = 80 + Math.sin(t * 2 + i * 1.3) * 30;
                ctx.globalAlpha = 0.3 + Math.sin(t + i) * 0.2;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else {
            // Generic parallax layers
            for (let i = 0; i < 4; i++) {
                const dx = 60 + i * 100;
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(dx, 150 - Math.sin(i) * 10, 30, 15 + Math.sin(i * 2) * 8);
            }
        }

        // Player character
        const px = 240 + Math.sin(frame * 0.03) * 40;
        ctx.fillStyle = th.accent;
        ctx.fillRect(px - 5, 148, 10, 16);
        ctx.fillStyle = '#f0c890';
        ctx.beginPath();
        ctx.arc(px, 142, 6, 0, Math.PI * 2);
        ctx.fill();

        // Theme name
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.8;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(th.name, 240, 95);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;

        // "MOTEUR 2D" label
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.font = '10px monospace';
        ctx.fillText('MOTEUR 2D INTEGRAL', 20, 195);
        ctx.globalAlpha = 1;
    }

    function drawCarthagePreview(c) {
        const ctx = c.getContext('2d');
        const t = frame * 0.03;

        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#1a0825');
        g.addColorStop(0.3, '#3a1045');
        g.addColorStop(0.55, '#6a2050');
        g.addColorStop(0.75, '#c85030');
        g.addColorStop(0.9, '#e89040');
        g.addColorStop(1, '#f0c060');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 200);

        ctx.fillStyle = 'rgba(255,200,100,0.15)';
        const sunX = 380, sunY = 130;
        ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffe080';
        ctx.beginPath(); ctx.arc(sunX, sunY, 18, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        const seaY = 145;
        ctx.fillStyle = 'rgba(30,60,100,0.5)';
        ctx.fillRect(0, seaY, 480, 55);
        ctx.strokeStyle = 'rgba(255,200,100,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            for (let x = 0; x < 480; x += 4) {
                const wy = seaY + 5 + i * 8 + Math.sin(x * 0.015 + t * 0.5 + i) * 2;
                x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }

        const hillX = 240, hillY = 108;
        ctx.fillStyle = '#b89860';
        ctx.beginPath();
        ctx.moveTo(120, 140);
        ctx.quadraticCurveTo(hillX, hillY, 360, 140);
        ctx.lineTo(360, 145);
        ctx.lineTo(120, 145);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f0e8d0';
        ctx.fillRect(hillX - 25, hillY + 5, 50, 18);
        ctx.fillStyle = '#e0d0b0';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(hillX - 18 + i * 10, hillY - 10, 4, 16);
        }

        ctx.fillStyle = '#c9a86c';
        ctx.fillRect(0, 146, 480, 54);
        ctx.fillStyle = '#8b6914';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(20 + i * 60, 130, 30, 18);
            ctx.fillRect(25 + i * 60, 122, 20, 10);
        }

        ctx.fillStyle = 'rgba(20,50,90,0.5)';
        const portX = 160, portY = 145;
        ctx.beginPath(); ctx.arc(portX, portY, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a08040';
        ctx.beginPath(); ctx.arc(portX, portY, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c8a050';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + t * 0.2;
            ctx.beginPath();
            ctx.moveTo(portX + Math.cos(a) * 12, portY + Math.sin(a) * 12);
            ctx.lineTo(portX + Math.cos(a) * 25, portY + Math.sin(a) * 25);
            ctx.stroke();
        }

        ctx.fillStyle = '#4a154b';
        for (let i = 0; i < 4; i++) {
            const fx = 60 + i * 130;
            const sway = Math.sin(t * 2 + i * 1.5) * 4;
            ctx.beginPath();
            ctx.moveTo(fx, 120);
            ctx.lineTo(fx + sway, 160);
            ctx.lineTo(fx + 8 + sway, 160);
            ctx.lineTo(fx + 8, 120);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 8; i++) {
            const sx = (i * 60) % 480;
            const sy = 100 + Math.sin(t * 1 + i * 2) * 15;
            ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,200,100,0.08)';
        ctx.fillRect(0, 0, 480, 28);
        ctx.fillRect(0, 172, 480, 28);

        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('𐤀𐤁𐤂𐤃𐤄 𐤅𐤆𐤇𐤈𐤉 𐤊𐤋𐤌𐤍𐤎', 240, 20);
        ctx.fillText('CARTHAGO DEI KOTHAN', 240, 195);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t);
        ctx.font = 'bold 10px monospace';
        ctx.fillText('EMPIRE', 20, 162);
        ctx.fillText('STRATÉGIE', 400, 162);
        ctx.globalAlpha = 1;
    }

    function drawCarthagePlatformerPreview(c) {
        const ctx = c.getContext('2d');
        const t = frame * 0.03;

        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#4a154b');
        g.addColorStop(0.4, '#6a2050');
        g.addColorStop(0.65, '#c85030');
        g.addColorStop(0.85, '#e89040');
        g.addColorStop(1, '#f0c060');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 200);

        ctx.fillStyle = '#ffb703';
        ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.arc(380, 50, 40, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(380, 50, 20, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#351138';
        ctx.beginPath();
        ctx.moveTo(100, 200); ctx.lineTo(180, 60); ctx.lineTo(260, 200);
        ctx.fill();
        ctx.fillStyle = '#e9d8a6';
        ctx.fillRect(165, 50, 30, 18);

        ctx.fillStyle = 'rgba(20,50,90,0.4)';
        ctx.beginPath(); ctx.arc(80, 120, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a4a20';
        ctx.beginPath(); ctx.arc(80, 120, 15, 0, Math.PI * 2); ctx.fill();

        const platforms = [
            { x: 20, y: 160, w: 140 },
            { x: 180, y: 130, w: 100 },
            { x: 300, y: 150, w: 120 },
            { x: 430, y: 120, w: 70 },
        ];
        for (const p of platforms) {
            ctx.fillStyle = '#e9d8a6';
            ctx.fillRect(p.x, p.y, p.w, 12);
            ctx.fillStyle = '#b08968';
            ctx.fillRect(p.x, p.y, p.w, 4);
        }
        ctx.fillStyle = '#583129';
        ctx.fillRect(0, 190, 480, 10);

        const px = 100 + Math.sin(t * 2) * 60;
        const py = 130 + Math.abs(Math.sin(t * 3)) * -25;
        ctx.save();
        ctx.translate(px + 15, py + 12);
        if (Math.cos(t * 2) > 0) ctx.scale(-1, 1);

        ctx.fillStyle = '#4a154b';
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.quadraticCurveTo(-25, -5 + Math.sin(t * 10) * 3, -30, 5);
        ctx.quadraticCurveTo(-18, 0, -5, 5);
        ctx.fill();

        ctx.fillStyle = '#e9d8a6';
        ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(-2, -18, 4, 3);

        ctx.fillStyle = '#4a154b';
        ctx.fillRect(-7, -6, 14, 18);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.strokeRect(-7, -6, 14, 18);

        ctx.fillStyle = '#fff';
        ctx.fillRect(-6, 14, 12, 8);
        ctx.fillStyle = '#583129';
        ctx.fillRect(-5, 22, 4, 5);
        ctx.fillRect(1, 22, 4, 5);

        ctx.restore();

        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 3; i++) {
            const ax = 80 + i * 120 + Math.sin(t * 2 + i) * 6;
            const ay = 145 + Math.sin(t * 4 + i * 2) * 3;
            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🪙', ax, ay);
        }

        ctx.fillStyle = '#d4a017';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('𐤊𐤓𐤕𐤇𐤃𐤔𐤕', 240, 22);
        ctx.globalAlpha = 0.6;
        ctx.font = '10px sans-serif';
        ctx.fillText('← → ESPACE', 240, 195);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawStratPreview(c) {
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, 480, 200);

        // Dotted globe
        const cx = 200, cy = 100, R = 62;
        for (let y = 0; y < 2 * R; y += 6) {
            for (let x = 0; x < 2 * R; x += 6) {
                const dx = x - R, dy = y - R;
                if (dx * dx + dy * dy < R * R) {
                    const depth = Math.sqrt(1 - (dx * dx + dy * dy) / (R * R));
                    ctx.fillStyle = `rgba(${60 + depth * 90},${120 + depth * 110},${220 + depth * 35},${0.35 + depth * 0.6})`;
                    ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // Empire-colored dots on the sphere (world map feel)
        const spots = [[0.62,0.30,'#d4a017'],[0.45,0.48,'#3a9df5'],[0.72,0.55,'#c84b31'],[0.55,0.62,'#2ecc71'],[0.38,0.28,'#9b59b6'],[0.66,0.42,'#e74c3c']];
        spots.forEach(([sx, sy, col], i) => {
            const a = sx * Math.PI * 2, e = (sy - 0.5) * Math.PI;
            const px = cx + R * Math.cos(e) * Math.cos(a + frame * 0.008) * 0.9;
            const py = cy + R * Math.sin(e) * 0.9;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(px, py, 2.5 + Math.sin(frame * 0.05 + i) * 0.5, 0, Math.PI * 2); ctx.fill();
        });

        // Title glow
        ctx.fillStyle = '#d4a017'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('STRAT', 320, 80);
        ctx.fillStyle = '#8a8aaa'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('18 empires · 123 territoires', 320, 102);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(320, 140, 22 + Math.sin(frame * 0.04) * 3, 0, Math.PI * 2); ctx.fill();

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 12; i++) ctx.fillRect((i * 37 + 15) % 480, (i * 23 + 8) % 60, 1.2, 1.2);
    }

    function drawT3alamPreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a2a5a'); g.addColorStop(0.6, '#0e4a8a'); g.addColorStop(1, '#0984e3');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        // Sun glow
        ctx.fillStyle = 'rgba(255, 220, 120, 0.18)';
        ctx.beginPath(); ctx.arc(390, 50, 46 + Math.sin(frame * 0.03) * 4, 0, Math.PI * 2); ctx.fill();

        // Ground dunes
        ctx.fillStyle = '#0a3a6a';
        ctx.beginPath(); ctx.ellipse(120, 190, 180, 40, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(360, 195, 190, 46, 0, Math.PI, 0); ctx.fill();

        // Floating Arabic letters (alphabet journey)
        const letters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'];
        ctx.font = 'bold 22px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
        letters.forEach((ch, i) => {
            const lx = 40 + i * 55;
            const ly = 150 - (Math.abs(i - 3.5) * 14) + Math.sin(frame * 0.04 + i * 0.8) * 6;
            ctx.fillStyle = ['#ffd166', '#ff9f43', '#54a0ff', '#5f27cd', '#ff6b6b', '#2ecc71', '#f368e0', '#feca57'][i];
            ctx.beginPath(); ctx.arc(lx, ly, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0b1f3a'; ctx.fillText(ch, lx, ly + 8);
        });

        // Lion mascot
        const lx = 240, ly = 96 + Math.sin(frame * 0.05) * 4;
        ctx.fillStyle = '#d9a14b'; ctx.beginPath(); ctx.arc(lx, ly, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c48a34'; ctx.beginPath(); ctx.arc(lx - 14, ly - 12, 8, 0, Math.PI * 2); ctx.arc(lx + 14, ly - 12, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath(); ctx.arc(lx - 7, ly - 2, 2.4, 0, Math.PI * 2); ctx.arc(lx + 7, ly - 2, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(lx, ly + 6, 4, 0, Math.PI); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.6; ctx.stroke();

        // Title
        ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "Segoe UI", sans-serif';
        ctx.fillText('رحلة الحروف', 360, 130);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '11px "Segoe UI", sans-serif';
        ctx.fillText('Alif → Ya', 360, 148);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 14; i++) ctx.fillRect((i * 37 + 15) % 480, (i * 23 + 8) % 70, 1.2, 1.2);
    }

    const drawers = {
        platform: drawPlatformPreview,
        fight: drawFightPreview,
        battle: drawBattlePreview,
        anime: drawAnimePreview,
        pixel: drawPixelPreview,
        jungle: drawJunglePreview,
        manga: drawMangaPreview,
        arabparkour: drawArabParkourPreview,
        shadows: drawShadowsPreview,
        carthage: drawCarthagePreview,
        carthage_platformer: drawCarthagePlatformerPreview,
        engine: drawEnginePreview,
        strat: drawStratPreview,
        t3alam: drawT3alamPreview
    };

    function drawGenericPreview(c) {
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, '#0a1428'); g.addColorStop(1, '#16203a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 200);

        const cx = 240, cy = 100, R = 62;
        for (let y = 0; y < 2 * R; y += 5) {
            for (let x = 0; x < 2 * R; x += 5) {
                const dx = x - R, dy = y - R;
                if (dx * dx + dy * dy < R * R) {
                    const depth = Math.sqrt(1 - (dx * dx + dy * dy) / (R * R));
                    ctx.fillStyle = `rgba(${90 + depth * 60},${150 + depth * 60},${220 + depth * 35},${0.3 + depth * 0.55})`;
                    ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.4, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
        const spots = [[0.55, 0.35, '#d4a017'], [0.4, 0.5, '#3a9df5'], [0.7, 0.52, '#c84b31'], [0.6, 0.65, '#2ecc71']];
        spots.forEach(([sx, sy, col]) => {
            const a = sx * Math.PI * 2, e = (sy - 0.5) * Math.PI;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(cx + R * Math.cos(e) * Math.cos(a + frame * 0.008) * 0.9, cy + R * Math.sin(e) * 0.9, 2.2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 12; i++) ctx.fillRect((i * 37 + 15) % 480, (i * 23 + 8) % 60, 1.2, 1.2);
    }

    const live = new Set();
    let running = false;
    function tick() {
        frame++;
        live.forEach(c => {
            const fn = drawers[c.dataset.game];
            if (fn) fn(c); else drawGenericPreview(c);
        });
        if (live.size) requestAnimationFrame(tick);
    }

    window.PixPreviews = {
        mount(root) {
            live.forEach(c => { if (!document.contains(c)) live.delete(c); });
            (root || document).querySelectorAll('.preview-canvas').forEach(c => {
                if (!c.dataset.fixed) { c.width = 480; c.height = 180; }
                live.add(c);
            });
            if (!running) { running = true; requestAnimationFrame(tick); }
        }
    };
});
