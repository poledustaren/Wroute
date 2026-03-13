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
    STARTING_BANANAS: 6,
    TOWER_COST: 5,
    UPGRADE_COST_BASE: 3,
    COINS_PER_KILL: 2,
    GRID_SIZE: 1.5,
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
        coins: 0,
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
    private onGameOver: () => void;
    private onStateUpdate: (state: any) => void;
    private showPopup: (text: string) => void;

    private mouse = new THREE.Vector2();
    private raycaster = new THREE.Raycaster();
    private groundPlane: THREE.Mesh | null = null;
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
        scene.background = new THREE.Color(0x330a0a);
        scene.fog = new THREE.Fog(0x330a0a, 40, 150);

        this.core.camera.position.set(0, 25, 15);
        this.core.camera.lookAt(0, 0, -5);

        // Lights
        this.core.scene.add(new THREE.AmbientLight(0x404040, 1.5));
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
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
            color: 0x663333,
            roughness: 0.6,
            metalness: 0.2
        });
        this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true;
        scene.add(this.groundPlane);

        // Path
        const pathPoints = PATH_WAYPOINTS.map(p => new THREE.Vector3(p.x, 0.1, p.z));
        const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 }));
        scene.add(pathLine);
    }

    private onMouseMove = (e: MouseEvent) => {
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

    private createTowerMesh(mode: string): THREE.Group {
        const group = new THREE.Group();
        const config = (TOWER_TYPES as any)[mode];
        
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 })
        );
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ 
                color: config.color, 
                emissive: config.color, 
                emissiveIntensity: 2 
            })
        );
        head.position.y = 1;
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
        if (this.groundPlane) {
            const intersects = this.raycaster.intersectObject(this.groundPlane);
            if (intersects.length > 0) {
                const pt = intersects[0].point;
                this.hoveredCell = {
                    x: Math.round(pt.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
                    z: Math.round(pt.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
                };
            }
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
                this.state.coins += enemy.reward;
                this.state.enemiesDead++;
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
                }
            }
        });

        // 4. Check Wave Completion
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
        
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(config.scale, config.scale, config.scale),
            new THREE.MeshStandardMaterial({ 
                color: config.color, 
                emissive: config.color, 
                emissiveIntensity: 0.5 
            })
        );
        mesh.position.set(PATH_WAYPOINTS[0].x, config.scale/2, PATH_WAYPOINTS[0].z);
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
        if (this.state.coins < cost) return;
        
        this.core.scene.remove(t.mesh);
        t.mode = mode;
        t.level++;
        t.mesh = this.createTowerMesh(mode);
        t.mesh.position.set(t.x, 0, t.z);
        this.core.scene.add(t.mesh);
        this.state.coins -= cost;
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
