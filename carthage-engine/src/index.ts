import { Engine } from './core/Engine';
import { SceneManager } from './core/SceneManager';
import { WebGLRenderer } from './renderer/WebGLRenderer';
import { GameScene } from './scenes/GameScene';

window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error("Élément canvas introuvable dans le DOM.");
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    try {
        const renderer = new WebGLRenderer(canvas);
        const sceneManager = new SceneManager();

        const gameScene = new GameScene(renderer, canvas);
        sceneManager.addScene('game', gameScene);

        await sceneManager.switchTo('game');

        const engine = new Engine(
            (dt) => {
                sceneManager.update(dt);
            },
            () => {
                sceneManager.fixedUpdate();
            },
            (interpolation) => {
                sceneManager.render(interpolation);
            }
        );

        engine.start();
        console.log("Moteur Pixel Software Design (Carthage Engine) démarré avec succès !");
    } catch (error) {
        console.error("Erreur critique lors de l'initialisation du moteur :", error);
    }
});
