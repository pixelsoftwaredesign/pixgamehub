export class ResourceManager {
    private images: Map<string, HTMLImageElement> = new Map();
    private audio: Map<string, HTMLAudioElement> = new Map();

    public async loadImage(key: string, url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.images.set(key, img);
                resolve(img);
            };
            img.onerror = () => reject(`Impossible de charger l'image : ${url}`);
        });
    }

    public getImage(key: string): HTMLImageElement | undefined {
        return this.images.get(key);
    }

    public async loadAudio(key: string, url: string): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            const aud = new Audio(url);
            aud.oncanplaythrough = () => {
                this.audio.set(key, aud);
                resolve(aud);
            };
            aud.onerror = () => reject(`Impossible de charger l'audio : ${url}`);
        });
    }

    public getAudio(key: string): HTMLAudioElement | undefined {
        return this.audio.get(key);
    }
}
