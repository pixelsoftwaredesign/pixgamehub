import { EntityId, Entity, createEntity } from './Entity';

export class World {
    private nextEntityId: EntityId = 1;
    private entities: Map<EntityId, Entity> = new Map();
    private componentsMap: Map<string, Map<EntityId, any>> = new Map();
    private pendingDestroy: EntityId[] = [];
    private componentNames: Set<string> = new Set();

    public createEntity(name: string = ''): EntityId {
        const id = this.nextEntityId++;
        this.entities.set(id, createEntity(id, name));
        return id;
    }

    public destroyEntity(entityId: EntityId): void {
        this.pendingDestroy.push(entityId);
    }

    public flush(): void {
        for (const id of this.pendingDestroy) {
            this.entities.delete(id);
            for (const store of this.componentsMap.values()) {
                store.delete(id);
            }
        }
        this.pendingDestroy = [];
    }

    public addComponent(entityId: EntityId, componentName: string, componentData: any): void {
        if (!this.componentsMap.has(componentName)) {
            this.componentsMap.set(componentName, new Map());
        }
        this.componentsMap.get(componentName)!.set(entityId, componentData);
        this.componentNames.add(componentName);
    }

    public removeComponent(entityId: EntityId, componentName: string): void {
        this.componentsMap.get(componentName)?.delete(entityId);
    }

    public getComponent<T = any>(entityId: EntityId, componentName: string): T | undefined {
        return this.componentsMap.get(componentName)?.get(entityId) as T | undefined;
    }

    public hasComponent(entityId: EntityId, componentName: string): boolean {
        return this.componentsMap.get(componentName)?.has(entityId) || false;
    }

    public getEntity(entityId: EntityId): Entity | undefined {
        return this.entities.get(entityId);
    }

    public isAlive(entityId: EntityId): boolean {
        return this.entities.get(entityId)?.alive || false;
    }

    public getEntitiesWith(...componentNames: string[]): EntityId[] {
        if (componentNames.length === 0) return [];

        const firstMap = this.componentsMap.get(componentNames[0]);
        if (!firstMap) return [];

        const result: EntityId[] = [];
        for (const entityId of firstMap.keys()) {
            const entity = this.entities.get(entityId);
            if (!entity || !entity.alive) continue;

            let hasAll = true;
            for (let i = 1; i < componentNames.length; i++) {
                if (!this.componentsMap.get(componentNames[i])?.has(entityId)) {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) result.push(entityId);
        }
        return result;
    }

    public getEntitiesWithOne(...componentNames: string[]): EntityId[] {
        const result: EntityId[] = [];
        for (const name of componentNames) {
            const store = this.componentsMap.get(name);
            if (store) {
                for (const entityId of store.keys()) {
                    const entity = this.entities.get(entityId);
                    if (entity && entity.alive && !result.includes(entityId)) {
                        result.push(entityId);
                    }
                }
            }
        }
        return result;
    }

    public getEntitiesByTag(tag: string): EntityId[] {
        const result: EntityId[] = [];
        for (const [id, entity] of this.entities) {
            if (entity.alive && entity.tags.has(tag)) {
                result.push(id);
            }
        }
        return result;
    }

    public getEntitiesByName(name: string): EntityId[] {
        const result: EntityId[] = [];
        for (const [id, entity] of this.entities) {
            if (entity.alive && entity.name === name) {
                result.push(id);
            }
        }
        return result;
    }

    public tagEntity(entityId: EntityId, tag: string): void {
        this.entities.get(entityId)?.tags.add(tag);
    }

    public untagEntity(entityId: EntityId, tag: string): void {
        this.entities.get(entityId)?.tags.delete(tag);
    }

    public getAllEntities(): EntityId[] {
        const result: EntityId[] = [];
        for (const [id, entity] of this.entities) {
            if (entity.alive) result.push(id);
        }
        return result;
    }

    public getComponentStore(componentName: string): Map<EntityId, any> | undefined {
        return this.componentsMap.get(componentName);
    }

    public getComponentNames(): string[] {
        return Array.from(this.componentNames);
    }

    public entityCount(): number {
        let count = 0;
        for (const entity of this.entities.values()) {
            if (entity.alive) count++;
        }
        return count;
    }

    public clear(): void {
        this.entities.clear();
        this.componentsMap.clear();
        this.pendingDestroy = [];
        this.nextEntityId = 1;
    }
}
