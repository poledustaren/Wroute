import * as THREE from 'three';

// Generic object pool
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private active: Set<T> = new Set();

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get(): T {
    let obj: T;
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }
    this.resetFn(obj);
    this.active.add(obj);
    return obj;
  }

  release(obj: T) {
    this.active.delete(obj);
    this.pool.push(obj);
  }

  get activeCount(): number {
    return this.active.size;
  }

  get pooledCount(): number {
    return this.pool.length;
  }
}

// Particle pool
export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticlePool {
  private pool: ObjectPool<Particle>;
  private scene: THREE.Scene;
  private geometry: THREE.SphereGeometry;
  private materials: Map<number, THREE.MeshBasicMaterial> = new Map();

  constructor(scene: THREE.Scene, initialSize: number = 50) {
    this.scene = scene;
    this.geometry = new THREE.SphereGeometry(0.1, 4, 4);

    this.pool = new ObjectPool<Particle>(
      () => {
        const mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.8
        }));
        mesh.visible = false;
        this.scene.add(mesh);
        return {
          mesh,
          velocity: new THREE.Vector3(),
          life: 1,
          maxLife: 1,
          active: false
        };
      },
      (particle) => {
        particle.mesh.visible = false;
        particle.active = false;
      },
      initialSize
    );
  }

  get(position: THREE.Vector3, color: number): Particle {
    const particle = this.pool.get();

    // Get or create material for this color
    if (!this.materials.has(color)) {
      this.materials.set(color, new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      }));
    }

    particle.mesh.material = this.materials.get(color)!;
    particle.mesh.position.copy(position);
    particle.mesh.visible = true;
    particle.mesh.material.opacity = 0.8;
    particle.active = true;

    return particle;
  }

  release(particle: Particle) {
    particle.mesh.visible = false;
    this.pool.release(particle);
  }

  dispose() {
    // Dispose all materials
    this.materials.forEach(mat => mat.dispose());
    this.materials.clear();

    // Dispose geometry
    this.geometry.dispose();

    // Remove all mesh objects from scene
    // Note: We'd need to track all created meshes to dispose them
  }
}

// Debris pool
export interface Debris {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  active: boolean;
}

export class DebrisPool {
  private pool: ObjectPool<Debris>;
  private scene: THREE.Scene;
  private geometry: THREE.BoxGeometry;
  private materials: Map<number, THREE.MeshStandardMaterial> = new Map();

  constructor(scene: THREE.Scene, initialSize: number = 50) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);

    this.pool = new ObjectPool<Debris>(
      () => {
        const mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mesh.visible = false;
        this.scene.add(mesh);
        return {
          mesh,
          velocity: new THREE.Vector3(),
          life: 1,
          active: false
        };
      },
      (debris) => {
        debris.mesh.visible = false;
        debris.active = false;
      },
      initialSize
    );
  }

  get(position: THREE.Vector3, color: number): Debris {
    const debris = this.pool.get();

    // Get or create material for this color
    if (!this.materials.has(color)) {
      this.materials.set(color, new THREE.MeshStandardMaterial({ color }));
    }

    debris.mesh.material = this.materials.get(color)!;
    debris.mesh.position.copy(position);
    debris.mesh.visible = true;

    // Randomize position slightly
    debris.mesh.position.x += (Math.random() - 0.5) * 1.5;
    debris.mesh.position.y += (Math.random() - 0.5) * 1.5;
    debris.mesh.position.z += (Math.random() - 0.5) * 1.5;

    debris.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    debris.active = true;

    return debris;
  }

  release(debris: Debris) {
    debris.mesh.visible = false;
    this.pool.release(debris);
  }

  dispose() {
    this.materials.forEach(mat => mat.dispose());
    this.materials.clear();
    this.geometry.dispose();
  }
}

// Floating text pool
export interface FloatingText {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  active: boolean;
}

export class FloatingTextPool {
  private pool: ObjectPool<FloatingText>;
  private scene: THREE.Scene;
  private textureCache: Map<string, THREE.CanvasTexture> = new Map();

  constructor(scene: THREE.Scene, initialSize: number = 10) {
    this.scene = scene;

    this.pool = new ObjectPool<FloatingText>(
      () => {
        const spriteMat = new THREE.SpriteMaterial({ transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.visible = false;
        this.scene.add(sprite);
        return {
          sprite,
          life: 1,
          maxLife: 1,
          active: false
        };
      },
      (ft) => {
        ft.sprite.visible = false;
        ft.active = false;
      },
      initialSize
    );
  }

  get(text: string, position: THREE.Vector3, color: string = '#ffff00'): FloatingText {
    const ft = this.pool.get();

    // Get or create texture for this text/color combination
    const key = `${text}_${color}`;
    if (!this.textureCache.has(key)) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;

      const gradient = ctx.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, '#ff8800');
      ctx.fillStyle = gradient;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, 128, 40);
      ctx.fillText(text, 128, 40);

      this.textureCache.set(key, new THREE.CanvasTexture(canvas));
    }

    ft.sprite.material.map = this.textureCache.get(key)!;
    ft.sprite.material.needsUpdate = true;
    ft.sprite.position.copy(position);
    ft.sprite.position.y += 3;
    ft.sprite.scale.set(4, 1, 1);
    ft.sprite.visible = true;
    ft.sprite.material.opacity = 1;
    ft.active = true;

    return ft;
  }

  release(ft: FloatingText) {
    ft.sprite.visible = false;
    this.pool.release(ft);
  }

  dispose() {
    this.textureCache.forEach(tex => tex.dispose());
    this.textureCache.clear();
  }
}