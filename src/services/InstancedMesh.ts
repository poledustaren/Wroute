import * as THREE from 'three';

// Instanced mesh manager for rendering many similar objects efficiently
export class InstancedMeshManager {
  private instances: Map<string, {
    mesh: THREE.InstancedMesh;
    count: number;
    maxCount: number;
    positions: THREE.Vector3[];
    rotations: THREE.Euler[];
    scales: THREE.Vector3[];
    visible: boolean[];
  }> = new Map();

  // Create or get an instanced mesh for a specific geometry/material combination
  getInstancedMesh(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    initialCount: number = 100
  ): THREE.InstancedMesh {
    if (!this.instances.has(key)) {
      const mesh = new THREE.InstancedMesh(geometry, material, initialCount);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.instances.set(key, {
        mesh,
        count: 0,
        maxCount: initialCount,
        positions: [],
        rotations: [],
        scales: [],
        visible: []
      });
    }

    return this.instances.get(key)!.mesh;
  }

  // Add an instance
  addInstance(
    key: string,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler(),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ): number {
    const instance = this.instances.get(key);
    if (!instance) return -1;

    // Grow buffer if needed
    if (instance.count >= instance.maxCount) {
      this.growBuffer(key, Math.ceil(instance.maxCount * 1.5));
    }

    const index = instance.count;
    instance.positions[index] = position.clone();
    instance.rotations[index] = rotation.clone();
    instance.scales[index] = scale.clone();
    instance.visible[index] = true;

    // Update instance matrix
    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    instance.mesh.setMatrixAt(index, matrix);
    instance.mesh.instanceMatrix.needsUpdate = true;

    instance.count++;
    return index;
  }

  // Remove an instance
  removeInstance(key: string, index: number): void {
    const instance = this.instances.get(key);
    if (!instance || index < 0 || index >= instance.count) return;

    // Swap with last element
    const lastIndex = instance.count - 1;
    if (index !== lastIndex) {
      instance.positions[index] = instance.positions[lastIndex];
      instance.rotations[index] = instance.rotations[lastIndex];
      instance.scales[index] = instance.scales[lastIndex];
      instance.visible[index] = instance.visible[lastIndex];

      // Update matrix for swapped element
      const matrix = new THREE.Matrix4();
      matrix.compose(
        instance.positions[index],
        new THREE.Quaternion().setFromEuler(instance.rotations[index]),
        instance.scales[index]
      );
      instance.mesh.setMatrixAt(index, matrix);
    }

    instance.count--;
    instance.mesh.instanceMatrix.needsUpdate = true;
  }

  // Update instance transform
  updateInstance(
    key: string,
    index: number,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    const instance = this.instances.get(key);
    if (!instance || index < 0 || index >= instance.count) return;

    instance.positions[index].copy(position);
    if (rotation) instance.rotations[index].copy(rotation);
    if (scale) instance.scales[index].copy(scale);

    const matrix = new THREE.Matrix4();
    matrix.compose(
      instance.positions[index],
      new THREE.Quaternion().setFromEuler(instance.rotations[index]),
      instance.scales[index]
    );
    instance.mesh.setMatrixAt(index, matrix);
    instance.mesh.instanceMatrix.needsUpdate = true;
  }

  // Set instance visibility
  setInstanceVisible(key: string, index: number, visible: boolean): void {
    const instance = this.instances.get(key);
    if (!instance || index < 0 || index >= instance.count) return;

    instance.visible[index] = visible;
    instance.mesh.setMatrixAt(index, new THREE.Matrix4().makeScale(
      visible ? 1 : 0,
      visible ? 1 : 0,
      visible ? 1 : 0
    ));
    instance.mesh.instanceMatrix.needsUpdate = true;
  }

  // Get instance count
  getInstanceCount(key: string): number {
    return this.instances.get(key)?.count ?? 0;
  }

  // Grow the instance buffer
  private growBuffer(key: string, newCapacity: number): void {
    const instance = this.instances.get(key);
    if (!instance) return;

    const oldMesh = instance.mesh;
    const newMesh = new THREE.InstancedMesh(
      oldMesh.geometry,
      oldMesh.material,
      newCapacity
    );
    newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    newMesh.castShadow = oldMesh.castShadow;
    newMesh.receiveShadow = oldMesh.receiveShadow;

    // Copy existing instances
    for (let i = 0; i < instance.count; i++) {
      const matrix = new THREE.Matrix4();
      oldMesh.getMatrixAt(i, matrix);
      newMesh.setMatrixAt(i, matrix);
    }
    newMesh.instanceMatrix.needsUpdate = true;

    // Replace in scene
    if (oldMesh.parent) {
      oldMesh.parent.remove(oldMesh);
      oldMesh.parent.add(newMesh);
    }
    oldMesh.dispose();

    instance.mesh = newMesh;
    instance.maxCount = newCapacity;
  }

  // Clear all instances of a specific mesh
  clearInstances(key: string): void {
    const instance = this.instances.get(key);
    if (!instance) return;

    instance.count = 0;
    instance.positions = [];
    instance.rotations = [];
    instance.scales = [];
    instance.visible = [];

    // Reset all matrices to identity
    const matrix = new THREE.Matrix4().identity();
    for (let i = 0; i < instance.maxCount; i++) {
      instance.mesh.setMatrixAt(i, matrix);
    }
    instance.mesh.instanceMatrix.needsUpdate = true;
  }

  // Clear all instanced meshes
  clearAll(): void {
    for (const [key, instance] of this.instances) {
      instance.mesh.dispose();
    }
    this.instances.clear();
  }

  // Get the instanced mesh for rendering
  getMesh(key: string): THREE.InstancedMesh | undefined {
    return this.instances.get(key)?.mesh;
  }
}

// Factory functions for common instanced objects
export class InstancedObjectFactory {
  private manager: InstancedMeshManager;

  constructor(manager: InstancedMeshManager) {
    this.manager = manager;
  }

  // Create instanced enemies
  createInstancedEnemy(color: number): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(1.2, 1.4, 0.6);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
    });
    return this.manager.getInstancedMesh(`enemy_${color}`, geometry, material, 50);
  }

  // Create instanced obstacles (desks)
  createInstancedDesk(): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(1.8, 0.1, 1.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1,
    });
    return this.manager.getInstancedMesh('desk', geometry, material, 30);
  }

  // Create instanced collectibles
  createInstancedCollectible(type: string, color: number): THREE.InstancedMesh {
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'neuronka':
        geometry = new THREE.IcosahedronGeometry(0.5, 1);
        break;
      case 'gramota':
        geometry = new THREE.BoxGeometry(0.8, 1.1, 0.05);
        break;
      case 'pizza':
        geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 3, 1, false, 0, Math.PI * 2 / 3);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.3, 8, 8);
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.2,
    });

    return this.manager.getInstancedMesh(`collectible_${type}_${color}`, geometry, material, 30);
  }

  // Create instanced projectiles
  createInstancedProjectile(type: string): THREE.InstancedMesh {
    let geometry: THREE.BufferGeometry;
    let color: number;

    switch (type) {
      case 'cigarette':
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        color = 0xffffff;
        break;
      case 'goyda':
        geometry = new THREE.PlaneGeometry(2, 1);
        color = 0xff6600;
        break;
      default:
        geometry = new THREE.SphereGeometry(0.2, 8, 8);
        color = 0xffffff;
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
    });

    return this.manager.getInstancedMesh(`projectile_${type}`, geometry, material, 100);
  }

  // Create instanced platforms
  createInstancedPlatform(): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(12, 1, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      roughness: 0.9,
      metalness: 0,
    });
    return this.manager.getInstancedMesh('platform', geometry, material, 10);
  }
}