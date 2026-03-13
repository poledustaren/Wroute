import * as THREE from 'three';
import { CoreRenderer } from '../core/Renderer';
import { PostProcessor } from '../core/PostProcessor';

export interface Level1Config {
    canvas: HTMLCanvasElement;
    onGameOver: () => void;
    onScoreUpdate: (score: number) => void;
    onAmmoUpdate: (ammo: number) => void;
    onBuffsUpdate: (buffs: string[]) => void;
    showPopup: (text: string) => void;
}

export class Level1Engine {
    private core: CoreRenderer;
    private post: PostProcessor;
    private lastTime: number = 0;
    private isActive: boolean = true;
    private frameId: number | null = null;
    
    // Callbacks
    private onGameOver: () => void;
    private onScoreUpdate: (score: number) => void;
    private onAmmoUpdate: (ammo: number) => void;
    private onBuffsUpdate: (buffs: string[]) => void;
    private showPopup: (text: string) => void;

    // Game state
    private state = {
        score: 0,
        ammo: 10,
        buffs: [] as string[],
        isGameOver: false,
        lastGeneratedZ: -100
    };

    // Input
    private input = { left: false, right: false, jump: false, shoot: false };

    // Entities
    private player: THREE.Group | null = null;
    private playerVel = new THREE.Vector3();
    private enemies: any[] = [];
    private projectiles: any[] = [];
    private chunks: THREE.Object3D[] = [];

    constructor(config: Level1Config) {
        this.onGameOver = config.onGameOver;
        this.onScoreUpdate = config.onScoreUpdate;
        this.onAmmoUpdate = config.onAmmoUpdate;
        this.onBuffsUpdate = config.onBuffsUpdate;
        this.showPopup = config.showPopup;

        this.core = new CoreRenderer({
            canvas: config.canvas,
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        this.post = new PostProcessor(this.core.renderer, this.core.scene, this.core.camera);
        
        this.setupLevel();
        this.setupInput();
    }

    private setupLevel(): void {
        const scene = this.core.scene;
        scene.background = new THREE.Color(0x050510);
        scene.fog = new THREE.Fog(0x050510, 20, 150);

        this.core.camera.position.set(0, 5, 10);

        // Neon Lights - Brighter for better visibility
        scene.add(new THREE.AmbientLight(0x4444aa, 1.0));
        const dirLight = new THREE.DirectionalLight(0xff00ff, 2.0);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        const pointLight = new THREE.PointLight(0x00ffff, 10, 50);
        pointLight.position.set(-5, 5, 0);
        scene.add(pointLight);

        // Player
        this.player = this.createPlayerMesh();
        scene.add(this.player);

        // Initial Chunks
        for (let i = 0; i < 5; i++) {
            this.generateChunk(-i * 40);
        }
    }

    private createPlayerMesh(): THREE.Group {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1, metalness: 0.8 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.5), mat);
        body.position.y = 1.25;
        body.castShadow = true;
        group.add(body);
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
        head.position.y = 2.4;
        head.castShadow = true;
        group.add(head);

        return group;
    }

    private generateChunk(z: number): void {
        const group = new THREE.Group();
        group.position.z = z;

        // Floor - Dark reflective metal
        const floorGeo = new THREE.BoxGeometry(12, 1, 40);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a, 
            roughness: 0.2, 
            metalness: 0.9,
            emissive: 0x111122,
            emissiveIntensity: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        group.add(floor);

        // Objects/Enemies
        if (Math.random() > 0.5) {
            this.spawnEnemyInChunk(group);
        } else {
            this.spawnObstacleInChunk(group);
        }

        this.core.scene.add(group);
        this.chunks.push(group);
        this.state.lastGeneratedZ = z;
    }

    private spawnEnemyInChunk(parent: THREE.Group): void {
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat);
        mesh.position.set((Math.random() - 0.5) * 8, 0.6, Math.random() * -30 + 15);
        parent.add(mesh);
        this.enemies.push({ mesh, hp: 1 });
    }

    private spawnObstacleInChunk(parent: THREE.Group): void {
        const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), mat);
        mesh.position.set((Math.random() - 0.5) * 8, 0.5, Math.random() * -30 + 15);
        parent.add(mesh);
    }

    private addWall(parent: THREE.Group, x: number): void {
        const wallGeo = new THREE.BoxGeometry(1, 10, 40);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.x = x;
        wall.position.y = 4.5;
        parent.add(wall);

        // Neon Strip
        const stripGeo = new THREE.BoxGeometry(0.1, 0.5, 40);
        const stripMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 5 });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.x = x > 0 ? -0.55 : 0.55;
        strip.position.y = 3;
        wall.add(strip);
    }

    private setupInput(): void {
        const down = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') this.input.left = true;
            if (e.code === 'ArrowRight') this.input.right = true;
            if (e.code === 'Space' || e.code === 'ArrowUp') this.input.jump = true;
            if (e.code === 'KeyG' || e.code === 'Enter') this.input.shoot = true;
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft') this.input.left = false;
            if (e.code === 'ArrowRight') this.input.right = false;
            if (e.code === 'Space' || e.code === 'ArrowUp') this.input.jump = false;
            if (e.code === 'KeyG' || e.code === 'Enter') this.input.shoot = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        this.cleanupInput = () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }
    private cleanupInput: (() => void) | null = null;

    public start(): void {
        this.lastTime = performance.now();
        this.loop();
    }

    private loop = (): void => {
        if (!this.isActive) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.post.render(dt);
        this.frameId = requestAnimationFrame(this.loop);
    };

    private update(dt: number): void {
        if (!this.player || this.state.isGameOver) return;

        // Auto move forward
        this.player.position.z -= 20 * dt;

        // X movement
        const moveX = 15;
        if (this.input.left) this.player.position.x -= moveX * dt;
        if (this.input.right) this.player.position.x += moveX * dt;
        this.player.position.x = Math.max(-5, Math.min(5, this.player.position.x));

        // Jump Physics
        if (this.input.jump && this.player.position.y <= 0.01) {
            this.playerVel.y = 15;
        }
        this.playerVel.y -= 40 * dt; // Gravity
        this.player.position.y += this.playerVel.y * dt;
        if (this.player.position.y < 0) {
            this.player.position.y = 0;
            this.playerVel.y = 0;
        }

        // Shooting
        if (this.input.shoot && this.state.ammo > 0) {
            this.shoot();
            this.input.shoot = false;
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.z -= 100 * dt;
            if (p.mesh.position.z < this.player.position.z - 100) {
                this.core.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        // Collisions & Updates
        this.enemies.forEach((enemy, eIdx) => {
            // Player collision
            if (this.player!.position.distanceTo(enemy.mesh.getWorldPosition(new THREE.Vector3())) < 1.5) {
                this.state.isGameOver = true;
                this.onGameOver();
            }

            // Projectile collision
            this.projectiles.forEach((p, pIdx) => {
                if (p.mesh.position.distanceTo(enemy.mesh.getWorldPosition(new THREE.Vector3())) < 1.5) {
                    enemy.hp--;
                    this.core.scene.remove(p.mesh);
                    this.projectiles.splice(pIdx, 1);
                }
            });

            if (enemy.hp <= 0) {
                enemy.mesh.parent?.remove(enemy.mesh);
                this.enemies.splice(eIdx, 1);
                this.state.score += 100;
            }
        });

        // Camera follow
        this.core.camera.position.z = this.player.position.z + 10;
        this.core.camera.position.y = this.player.position.y + 5;
        this.core.camera.lookAt(this.player.position.x, this.player.position.y + 2, this.player.position.z - 10);

        // Chunk generation
        if (this.player.position.z - 80 < this.state.lastGeneratedZ) {
            this.generateChunk(this.state.lastGeneratedZ - 40);
        }

        // Chunk cleanup
        if (this.chunks.length > 10) {
            const old = this.chunks.shift();
            if (old) this.core.scene.remove(old);
        }

        // Score
        this.state.score += dt * 10;
        this.onScoreUpdate(Math.floor(this.state.score));
    }

    private shoot() {
        if (!this.player) return;
        this.state.ammo--;
        this.onAmmoUpdate(this.state.ammo);
        
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 })
        );
        mesh.position.copy(this.player.position);
        mesh.position.y += 1.5;
        this.core.scene.add(mesh);
        this.projectiles.push({ mesh });

        // Muzzle flash
        const flash = new THREE.PointLight(0xffff00, 20, 10);
        flash.position.copy(mesh.position);
        this.core.scene.add(flash);
        setTimeout(() => this.core.scene.remove(flash), 50);
    }

    public resize(width: number, height: number): void {
        this.core.resize(width, height);
        this.post.setSize(width, height);
    }

    public destroy(): void {
        this.isActive = false;
        if (this.frameId) cancelAnimationFrame(this.frameId);
        if (this.cleanupInput) this.cleanupInput();
        this.core.destroy();
    }
}
