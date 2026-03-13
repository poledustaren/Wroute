import * as THREE from 'three';
import { CoreRenderer } from '../core/Renderer';
import { PostProcessor } from '../core/PostProcessor';

export interface Level3Config {
    canvas: HTMLCanvasElement;
    onGameOver: () => void;
    onStateUpdate: (state: any) => void;
    showPopup: (text: string) => void;
}

const CONFIG = {
    STARTING_BANANAS: 15,
    TOWER_COST: 5,
    UPGRADE_COST_BASE: 5,
    BANANAS_PER_KILL: 2,
    GRID_SIZE: 2,
    PATH_WIDTH: 2.5,
    MAP_WIDTH: 20,
    MAP_HEIGHT: 40,
};

const ENEMIES = {
    flag: { hp: 3, speed: 0.1, reward: 2, color: 0xff0000, scale: 0.8, name: 'Флаг США' },
    iphone: { hp: 5, speed: 0.08, reward: 2, color: 0x888888, scale: 0.7, name: 'iPhone' },
    dollar: { hp: 2, speed: 0.12, reward: 2, color: 0x00ff00, scale: 0.6, name: 'Доллар' },
    doctor: { hp: 8, speed: 0.05, reward: 2, color: 0xffffff, scale: 1.0, name: 'Доктор' },
};

const TOWER_TYPES = {
    base: { damage: 2, range: 4, cooldown: 1000, color: 0xff0000 },
    stalin: { damage: 8, range: 6, cooldown: 2500, color: 0xaa0000 },
    zaza: { damage: 1, range: 3, cooldown: 300, color: 0x00aa00 },
};

const PATH_WAYPOINTS = [
    { x: 0, z: -35 }, { x: 0, z: -25 }, { x: -6, z: -25 },
    { x: -6, z: -15 }, { x: 6, z: -15 }, { x: 6, z: -5 },
    { x: -6, z: -5 }, { x: -6, z: 5 }, { x: 6, z: 5 },
    { x: 6, z: 15 }, { x: 0, z: 15 }, { x: 0, z: 25 },
];

export class Level3Engine {
    private core: CoreRenderer;
    private post: PostProcessor;
    private lastTime: number = 0;
    private isActive: boolean = true;
    private frameId: number | null = null;
    
    public state = {
        bananas: CONFIG.STARTING_BANANAS,
        wave: 1,
        waveActive: false,
        gameOver: false,
        enemiesSpawned: 0,
        enemiesDead: 0,
        enemiesReachedEnd: 0,
        placingMode: false,
        selectedTowerId: null as number | null,
    };

    private towers: any[] = [];
    private enemies: any[] = [];
    private projectiles: any[] = [];
    private vfxTexts: any[] = [];
    private onGameOver: () => void;
    private onStateUpdate: (state: any) => void;
    private showPopup: (text: string) => void;

    private mouse = new THREE.Vector2(-100, -100);
    private raycaster = new THREE.Raycaster();
    private groundPlane: THREE.Mesh | null = null;
    private hoverCursor: THREE.Mesh | null = null;
    public hoveredCell: { x: number, z: number } | null = null;

    constructor(config: Level3Config) {
        this.onGameOver = config.onGameOver;
        this.onStateUpdate = config.onStateUpdate;
        this.showPopup = config.showPopup;

        this.core = new CoreRenderer({
            canvas: config.canvas,
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        this.post = new PostProcessor(this.core.renderer, this.core.scene, this.core.camera);
        this.setupLevel();
        
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('click', this.onClick);
    }

    private setupLevel(): void {
        const scene = this.core.scene;
        scene.background = new THREE.Color(0x444466);
        scene.fog = new THREE.Fog(0x444466, 50, 200);

        this.core.camera.position.set(0, 35, 30);
        this.core.camera.lookAt(0, 0, -10);

        // Lights - Much brighter
        this.core.scene.add(new THREE.AmbientLight(0xffffff, 2.0));
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
        this.core.scene.add(hemiLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.mapSize.set(2048, 2048);
        this.core.scene.add(dirLight);

        // Ground (PBR)
        const groundGeo = new THREE.PlaneGeometry(50, 100);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.2
        });
        this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true;
        scene.add(this.groundPlane);

        // Path (Glowing Trench)
        const pathPoints = PATH_WAYPOINTS.map(p => new THREE.Vector3(p.x, 0.05, p.z));
        const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 5 }));
        const pathGlowBase = new THREE.LineSegments(pathGeo, new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 }));
        scene.add(pathLine);
        scene.add(pathGlowBase);

        // Ruins Environment
        this.generateRuins();

        // Hover Cursor
        const cursorGeo = new THREE.PlaneGeometry(CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        this.hoverCursor = new THREE.Mesh(cursorGeo, cursorMat);
        this.hoverCursor.rotation.x = -Math.PI / 2;
        this.hoverCursor.position.y = 0.05;
        this.hoverCursor.visible = false;
        scene.add(this.hoverCursor);
    }

    private onMouseMove = (e: MouseEvent) => {
        // Must calculate position relative to canvas
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    private onClick = (e: MouseEvent) => {
        if (this.state.placingMode && this.hoveredCell) {
            this.placeTower();
        } else if (this.hoveredCell) {
            this.selectTower();
        }
    };

    private placeTower() {
        if (this.state.bananas < CONFIG.TOWER_COST) return;
        
        const tower = {
            id: Date.now(),
            x: this.hoveredCell!.x,
            z: this.hoveredCell!.z,
            mode: 'base',
            level: 1,
            lastShot: 0,
            mesh: this.createTowerMesh('base')
        };
        
        tower.mesh.position.set(tower.x, 0, tower.z);
        this.core.scene.add(tower.mesh);
        this.towers.push(tower);
        
        this.state.bananas -= CONFIG.TOWER_COST;
        this.state.placingMode = false;
        this.state.selectedTowerId = tower.id;
        this.onStateUpdate(this.state);
    }

    private selectTower() {
        const found = this.towers.find(t => 
            Math.abs(t.x - this.hoveredCell!.x) < 0.1 && 
            Math.abs(t.z - this.hoveredCell!.z) < 0.1
        );
        this.state.selectedTowerId = found ? found.id : null;
        this.onStateUpdate(this.state);
    }

    private generateRuins() {
        const ruinsGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });

        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 45;
            const z = (Math.random() - 0.5) * 90;
            
            // Don't spawn on path
            let nearPath = false;
            for (const wp of PATH_WAYPOINTS) {
                if (Math.abs(x - wp.x) < 4 && Math.abs(z - wp.z) < 4) {
                    nearPath = true;
                    break;
                }
            }
            if (nearPath) continue;

            const height = Math.random() * 4 + 1;
            const width = Math.random() * 3 + 1;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), mat);
            mesh.position.set(x, height / 2, z);
            mesh.rotation.y = Math.random() * Math.PI;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            ruinsGroup.add(mesh);
        }

        // Add some burning barrels
        for (let i = 0; i < 15; i++) {
             const x = (Math.random() - 0.5) * 40;
             const z = (Math.random() - 0.5) * 80;
             const barrel = new THREE.Mesh(
                 new THREE.CylinderGeometry(0.4, 0.4, 1.2),
                 new THREE.MeshStandardMaterial({ color: 0x111111 })
             );
             barrel.position.set(x, 0.6, z);
             ruinsGroup.add(barrel);

             const fire = new THREE.PointLight(0xff5500, 5, 10);
             fire.position.set(x, 1.5, z);
             ruinsGroup.add(fire);
        }

        this.core.scene.add(ruinsGroup);
    }

    private createTowerMesh(mode: string): THREE.Group {
        const group = new THREE.Group();
        const config = (TOWER_TYPES as any)[mode];
        
        let baseGeo: THREE.BufferGeometry = new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8);
        let headGeo: THREE.BufferGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        let headMat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 2 });

        if (mode === 'stalin') {
            baseGeo = new THREE.BoxGeometry(1.5, 1.0, 1.5); // Plinth
            headGeo = new THREE.BoxGeometry(1.2, 1.5, 1.2); // Bust placeholder
            headMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }); // Stone
        } else if (mode === 'zaza') {
            baseGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.3, 6);
            headGeo = new THREE.OctahedronGeometry(0.8); // Crystal
            headMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, emissiveIntensity: 3, transparent: true, opacity: 0.8 });
        }

        const base = new THREE.Mesh(
            baseGeo,
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.8 })
        );
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = mode === 'stalin' ? 1.5 : 1.2;
        head.castShadow = true;
        group.add(head);
        
        return group;
    }

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

    private update(dt: number) {
        if (this.state.gameOver) return;

        // 1. Raycast for hovered cell
        this.raycaster.setFromCamera(this.mouse, this.core.camera);
        if (this.groundPlane && this.state.placingMode) {
            const intersects = this.raycaster.intersectObject(this.groundPlane);
            if (intersects.length > 0) {
                const pt = intersects[0].point;
                this.hoveredCell = {
                    x: Math.round(pt.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
                    z: Math.round(pt.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
                };
                if (this.hoverCursor) {
                    this.hoverCursor.position.set(this.hoveredCell.x, 0.05, this.hoveredCell.z);
                    this.hoverCursor.visible = true;
                }
            } else {
                this.hoveredCell = null;
                if (this.hoverCursor) this.hoverCursor.visible = false;
            }
        } else {
            if (this.hoverCursor) this.hoverCursor.visible = false;
        }

        // 2. Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const wp = PATH_WAYPOINTS[enemy.wpIndex + 1];
            if (!wp) {
                this.state.gameOver = true;
                this.onGameOver();
                return;
            }
            
            const dx = wp.x - enemy.mesh.position.x;
            const dz = wp.z - enemy.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 0.1) {
                enemy.wpIndex++;
            } else {
                enemy.mesh.position.x += (dx / dist) * enemy.speed * dt * 50;
                enemy.mesh.position.z += (dz / dist) * enemy.speed * dt * 50;
                enemy.mesh.rotation.y += dt * 5;
            }

            if (enemy.hp <= 0) {
                this.core.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                this.state.bananas += enemy.reward; // Give bananas instead of invalid coins
                this.state.enemiesDead++;
                this.spawnFloatingText(`+${enemy.reward}🍌`, enemy.mesh.position.clone(), 0xffff00);
            }
        }

        // 3. Update Towers (Fire)
        const now = performance.now();
        this.towers.forEach(t => {
            const config = (TOWER_TYPES as any)[t.mode];
            if (now - t.lastShot > config.cooldown) {
                const target = this.enemies.find(e => 
                    Math.sqrt(Math.pow(e.mesh.position.x - t.x, 2) + Math.pow(e.mesh.position.z - t.z, 2)) < config.range
                );
                if (target) {
                    target.hp -= config.damage;
                    t.lastShot = now;
                    this.createMuzzleFlash(t.x, 1.5, t.z, config.color);
                    this.createProjectile(t.x, 1.5, t.z, target.mesh.position.x, target.mesh.position.y, target.mesh.position.z, config.color);
                    this.spawnFloatingText(`-${config.damage}`, target.mesh.position.clone(), 0xff0000);
                    
                    if (t.mode === 'stalin') this.shakeCamera(0.5);
                }
            }
        });

        // 4. Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dx = p.target.x - p.mesh.position.x;
            const dy = p.target.y - p.mesh.position.y;
            const dz = p.target.z - p.mesh.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < 0.5) {
                this.core.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            } else {
                p.mesh.position.x += (dx/dist) * dt * 50;
                p.mesh.position.y += (dy/dist) * dt * 50;
                p.mesh.position.z += (dz/dist) * dt * 50;
            }
        }

        // 5. Update Floating Texts
        for (let i = this.vfxTexts.length - 1; i >= 0; i--) {
            const txt = this.vfxTexts[i];
            txt.age += dt;
            txt.mesh.position.y += dt * 2;
            txt.mesh.material.opacity = 1.0 - (txt.age / 1.0);
            if (txt.age >= 1.0) {
                this.core.scene.remove(txt.mesh);
                this.vfxTexts.splice(i, 1);
            }
        }

        // 6. Camera Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const sx = (Math.random() - 0.5) * this.shakeAmt;
            const sy = (Math.random() - 0.5) * this.shakeAmt;
            this.core.camera.position.set(this.baseCamPos.x + sx, this.baseCamPos.y + sy, this.baseCamPos.z);
        } else {
            this.core.camera.position.copy(this.baseCamPos);
        }

        // 7. Check Wave Completion
        if (this.state.waveActive && this.enemies.length === 0) {
            this.state.waveActive = false;
            this.state.wave++;
            this.showPopup(`ВОЛНА ${this.state.wave} ГОТОВА!`);
        }

        this.onStateUpdate(this.state);
    }

    private createMuzzleFlash(x: number, y: number, z: number, color: number) {
        const light = new THREE.PointLight(color, 10, 5);
        light.position.set(x, y, z);
        this.core.scene.add(light);
        setTimeout(() => this.core.scene.remove(light), 50);
    }

    private createProjectile(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: number) {
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.8);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x1, y1, z1);
        mesh.lookAt(x2, y2, z2);
        this.core.scene.add(mesh);
        this.projectiles.push({ mesh, target: new THREE.Vector3(x2, y2, z2) });
    }

    private shakeTime = 0;
    private shakeAmt = 0;
    private baseCamPos = new THREE.Vector3(0, 35, 30);

    private shakeCamera(amount: number) {
        this.shakeAmt = amount;
        this.shakeTime = 0.2;
    }

    // Crude sprite text for WebGL without font loader overhead
    private spawnFloatingText(text: string, pos: THREE.Vector3, color: number) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.position.y += 2;
        sprite.scale.set(4, 1, 1);
        this.core.scene.add(sprite);
        
        this.vfxTexts.push({ mesh: sprite, age: 0 });
    }

    public startWave() {
        if (this.state.waveActive) return;
        this.state.waveActive = true;
        this.state.enemiesSpawned = 0;
        
        const count = 5 + this.state.wave * 2;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!this.isActive) return;
                this.spawnEnemy();
            }, i * 800);
        }
    }

    private spawnEnemy() {
        const types = Object.keys(ENEMIES) as any[];
        const typeKey = types[Math.floor(Math.random() * types.length)];
        const config = (ENEMIES as any)[typeKey];
        
        let geo: THREE.BufferGeometry = new THREE.BoxGeometry(config.scale, config.scale, config.scale);
        
        if (typeKey === 'iphone') {
            geo = new THREE.BoxGeometry(config.scale * 0.8, config.scale * 1.5, config.scale * 0.1); // Phone shape
        } else if (typeKey === 'flag') {
            geo = new THREE.PlaneGeometry(config.scale * 1.5, config.scale); // Flag shape
        } else if (typeKey === 'dollar') {
            geo = new THREE.BoxGeometry(config.scale * 1.2, config.scale * 0.2, config.scale * 0.6); // Stack of cash
        } else if (typeKey === 'doctor') {
            geo = new THREE.CylinderGeometry(config.scale * 0.3, config.scale * 0.3, config.scale * 1.5); // Doc shape
        }

        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ 
                color: config.color, 
                emissive: config.color, 
                emissiveIntensity: 0.5,
                side: THREE.DoubleSide
            })
        );
        mesh.position.set(PATH_WAYPOINTS[0].x, config.scale, PATH_WAYPOINTS[0].z);
        if (typeKey === 'flag') mesh.position.y += 1;
        
        mesh.castShadow = true;
        this.core.scene.add(mesh);
        
        this.enemies.push({
            mesh,
            hp: config.hp * (1 + this.state.wave * 0.1),
            speed: config.speed,
            reward: config.reward,
            wpIndex: 0
        });
        this.state.enemiesSpawned++;
    }

    public upgradeTower(mode: 'stalin' | 'zaza') {
        const t = this.towers.find(t => t.id === this.state.selectedTowerId);
        if (!t) return;
        const cost = t.level * CONFIG.UPGRADE_COST_BASE;
        if (this.state.bananas < cost) return;
        
        this.core.scene.remove(t.mesh);
        t.mode = mode;
        t.level++;
        t.mesh = this.createTowerMesh(mode);
        t.mesh.position.set(t.x, 0, t.z);
        this.core.scene.add(t.mesh);
        this.state.bananas -= cost;
        this.onStateUpdate(this.state);
    }

    public resize(width: number, height: number): void {
        this.core.resize(width, height);
        this.post.setSize(width, height);
    }

    public destroy(): void {
        this.isActive = false;
        if (this.frameId) cancelAnimationFrame(this.frameId);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('click', this.onClick);
        this.core.destroy();
    }
}
