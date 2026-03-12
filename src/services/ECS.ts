import * as THREE from 'three';

// Entity Component System (ECS) for game objects
export type EntityId = string;

// Components
export interface TransformComponent {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface PhysicsComponent {
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  friction: number;
  gravity: boolean;
}

export interface HealthComponent {
  current: number;
  max: number;
  invulnerable: boolean;
  invulnerabilityTime: number;
}

export interface CollisionComponent {
  radius: number;
  type: 'sphere' | 'aabb';
  layer: string; // e.g., 'player', 'enemy', 'projectile', 'collectible'
  mask: string[]; // Which layers this can collide with
}

export interface RenderComponent {
  mesh: THREE.Object3D;
  visible: boolean;
}

export interface AIComponent {
  type: 'enemy' | 'boss' | 'vaper' | 'dushnila' | 'monkey';
  speed: number;
  attackRange: number;
  state: string;
  target: EntityId | null;
}

export interface ProjectileComponent {
  type: 'cigarette' | 'lighter' | 'coffee' | 'ashtray' | 'goyda';
  damage: number;
  lifetime: number;
  bounces: number;
  maxBounces: number;
  power: number;
}

export interface CollectibleComponent {
  type: 'ammo' | 'coffee' | 'gossip' | 'clothing' | 'gramota' | 'neuronka' | 'pizza' | 'speed' | 'shield' | 'power' | 'ashtray';
  value: number;
  effect: () => void;
}

export interface PlayerComponent {
  speed: number;
  jumpForce: number;
  isGrounded: boolean;
  ammo: number;
  score: number;
  buffs: BuffComponent[];
}

export interface BuffComponent {
  type: string;
  duration: number;
  effect: () => void;
}

// Component storage
class ComponentStorage<T> {
  private components: Map<EntityId, T> = new Map();

  set(entityId: EntityId, component: T): void {
    this.components.set(entityId, component);
  }

  get(entityId: EntityId): T | undefined {
    return this.components.get(entityId);
  }

  has(entityId: EntityId): boolean {
    return this.components.has(entityId);
  }

  delete(entityId: EntityId): void {
    this.components.delete(entityId);
  }

  getAll(): Map<EntityId, T> {
    return this.components;
  }

  clear(): void {
    this.components.clear();
  }
}

// Entity Manager
export class EntityManager {
  private nextId = 0;
  private entities: Set<EntityId> = new Set();

  // Component storages
  transform = new ComponentStorage<TransformComponent>();
  physics = new ComponentStorage<PhysicsComponent>();
  health = new ComponentStorage<HealthComponent>();
  collision = new ComponentStorage<CollisionComponent>();
  render = new ComponentStorage<RenderComponent>();
  ai = new ComponentStorage<AIComponent>();
  projectile = new ComponentStorage<ProjectileComponent>();
  collectible = new ComponentStorage<CollectibleComponent>();
  player = new ComponentStorage<PlayerComponent>();

  createEntity(): EntityId {
    const id = `entity_${this.nextId++}`;
    this.entities.add(id);
    return id;
  }

  destroyEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
    this.transform.delete(entityId);
    this.physics.delete(entityId);
    this.health.delete(entityId);
    this.collision.delete(entityId);
    this.render.delete(entityId);
    this.ai.delete(entityId);
    this.projectile.delete(entityId);
    this.collectible.delete(entityId);
    this.player.delete(entityId);
  }

  getEntity(entityId: EntityId): EntityId | undefined {
    return this.entities.has(entityId) ? entityId : undefined;
  }

  getAllEntities(): Set<EntityId> {
    return this.entities;
  }

  // Query entities with specific components
  queryEntities(...componentTypes: string[]): EntityId[] {
    const result: EntityId[] = [];
    for (const entityId of this.entities) {
      let hasAll = true;
      for (const type of componentTypes) {
        if (!this.hasComponent(entityId, type)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) {
        result.push(entityId);
      }
    }
    return result;
  }

  private hasComponent(entityId: EntityId, componentType: string): boolean {
    switch (componentType) {
      case 'transform': return this.transform.has(entityId);
      case 'physics': return this.physics.has(entityId);
      case 'health': return this.health.has(entityId);
      case 'collision': return this.collision.has(entityId);
      case 'render': return this.render.has(entityId);
      case 'ai': return this.ai.has(entityId);
      case 'projectile': return this.projectile.has(entityId);
      case 'collectible': return this.collectible.has(entityId);
      case 'player': return this.player.has(entityId);
      default: return false;
    }
  }
}

// Systems
export interface System {
  update(dt: number, entityManager: EntityManager): void;
}

export class PhysicsSystem implements System {
  update(dt: number, entityManager: EntityManager): void {
    const entities = entityManager.queryEntities('transform', 'physics');
    for (const entityId of entities) {
      const transform = entityManager.transform.get(entityId)!;
      const physics = entityManager.physics.get(entityId)!;

      // Apply gravity
      if (physics.gravity) {
        physics.acceleration.y -= 9.8;
      }

      // Apply acceleration to velocity
      physics.velocity.add(physics.acceleration.clone().multiplyScalar(dt));

      // Apply friction
      physics.velocity.x *= (1 - physics.friction * dt);
      physics.velocity.z *= (1 - physics.friction * dt);

      // Update position
      transform.position.add(physics.velocity.clone().multiplyScalar(dt));

      // Reset acceleration for next frame
      physics.acceleration.set(0, 0, 0);

      // Ground collision (simple)
      if (transform.position.y < 0 && physics.gravity) {
        transform.position.y = 0;
        physics.velocity.y = 0;
      }
    }
  }
}

export class CollisionSystem implements System {
  update(dt: number, entityManager: EntityManager): void {
    const entitiesWithCollision = entityManager.queryEntities('transform', 'collision');

    for (let i = 0; i < entitiesWithCollision.length; i++) {
      const entityA = entitiesWithCollision[i];
      const transformA = entityManager.transform.get(entityA)!;
      const collisionA = entityManager.collision.get(entityA)!;

      for (let j = i + 1; j < entitiesWithCollision.length; j++) {
        const entityB = entitiesWithCollision[j];
        const transformB = entityManager.transform.get(entityB)!;
        const collisionB = entityManager.collision.get(entityB)!;

        // Check if layers can collide
        if (!collisionA.mask.includes(collisionB.layer) && !collisionB.mask.includes(collisionA.layer)) {
          continue;
        }

        // Fast sphere collision check
        const dx = transformA.position.x - transformB.position.x;
        const dy = transformA.position.y - transformB.position.y;
        const dz = transformA.position.z - transformB.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radiusSum = collisionA.radius + collisionB.radius;

        if (distSq < radiusSum * radiusSum) {
          this.handleCollision(entityManager, entityA, entityB);
        }
      }
    }
  }

  private handleCollision(entityManager: EntityManager, entityA: EntityId, entityB: EntityId): void {
    // Dispatch collision event based on component types
    const hasProjectileA = entityManager.projectile.has(entityA);
    const hasProjectileB = entityManager.projectile.has(entityB);
    const hasCollectibleA = entityManager.collectible.has(entityA);
    const hasCollectibleB = entityManager.collectible.has(entityB);

    if (hasProjectileA && !hasCollectibleB) {
      // Projectile hit something
      const projectile = entityManager.projectile.get(entityA)!;
      const healthB = entityManager.health.get(entityB);
      if (healthB) {
        healthB.current -= projectile.damage * projectile.power;
      }
      // Mark projectile for removal
      entityManager.destroyEntity(entityA);
    } else if (hasProjectileB && !hasCollectibleA) {
      // Projectile hit something
      const projectile = entityManager.projectile.get(entityB)!;
      const healthA = entityManager.health.get(entityA);
      if (healthA) {
        healthA.current -= projectile.damage * projectile.power;
      }
      // Mark projectile for removal
      entityManager.destroyEntity(entityB);
    } else if (hasCollectibleA || hasCollectibleB) {
      // Collectible pickup
      const collectibleEntity = hasCollectibleA ? entityA : entityB;
      const collectible = entityManager.collectible.get(collectibleEntity)!;
      collectible.effect();
      entityManager.destroyEntity(collectibleEntity);
    } else if (entityManager.player.has(entityA) || entityManager.player.has(entityB)) {
      // Player collision with enemy/obstacle
      const playerEntity = entityManager.player.has(entityA) ? entityA : entityB;
      const otherEntity = entityManager.player.has(entityA) ? entityB : entityA;

      // Check if player has shield buff
      const player = entityManager.player.get(playerEntity)!;
      const hasShield = player.buffs.some(b => b.type === 'shield');

      if (!hasShield) {
        // Player takes damage or dies
        const health = entityManager.health.get(playerEntity)!;
        health.current = 0; // Instant death for now
      }
    }
  }
}

export class AISystem implements System {
  update(dt: number, entityManager: EntityManager): void {
    const entitiesWithAI = entityManager.queryEntities('transform', 'ai');

    for (const entityId of entitiesWithAI) {
      const transform = entityManager.transform.get(entityId)!;
      const ai = entityManager.ai.get(entityId)!;
      const physics = entityManager.physics.get(entityId);

      // Find player
      const playerEntities = entityManager.queryEntities('player');
      if (playerEntities.length === 0) continue;

      const playerTransform = entityManager.transform.get(playerEntities[0])!;
      const distanceToPlayer = transform.position.distanceTo(playerTransform.position);

      // Move towards player
      if (distanceToPlayer > ai.attackRange) {
        const direction = new THREE.Vector3()
          .subVectors(playerTransform.position, transform.position)
          .normalize();

        if (physics) {
          physics.acceleration.add(direction.multiplyScalar(ai.speed));
        } else {
          transform.position.add(direction.multiplyScalar(ai.speed * dt));
        }

        // Face player
        transform.rotation.y = Math.atan2(direction.x, direction.z);
      }
    }
  }
}

export class ProjectileSystem implements System {
  update(dt: number, entityManager: EntityManager): void {
    const entitiesWithProjectile = entityManager.queryEntities('transform', 'projectile');

    for (const entityId of entitiesWithProjectile) {
      const projectile = entityManager.projectile.get(entityId)!;

      // Update lifetime
      projectile.lifetime -= dt;
      if (projectile.lifetime <= 0) {
        entityManager.destroyEntity(entityId);
      }
    }
  }
}

export class HealthSystem implements System {
  update(dt: number, entityManager: EntityManager): void {
    const entitiesWithHealth = entityManager.queryEntities('health');

    for (const entityId of entitiesWithHealth) {
      const health = entityManager.health.get(entityId)!;

      // Check if dead
      if (health.current <= 0) {
        // Handle death
        entityManager.destroyEntity(entityId);
      }

      // Update invulnerability
      if (health.invulnerable) {
        health.invulnerabilityTime -= dt;
        if (health.invulnerabilityTime <= 0) {
          health.invulnerable = false;
        }
      }
    }
  }
}

// Game World
export class GameWorld {
  entityManager: EntityManager;
  private systems: System[] = [];

  constructor() {
    this.entityManager = new EntityManager();
    this.systems = [
      new PhysicsSystem(),
      new CollisionSystem(),
      new AISystem(),
      new ProjectileSystem(),
      new HealthSystem()
    ];
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(dt, this.entityManager);
    }
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index > -1) {
      this.systems.splice(index, 1);
    }
  }
}

// Factory functions for creating entities
export function createPlayerEntity(entityManager: EntityManager, mesh: THREE.Object3D): EntityId {
  const id = entityManager.createEntity();

  entityManager.transform.set(id, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
    scale: mesh.scale.clone()
  });

  entityManager.health.set(id, {
    current: 100,
    max: 100,
    invulnerable: false,
    invulnerabilityTime: 0
  });

  entityManager.collision.set(id, {
    radius: 1.0,
    type: 'sphere',
    layer: 'player',
    mask: ['enemy', 'projectile', 'collectible', 'obstacle']
  });

  entityManager.render.set(id, {
    mesh,
    visible: true
  });

  entityManager.player.set(id, {
    speed: 15,
    jumpForce: 15,
    isGrounded: true,
    ammo: 10,
    score: 0,
    buffs: []
  });

  return id;
}

export function createEnemyEntity(
  entityManager: EntityManager,
  mesh: THREE.Object3D,
  type: AIComponent['type'],
  hp: number,
  speed: number
): EntityId {
  const id = entityManager.createEntity();

  entityManager.transform.set(id, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
    scale: mesh.scale.clone()
  });

  entityManager.health.set(id, {
    current: hp,
    max: hp,
    invulnerable: false,
    invulnerabilityTime: 0
  });

  entityManager.collision.set(id, {
    radius: 1.0,
    type: 'sphere',
    layer: 'enemy',
    mask: ['player', 'projectile']
  });

  entityManager.render.set(id, {
    mesh,
    visible: true
  });

  entityManager.ai.set(id, {
    type,
    speed,
    attackRange: 1.5,
    state: 'idle',
    target: null
  });

  return id;
}

export function createProjectileEntity(
  entityManager: EntityManager,
  mesh: THREE.Object3D,
  type: ProjectileComponent['type'],
  damage: number,
  power: number = 1
): EntityId {
  const id = entityManager.createEntity();

  entityManager.transform.set(id, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
    scale: mesh.scale.clone()
  });

  entityManager.collision.set(id, {
    radius: 0.5,
    type: 'sphere',
    layer: 'projectile',
    mask: ['enemy', 'obstacle']
  });

  entityManager.render.set(id, {
    mesh,
    visible: true
  });

  entityManager.projectile.set(id, {
    type,
    damage,
    lifetime: 5.0,
    bounces: 0,
    maxBounces: 3,
    power
  });

  return id;
}