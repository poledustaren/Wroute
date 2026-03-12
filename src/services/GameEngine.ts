import * as THREE from 'three';
import { GameWorld, EntityManager, EntityId, createPlayerEntity, createEnemyEntity, createProjectileEntity } from './ECS';
import { ParticlePool, DebrisPool, FloatingTextPool, Particle, Debris, FloatingText } from './ObjectPool';
import { InstancedMeshManager, InstancedObjectFactory } from './InstancedMesh';

export interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  onScoreUpdate?: (score: number) => void;
  onAmmoUpdate?: (ammo: number) => void;
  onBuffsUpdate?: (buffs: string[]) => void;
  onGameOver?: () => void;
  onPopup?: (text: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gameWorld: GameWorld;
  private entityManager: EntityManager;

  // Pools
  private particlePool: ParticlePool;
  private debrisPool: DebrisPool;
  private floatingTextPool: FloatingTextPool;

  // Instancing
  private instancedManager: InstancedMeshManager;
  private instancedFactory: InstancedObjectFactory;

  // Game state
  private playerId: EntityId | null = null;
  private enemies: EntityId[] = [];
  private projectiles: EntityId[] = [];
  private collectibles: EntityId[] = [];
  private particles: Particle[] = [];
  private debrisList: Debris[] = [];
  private floatingTexts: FloatingText[] = [];

  // Timing
  private lastTime = 0;
  private accumulator = 0;
  private fixedStep = 1 / 60; // 60 FPS physics
  private time = 0;

  // Game config
  private score = 0;
  private ammo = 10;
  private buffs: string[] = [];
  private isGameOver = false;
  private lastGeneratedZ = -200;

  // Callbacks
  private onScoreUpdate?: (score: number) => void;
  private onAmmoUpdate?: (ammo: number) => void;
  private onBuffsUpdate?: (buffs: string[]) => void;
  private onGameOver?: () => void;
  private onPopup?: (text: string) => void;

  // Input state
  input = {
    left: false,
    right: false,
    jump: false,
    shoot: false,
  };

  // Animation frame ID
  private animationFrameId: number | null = null;

  constructor(config: GameEngineConfig) {
    this.canvas = config.canvas;
    this.onScoreUpdate = config.onScoreUpdate;
    this.onAmmoUpdate = config.onAmmoUpdate;
    this.onBuffsUpdate = config.onBuffsUpdate;
    this.onGameOver = config.onGameOver;
    this.onPopup = config.onPopup;

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);
    this.scene.fog = new THREE.Fog(0x0a0a15, 20, 80);

    this.camera = new THREE.PerspectiveCamera(
      75,
      config.width / config.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize game world
    this.gameWorld = new GameWorld();
    this.entityManager = this.gameWorld.entityManager;

    // Initialize pools
    this.particlePool = new ParticlePool(this.scene, 100);
    this.debrisPool = new DebrisPool(this.scene, 100);
    this.floatingTextPool = new FloatingTextPool(this.scene, 20);

    // Initialize instancing
    this.instancedManager = new InstancedMeshManager();
    this.instancedFactory = new InstancedObjectFactory(this.instancedManager);

    // Setup lighting
    this.setupLighting();

    // Setup input
    this.setupInput();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0xff6600, 0.5, 30);
    pointLight1.position.set(-5, 8, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0066ff, 0.5, 30);
    pointLight2.position.set(5, 8, 0);
    this.scene.add(pointLight2);
  }

  private setupInput(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') this.input.left = true;
      if (e.code === 'ArrowRight') this.input.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp') this.input.jump = true;
      if (e.code === 'KeyG' || e.code === 'Enter') this.input.shoot = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'ArrowRight') this.input.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp') this.input.jump = false;
      if (e.code === 'KeyG' || e.code === 'Enter') this.input.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Store cleanup function
    this.cleanupInput = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  private cleanupInput: (() => void) | null = null;

  // Initialize the game
  initialize(): void {
    // Create player
    const playerMesh = this.createPlayerMesh();
    this.scene.add(playerMesh);
    this.playerId = createPlayerEntity(this.entityManager, playerMesh);

    // Generate initial chunks (but don't start loop yet)
    for (let i = 0; i < 4; i++) {
      this.generateChunk(-i * 50);
    }

    // Set initial time but don't start loop
    this.lastTime = performance.now();
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffccaa,
      roughness: 0.5,
      metalness: 0,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.55;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.65, 0.2, 0.65);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.9;
    group.add(hair);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 2.6, 0.31);
    const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), pupilMat);
    leftPupil.position.set(0, 0, 0.03);
    leftEye.add(leftPupil);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 2.6, 0.31);
    const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), pupilMat);
    rightPupil.position.set(0, 0, 0.03);
    rightEye.add(rightPupil);
    group.add(rightEye);

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    group.add(body);

    // Tie
    const tieGeo = new THREE.BoxGeometry(0.15, 0.6, 0.05);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 1.8, 0.26);
    group.add(tie);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
    const handGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.7, 2.1, 0);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.y = -0.4;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -1.0;
    leftArmGroup.add(leftHand);
    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.7, 2.1, 0);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.y = -0.4;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -1.0;
    rightArmGroup.add(rightHand);
    group.add(rightArmGroup);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const shoeGeo = new THREE.BoxGeometry(0.45, 0.2, 0.5);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.25, 1.0, 0);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.y = -0.5;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);
    const leftShoe = new THREE.Mesh(shoeGeo, hairMat);
    leftShoe.position.set(0, -1.1, 0.05);
    leftLegGroup.add(leftShoe);
    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.25, 1.0, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.y = -0.5;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);
    const rightShoe = new THREE.Mesh(shoeGeo, hairMat);
    rightShoe.position.set(0, -1.1, 0.05);
    rightLegGroup.add(rightShoe);
    group.add(rightLegGroup);

    return group;
  }

  private generateChunk(startZ: number): void {
    // Create floor using instanced mesh (simplified for now)
    this.addPlatformInstance(startZ);

    // Generate obstacles and enemies using optimized methods
    const patternRand = Math.random();

    if (patternRand < 0.3) {
      this.generateEnemyFormation(startZ);
    } else {
      this.generateRandomObjects(startZ);
    }
  }

  private addPlatformInstance(z: number): number {
    // For simplicity, using regular meshes for now
    // In production, use instanced meshes
    const floorGeo = new THREE.BoxGeometry(12, 1, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      roughness: 0.9,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.5, z - 25);
    floor.receiveShadow = true;
    this.scene.add(floor);
    return -1;
  }

  private generateEnemyFormation(startZ: number): void {
    const zPos = startZ - 25;

    for (let i = 0; i < 3; i++) {
      const enemyMesh = this.createEnemyMesh(0x880000);
      enemyMesh.position.set(0, 0, zPos - i * 3);
      this.scene.add(enemyMesh);

      const enemyId = createEnemyEntity(this.entityManager, enemyMesh, 'enemy', 1, 8);
      this.enemies.push(enemyId);
    }
  }

  private generateRandomObjects(startZ: number): void {
    const numItems = Math.floor(Math.random() * 3 + 2);

    for (let i = 0; i < numItems; i++) {
      const zPos = startZ - Math.random() * 50;
      const xPos = (Math.random() - 0.5) * 9;

      const rand = Math.random();
      if (rand < 0.4) {
        // Enemy
        const enemyMesh = this.createEnemyMesh(0x880000);
        enemyMesh.position.set(xPos, 0, zPos);
        this.scene.add(enemyMesh);
        const enemyId = createEnemyEntity(this.entityManager, enemyMesh, 'enemy', 1, 8);
        this.enemies.push(enemyId);
      } else if (rand < 0.6) {
        // Obstacle
        const obs = this.createObstacleMesh();
        obs.position.set(xPos, 0, zPos);
        this.scene.add(obs);
      } else if (rand < 0.8) {
        // Collectible
        const collectibleMesh = this.createCollectibleMesh(0x00ff00);
        collectibleMesh.position.set(xPos, 1.5, zPos);
        this.scene.add(collectibleMesh);
      }
    }
  }

  private createEnemyMesh(color: number): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.2, 1.4, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.6;
    head.castShadow = true;
    group.add(head);

    // Angry eyes
    const eyeGeo = new THREE.BoxGeometry(0.2, 0.1, 0.1);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 2.7, 0.41);
    leftEye.rotation.z = -0.2;
    const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), pupilMat);
    leftPupil.position.set(0, 0, 0.02);
    leftEye.add(leftPupil);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 2.7, 0.41);
    rightEye.rotation.z = 0.2;
    const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), pupilMat);
    rightPupil.position.set(0, 0, 0.02);
    rightEye.add(rightPupil);
    group.add(rightEye);

    group.userData = { color, health: 1 };
    return group;
  }

  private createObstacleMesh(): THREE.Group {
    const group = new THREE.Group();
    const topGeo = new THREE.BoxGeometry(1.8, 0.1, 1.2);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 1;
    top.castShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x555555 });

    const positions = [
      [-0.8, 0.5, -0.5],
      [0.8, 0.5, -0.5],
      [-0.8, 0.5, 0.5],
      [0.8, 0.5, 0.5],
    ];

    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    const monitorGeo = new THREE.BoxGeometry(0.8, 0.5, 0.1);
    const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const monitor = new THREE.Mesh(monitorGeo, monitorMat);
    monitor.position.set(0, 1.3, -0.2);
    monitor.castShadow = true;
    group.add(monitor);

    return group;
  }

  private createCollectibleMesh(color: number): THREE.Group {
    const group = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.5, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      wireframe: true,
    });
    const core = new THREE.Mesh(geo, mat);
    group.add(core);

    const innerGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    return group;
  }

  // Main game loop
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = now;

    // Update particles and debris (every frame for smooth animation)
    this.updateParticles(dt);
    this.updateDebris(dt);
    this.updateFloatingTexts(dt);

    if (this.isGameOver) return;

    // Fixed timestep for physics
    this.accumulator += dt;
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.render();
  };

  private update(dt: number): void {
    this.time += dt;

    // Update game world (ECS)
    this.gameWorld.update(dt);

    // Update player based on input
    this.updatePlayer(dt);

    // Update enemies
    this.updateEnemies(dt);

    // Update projectiles
    this.updateProjectiles(dt);

    // Update collectibles
    this.updateCollectibles(dt);

    // Check collisions
    this.checkCollisions();

    // Generate new chunks ahead of player
    if (this.playerId) {
      const transform = this.entityManager.transform.get(this.playerId);
      if (transform && transform.position.z - 60 < this.lastGeneratedZ) {
        this.generateChunk(this.lastGeneratedZ);
        this.lastGeneratedZ -= 50;
      }
    }

    // Update camera
    this.updateCamera();
  }

  private updatePlayer(dt: number): void {
    if (!this.playerId) return;

    const transform = this.entityManager.transform.get(this.playerId);
    const player = this.entityManager.player.get(this.playerId);
    if (!transform || !player) return;

    // Movement
    const moveSpeed = 15;
    if (this.input.left) transform.position.x -= moveSpeed * dt;
    if (this.input.right) transform.position.x += moveSpeed * dt;

    // Clamp to road
    const maxOffsetX = 5;
    if (transform.position.x < -maxOffsetX) transform.position.x = -maxOffsetX;
    if (transform.position.x > maxOffsetX) transform.position.x = maxOffsetX;

    // Move forward
    transform.position.z -= 15 * dt;

    // Jump
    const physics = this.entityManager.physics.get(this.playerId);
    if (physics) {
      if (this.input.jump && transform.position.y <= 0.01) {
        physics.velocity.y = 15;
      }

      // Apply gravity
      physics.velocity.y -= 40 * dt;
      transform.position.y += physics.velocity.y * dt;

      if (transform.position.y < 0) {
        transform.position.y = 0;
        physics.velocity.y = 0;
      }
    }

    // Update mesh position
    const render = this.entityManager.render.get(this.playerId);
    if (render && render.mesh) {
      render.mesh.position.copy(transform.position);
    }

    // Shoot
    if (this.input.shoot) {
      this.shoot();
      this.input.shoot = false;
    }

    // Update score
    this.score += 15 * dt * 0.1;
    if (this.onScoreUpdate) {
      this.onScoreUpdate(Math.floor(this.score));
    }
  }

  private updateEnemies(dt: number): void {
    // Move enemies towards player
    for (const enemyId of this.enemies) {
      const transform = this.entityManager.transform.get(enemyId);
      const physics = this.entityManager.physics.get(enemyId);
      if (!transform || !physics) continue;

      // Simple AI: move towards player
      if (this.playerId) {
        const playerTransform = this.entityManager.transform.get(this.playerId);
        if (playerTransform) {
          const dx = playerTransform.position.x - transform.position.x;
          const dz = playerTransform.position.z - transform.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist > 1) {
            physics.velocity.x = (dx / dist) * 8;
            physics.velocity.z = (dz / dist) * 8;
          }

          // Face player
          transform.rotation.y = Math.atan2(dx, dz);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    // Update projectile positions
    for (const projectileId of this.projectiles) {
      const transform = this.entityManager.transform.get(projectileId);
      const physics = this.entityManager.physics.get(projectileId);
      if (!transform || !physics) continue;

      // Move forward
      transform.position.add(physics.velocity.clone().multiplyScalar(dt));

      // Update mesh
      const render = this.entityManager.render.get(projectileId);
      if (render && render.mesh) {
        render.mesh.position.copy(transform.position);
      }
    }
  }

  private updateCollectibles(dt: number): void {
    // Animate collectibles
    for (const collectibleId of this.collectibles) {
      const transform = this.entityManager.transform.get(collectibleId);
      const render = this.entityManager.render.get(collectibleId);
      if (!transform || !render || !render.mesh) continue;

      // Rotate and bob
      render.mesh.rotation.y += dt * 2;
      render.mesh.position.y = 1.5 + Math.sin(this.time * 3) * 0.2;
    }
  }

  private checkCollisions(): void {
    // Check player vs enemies
    if (this.playerId) {
      const playerTransform = this.entityManager.transform.get(this.playerId);
      if (playerTransform) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemyId = this.enemies[i];
          const enemyTransform = this.entityManager.transform.get(enemyId);
          if (!enemyTransform) continue;

          const dx = playerTransform.position.x - enemyTransform.position.x;
          const dz = playerTransform.position.z - enemyTransform.position.z;
          const distSq = dx * dx + dz * dz;

          if (distSq < 2.25) { // 1.5 radius squared
            this.handlePlayerHit(enemyId);
            break;
          }
        }
      }
    }

    // Check projectiles vs enemies
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectileId = this.projectiles[i];
      const projectileTransform = this.entityManager.transform.get(projectileId);
      if (!projectileTransform) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemyId = this.enemies[j];
        const enemyTransform = this.entityManager.transform.get(enemyId);
        if (!enemyTransform) continue;

        const dx = projectileTransform.position.x - enemyTransform.position.x;
        const dz = projectileTransform.position.z - enemyTransform.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < 2.25) { // Hit
          this.handleProjectileHit(projectileId, enemyId, j);
          break;
        }
      }
    }

    // Check player vs collectibles
    if (this.playerId) {
      const playerTransform = this.entityManager.transform.get(this.playerId);
      if (playerTransform) {
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
          const collectibleId = this.collectibles[i];
          const collectibleTransform = this.entityManager.transform.get(collectibleId);
          if (!collectibleTransform) continue;

          const dx = playerTransform.position.x - collectibleTransform.position.x;
          const dz = playerTransform.position.z - collectibleTransform.position.z;
          const distSq = dx * dx + dz * dz;

          if (distSq < 2.25) { // Pick up
            this.handleCollectiblePickup(collectibleId, i);
          }
        }
      }
    }
  }

  private handlePlayerHit(enemyId: EntityId): void {
    // Check for shield buff
    const hasShield = this.buffs.some(b => b.includes('Щит'));
    if (hasShield) return;

    // Game over
    this.isGameOver = true;

    // Spawn debris
    if (this.playerId) {
      const transform = this.entityManager.transform.get(this.playerId);
      if (transform) {
        for (let i = 0; i < 50; i++) {
          const debris = this.debrisPool.get(transform.position, 0x333333);
          debris.velocity.set(
            (Math.random() - 0.5) * 15,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 15
          );
          debris.life = 1.5;
          this.debrisList.push(debris);
        }
      }

      // Hide player
      const render = this.entityManager.render.get(this.playerId);
      if (render && render.mesh) {
        render.mesh.visible = false;
      }
    }

    // Notify game over
    if (this.onGameOver) {
      this.onGameOver();
    }
  }

  private handleProjectileHit(projectileId: EntityId, enemyId: EntityId, enemyIndex: number): void {
    // Remove projectile
    const projectileRender = this.entityManager.render.get(projectileId);
    if (projectileRender && projectileRender.mesh) {
      this.scene.remove(projectileRender.mesh);
    }
    this.entityManager.destroyEntity(projectileId);
    this.projectiles.splice(this.projectiles.indexOf(projectileId), 1);

    // Damage enemy
    const health = this.entityManager.health.get(enemyId);
    if (health) {
      health.current -= 1;

      if (health.current <= 0) {
        // Enemy died
        const enemyTransform = this.entityManager.transform.get(enemyId);
        if (enemyTransform) {
          // Spawn debris and particles
          for (let i = 0; i < 20; i++) {
            const debris = this.debrisPool.get(enemyTransform.position, 0x880000);
            debris.velocity.set(
              (Math.random() - 0.5) * 15,
              Math.random() * 10 + 5,
              (Math.random() - 0.5) * 15
            );
            debris.life = 1.5;
            this.debrisList.push(debris);
          }

          for (let i = 0; i < 15; i++) {
            const particle = this.particlePool.get(enemyTransform.position, 0xff0000);
            particle.velocity.set(
              (Math.random() - 0.5) * 10,
              Math.random() * 10 + 5,
              (Math.random() - 0.5) * 10
            );
            particle.life = 1;
            particle.maxLife = 1;
            this.particles.push(particle);
          }

          // Add score
          this.score += 50;
          if (this.onScoreUpdate) {
            this.onScoreUpdate(Math.floor(this.score));
          }

          // Show floating text
          const ft = this.floatingTextPool.get("УБИТ!", enemyTransform.position);
          ft.life = 1;
          ft.maxLife = 1;
          this.floatingTexts.push(ft);
        }

        // Remove enemy
        const enemyRender = this.entityManager.render.get(enemyId);
        if (enemyRender && enemyRender.mesh) {
          this.scene.remove(enemyRender.mesh);
        }
        this.entityManager.destroyEntity(enemyId);
        this.enemies.splice(enemyIndex, 1);
      }
    }
  }

  private handleCollectiblePickup(collectibleId: EntityId, index: number): void {
    // Remove collectible
    const render = this.entityManager.render.get(collectibleId);
    if (render && render.mesh) {
      this.scene.remove(render.mesh);
    }
    this.entityManager.destroyEntity(collectibleId);
    this.collectibles.splice(index, 1);

    // Spawn particles
    // Note: We'd need position from the collectible, but it's already destroyed
    // In a real implementation, we'd get position before destroying

    // Add ammo
    this.ammo += 5;
    if (this.onAmmoUpdate) {
      this.onAmmoUpdate(this.ammo);
    }

    // Add score
    this.score += 10;
    if (this.onScoreUpdate) {
      this.onScoreUpdate(Math.floor(this.score));
    }

    // Show popup
    if (this.onPopup) {
      this.onPopup("+5 СИГАРЕТ");
    }
  }

  private shoot(): void {
    if (this.ammo <= 0) return;

    this.ammo--;
    if (this.onAmmoUpdate) {
      this.onAmmoUpdate(this.ammo);
    }

    if (!this.playerId) return;

    const playerTransform = this.entityManager.transform.get(this.playerId);
    if (!playerTransform) return;

    // Create projectile
    const projectileGeo = new THREE.PlaneGeometry(2, 1);
    const projectileMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide,
    });
    const projectileMesh = new THREE.Mesh(projectileGeo, projectileMat);
    projectileMesh.position.copy(playerTransform.position);
    projectileMesh.position.y += 2;
    this.scene.add(projectileMesh);

    const projectileId = createProjectileEntity(
      this.entityManager,
      projectileMesh,
      'goyda',
      1,
      1
    );
    this.projectiles.push(projectileId);

    // Set velocity
    const physics = this.entityManager.physics.get(projectileId);
    if (physics) {
      physics.velocity.set(0, 0, -30); // Move forward
    }

    // Play shoot sound
    this.playShootSound();

    // Spawn particles at launch
    for (let i = 0; i < 5; i++) {
      const particle = this.particlePool.get(projectileMesh.position, 0xff6600);
      particle.velocity.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 5,
        (Math.random() - 0.5) * 10
      );
      particle.life = 0.5;
      particle.maxLife = 0.5;
      this.particles.push(particle);
    }
  }

  private playShootSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio not supported
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particlePool.release(p);
        this.particles.splice(i, 1);
      } else {
        p.velocity.y -= 20 * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = (p.life / p.maxLife) * 0.8;
      }
    }
  }

  private updateDebris(dt: number): void {
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life -= dt;

      if (d.life <= 0) {
        this.debrisPool.release(d);
        this.debrisList.splice(i, 1);
      } else {
        d.velocity.y -= 40 * dt;
        d.mesh.position.addScaledVector(d.velocity, dt);
        d.mesh.rotation.x += dt * 5;
        d.mesh.rotation.y += dt * 5;

        if (d.mesh.position.y < 0.15) {
          d.mesh.position.y = 0.15;
          d.velocity.y *= -0.5;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }
      }
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;

      if (ft.life <= 0) {
        this.floatingTextPool.release(ft);
        this.floatingTexts.splice(i, 1);
      } else {
        ft.sprite.position.y += dt * 2;
        ft.sprite.material.opacity = ft.life / ft.maxLife;
      }
    }
  }

  private updateCamera(): void {
    if (!this.playerId) return;

    const transform = this.entityManager.transform.get(this.playerId);
    if (!transform) return;

    this.camera.position.x = transform.position.x * 0.3;
    this.camera.position.y = transform.position.y + 6;
    this.camera.position.z = transform.position.z + 10;
    this.camera.lookAt(
      transform.position.x * 0.5,
      transform.position.y + 2,
      transform.position.z - 10
    );
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  // Public methods
  start(): void {
    this.isGameOver = false;
    this.score = 0;
    this.ammo = 10;
    this.buffs = [];
    this.time = 0;

    // Reset player position
    if (this.playerId) {
      const transform = this.entityManager.transform.get(this.playerId);
      if (transform) {
        transform.position.set(0, 0, 0);
      }
      const render = this.entityManager.render.get(this.playerId);
      if (render && render.mesh) {
        render.mesh.visible = true;
      }
    }

    // Clear enemies and projectiles
    this.clearEntities();

    // Generate initial chunks
    for (let i = 0; i < 4; i++) {
      this.generateChunk(-i * 50);
    }

    // Start game loop
    this.lastTime = performance.now();
    this.animate();
  }

  private clearEntities(): void {
    // Remove all enemies
    for (const enemyId of this.enemies) {
      const render = this.entityManager.render.get(enemyId);
      if (render && render.mesh) {
        this.scene.remove(render.mesh);
      }
      this.entityManager.destroyEntity(enemyId);
    }
    this.enemies = [];

    // Remove all projectiles
    for (const projectileId of this.projectiles) {
      const render = this.entityManager.render.get(projectileId);
      if (render && render.mesh) {
        this.scene.remove(render.mesh);
      }
      this.entityManager.destroyEntity(projectileId);
    }
    this.projectiles = [];

    // Remove all collectibles
    for (const collectibleId of this.collectibles) {
      const render = this.entityManager.render.get(collectibleId);
      if (render && render.mesh) {
        this.scene.remove(render.mesh);
      }
      this.entityManager.destroyEntity(collectibleId);
    }
    this.collectibles = [];

    // Clear pools
    this.particles.forEach(p => this.particlePool.release(p));
    this.particles = [];
    this.debrisList.forEach(d => this.debrisPool.release(d));
    this.debrisList = [];
    this.floatingTexts.forEach(ft => this.floatingTextPool.release(ft));
    this.floatingTexts = [];
  }

  pause(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (!this.animationFrameId) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  destroy(): void {
    this.pause();
    this.clearEntities();

    // Cleanup pools
    this.particlePool.dispose();
    this.debrisPool.dispose();
    this.floatingTextPool.dispose();

    // Cleanup instanced meshes
    this.instancedManager.clearAll();

    // Cleanup input
    if (this.cleanupInput) {
      this.cleanupInput();
    }

    // Dispose renderer
    this.renderer.dispose();
  }

  // Resize handler
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}