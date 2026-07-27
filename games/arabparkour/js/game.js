/**
 * game.js — Boucle de jeu principale
 * Le Voleur de Bagdad : Les Sables Scintillants
 */

(function () {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const GAME_W = 960;
    const GAME_H = 540;
    canvas.width = GAME_W;
    canvas.height = GAME_H;

    let gameState = 'menu';
    let player = null;
    let level = null;
    let guards = [];
    let camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let keys = {};
    let time = 0;
    let windForce = 2;
    let sandParticles = [];
    let particles = [];
    let scorePopups = [];

    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    function initGame() {
        level = new Level(6000, GAME_H);
        player = new Player(120, GAME_H - 60 - 40);
        guards = [];
        for (let i = 0; i < 8; i++) {
            const gx = 400 + i * 650 + Math.random() * 200;
            guards.push(new Guard(gx, GAME_H - 60 - 42, 150 + Math.random() * 100));
        }
        camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        sandParticles = [];
        particles = [];
        scorePopups = [];
    }

    window.startGame = function () {
        initGame();
        gameState = 'playing';
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('game-canvas').style.display = 'block';
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('gameover-screen').style.display = 'none';
    };

    window.restartGame = function () {
        startGame();
    };

    function update() {
        if (gameState !== 'playing') return;
        time += 0.016;

        windForce = 2 + Math.sin(time * 0.5) * 1.5;

        const action = player.handleInput(keys);
        if (action === 'sand') {
            throwSand();
        }

        player.update(level.platforms, level.width);

        for (const g of guards) {
            g.update(player, level.platforms);
        }

        for (const g of level.gems) {
            if (!g.collected) {
                const dx = (player.x + player.width / 2) - g.x;
                const dy = (player.y + player.height / 2) - g.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    g.collected = true;
                    player.gems++;
                    player.score += 500;
                    addScorePopup(g.x, g.y, '+500', '#ff6b6b');
                    for (let i = 0; i < 12; i++) {
                        particles.push(createParticle(g.x, g.y, '#ff6b6b'));
                    }
                }
            }
        }

        for (const s of sandParticles) {
            s.x += s.vx;
            s.y += s.vy;
            s.life--;
            s.vy += 0.1;
            for (const g of guards) {
                if (!g.stunned) {
                    const dx = s.x - (g.x + g.width / 2);
                    const dy = s.y - (g.y + g.height / 2);
                    if (Math.sqrt(dx * dx + dy * dy) < 40) {
                        g.stun();
                        player.score += 100;
                        addScorePopup(g.x, g.y - 20, '+100', '#d4a017');
                        for (let i = 0; i < 6; i++) {
                            particles.push(createParticle(s.x, s.y, '#d4a017'));
                        }
                    }
                }
            }
        }
        sandParticles = sandParticles.filter(s => s.life > 0);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life--;
            p.alpha = p.life / p.maxLife;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = scorePopups.length - 1; i >= 0; i--) {
            const sp = scorePopups[i];
            sp.y -= 1;
            sp.life--;
            sp.alpha = sp.life / sp.maxLife;
            if (sp.life <= 0) scorePopups.splice(i, 1);
        }

        camera.targetX = player.x - GAME_W / 2 + player.width / 2;
        camera.targetY = Math.max(0, player.y - GAME_H * 0.4);
        camera.x += (camera.targetX - camera.x) * 0.08;
        camera.y += (camera.targetY - camera.y) * 0.06;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > level.width - GAME_W) camera.x = level.width - GAME_W;
        if (camera.y < 0) camera.y = 0;

        if (player.y > GAME_H + 100) {
            player.takeDamage(100);
        }

        if (player.state === 'dead') {
            gameState = 'gameover';
            document.getElementById('gameover-screen').style.display = 'flex';
            document.getElementById('gameover-title').textContent = 'ATTRAPÉ !';
            document.getElementById('gameover-text').textContent = 'Les gardes vous ont capturé...';
            document.getElementById('gameover-score').textContent = 'Score: ' + player.score + ' | Artéfacts: ' + player.gems + '/' + player.totalGems;
        }

        if (player.gems >= player.totalGems) {
            gameState = 'gameover';
            document.getElementById('gameover-screen').style.display = 'flex';
            document.getElementById('gameover-title').textContent = 'VICTOIRE !';
            document.getElementById('gameover-title').style.color = '#ffd700';
            document.getElementById('gameover-text').textContent = 'Vous avez récupéré tous les artéfacts !';
            document.getElementById('gameover-score').textContent = 'Score final: ' + player.score;
        }

        updateHUD();
    }

    function throwSand() {
        const dir = player.facingRight ? 1 : -1;
        for (let i = 0; i < 8; i++) {
            sandParticles.push({
                x: player.x + player.width / 2 + dir * 15,
                y: player.y + player.height / 2 - 5,
                vx: dir * (4 + Math.random() * 3),
                vy: -2 + Math.random() * 4,
                life: 25 + Math.random() * 10,
                size: 2 + Math.random() * 2,
                color: '#d4a373'
            });
        }
    }

    function createParticle(x, y, color) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            alpha: 1,
            size: 1.5 + Math.random() * 2,
            color: color
        };
    }

    function addScorePopup(x, y, text, color) {
        scorePopups.push({
            x: x, y: y, text: text, color: color,
            life: 40, maxLife: 40, alpha: 1
        });
    }

    function updateHUD() {
        document.getElementById('hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
        document.getElementById('stamina-bar').style.width = (player.stamina / player.maxStamina * 100) + '%';
        document.getElementById('score-display').textContent = player.score;
        document.getElementById('gem-count').textContent = player.gems + ' / ' + player.totalGems;
    }

    function render() {
        if (!level || !player) return;
        ctx.clearRect(0, 0, GAME_W, GAME_H);

        level.drawBackground(ctx, camera, time, GAME_W, GAME_H);

        level.drawBuildings(ctx, camera, time);

        for (const g of guards) {
            g.draw(ctx, camera, time);
        }

        player.drawTrail(ctx, camera);
        player.draw(ctx, camera, time);

        level.drawForeground(ctx, camera, time, windForce);

        for (const s of sandParticles) {
            const sx = s.x - camera.x;
            const sy = s.y - camera.y;
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.life / 30;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const p of particles) {
            const px = p.x - camera.x;
            const py = p.y - camera.y;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        for (const sp of scorePopups) {
            const sx = sp.x - camera.x;
            const sy = sp.y - camera.y;
            ctx.fillStyle = sp.color;
            ctx.globalAlpha = sp.alpha;
            ctx.font = 'bold 14px Georgia';
            ctx.textAlign = 'center';
            ctx.fillText(sp.text, sx, sy);
            ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;

        drawVignette();
    }

    function drawVignette() {
        const g = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_W * 0.3, GAME_W / 2, GAME_H / 2, GAME_W * 0.7);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    function gameLoop() {
        if (gameState === 'playing') {
            update();
            render();
        }
        requestAnimationFrame(gameLoop);
    }

    drawMenuPreview();
    gameLoop();

    function drawMenuPreview() {
        const mc = document.getElementById('menu-canvas');
        const mctx = mc.getContext('2d');
        let mt = 0;

        function animateMenu() {
            mt += 0.03;
            const g = mctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, '#2a0a3a');
            g.addColorStop(0.4, '#5c1a4a');
            g.addColorStop(0.7, '#d4601a');
            g.addColorStop(1, '#f0b848');
            mctx.fillStyle = g;
            mctx.fillRect(0, 0, 600, 300);

            const sunX = 480, sunY = 100;
            mctx.fillStyle = '#ffcc44';
            mctx.globalAlpha = 0.2;
            mctx.beginPath();
            mctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
            mctx.fill();
            mctx.globalAlpha = 0.5;
            mctx.beginPath();
            mctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
            mctx.fill();
            mctx.globalAlpha = 1;

            mctx.fillStyle = '#1a0a2a';
            mctx.globalAlpha = 0.3;
            mctx.beginPath();
            mctx.moveTo(0, 200);
            for (let i = 0; i < 8; i++) {
                mctx.lineTo(i * 80, 200 - 15 - Math.sin(i * 1.2) * 20);
            }
            mctx.lineTo(600, 200);
            mctx.closePath();
            mctx.fill();
            mctx.globalAlpha = 1;

            const buildings = [
                { x: 50, w: 70, h: 100, dome: true },
                { x: 140, w: 50, h: 140, minaret: true },
                { x: 210, w: 90, h: 80, dome: false },
                { x: 330, w: 60, h: 120, minaret: true },
                { x: 410, w: 80, h: 90, dome: true },
                { x: 510, w: 60, h: 110, dome: false },
            ];
            for (const b of buildings) {
                mctx.fillStyle = '#c68642';
                mctx.fillRect(b.x, 220 - b.h, b.w, b.h);
                if (b.dome) {
                    mctx.fillStyle = '#d4a017';
                    mctx.beginPath();
                    mctx.ellipse(b.x + b.w / 2, 220 - b.h, b.w * 0.4, b.h * 0.2, 0, Math.PI, 0, false);
                    mctx.fill();
                }
                if (b.minaret) {
                    mctx.fillStyle = '#d4a373';
                    mctx.fillRect(b.x + b.w / 2 - 5, 220 - b.h - 40, 10, 40);
                    mctx.fillStyle = '#d4a017';
                    mctx.beginPath();
                    mctx.arc(b.x + b.w / 2, 220 - b.h - 40, 7, Math.PI, 0, false);
                    mctx.fill();
                }
            }

            for (let i = 0; i < 3; i++) {
                const bx = 100 + i * 180;
                const sway = Math.sin(mt * 2.5 + i * 1.5) * 6;
                mctx.fillStyle = i % 2 === 0 ? '#8b0000' : '#722f37';
                mctx.beginPath();
                mctx.moveTo(bx, 200);
                mctx.quadraticCurveTo(bx + sway * 0.4, 215, bx + sway, 230);
                mctx.lineTo(bx + 5 + sway, 230);
                mctx.quadraticCurveTo(bx + 5 + sway * 0.4, 215, bx + 5, 200);
                mctx.closePath();
                mctx.fill();
            }

            mctx.fillStyle = '#c68642';
            mctx.fillRect(0, 260, 600, 40);

            const px = 300 + Math.sin(mt * 2) * 40;
            const py = 230;
            mctx.fillStyle = '#4a154b';
            mctx.fillRect(px - 6, py - 5, 12, 15);
            mctx.fillStyle = '#e9d8a6';
            mctx.beginPath();
            mctx.arc(px, py - 12, 6, 0, Math.PI * 2);
            mctx.fill();
            mctx.fillStyle = '#d4a017';
            mctx.beginPath();
            mctx.arc(px, py - 15, 7, Math.PI, 0, false);
            mctx.fill();

            ctx.fillStyle = '#d4a017';
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 6; i++) {
                const dx = (i * 100 + mt * 20) % 600;
                const dy = 150 + Math.sin(mt * 2 + i) * 20;
                mctx.beginPath();
                mctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                mctx.fill();
            }
            mctx.globalAlpha = 1;

            if (gameState === 'menu') requestAnimationFrame(animateMenu);
        }
        animateMenu();
    }
})();
