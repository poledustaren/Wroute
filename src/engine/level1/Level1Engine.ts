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
        lastGeneratedZ: -100,
        gracePeriod: 3.0 // 3 seconds of invulnerability at start
    };

    // Input
    private input = { left: false, right: false, jump: false, shoot: false };

    // Entities
    private player: THREE.Group | null = null;
    private playerVel = new THREE.Vector3();
    private enemies: any[] = [];
    private collectibles: any[] = [];
    private projectiles: any[] = [];
    private chunks: THREE.Object3D[] = [];
    private clock = new THREE.Clock();

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
        scene.background = new THREE.Color(0x222233);
        scene.fog = new THREE.Fog(0x222233, 40, 200);

        this.core.camera.position.set(0, 5, 10);

        // Neon Lights - Brighter for better visibility
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        const pointLight = new THREE.PointLight(0x00ffff, 20, 100);
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
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.1 });
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

        // Floor - Lighter and less metallic
        const floorGeo = new THREE.BoxGeometry(12, 1, 40);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x333344, 
            roughness: 0.8, 
            metalness: 0.2,
            emissive: 0x111122,
            emissiveIntensity: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        group.add(floor);

        // Decoration on walls
        this.addWall(group, -6);
        this.addWall(group, 6);

        // High Density Spawning
        if (z < -20) {
            const numSpawns = Math.floor(Math.random() * 3) + 1; // 1 to 3 items per chunk
            for (let i = 0; i < numSpawns; i++) {
                const type = Math.random();
                if (type < 0.4) {
                    this.spawnEnemyInChunk(group);
                } else if (type < 0.7) {
                    this.spawnCollectibleInChunk(group);
                } else {
                    this.spawnObstacleInChunk(group);
                }
            }
        }

        this.core.scene.add(group);
        this.chunks.push(group);
        this.state.lastGeneratedZ = z;
    }

    private spawnEnemyInChunk(parent: THREE.Group): void {
        const typeRnd = Math.random();
        let type = 'vaper';
        let color = 0x00ffff;
        let hp = 1;
        let geo: THREE.BufferGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8); // Vaper tall
        let yy = 1;

        if (typeRnd > 0.6) {
            type = 'dushnila';
            color = 0x555555;
            hp = 3;
            geo = new THREE.BoxGeometry(1.5, 1.5, 1.5); // Dushnila fat
            yy = 0.75;
        } else if (typeRnd > 0.4) {
            type = 'monkey';
            color = 0xff8800;
            hp = 1;
            geo = new THREE.SphereGeometry(0.6); // Monkey round
            yy = 0.6 + Math.random() * 2; // Can spawn in air
        }

        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random() - 0.5) * 8, yy, (Math.random() - 0.5) * 30);
        mesh.castShadow = true;
        parent.add(mesh);
        this.enemies.push({ mesh, type, hp, startY: yy, timeOffset: Math.random() * Math.PI * 2 });
    }

    private spawnCollectibleInChunk(parent: THREE.Group): void {
        const typeRnd = Math.random();
        let type = 'coffee';
        let color = 0x8b4513; // Brown
        let geo: THREE.BufferGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.6);

        if (typeRnd > 0.7) {
            type = 'cigarette';
            color = 0xffffff;
            geo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
        } else if (typeRnd > 0.5) {
            type = 'gramota';
            color = 0xffd700; // Gold
            geo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
        } else if (typeRnd > 0.9) {
            type = 'ashtray';
            color = 0x888888;
            geo = new THREE.CylinderGeometry(0.5, 0.4, 0.2);
        }

        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random() - 0.5) * 8, 1.0, (Math.random() - 0.5) * 30);
        parent.add(mesh);
        this.collectibles.push({ mesh, type });
    }

    private spawnObstacleInChunk(parent: THREE.Group): void {
        const isPuddle = Math.random() > 0.5;
        if (isPuddle) {
            const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 });
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 16), mat);
            mesh.position.set((Math.random() - 0.5) * 6, -0.4, (Math.random() - 0.5) * 30);
            parent.add(mesh);
            this.enemies.push({ mesh, type: 'puddle', hp: 999, startY: -0.4, timeOffset: 0 }); // Acts as hazard
        } else {
            const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1), mat);
            mesh.position.set((Math.random() - 0.5) * 6, 0.75, (Math.random() - 0.5) * 30);
            parent.add(mesh);
            this.enemies.push({ mesh, type: 'wall', hp: 999, startY: 0.75, timeOffset: 0 }); // Acts as hazard
        }
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
        
        if (this.state.gracePeriod > 0) this.state.gracePeriod -= dt;

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

        const t = this.clock.getElapsedTime();

        // Update Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            const wPos = item.mesh.getWorldPosition(new THREE.Vector3());
            
            item.mesh.rotation.y += dt * 2;
            item.mesh.position.y = 1.0 + Math.sin(t * 3 + item.mesh.position.z) * 0.2;

            if (this.player.position.distanceTo(wPos) < 1.5) {
                // Collect item
                item.mesh.parent?.remove(item.mesh);
                this.collectibles.splice(i, 1);
                
                if (item.type === 'coffee') {
                    this.state.buffs.push('COFFEE RUSH');
                    this.onBuffsUpdate([...this.state.buffs]);
                    this.state.score += 50;
                    this.showPopup("КОФЕЙНЫЙ РАШ!");
                } else if (item.type === 'cigarette') {
                    this.state.ammo += 10;
                    this.onAmmoUpdate(this.state.ammo);
                    this.showPopup("+10 СИГАРЕТ");
                } else if (item.type === 'gramota') {
                    this.state.score += 500;
                    this.showPopup("ГОЙДА!");
                } else if (item.type === 'ashtray') {
                    this.state.ammo += 30; // Treat as big ammo pool for now
                    this.onAmmoUpdate(this.state.ammo);
                    this.showPopup("ПЕПЕЛЬНИЦА");
                }
            }
        }

        // Collisions & Enemy Updates
        this.enemies.forEach((enemy, eIdx) => {
            // Animate enemies
            if (enemy.type === 'monkey') {
                enemy.mesh.position.y = enemy.startY + Math.abs(Math.sin(t * 5 + enemy.timeOffset)) * 2;
            } else if (enemy.type === 'vaper') {
                enemy.mesh.position.x += Math.sin(t * 3 + enemy.timeOffset) * dt * 5;
            }

            const wPos = enemy.mesh.getWorldPosition(new THREE.Vector3());

            // Player collision (Only after grace period)
            if (this.state.gracePeriod <= 0 && this.player!.position.distanceTo(wPos) < 1.5) {
                this.state.isGameOver = true;
                this.onGameOver();
            }

            // Projectile collision
            this.projectiles.forEach((p, pIdx) => {
                if (enemy.hp < 999 && p.mesh.position.distanceTo(wPos) < 1.5) {
                    enemy.hp--;
                    this.core.scene.remove(p.mesh);
                    this.projectiles.splice(pIdx, 1);
                }
            });

            if (enemy.hp <= 0) {
                enemy.mesh.parent?.remove(enemy.mesh);
                this.enemies.splice(eIdx, 1);
                this.state.score += 100;
                this.createExplosionVFX(wPos);
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

    private createExplosionVFX(pos: THREE.Vector3) {
        const flash = new THREE.PointLight(0xffaa00, 10, 8);
        flash.position.copy(pos);
        this.core.scene.add(flash);
        setTimeout(() => this.core.scene.remove(flash), 100);
    }

    private shoot() {
        if (!this.player) return;
        this.state.ammo--;
        this.onAmmoUpdate(this.state.ammo);
        
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 })
        );
        mesh.position.copy(this.player.position);
        mesh.position.y += 1.5;
        this.core.scene.add(mesh);
        this.projectiles.push({ mesh });

        this.createExplosionVFX(mesh.position);
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
