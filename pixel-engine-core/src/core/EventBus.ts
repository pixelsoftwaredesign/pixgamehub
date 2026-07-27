export type EventCallback = (data?: any) => void;

export interface EventSubscription {
    id: number;
    callback: EventCallback;
    once: boolean;
}

export class EventBus {
    private listeners: Map<string, EventSubscription[]> = new Map();
    private nextId: number = 1;
    private eventLog: Array<{ event: string; timestamp: number; data?: any }> = [];
    private maxLogSize: number = 100;

    public on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const id = this.nextId++;
        const subscription: EventSubscription = { id, callback, once: false };
        this.listeners.get(event)!.push(subscription);

        return () => this.off(event, id);
    }

    public once(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const id = this.nextId++;
        const subscription: EventSubscription = { id, callback, once: true };
        this.listeners.get(event)!.push(subscription);

        return () => this.off(event, id);
    }

    public off(event: string, id: number): void {
        const subs = this.listeners.get(event);
        if (subs) {
            const idx = subs.findIndex(s => s.id === id);
            if (idx !== -1) subs.splice(idx, 1);
        }
    }

    public emit(event: string, data?: any): void {
        this.eventLog.push({ event, timestamp: performance.now(), data });
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog.shift();
        }

        const subs = this.listeners.get(event);
        if (!subs) return;

        const toRemove: number[] = [];
        for (const sub of subs) {
            sub.callback(data);
            if (sub.once) {
                toRemove.push(sub.id);
            }
        }

        if (toRemove.length > 0) {
            for (const id of toRemove) {
                const idx = subs.findIndex(s => s.id === id);
                if (idx !== -1) subs.splice(idx, 1);
            }
        }
    }

    public getEventLog(): Array<{ event: string; timestamp: number; data?: any }> {
        return this.eventLog;
    }

    public clear(): void {
        this.listeners.clear();
        this.eventLog = [];
    }

    public listenerCount(event: string): number {
        return this.listeners.get(event)?.length || 0;
    }
}
