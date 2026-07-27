import { SceneManager } from './SceneManager.js';
import { CarthageRoofsScene } from './scenes/CarthageRoofsScene.js';
import { StreamerBridge } from './streaming/StreamerBridge.js';
import { AudioManager } from './engine/AudioManager.js';
import { InputManager } from './engine/InputManager.js';
import { GameHUD } from './ui/GameHUD.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        const cr = Math.min(r, w / 2, h / 2);
        this.moveTo(x + cr, y);
        this.arcTo(x + w, y, x + w, y + h, cr);
        this.arcTo(x + w, y + h, x, y + h, cr);
        this.arcTo(x, y + h, x, y, cr);
        this.arcTo(x, y, x + w, y, cr);
        this.closePath();
        return this;
    };
}

window._rrect = function(ctx2, x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
};

const dpr = window.devicePixelRatio || 1;
const displayWidth = canvas.clientWidth || 1280;
const displayHeight = canvas.clientHeight || 720;
if (dpr !== 1) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
} else {
    canvas.width = 1280;
    canvas.height = 720;
}

const sceneManager = new SceneManager();
const streamer = new StreamerBridge(canvas);
const audioManager = new AudioManager();
const inputManager = new InputManager();

let gameHUD = null;
let gameStarted = false;

window.addEventListener('keydown', e => {
    if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault();
        if (streamer.startRecording()) {
            showRecordingBadge(true);
        }
    }

    if (e.code === 'KeyT' && e.ctrlKey) {
        e.preventDefault();
        if (streamer.isRecording) {
            streamer.exportRecording('carthage_gameplay.webm');
            showRecordingBadge(false);
        }
    }

    if (e.code === 'KeyM') {
        audioManager.toggleMute();
        showMuteBadge(audioManager.isMuted);
    }

    if (e.code === 'Space' || e.code === 'Enter') {
        audioManager.resume();
    }

    e.preventDefault();
});

function showRecordingBadge(active) {
    let badge = document.getElementById('rec-badge');
    if (active) {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'rec-badge';
            badge.style.cssText = 'position:fixed;top:12px;right:12px;background:#c1121f;color:#fff;padding:6px 14px;border-radius:6px;font:bold 13px sans-serif;z-index:9999;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
            document.body.appendChild(badge);
        }
        badge.innerHTML = '<span style="width:8px;height:8px;background:#fff;border-radius:50%;animation:pulse 1s infinite"></span> REC';
        badge.style.display = 'flex';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

function showMuteBadge(muted) {
    let badge = document.getElementById('mute-badge');
    if (muted) {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mute-badge';
            badge.style.cssText = 'position:fixed;bottom:12px;right:12px;background:rgba(43,25,16,0.9);color:#d4af37;padding:6px 14px;border-radius:6px;font:bold 12px Georgia,serif;z-index:9999;border:1px solid #d4af37;transition:opacity 0.5s;';
            document.body.appendChild(badge);
        }
        badge.textContent = '🔇 MUTED';
        badge.style.display = 'block';
        setTimeout(() => { if (badge) badge.style.opacity = '0.6'; }, 100);
    } else if (badge) {
        badge.style.display = 'none';
    }
}

const style = document.createElement('style');
style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}';
document.head.appendChild(style);

window.addEventListener('heroSelected', async (e) => {
    const hero = e.detail;

    audioManager.generateSoundEffects();

    const carthageScene = new CarthageRoofsScene(canvas);
    carthageScene.setAudioManager(audioManager);
    carthageScene.setInputManager(inputManager);
    sceneManager.add('rooftops', carthageScene);
    sceneManager.switch('rooftops');

    if (carthageScene.onEnter) {
        carthageScene.onEnter(hero);
    }

    gameHUD = new GameHUD(ctx, canvas);
    gameStarted = true;

    showMuteBadge(audioManager.isMuted);
});

let lastTime = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const rawDt = (timestamp - lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    lastTime = timestamp;

    const w = dpr !== 1 ? canvas.clientWidth : canvas.width;
    const h = dpr !== 1 ? canvas.clientHeight : canvas.height;
    ctx.clearRect(0, 0, w, h);

    inputManager.update();

    if (gameStarted) {
        const inputState = inputManager.getState();
        sceneManager.update(dt, inputState);
        sceneManager.draw(ctx);

        if (gameHUD) {
            const scene = sceneManager.currentScene;
            if (scene && scene.player) {
                const player = scene.player;
                const multi = player.movement ? (typeof player.movement.getStealthMultiplier === 'function' ? player.movement.getStealthMultiplier() : 1) : 1;
                const combo = player.movement ? player.movement.getFlowCombo() : 0;
                const alerted = scene.guards ? scene.guards.filter(g => g.state === 'ALERTED' || g.state === 'SEARCHING').length : 0;
                const suspicious = scene.guards ? scene.guards.filter(g => g.state === 'SUSPICIOUS').length : 0;
                const collected = scene.artifacts ? scene.artifacts.filter(a => a.collected).length : 0;
                const total = scene.artifacts ? scene.artifacts.length : 0;

                gameHUD.draw(
                    player,
                    scene.score || 0,
                    { collected, total },
                    scene.timer || 0,
                    combo,
                    alerted,
                    suspicious,
                    multi
                );
            }
        }

        playAudioFeedback(sceneManager.currentScene, dt);
    }

    requestAnimationFrame(gameLoop);
}

let lastState = 'IDLE';
let lastCombo = 0;

function playAudioFeedback(scene, dt) {
    if (!scene || !scene.player || !scene.player.movement) return;

    const movement = scene.player.movement;
    const currentState = movement.state;
    const currentCombo = movement.getFlowCombo();

    if (currentState !== lastState) {
        switch (currentState) {
            case 'AIR_DASH': audioManager.play('dash'); break;
            case 'SLIDE': audioManager.play('slide'); break;
            case 'WALL_RUN': audioManager.play('wallrun', true); break;
            case 'GRAPPLE': audioManager.play('grapple'); break;
        }

        if (lastState === 'WALL_RUN' && currentState !== 'WALL_RUN') {
            audioManager.play('land');
        }

        lastState = currentState;
    }

    if (currentCombo > lastCombo && currentCombo >= 2) {
        const pitch = 1 + currentCombo * 0.05;
        audioManager.playWithPitch('combo', pitch);
    }
    lastCombo = currentCombo;

    if (scene.gameOver && !scene._audioPlayedGameOver) {
        audioManager.play('hurt');
        scene._audioPlayedGameOver = true;
    }
    if (scene.gameWon && !scene._audioPlayedWin) {
        audioManager.play('collect');
        scene._audioPlayedWin = true;
    }
}

requestAnimationFrame(gameLoop);
