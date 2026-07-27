export class CollisionManager {
    checkPlatformCollisions(entity, platforms) {
        entity.isOnGround = false;

        for (const p of platforms) {
            if (
                entity.x + entity.width > p.x &&
                entity.x < p.x + p.w &&
                entity.y + entity.height >= p.y &&
                entity.y + entity.height - entity.vy <= p.y + 15
            ) {
                entity.y = p.y - entity.height;
                entity.vy = 0;
                entity.isOnGround = true;
            }
        }
    }

    checkFallDeath(entity, deathY = 800) {
        if (entity.y > deathY) {
            entity.alive = false;
            return true;
        }
        return false;
    }

    checkGuardCollision(player, guard) {
        const dx = (player.x + player.width / 2) - (guard.x + guard.width / 2);
        const dy = (player.y + player.height / 2) - (guard.y + guard.height / 2);
        return Math.sqrt(dx * dx + dy * dy) < 35;
    }

    checkArtifactCollision(player, artifact, radius = 30) {
        const dx = (player.x + player.width / 2) - artifact.x;
        const dy = (player.y + player.height / 2) - artifact.y;
        return Math.sqrt(dx * dx + dy * dy) < radius;
    }

    checkShadowZone(entity, shadowZones) {
        for (const zone of shadowZones) {
            if (
                entity.x + entity.width > zone.x &&
                entity.x < zone.x + zone.w &&
                entity.y + entity.height > zone.y &&
                entity.y < zone.y + zone.h
            ) {
                return true;
            }
        }
        return false;
    }

    isOnPlatform(entity, platforms) {
        for (const p of platforms) {
            if (
                entity.x + entity.width > p.x &&
                entity.x < p.x + p.w &&
                Math.abs(entity.y + entity.height - p.y) < 2
            ) {
                return p;
            }
        }
        return null;
    }

    clampToBounds(entity, bounds) {
        if (entity.x < bounds.minX) entity.x = bounds.minX;
        if (entity.x + entity.width > bounds.maxX) entity.x = bounds.maxX - entity.width;
        if (entity.y < bounds.minY) entity.y = bounds.minY;
        if (entity.y + entity.height > bounds.maxY) entity.y = bounds.maxY - entity.height;
    }
}
