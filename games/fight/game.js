// ============================================================
//  KUNG FU ARENA - COMBAT DE RUE
//  Complete 2D Fighting Game
// ============================================================

(function () {
    "use strict";

    // ── CONSTANTS ──────────────────────────────────────────
    const W = 1200, H = 600;
    const GROUND_Y = H - 80;
    const GRAVITY = 0.65;
    const MAX_HP = 1000;
    const MAX_METER = 100;
    const ROUND_TIME = 99;
    const WINS_NEEDED = 2;
    const BLOCK_REDUCTION = 0.2;

    const ATTACKS = {
        punch:   { startup: 4, active: 4, recovery: 8,  range: 55,  damage: 60,  meterGain: 5,  hitStop: 4,  knockback: 4  },
        kick:    { startup: 6, active: 5, recovery: 10, range: 70,  damage: 90,  meterGain: 8,  hitStop: 6,  knockback: 7  },
        special: { startup: 10, active: 6, recovery: 14, range: 90, damage: 160, meterGain: 0, hitStop: 10, knockback: 12 }
    };
    const SPECIAL_COST = 50;
    const COMBO_WINDOW = 30;

    const FIGHTER_DEFS = [
        {
            id: "dragon", name: "DRAGON", color: "#2266dd", color2: "#1144aa", headband: "#ff2222",
            desc: "Balanced",
            stats: { speed: 5, jump: 12, damage: 1.0, range: 1.0 }
        },
        {
            id: "tiger", name: "TIGER", color: "#dd8822", color2: "#aa6611", headband: "#222",
            desc: "Powerful",
            stats: { speed: 4, jump: 11, damage: 1.35, range: 1.1 }
        },
        {
            id: "crane", name: "CRANE", color: "#eee", color2: "#bbb", headband: "#2266ff",
            desc: "Fast",
            stats: { speed: 7, jump: 14, damage: 0.85, range: 0.95 }
        },
        {
            id: "serpent", name: "SERPENT", color: "#22aa44", color2: "#117733", headband: "#cc22cc",
            desc: "Cunning",
            stats: { speed: 6, jump: 13, damage: 0.9, range: 1.15 }
        }
    ];

    // ── INPUT MAP ──────────────────────────────────────────
    const KEY_MAP = {
        p1: {
            left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS",
            punch: "KeyF", kick: "KeyG", special: "KeyH", block: "KeyA"
        },
        p2: {
            left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
            punch: "KeyJ", kick: "KeyK", special: "KeyL", block: "ArrowLeft"
        }
    };

    // ── STATE ──────────────────────────────────────────────
    let state = "title"; // title | select | playing | roundEnd | result
    let keys = {};
    let players = [null, null];
    let roundWins = [0, 0];
    let currentRound = 0;
    let timer = ROUND_TIME;
    let timerAccum = 0;
    let hitStopTimer = 0;
    let shakeTimer = 0;
    let shakeIntensity = 0;
    let screenFlash = 0;
    let effects = [];
    let particles = [];
    let lanterns = [];
    let backgroundBuildings = [];
    let roundOverlayTimer = 0;

    // ── DOM ────────────────────────────────────────────────
    const $ = (s) => document.querySelector(s);
    const titleScreen = $("#title-screen");
    const selectScreen = $("#select-screen");
    const gameScreen = $("#game-screen");
    const resultScreen = $("#result-screen");
    const canvas = $("#game-canvas");
    const ctx = canvas.getContext("2d");
    const hp1Bar = $("#hp1"), hp2Bar = $("#hp2");
    const hp1Dmg = $("#hp1-dmg"), hp2Dmg = $("#hp2-dmg");
    const meter1Bar = $("#meter1"), meter2Bar = $("#meter2");
    const timerEl = $("#timer");
    const comboP1 = $("#combo-p1"), comboP2 = $("#combo-p2");
    const rounds1El = $("#rounds1"), rounds2El = $("#rounds2");
    const roundOverlay = $("#round-overlay");
    const roundText = $("#round-text");

    canvas.width = W;
    canvas.height = H;

    // ── BACKGROUND SETUP ───────────────────────────────────
    function initBackground() {
        lanterns = [];
        backgroundBuildings = [];
        for (let i = 0; i < 6; i++) {
            backgroundBuildings.push({
                x: i * 210 + Math.random() * 40 - 20,
                w: 80 + Math.random() * 60,
                h: 120 + Math.random() * 100,
                color: `rgb(${15 + Math.random() * 15}, ${10 + Math.random() * 15}, ${20 + Math.random() * 20})`
            });
        }
        for (let i = 0; i < 5; i++) {
            lanterns.push({
                x: 120 + i * 240,
                swing: Math.random() * Math.PI * 2
            });
        }
    }
    initBackground();

    // ── FIGHTER CLASS ──────────────────────────────────────
    function createFighter(def, playerIndex) {
        const side = playerIndex === 0 ? 200 : W - 200;
        return {
            def,
            playerIndex,
            x: side,
            y: GROUND_Y,
            vx: 0,
            vy: 0,
            hp: MAX_HP,
            hpDisplay: MAX_HP,
            meter: 0,
            facing: playerIndex === 0 ? 1 : -1,
            grounded: true,
            dashing: false,
            dashTimer: 0,
            blocking: false,
            state: "idle",
            stateTimer: 0,
            attackType: null,
            comboCount: 0,
            comboTimer: 0,
            lastHitFrame: 0,
            animFrame: 0,
            animTimer: 0,
            roundWins: 0,
            walkFrame: 0
        };
    }

    // ── SCREEN SWITCHING ───────────────────────────────────
    function showScreen(name) {
        [titleScreen, selectScreen, gameScreen, resultScreen].forEach(s => s.classList.remove("active"));
        state = name;
        if (name === "title") titleScreen.classList.add("active");
        else if (name === "select") selectScreen.classList.add("active");
        else if (name === "playing") gameScreen.classList.add("active");
        else if (name === "result") resultScreen.classList.add("active");
    }

    // ── CHARACTER SELECT ───────────────────────────────────
    let p1Choice = -1, p2Choice = -1;

    function buildSelectScreen() {
        const p1Cards = $("#p1-cards");
        const p2Cards = $("#p2-cards");
        p1Cards.innerHTML = "";
        p2Cards.innerHTML = "";

        FIGHTER_DEFS.forEach((f, i) => {
            p1Cards.appendChild(makeCard(f, i, 0));
            p2Cards.appendChild(makeCard(f, i, 1));
        });
    }

    function makeCard(f, index, player) {
        const card = document.createElement("div");
        card.className = "fighter-card";
        card.dataset.index = index;

        const icon = document.createElement("div");
        icon.className = "fc-icon";
        icon.style.background = f.color;
        icon.style.borderRadius = "4px";
        card.appendChild(icon);

        const name = document.createElement("div");
        name.className = "fc-name";
        name.textContent = f.name;
        name.style.color = f.color;
        card.appendChild(name);

        const stats = document.createElement("div");
        stats.className = "fc-stats";
        const labels = ["SPD", "JMP", "DMG", "RNG"];
        const vals = [f.stats.speed, f.stats.jump, f.stats.damage, f.stats.range];
        const maxVals = [7, 14, 1.35, 1.15];
        labels.forEach((l, si) => {
            const pct = Math.min(vals[si] / maxVals[si], 1) * 100;
            const color = si === 2 ? "#ff4444" : si === 0 ? "#44aaff" : si === 1 ? "#44ff44" : "#ffaa00";
            stats.innerHTML += `<div>${l} <span class="stat-bar" style="width:${pct * 0.4}px;background:${color}"></span></div>`;
        });
        card.appendChild(stats);

        card.addEventListener("click", () => {
            if (player === 0) {
                p1Choice = index;
                p1Cards.querySelectorAll(".fighter-card").forEach(c => c.classList.remove("selected-p1"));
                card.classList.add("selected-p1");
                $("#p1-selected").textContent = f.name;
                $("#p1-selected").style.color = f.color;
            } else {
                p2Choice = index;
                p2Cards.querySelectorAll(".fighter-card").forEach(c => c.classList.remove("selected-p2"));
                card.classList.add("selected-p2");
                $("#p2-selected").textContent = f.name;
                $("#p2-selected").style.color = f.color;
            }
            updateFightBtn();
        });

        return card;
    }

    function updateFightBtn() {
        $("#btn-fight").disabled = p1Choice < 0 || p2Choice < 0;
    }

    // ── ROUND MANAGEMENT ───────────────────────────────────
    function startMatch() {
        roundWins = [0, 0];
        currentRound = 0;
        startRound();
    }

    function startRound() {
        currentRound++;
        timer = ROUND_TIME;
        timerAccum = 0;
        effects = [];
        particles = [];
        hitStopTimer = 0;
        shakeTimer = 0;

        players[0] = createFighter(FIGHTER_DEFS[p1Choice], 0);
        players[1] = createFighter(FIGHTER_DEFS[p2Choice], 1);

        showScreen("playing");
        updateRoundDots();
        showRoundOverlay(`ROUND ${currentRound}`, 120, () => {
            showRoundOverlay("FIGHT!", 80, () => {
                roundOverlay.classList.add("hidden");
            });
        });
    }

    function showRoundOverlay(text, duration, cb) {
        roundText.textContent = text;
        roundOverlay.classList.remove("hidden");
        roundOverlayTimer = duration;
        if (cb) {
            const iv = setInterval(() => {
                roundOverlayTimer--;
                if (roundOverlayTimer <= 0) {
                    clearInterval(iv);
                    cb();
                }
            }, 16);
        }
    }

    function endRound(winnerIndex) {
        state = "roundEnd";
        if (winnerIndex >= 0) {
            roundWins[winnerIndex]++;
            updateRoundDots();
        }

        const txt = winnerIndex >= 0 ? `${players[winnerIndex].def.name} WINS!` : "DRAW!";
        showRoundOverlay(txt, 120, () => {
            if (roundWins[0] >= WINS_NEEDED || roundWins[1] >= WINS_NEEDED) {
                showResult();
            } else {
                startRound();
            }
        });
    }

    function showResult() {
        const winner = roundWins[0] >= WINS_NEEDED ? 0 : 1;
        const wt = $("#winner-text");
        wt.textContent = `PLAYER ${winner + 1} - ${players[winner].def.name} WINS!`;
        wt.style.color = players[winner].def.color;
        showScreen("result");
    }

    function updateRoundDots() {
        rounds1El.innerHTML = "";
        rounds2El.innerHTML = "";
        for (let i = 0; i < WINS_NEEDED; i++) {
            const d1 = document.createElement("div");
            d1.className = "round-dot" + (i < roundWins[0] ? " won" : "");
            rounds1El.appendChild(d1);
            const d2 = document.createElement("div");
            d2.className = "round-dot" + (i < roundWins[1] ? " won" : "");
            rounds2El.appendChild(d2);
        }
    }

    // ── ATTACK LOGIC ───────────────────────────────────────
    function startAttack(fighter, type) {
        if (fighter.state !== "idle" && fighter.state !== "walk") return;
        const atkDef = ATTACKS[type];
        if (type === "special" && fighter.meter < SPECIAL_COST) return;

        fighter.state = "attack_startup";
        fighter.attackType = type;
        fighter.stateTimer = atkDef.startup;

        if (type === "special") fighter.meter -= SPECIAL_COST;
    }

    function processAttackHit(attacker, defender) {
        const atkDef = ATTACKS[attacker.attackType];
        const hitX = attacker.x + attacker.facing * atkDef.range;
        const dx = Math.abs(hitX - defender.x);
        const dy = Math.abs(attacker.y - defender.y);

        if (dx < atkDef.range && dy < 60) {
            let dmg = atkDef.damage * attacker.def.stats.damage;
            let blocked = defender.blocking;

            if (blocked) {
                dmg *= BLOCK_REDUCTION;
                spawnBlockParticles(defender.x - defender.facing * 20, defender.y - 40);
            }

            defender.hp = Math.max(0, defender.hp - dmg);
            attacker.meter = Math.min(MAX_METER, attacker.meter + atkDef.meterGain);
            defender.meter = Math.min(MAX_METER, defender.meter + atkDef.meterGain * 0.5);

            // Knockback
            const kb = blocked ? atkDef.knockback * 0.3 : atkDef.knockback;
            defender.vx = attacker.facing * kb;
            if (!blocked) defender.vy = -3;

            // Hit stop
            hitStopTimer = atkDef.hitStop;

            // Screen shake on heavy hits
            if (dmg > 80 && !blocked) {
                shakeTimer = 8;
                shakeIntensity = Math.min(dmg / 20, 8);
            }

            // Combo
            if (attacker.comboTimer > 0) {
                attacker.comboCount++;
            } else {
                attacker.comboCount = 1;
            }
            attacker.comboTimer = COMBO_WINDOW;

            // Effects
            const fx = defender.x - defender.facing * 20;
            const fy = defender.y - 40;
            if (attacker.attackType === "punch") {
                spawnHitSpark(fx, fy);
            } else if (attacker.attackType === "kick") {
                spawnKickArc(fx, fy);
            } else {
                spawnSpecialRing(fx, fy);
            }

            screenFlash = blocked ? 3 : 6;
        }
    }

    // ── EFFECTS ────────────────────────────────────────────
    function spawnHitSpark(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.3;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 10 + Math.random() * 8, maxLife: 18, size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? "#ffcc00" : "#ffffff", type: "spark"
            });
        }
    }

    function spawnKickArc(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 10) * i - Math.PI / 4;
            const speed = 4 + Math.random() * 3;
            particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 12 + Math.random() * 6, maxLife: 18, size: 2 + Math.random() * 2,
                color: "#ff6600", type: "arc"
            });
        }
    }

    function spawnSpecialRing(x, y) {
        effects.push({
            type: "ring", x, y, radius: 5, maxRadius: 60, life: 15, maxLife: 15
        });
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const speed = 5 + Math.random() * 4;
            particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 15 + Math.random() * 10, maxLife: 25, size: 3 + Math.random() * 4,
                color: ["#ff44ff", "#44ffff", "#ffcc00"][Math.floor(Math.random() * 3)], type: "energy"
            });
        }
    }

    function spawnBlockParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x + Math.random() * 10 - 5, y: y + Math.random() * 10 - 5,
                vx: Math.random() * 4 - 2, vy: -Math.random() * 3 - 1,
                life: 8 + Math.random() * 6, maxLife: 14, size: 2 + Math.random() * 2,
                color: "#88aaff", type: "block"
            });
        }
    }

    function spawnSpeedLine(x, y, dir) {
        particles.push({
            x, y: y + Math.random() * 20 - 10,
            vx: -dir * (8 + Math.random() * 5), vy: 0,
            life: 6, maxLife: 6, size: 1, color: "rgba(255,255,255,0.5)", type: "speedline"
        });
    }

    // ── UPDATE ─────────────────────────────────────────────
    function update() {
        if (state !== "playing" && state !== "roundEnd") return;
        if (state === "roundEnd") {
            updateEffects();
            return;
        }

        // Hit stop
        if (hitStopTimer > 0) {
            hitStopTimer--;
            updateEffects();
            return;
        }

        // Timer
        timerAccum += 1;
        if (timerAccum >= 60) {
            timerAccum -= 60;
            timer--;
            if (timer <= 0) {
                timer = 0;
                endRound(players[0].hp >= players[1].hp ? 0 : (players[1].hp >= players[0].hp ? 1 : -1));
                return;
            }
        }

        // Update players
        for (let i = 0; i < 2; i++) {
            const p = players[i];
            const opp = players[1 - i];
            const ctrl = KEY_MAP[`p${i + 1}`];

            // Face opponent
            p.facing = opp.x > p.x ? 1 : -1;

            // Blocking
            p.blocking = keys[ctrl.block] && (p.state === "idle" || p.state === "walk" || p.blocking);
            if (p.state.startsWith("attack")) p.blocking = false;

            // State machine
            if (p.state === "idle" || p.state === "walk") {
                // Movement
                let moving = false;
                if (keys[ctrl.left]) {
                    p.vx = -p.def.stats.speed * 1.2;
                    moving = true;
                } else if (keys[ctrl.right]) {
                    p.vx = p.def.stats.speed * 1.2;
                    moving = true;
                } else {
                    p.vx *= 0.7;
                }

                p.state = moving ? "walk" : "idle";

                // Speed lines
                if (moving && p.grounded && Math.random() > 0.6) {
                    spawnSpeedLine(p.x - p.facing * 20, p.y - 10, p.facing);
                }

                // Jump
                if (keys[ctrl.up] && p.grounded) {
                    p.vy = -p.def.stats.jump;
                    p.grounded = false;
                }

                // Dash (double tap detection via dashTimer)
                if (keys[ctrl.down] && p.grounded) {
                    p.dashing = true;
                    p.dashTimer = 10;
                    p.vx = p.facing * 12;
                    p.vy = -2;
                    p.grounded = false;
                }

                // Attacks
                if (keys[ctrl.special]) {
                    startAttack(p, "special");
                    keys[ctrl.special] = false;
                } else if (keys[ctrl.kick]) {
                    startAttack(p, "kick");
                    keys[ctrl.kick] = false;
                } else if (keys[ctrl.punch]) {
                    startAttack(p, "punch");
                    keys[ctrl.punch] = false;
                }

            } else if (p.state === "attack_startup") {
                p.stateTimer--;
                if (p.stateTimer <= 0) {
                    p.state = "attack_active";
                    p.stateTimer = ATTACKS[p.attackType].active;
                    p.lastHitFrame = -1;
                }
            } else if (p.state === "attack_active") {
                p.stateTimer--;
                processAttackHit(p, opp);
                if (p.stateTimer <= 0) {
                    p.state = "attack_recovery";
                    p.stateTimer = ATTACKS[p.attackType].recovery;
                }
            } else if (p.state === "attack_recovery") {
                p.stateTimer--;
                p.vx *= 0.85;
                if (p.stateTimer <= 0) {
                    p.state = "idle";
                    p.attackType = null;
                }
            }

            // Physics
            p.vy += GRAVITY;
            p.x += p.vx;
            p.y += p.vy;

            // Ground
            if (p.y >= GROUND_Y) {
                p.y = GROUND_Y;
                p.vy = 0;
                p.grounded = true;
                p.dashing = false;
            }

            // Bounds
            p.x = Math.max(30, Math.min(W - 30, p.x));

            // Combo timer
            if (p.comboTimer > 0) {
                p.comboTimer--;
                if (p.comboTimer <= 0) p.comboCount = 0;
            }

            // Smooth HP display
            p.hpDisplay += (p.hp - p.hpDisplay) * 0.15;

            // Anim timer
            p.animTimer++;
            if (p.animTimer % 6 === 0) p.animFrame++;
        }

        updateEffects();
        updateUI();
    }

    function updateEffects() {
        // Shake
        if (shakeTimer > 0) shakeTimer--;
        if (screenFlash > 0) screenFlash--;

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Effects
        for (let i = effects.length - 1; i >= 0; i--) {
            const e = effects[i];
            e.life--;
            e.radius += (e.maxRadius - e.radius) * 0.2;
            if (e.life <= 0) effects.splice(i, 1);
        }

        // Lanterns
        lanterns.forEach(l => { l.swing += 0.02; });
    }

    function updateUI() {
        const p1 = players[0], p2 = players[1];
        hp1Bar.style.width = (p1.hpDisplay / MAX_HP * 100) + "%";
        hp2Bar.style.width = (p2.hpDisplay / MAX_HP * 100) + "%";
        hp1Dmg.style.width = (p1.hp / MAX_HP * 100) + "%";
        hp2Dmg.style.width = (p2.hp / MAX_HP * 100) + "%";
        meter1Bar.style.width = (p1.meter / MAX_METER * 100) + "%";
        meter2Bar.style.width = (p2.meter / MAX_METER * 100) + "%";
        meter1Bar.classList.toggle("full", p1.meter >= SPECIAL_COST);
        meter2Bar.classList.toggle("full", p2.meter >= SPECIAL_COST);
        timerEl.textContent = timer < 10 ? "0" + timer : timer;
        timerEl.classList.toggle("urgent", timer <= 10);

        // Combos
        if (p1.comboCount > 1 && p1.comboTimer > 0) {
            comboP1.textContent = `${p1.comboCount} HITS! COMBO`;
            comboP1.classList.add("visible");
        } else {
            comboP1.classList.remove("visible");
        }
        if (p2.comboCount > 1 && p2.comboTimer > 0) {
            comboP2.textContent = `${p2.comboCount} HITS! COMBO`;
            comboP2.classList.add("visible");
        } else {
            comboP2.classList.remove("visible");
        }

        // HP bar color
        const hp1Pct = p1.hp / MAX_HP;
        const hp2Pct = p2.hp / MAX_HP;
        hp1Bar.style.background = hp1Pct > 0.5 ? "linear-gradient(180deg, #44ff44, #22aa22)" :
                                   hp1Pct > 0.25 ? "linear-gradient(180deg, #ffcc00, #cc9900)" :
                                   "linear-gradient(180deg, #ff4444, #cc2222)";
        hp2Bar.style.background = hp2Pct > 0.5 ? "linear-gradient(180deg, #44ff44, #22aa22)" :
                                   hp2Pct > 0.25 ? "linear-gradient(180deg, #ffcc00, #cc9900)" :
                                   "linear-gradient(180deg, #ff4444, #cc2222)";
    }

    // ── RENDER ─────────────────────────────────────────────
    function render() {
        ctx.save();

        // Screen shake
        if (shakeTimer > 0 && hitStopTimer <= 0) {
            const sx = (Math.random() - 0.5) * shakeIntensity;
            const sy = (Math.random() - 0.5) * shakeIntensity;
            ctx.translate(sx, sy);
        }

        // Screen flash
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${screenFlash * 0.06})`;
            ctx.fillRect(-10, -10, W + 20, H + 20);
        }

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#0a0a1a");
        skyGrad.addColorStop(0.5, "#111133");
        skyGrad.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Moon
        ctx.fillStyle = "rgba(255,255,200,0.9)";
        ctx.beginPath();
        ctx.arc(W - 150, 80, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,200,0.1)";
        ctx.beginPath();
        ctx.arc(W - 150, 80, 60, 0, Math.PI * 2);
        ctx.fill();

        // Stars
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 50; i++) {
            const sx = ((i * 137 + 42) % W);
            const sy = ((i * 89 + 17) % (H * 0.5));
            const ss = ((i * 23) % 3 === 0) ? 1.5 : 1;
            ctx.globalAlpha = 0.4 + (Math.sin(Date.now() * 0.001 + i) + 1) * 0.3;
            ctx.fillRect(sx, sy, ss, ss);
        }
        ctx.globalAlpha = 1;

        // Background buildings
        backgroundBuildings.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
            // Windows
            ctx.fillStyle = "rgba(255,200,50,0.3)";
            for (let wy = GROUND_Y - b.h + 15; wy < GROUND_Y - 10; wy += 25) {
                for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(wx, wy, 8, 10);
                    }
                }
            }
        });

        // Lanterns
        lanterns.forEach(l => {
            const swingX = Math.sin(l.swing) * 5;
            // Rope
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(l.x, GROUND_Y - 200);
            ctx.lineTo(l.x + swingX, GROUND_Y - 150);
            ctx.stroke();
            // Lantern body
            ctx.fillStyle = "#cc2200";
            ctx.beginPath();
            ctx.ellipse(l.x + swingX, GROUND_Y - 140, 10, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Glow
            const glowGrad = ctx.createRadialGradient(l.x + swingX, GROUND_Y - 140, 2, l.x + swingX, GROUND_Y - 140, 40);
            glowGrad.addColorStop(0, "rgba(255,100,0,0.3)");
            glowGrad.addColorStop(1, "rgba(255,100,0,0)");
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(l.x + swingX, GROUND_Y - 140, 40, 0, Math.PI * 2);
            ctx.fill();
        });

        // Ground / stage floor
        const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
        floorGrad.addColorStop(0, "#2a2a3a");
        floorGrad.addColorStop(1, "#1a1a2a");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

        // Floor line
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();

        // Floor tile pattern
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for (let tx = 0; tx < W; tx += 60) {
            ctx.beginPath();
            ctx.moveTo(tx, GROUND_Y);
            ctx.lineTo(tx, H);
            ctx.stroke();
        }

        // Effects (behind fighters)
        effects.forEach(e => {
            if (e.type === "ring") {
                const alpha = e.life / e.maxLife;
                ctx.strokeStyle = `rgba(200,100,255,${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = `rgba(100,200,255,${alpha * 0.5})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        // Fighters
        if (players[0] && players[1]) {
            // Hit stop freeze effect
            if (hitStopTimer > 0) {
                ctx.fillStyle = "rgba(255,255,255,0.08)";
                ctx.fillRect(0, 0, W, H);
            }

            drawFighter(players[0]);
            drawFighter(players[1]);
        }

        // Particles
        particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            if (p.type === "speedline") {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * 2, p.y);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    function drawFighter(f) {
        const x = f.x, y = f.y;
        const dir = f.facing;
        const c = f.def.color;
        const c2 = f.def.color2;
        const headband = f.def.headband;

        ctx.save();
        ctx.translate(x, y);

        // Block shield
        if (f.blocking) {
            ctx.strokeStyle = "rgba(100,180,255,0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(dir * 5, -30, 35, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(100,180,255,0.1)";
            ctx.fill();
        }

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- LEGS ---
        const walkCycle = f.state === "walk" ? Math.sin(f.animTimer * 0.3) * 10 : 0;
        const kickExtend = (f.state === "attack_active" && f.attackType === "kick") ? 15 : 0;
        const jumpOffset = f.grounded ? 0 : -5;

        // Back leg
        ctx.fillStyle = c2;
        ctx.fillRect(-8 - dir * 2, -18 + jumpOffset, 8, 18);
        // Front leg
        ctx.fillStyle = c2;
        ctx.fillRect(dir * 2 + walkCycle * 0.5, -18 + jumpOffset, 8, 18);

        // Kick extension
        if (kickExtend > 0) {
            ctx.fillStyle = c2;
            ctx.fillRect(dir * 10, -14 + jumpOffset, kickExtend, 6);
            // Foot
            ctx.fillStyle = "#553322";
            ctx.fillRect(dir * (10 + kickExtend), -16 + jumpOffset, 6, 8);
        } else {
            // Feet
            ctx.fillStyle = "#553322";
            ctx.fillRect(-8 - dir * 2 + walkCycle * -0.3, -2, 10, 4);
            ctx.fillRect(dir * 2 + walkCycle * 0.5, -2, 10, 4);
        }

        // --- BODY ---
        ctx.fillStyle = c;
        ctx.fillRect(-12, -50 + jumpOffset, 24, 32);

        // Belt / sash
        ctx.fillStyle = headband;
        ctx.fillRect(-12, -24 + jumpOffset, 24, 4);

        // --- ARMS ---
        const punchExtend = (f.state === "attack_active" && f.attackType === "punch") ? 25 : 0;
        const specialExtend = (f.state === "attack_active" && f.attackType === "special") ? 30 : 0;

        // Back arm
        ctx.fillStyle = c;
        ctx.fillRect(-14 - dir * 2, -46 + jumpOffset, 6, 18);

        // Front arm
        if (punchExtend > 0) {
            // Extended punching arm
            ctx.fillStyle = c;
            ctx.fillRect(dir * 10, -44 + jumpOffset, punchExtend, 6);
            // Fist
            ctx.fillStyle = "#553322";
            ctx.fillRect(dir * (10 + punchExtend), -46 + jumpOffset, 8, 10);
        } else if (specialExtend > 0) {
            // Both arms extended for special
            ctx.fillStyle = c;
            ctx.fillRect(dir * 10, -46 + jumpOffset, specialExtend, 5);
            ctx.fillRect(dir * 10, -40 + jumpOffset, specialExtend, 5);
            // Energy glow
            const glowAlpha = 0.4 + Math.sin(f.animTimer * 0.5) * 0.3;
            ctx.fillStyle = `rgba(200,100,255,${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(dir * (10 + specialExtend + 5), -43 + jumpOffset, 10, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = c;
            ctx.fillRect(dir * 10, -46 + jumpOffset, 6, 18);
        }

        // --- HEAD ---
        // Head shape
        ctx.fillStyle = "#f0c8a0";
        ctx.beginPath();
        ctx.arc(0, -58 + jumpOffset, 12, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeX = dir * 3;
        ctx.fillStyle = "#000";
        ctx.fillRect(eyeX - 2, -61 + jumpOffset, 3, 4);
        ctx.fillRect(eyeX + 3, -61 + jumpOffset, 3, 4);

        // Eye whites (expression based on state)
        if (f.state.startsWith("attack")) {
            // Intense eyes
            ctx.fillStyle = "#fff";
            ctx.fillRect(eyeX - 2, -61 + jumpOffset, 3, 2);
            ctx.fillRect(eyeX + 3, -61 + jumpOffset, 3, 2);
        }

        // Mouth
        if (f.blocking) {
            ctx.fillStyle = "#000";
            ctx.fillRect(eyeX - 1, -54 + jumpOffset, 4, 2);
        } else if (f.state.startsWith("attack")) {
            ctx.fillStyle = "#000";
            ctx.fillRect(eyeX - 2, -54 + jumpOffset, 6, 3);
        }

        // Headband
        ctx.fillStyle = headband;
        ctx.fillRect(-13, -66 + jumpOffset, 26, 4);
        // Headband tails
        const tailWave = Math.sin(f.animTimer * 0.15) * 3;
        ctx.fillStyle = headband;
        ctx.fillRect(-13 - dir * 5, -66 + jumpOffset + tailWave, 10, 3);
        ctx.fillRect(-13 - dir * 12, -66 + jumpOffset + tailWave * 1.5, 8, 3);

        // --- BLOCK EFFECT ---
        if (f.blocking) {
            ctx.strokeStyle = "rgba(100,200,255,0.4)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(-18, -70 + jumpOffset, 36, 55);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    // ── INPUT ──────────────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        keys[e.code] = true;
        e.preventDefault();
    });
    document.addEventListener("keyup", (e) => {
        keys[e.code] = false;
        e.preventDefault();
    });

    // ── BUTTONS ────────────────────────────────────────────
    $("#btn-play").addEventListener("click", () => {
        buildSelectScreen();
        showScreen("select");
    });

    $("#btn-fight").addEventListener("click", () => {
        if (p1Choice >= 0 && p2Choice >= 0) startMatch();
    });

    $("#btn-rematch").addEventListener("click", () => {
        startMatch();
    });

    $("#btn-back-select").addEventListener("click", () => {
        showScreen("select");
    });

    // ── GAME LOOP ──────────────────────────────────────────
    function gameLoop() {
        update();
        if (state === "playing" || state === "roundEnd") {
            render();
        }
        requestAnimationFrame(gameLoop);
    }

    showScreen("title");
    gameLoop();

})();
