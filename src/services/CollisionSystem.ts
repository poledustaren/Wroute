import * as THREE from 'three';

// Bounding sphere for fast collision detection
export interface BoundingSphere {
  position: THREE.Vector3;
  radius: number;
}

// Material cache for reusing materials
const materialCache = new Map<string, THREE.Material>();

export function getMaterial(type: 'standard' | 'basic', color: number, options?: {
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
}): THREE.Material {
  const key = `${type}_${color}_${JSON.stringify(options)}`;
  
  if (!materialCache.has(key)) {
    let material: THREE.Material;
    
    if (type === 'standard') {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: options?.roughness ?? 0.8,
        metalness: options?.metalness ?? 0.1,
        emissive: options?.emissive ?? 0x000000,
        emissiveIntensity: options?.emissiveIntensity ?? 1,
        transparent: options?.transparent ?? false,
        opacity: options?.opacity ?? 1,
        wireframe: options?.wireframe ?? false
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: options?.transparent ?? false,
        opacity: options?.opacity ?? 1,
        wireframe: options?.wireframe ?? false
      });
    }
    
    materialCache.set(key, material);
  }
  
  return materialCache.get(key)!;
}

// Fast sphere-sphere collision check
export function checkSphereCollision(
  pos1: THREE.Vector3, 
  radius1: number, 
  pos2: THREE.Vector3, 
  radius2: number
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const radiusSum = radius1 + radius2;
  return distSq < (radiusSum * radiusSum);
}

// Fast sphere-box approximate collision (uses bounding sphere for box)
export function checkSphereBoxCollision(
  spherePos: THREE.Vector3,
  sphereRadius: number,
  box: THREE.Object3D,
  boxMargin: number = 0.2
): boolean {
  // Get box's world position
  const boxPos = box.position;
  
  // Approximate box radius based on scale
  const boxRadius = Math.max(
    box.scale.x,
    box.scale.y,
    box.scale.z
  ) * 0.5 + boxMargin;
  
  return checkSphereCollision(spherePos, sphereRadius, boxPos, boxRadius);
}

// Entity with bounding sphere for efficient collision
export interface CollisionEntity {
  position: THREE.Vector3;
  boundingRadius: number;
  group?: THREE.Group;
  mesh?: THREE.Object3D;
}

// Collision manager that maintains a list of entities
export class CollisionManager {
  private entities: CollisionEntity[] = [];
  
  add(entity: CollisionEntity): void {
    this.entities.push(entity);
  }
  
  remove(entity: CollisionEntity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }
  
  clear(): void {
    this.entities = [];
  }
  
  // Check collision between two entities
  checkCollision(a: CollisionEntity, b: CollisionEntity): boolean {
    return checkSphereCollision(
      a.position, a.boundingRadius,
      b.position, b.boundingRadius
    );
  }
  
  // Check collision between entity and point
  checkPointCollision(entity: CollisionEntity, point: THREE.Vector3): boolean {
    return checkSphereCollision(
      entity.position, entity.boundingRadius,
      point, 0
    );
  }
  
  // Get all entities colliding with a specific entity
  getCollisions(entity: CollisionEntity): CollisionEntity[] {
    const result: CollisionEntity[] = [];
    for (const other of this.entities) {
      if (other !== entity && this.checkCollision(entity, other)) {
        result.push(other);
      }
    }
    return result;
  }
  
  // Get all entities colliding with a sphere
  getCollisionsWithSphere(position: THREE.Vector3, radius: number): CollisionEntity[] {
    const result: CollisionEntity[] = [];
    for (const entity of this.entities) {
      if (checkSphereCollision(position, radius, entity.position, entity.boundingRadius)) {
        result.push(entity);
      }
    }
    return result;
  }
}

// Optimized collision check for the existing game
export function checkFastCollision(
  obj1: THREE.Object3D,
  obj2: THREE.Object3D,
  margin: number = 0.2
): boolean {
  // Fast sphere-sphere check using positions
  const dx = obj1.position.x - obj2.position.x;
  const dy = obj1.position.y - obj2.position.y;
  const dz = obj1.position.z - obj2.position.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  
  // Estimate radius based on scale (approximation)
  const r1 = (Math.max(obj1.scale.x, obj1.scale.y, obj1.scale.z) * 0.5) + margin;
  const r2 = (Math.max(obj2.scale.x, obj2.scale.y, obj2.scale.z) * 0.5) + margin;
  const radiusSum = r1 + r2;
  
  return distSq < (radiusSum * radiusSum);
}

// More accurate AABB collision (still fast)
export function checkAABBCollision(
  obj1: THREE.Object3D,
  obj2: THREE.Object3D,
  margin: number = 0.2
): boolean {
  // Use world matrices for accurate bounds
  const box1 = new THREE.Box3().setFromObject(obj1);
  const box2 = new THREE.Box3().setFromObject(obj2);
  
  // Apply margin
  box1.min.addScalar(margin);
  box1.max.subScalar(margin);
  box2.min.addScalar(margin);
  box2.max.subScalar(margin);
  
  return box1.intersectsBox(box2);
}

// Spatial hash grid for broad phase collision detection
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Set<CollisionEntity>> = new Map();
  
  constructor(cellSize: number = 5) {
    this.cellSize = cellSize;
  }
  
  private getKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }
  
  insert(entity: CollisionEntity): void {
    const key = this.getKey(entity.position);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(entity);
  }
  
  remove(entity: CollisionEntity): void {
    const key = this.getKey(entity.position);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(entity);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
  }
  
  getNearby(position: THREE.Vector3): CollisionEntity[] {
    const result: CollisionEntity[] = [];
    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);
    
    // Check 3x3x3 neighborhood
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
          const cell = this.grid.get(key);
          if (cell) {
            result.push(...cell);
          }
        }
      }
    }
    
    return result;
  }
  
  clear(): void {
    this.grid.clear();
  }
}