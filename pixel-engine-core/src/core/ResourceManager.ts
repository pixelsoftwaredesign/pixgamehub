export type AssetType = 'image' | 'audio' | 'json' | 'yaml' | 'binary';

export interface AssetEntry {
    key: string;
    url: string;
    type: AssetType;
    data: any;
    loaded: boolean;
    error: boolean;
}

export class ResourceManager {
    private assets: Map<string, AssetEntry> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    private totalLoaded: number = 0;
    private totalAssets: number = 0;

    public addAsset(key: string, url: string, type: AssetType): void {
        this.assets.set(key, { key, url, type, data: null, loaded: false, error: false });
        this.totalAssets++;
    }

    public async loadAll(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [key, asset] of this.assets) {
            if (!asset.loaded && !this.loadingPromises.has(key)) {
                promises.push(this.loadAsset(key));
            }
        }

        await Promise.allSettled(promises);
    }

    public async loadAsset(key: string): Promise<any> {
        const asset = this.assets.get(key);
        if (!asset) {
            console.warn(`[ResourceManager] Asset inconnu: ${key}`);
            return null;
        }

        if (asset.loaded) return asset.data;

        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const promise = this.fetchAsset(asset);
        this.loadingPromises.set(key, promise);

        try {
            const data = await promise;
            asset.data = data;
            asset.loaded = true;
            this.totalLoaded++;
            return data;
        } catch (err) {
            asset.error = true;
            console.error(`[ResourceManager] Erreur chargement ${key}:`, err);
            return null;
        } finally {
            this.loadingPromises.delete(key);
        }
    }

    private async fetchAsset(asset: AssetEntry): Promise<any> {
        const response = await fetch(asset.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        switch (asset.type) {
            case 'image':
                return this.loadImage(response);
            case 'audio':
                return this.loadAudio(response);
            case 'json':
                return response.json();
            case 'yaml':
                return response.text();
            case 'binary':
                return response.arrayBuffer();
            default:
                return response.text();
        }
    }

    private async loadImage(response: Response): Promise<HTMLImageElement> {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve(img);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    private async loadAudio(response: Response): Promise<AudioBuffer> {
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new AudioContext();
        return audioCtx.decodeAudioData(arrayBuffer);
    }

    public get<T = any>(key: string): T | null {
        const asset = this.assets.get(key);
        if (asset && asset.loaded) return asset.data as T;
        return null;
    }

    public isLoaded(key: string): boolean {
        return this.assets.get(key)?.loaded || false;
    }

    public getProgress(): number {
        return this.totalAssets > 0 ? this.totalLoaded / this.totalAssets : 1;
    }

    public isFullyLoaded(): boolean {
        return this.totalLoaded >= this.totalAssets;
    }

    public registerProcedural(key: string, data: any): void {
        this.assets.set(key, {
            key,
            url: '',
            type: 'image',
            data,
            loaded: true,
            error: false
        });
        this.totalLoaded++;
        this.totalAssets++;
    }
}
