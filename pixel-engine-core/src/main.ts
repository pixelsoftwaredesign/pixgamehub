import { Engine } from './core/Engine';
import { GameRenderer } from './renderer/GameRenderer';
import { Camera } from './renderer/Camera';
import { LevelLoader } from './core/LevelLoader';
import { InputManager } from './core/InputManager';
import { AudioSystem } from './core/AudioSystem';
import { PhysicsSystem } from './ecs/systems/PhysicsSystem';
import { MovementSystem } from './ecs/systems/MovementSystem';
import { GuardAISystem } from './ecs/systems/GuardAISystem';
import { createPlayer, createCollider, createHealth, createGrapple } from './ecs/components';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine({ canvas, targetFPS: 60, mode: 'canvas2d' });
const ctx = engine.ctx;
if (!ctx) {
    throw new Error('Canvas2D context non disponible');
}

const camera = new Camera();
camera.setViewport(canvas.width, canvas.height);

const physics = new PhysicsSystem(0.55);
physics.setWorldBounds(0, 0, 8000, 1000);

const movement = new MovementSystem(physics);
const input = new InputManager(canvas);
input.bindMovementSystem(movement);

const loader = new LevelLoader(engine.world);
const level = LevelLoader.createSampleLevel();
loader.loadFromObject(level);

const playerEntities = engine.world.getEntitiesWith('player', 'transform', 'rigidBody');
let playerId = -1;
if (playerEntities.length > 0) {
    playerId = playerEntities[0];
    engine.world.addComponent(playerId, 'player', createPlayer('zayd', 4.0, 10));
    engine.world.addComponent(playerId, 'collider', createCollider(32, 64));
    engine.world.addComponent(playerId, 'health', createHealth(5));
    engine.world.addComponent(playerId, 'grapple', createGrapple(300));
    engine.world.addComponent(playerId, 'stealth', {
        multiplier: 1.0,
        isInShadow: false,
        noiseLevel: 0.2
    });
}

engine.addSystem(movement);
engine.addSystem(physics);

const guardAI = new GuardAISystem();
engine.addSystem(guardAI);

const audio = new AudioSystem();
let audioInitialized = false;
let wasGrounded = false;
let wasGrappleActive = false;
let prevGuardStates: Record<number, string> = {};
let footstepTimer = 0;

const initAudio = () => {
    if (!audioInitialized) {
        audio.init();
        audio.startAmbient();
        audioInitialized = true;
    }
};
document.addEventListener('click', initAudio, { once: false });
document.addEventListener('keydown', initAudio, { once: false });

const gameRenderer = new GameRenderer(ctx);
gameRenderer.setViewport(canvas.width, canvas.height);

engine.setRenderCallback((_interpolation: number) => {
    if (!ctx) return;

    if (playerId >= 0) {
        camera.follow(engine.world, playerId);

        const rb = engine.world.getComponent<{ vx: number; vy: number; isGrounded: boolean }>(playerId, 'rigidBody');
        const grapple = engine.world.getComponent<{ active: boolean }>(playerId, 'grapple');

        if (rb) {
            if (!wasGrounded && rb.isGrounded && Math.abs(rb.vy) < 0.1) {
                audio.playLand();
            }
            wasGrounded = rb.isGrounded;

            if (rb.isGrounded && Math.abs(rb.vx) > 1) {
                footstepTimer++;
                if (footstepTimer % 18 === 0) {
                    audio.playFootstep();
                }
            } else {
                footstepTimer = 0;
            }
        }

        if (grapple) {
            if (grapple.active && !wasGrappleActive) {
                audio.playGrappleAttach();
            } else if (!grapple.active && wasGrappleActive) {
                audio.playGrappleRelease();
            }
            wasGrappleActive = grapple.active;
        }
    }

    const guards = engine.world.getEntitiesWith('guard');
    for (const gid of guards) {
        const guard = engine.world.getComponent<{ state: string }>(gid, 'guard');
        if (!guard) continue;
        const prevState = prevGuardStates[gid];
        if (prevState === 'PATROL' && guard.state === 'SUSPICIOUS') {
            audio.playGuardSuspicious();
        } else if (prevState !== 'ALERTED' && guard.state === 'ALERTED') {
            audio.playGuardAlert();
        }
        prevGuardStates[gid] = guard.state;
    }

    gameRenderer.render(engine.world, camera, playerId);
    input.flush();
});

engine.start();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.setViewport(canvas.width, canvas.height);
    gameRenderer.setViewport(canvas.width, canvas.height);
});

console.log('[PixelEngine] Demarré. Controles: A/D=gauche/droite, Space=sauter, E=grappin, Shift=sprint');
