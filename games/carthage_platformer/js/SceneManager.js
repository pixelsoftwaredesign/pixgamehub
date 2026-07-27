export class SceneManager {
    constructor() {
        this.scenes = {};
        this.currentScene = null;
        this.sceneData = null;
    }

    add(name, scene) {
        this.scenes[name] = scene;
    }

    switch(name, data) {
        if (this.currentScene && this.currentScene.onExit) {
            this.currentScene.onExit();
        }
        this.currentScene = this.scenes[name];
        this.sceneData = data || null;
        if (this.currentScene && this.currentScene.onEnter) {
            this.currentScene.onEnter(data);
        }
    }

    update(dt, inputState) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt, inputState);
        }
    }

    draw(ctx) {
        if (this.currentScene && this.currentScene.draw) {
            this.currentScene.draw(ctx);
        }
    }
}
