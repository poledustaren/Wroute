import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ========== GAME CONFIGURATION ==========
const CONFIG = {
  STARTING_BANANAS: 6,
  TOWER_COST: 5,
  UPGRADE_COST_BASE: 3,
  COINS_PER_KILL: 2,
  WAVES_UNTIL_BOSS: 5,
  PATH_WIDTH: 2.5,
  GRID_SIZE: 1.5,
  MAP_WIDTH: 20,
  MAP_HEIGHT: 40,
};

const ENEMIES = {
  flag: { hp: 3, speed: 0.04, reward: 2, color: 0xff0000, scale: 0.8, name: 'Флаг США' },
  iphone: { hp: 5, speed: 0.03, reward: 2, color: 0x888888, scale: 0.7, name: 'iPhone' },
  dollar: { hp: 2, speed: 0.06, reward: 2, color: 0x00ff00, scale: 0.6, name: 'Доллар' },
  doctor: { hp: 8, speed: 0.02, reward: 2, color: 0xffffff, scale: 1.0, name: 'Доктор' },
};

const TOWER_TYPES = {
  minigoyder: {
    base: { damage: 2, range: 4, cooldown: 1000, color: 0xff0000 },
    stalin: { damage: 8, range: 6, cooldown: 2500, color: 0xaa0000 },
    zaza: { damage: 1, range: 3, cooldown: 300, color: 0x00aa00 },
  },
};

const PATH_WAYPOINTS = [
  { x: 0, z: -35 },
  { x: 0, z: -25 },
  { x: -6, z: -25 },
  { x: -6, z: -15 },
  { x: 6, z: -15 },
  { x: 6, z: -5 },
  { x: -6, z: -5 },
  { x: -6, z: 5 },
  { x: 6, z: 5 },
  { x: 6, z: 15 },
  { x: 0, z: 15 },
  { x: 0, z: 25 },
];

interface Tower {
  id: number;
  x: number;
  z: number;
  gridX: number;
  gridZ: number;
  level: number;
  mode: 'base' | 'stalin' | 'zaza';
  lastShot: number;
  mesh: THREE.Group;
  rangeMesh: THREE.Mesh | null;
}

interface Enemy {
  id: number;
  type: keyof typeof ENEMIES;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  pathIndex: number;
  progress: number;
  mesh: THREE.Mesh;
  healthBar: THREE.Mesh;
  dead: boolean;
}

// All game state lives in this ref to avoid stale closures
interface GameState {
  bananas: number;
  coins: number;
  wave: number;
  waveActive: boolean;
  gameOver: boolean;
  showProgrev: boolean;
  placingMode: boolean;
  hoveredCell: { x: number; z: number } | null;
  selectedTower: Tower | null;
  selectedUpgrade: 'stalin' | 'zaza';
  debug: string;
  enemiesSpawned: number;
  enemiesDead: number;
  enemiesReachedEnd: number;
  timers: ReturnType<typeof setTimeout>[];
  lastSpeechTime: number;
  logs: string[];
}

export default function Level4Canvas({ setGameState }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const ghostTowerRef = useRef<THREE.Mesh | null>(null);
  const selectionMarkerRef = useRef<THREE.Mesh | null>(null);
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const frameRef = useRef<number>(0);
  const isActiveRef = useRef(true);
  const lastTimeRef = useRef<number>(0);
  const waveSpawnedRef = useRef(false);

  const gameRef = useRef<GameState>({
    bananas: CONFIG.STARTING_BANANAS,
    coins: 0,
    wave: 1,
    waveActive: false,
    gameOver: false,
    showProgrev: true,
    placingMode: false,
    hoveredCell: null,
    selectedTower: null,
    selectedUpgrade: 'stalin',
    debug: '',
    enemiesSpawned: 0,
    enemiesDead: 0,
    enemiesReachedEnd: 0,
    timers: [],
    lastSpeechTime: 0,
    logs: [],
  });

  // UI-only state (only triggers re-render for React JSX)
  const [, forceUpdate] = useState(0);

  const uiUpdate = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  // Logging helper: writes to console + gameRef.logs array + triggers UI re-render
  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    const formatted = `[${timestamp}] ${msg}`;
    console.log(`[Level4] ${formatted}`);
    gameRef.current.logs.push(formatted);
    // Keep only last 200 entries
    if (gameRef.current.logs.length > 200) {
      gameRef.current.logs.splice(0, gameRef.current.logs.length - 200);
    }
    uiUpdate();
  }, [uiUpdate]);

  // Show/hide debug log panel (toggled via F3 key)
  const [showLogPanel, setShowLogPanel] = useState(false);

  // ========== UTILITY FUNCTIONS ==========
  const snapToGrid = useCallback((x: number, z: number) => ({
    x: Math.round(x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
    z: Math.round(z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
  }), []);

  const pointToLineDistance = useCallback((px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
    const A = px - x1;
    const B = pz - z1;
    const C = x2 - x1;
    const D = z2 - z1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, zz;
    if (param < 0) { xx = x1; zz = z1; }
    else if (param > 1) { xx = x2; zz = z2; }
    else { xx = x1 + param * C; zz = z1 + param * D; }
    const dx = px - xx;
    const dz = pz - zz;
    return Math.sqrt(dx * dx + dz * dz);
  }, []);

  const isValidPlacement = useCallback((x: number, z: number): boolean => {
    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const p1 = PATH_WAYPOINTS[i];
      const p2 = PATH_WAYPOINTS[i + 1];
      const dist = pointToLineDistance(x, z, p1.x, p1.z, p2.x, p2.z);
      if (dist < CONFIG.PATH_WIDTH / 2 + 0.5) return false;
    }
    const snapped = snapToGrid(x, z);
    return !towersRef.current.some(t =>
      Math.abs(t.gridX - snapped.x) < 0.1 && Math.abs(t.gridZ - snapped.z) < 0.1
    );
  }, [pointToLineDistance, snapToGrid]);

  // ========== SAFE TIMER (cleanup-aware) ==========
  const addTimer = useCallback((fn: () => void, delay: number) => {
    const timerId = setTimeout(() => {
      // Remove from list
      const idx = gameRef.current.timers.indexOf(timerId);
      if (idx >= 0) gameRef.current.timers.splice(idx, 1);
      fn();
    }, delay);
    gameRef.current.timers.push(timerId);
    return timerId;
  }, []);

  // ========== MESH CREATION ==========
  const createTowerMesh = useCallback((mode: 'base' | 'stalin' | 'zaza'): THREE.Group => {
    const group = new THREE.Group();
    group.visible = true; // Ensure visibility
    const config = TOWER_TYPES.minigoyder[mode];

    const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    const turretGeo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
    const turretMat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.6,
      roughness: 0.3,
      emissive: config.color,
      emissiveIntensity: 0.2,
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.y = 1.1;
    turret.castShadow = true;
    group.add(turret);

    const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.3, 0.4);
    group.add(barrel);

    const rangeGeo = new THREE.RingGeometry(config.range - 0.1, config.range, 32);
    const rangeMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const rangeMesh = new THREE.Mesh(rangeGeo, rangeMat);
    rangeMesh.rotation.x = -Math.PI / 2;
    rangeMesh.position.y = 0.05;
    group.add(rangeMesh);

    return group;
  }, []);

  const createEnemyMesh = useCallback((type: keyof typeof ENEMIES): THREE.Mesh => {
    const config = ENEMIES[type];
    const geo = new THREE.BoxGeometry(config.scale, config.scale * 0.8, config.scale * 0.3);
    const mat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.6, // Increased from 0.3
      roughness: 0.4,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, []);

  const createHealthBar = useCallback((): THREE.Mesh => {
    const geo = new THREE.PlaneGeometry(0.8, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1;
    return mesh;
  }, []);

  // ========== PATH POSITION ==========
  const getPathPosition = useCallback((index: number, progress: number): { x: number; z: number } => {
    if (index >= PATH_WAYPOINTS.length - 1) {
      return PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
    }
    const p1 = PATH_WAYPOINTS[index];
    const p2 = PATH_WAYPOINTS[index + 1];
    return {
      x: p1.x + (p2.x - p1.x) * progress,
      z: p1.z + (p2.z - p1.z) * progress,
    };
  }, []);

  // ========== SPAWN WAVE ==========
  const spawnWave = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) {
      log('ERROR: spawnWave called but scene is null!');
      return;
    }

    const g = gameRef.current;
    g.waveActive = true;
    g.enemiesSpawned = 0;
    g.enemiesDead = 0;
    g.enemiesReachedEnd = 0;
    waveSpawnedRef.current = true;

    const waveEnemies: Array<keyof typeof ENEMIES> = [];
    ['flag', 'flag', 'iphone', 'iphone', 'dollar', 'dollar', 'doctor', 'doctor'].forEach(type => {
      waveEnemies.push(type as keyof typeof ENEMIES);
    });

    for (let i = 2; i < g.wave; i++) {
      const types = Object.keys(ENEMIES) as Array<keyof typeof ENEMIES>;
      waveEnemies.push(types[Math.floor(Math.random() * types.length)]);
    }

    const totalToSpawn = waveEnemies.length;
    log(`Wave ${g.wave} started! Spawning ${totalToSpawn} enemies`);

    waveEnemies.forEach((type, index) => {
      addTimer(() => {
        if (!isActiveRef.current || !sceneRef.current) return;

        const config = ENEMIES[type];
        const hpScale = 1 + (gameRef.current.wave - 1) * 0.2;
        const enemy: Enemy = {
          id: Date.now() + index + Math.random(),
          type,
          hp: config.hp * hpScale,
          maxHp: config.hp * hpScale,
          speed: config.speed,
          reward: config.reward,
          pathIndex: 0,
          progress: 0,
          mesh: createEnemyMesh(type),
          healthBar: createHealthBar(),
          dead: false,
        };

        enemy.mesh.position.set(PATH_WAYPOINTS[0].x, config.scale * 0.4, PATH_WAYPOINTS[0].z);
        enemy.healthBar.position.set(PATH_WAYPOINTS[0].x, config.scale * 0.4 + 0.6, PATH_WAYPOINTS[0].z);

        sceneRef.current!.add(enemy.mesh);
        sceneRef.current!.add(enemy.healthBar);
        enemiesRef.current.push(enemy);
        gameRef.current.enemiesSpawned++;
        log(`Spawned ${config.name} (${type}) #${index+1}/${totalToSpawn} | HP=${enemy.hp.toFixed(1)}`);
      }, index * 800);
    });
  }, [addTimer, createEnemyMesh, createHealthBar, log]);

  // ========== GAME LOOP (no setState calls!) ==========
  const gameLoop = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    if (!isActiveRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const now = performance.now();
    const g = gameRef.current;

    // Delta time (seconds)
    const delta = lastTimeRef.current ? Math.min((now - lastTimeRef.current) / 1000, 0.1) : 0.016;
    lastTimeRef.current = now;

    // ---- UPDATE ENEMIES ----
    const alive: Enemy[] = [];
    for (const enemy of enemiesRef.current) {
      if (enemy.dead) continue;

      // Check if we're at the final waypoint (reached end)
      if (enemy.pathIndex >= PATH_WAYPOINTS.length - 1) {
        // Reached end -> game over
        enemy.dead = true;
        scene.remove(enemy.mesh);
        scene.remove(enemy.healthBar);
        g.enemiesReachedEnd++;
        g.gameOver = true;
        log(`GAME OVER! ${ENEMIES[enemy.type].name} reached the end!`);
        continue;
      }

      const currentWP = PATH_WAYPOINTS[enemy.pathIndex];
      const nextIdx = enemy.pathIndex + 1;
      const nextWP = PATH_WAYPOINTS[nextIdx];
      const dx = nextWP.x - currentWP.x;
      const dz = nextWP.z - currentWP.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Frame-rate independent movement
      enemy.progress += (enemy.speed * delta) / Math.max(dist, 0.001);

      if (enemy.progress >= 1) {
        enemy.pathIndex++;
        enemy.progress = 0;
      }

      const pos = getPathPosition(enemy.pathIndex, enemy.progress);
      enemy.mesh.position.x = pos.x;
      enemy.mesh.position.z = pos.z;
      enemy.mesh.rotation.y += 0.05;

      // Billboard health bar toward camera
      enemy.healthBar.position.x = pos.x;
      enemy.healthBar.position.z = pos.z;
      enemy.healthBar.lookAt(camera.position.x, camera.position.y, camera.position.z);

      const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
      enemy.healthBar.scale.x = Math.max(0.01, hpPercent);
      (enemy.healthBar.material as THREE.MeshBasicMaterial).color.setHex(
        hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffff00 : 0xff0000
      );

      if (enemy.hp <= 0) {
        // Enemy died
        enemy.dead = true;
        scene.remove(enemy.mesh);
        scene.remove(enemy.healthBar);
        g.coins += enemy.reward;
        g.enemiesDead++;
        log(`KILLED ${ENEMIES[enemy.type].name}! +${enemy.reward}💰 | Total killed: ${g.enemiesDead}`);
      } else {
        alive.push(enemy);
      }
    }
    enemiesRef.current = alive;

    // ---- TOWERS SHOOT ----
    for (const tower of towersRef.current) {
      const config = TOWER_TYPES.minigoyder[tower.mode];
      if (now - tower.lastShot < config.cooldown) continue;

      let closestEnemy: Enemy | null = null;
      let closestDist = config.range;

      for (const enemy of enemiesRef.current) {
        if (enemy.dead) continue;
        const dx = enemy.mesh.position.x - tower.x;
        const dz = enemy.mesh.position.z - tower.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        closestEnemy.hp -= config.damage;
        tower.lastShot = now;
        log(`Tower #${tower.id.toString().slice(-4)} [${tower.mode}] shoots ${ENEMIES[closestEnemy.type].name} for ${config.damage}dmg | HP left: ${Math.max(0, closestEnemy.hp).toFixed(1)}`);

        // Flash effect
        const flash = new THREE.PointLight(config.color, 2, 3);
        flash.position.set(tower.x, 2, tower.z);
        scene.add(flash);
        addTimer(() => scene.remove(flash), 100);

        // Throttled speech (max 1 per second)
        if (now - g.lastSpeechTime > 1000) {
          g.lastSpeechTime = now;
          const text = tower.mode === 'stalin' ? 'ЗА СТАЛИНА' : 'ЗА ЗА ЗА';
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = tower.mode === 'stalin' ? 1.2 : 1.8;
          utter.pitch = tower.mode === 'stalin' ? 0.6 : 1.4;
          utter.volume = 0.5;
          speechSynthesis.speak(utter);
        }

        // Rotate tower to face target
        tower.mesh.lookAt(closestEnemy.mesh.position.x, 0, closestEnemy.mesh.position.z);
      }
    }

    // ---- CHECK WAVE COMPLETION ----
    if (g.waveActive && enemiesRef.current.length === 0 && waveSpawnedRef.current) {
      g.waveActive = false;
      g.wave++;
      waveSpawnedRef.current = false;
      log(`Wave COMPLETED! Advancing to wave ${g.wave}. Coins: ${g.coins}, Bananas: ${g.bananas}`);
    }

    // ---- CHECK GAME OVER (enemies reached end) ----
    if (g.gameOver) {
      // Game over logic handled by React state
    }

    // ---- GHOST TOWER ----
    if (g.placingMode && ghostTowerRef.current && g.hoveredCell) {
      ghostTowerRef.current.position.set(g.hoveredCell.x, 0.5, g.hoveredCell.z);
      ghostTowerRef.current.visible = true;
      const valid = isValidPlacement(g.hoveredCell.x, g.hoveredCell.z);
      (ghostTowerRef.current.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x00ff00 : 0xff0000);
    } else if (ghostTowerRef.current) {
      ghostTowerRef.current.visible = false;
    }

    renderer.render(scene, camera);
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [getPathPosition, isValidPlacement, addTimer, log]);

  // ========== INPUT HANDLERS (useCallback for stable refs) ==========
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !groundPlaneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const snapped = snapToGrid(point.x, point.z);
      gameRef.current.hoveredCell = snapped;
    }
  }, [snapToGrid]);

  const handleClick = useCallback(() => {
    const g = gameRef.current;
    if (!g.hoveredCell) return;
    log(`Click at (${g.hoveredCell.x.toFixed(1)}, ${g.hoveredCell.z.toFixed(1)}) | placingMode=${g.placingMode} bananas=${g.bananas}`);

    if (g.placingMode && isValidPlacement(g.hoveredCell.x, g.hoveredCell.z) && g.bananas >= CONFIG.TOWER_COST) {
      // Place tower
      const tower: Tower = {
        id: Date.now(),
        x: g.hoveredCell.x,
        z: g.hoveredCell.z,
        gridX: g.hoveredCell.x,
        gridZ: g.hoveredCell.z,
        level: 1,
        mode: 'base',
        lastShot: 0,
        mesh: createTowerMesh('base'),
        rangeMesh: null,
      };

      tower.mesh.position.set(g.hoveredCell.x, 0, g.hoveredCell.z);
      
      // Ensure all mesh children are visible
      tower.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
          child.updateMatrix();
          child.updateMatrixWorld();
        }
      });
      
      sceneRef.current?.add(tower.mesh);
      
      // Force scene update
      tower.mesh.updateMatrixWorld(true);
      
      towersRef.current.push(tower);

      g.bananas -= CONFIG.TOWER_COST;
      g.placingMode = false;
      g.selectedTower = tower;
      log(`Tower #${tower.id.toString().slice(-4)} PLACED at (${tower.x.toFixed(1)}, ${tower.z.toFixed(1)}) | Bananas left: ${g.bananas}`);

      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.position.set(g.hoveredCell.x, 0.05, g.hoveredCell.z);
        selectionMarkerRef.current.visible = true;
      }

      uiUpdate();
    } else if (!g.placingMode) {
      // Select existing tower
      const clickedTower = towersRef.current.find(t =>
        Math.abs(t.gridX - g.hoveredCell!.x) < 0.1 && Math.abs(t.gridZ - g.hoveredCell!.z) < 0.1
      );

      if (clickedTower) {
        g.selectedTower = clickedTower;
        log(`Selected tower #${clickedTower.id.toString().slice(-4)} [${clickedTower.mode}] level ${clickedTower.level}`);
        if (selectionMarkerRef.current) {
          selectionMarkerRef.current.position.set(clickedTower.x, 0.05, clickedTower.z);
          selectionMarkerRef.current.visible = true;
        }
      } else {
        g.selectedTower = null;
        if (selectionMarkerRef.current) {
          selectionMarkerRef.current.visible = false;
        }
      }
      uiUpdate();
    } else if (g.placingMode) {
      if (g.bananas < CONFIG.TOWER_COST) {
        log(`Cannot place tower: not enough bananas (${g.bananas}/${CONFIG.TOWER_COST})`);
      } else if (!isValidPlacement(g.hoveredCell.x, g.hoveredCell.z)) {
        log(`Cannot place tower at (${g.hoveredCell.x.toFixed(1)}, ${g.hoveredCell.z.toFixed(1)}): invalid position (too close to path or another tower)`);
      }
    }
  }, [isValidPlacement, createTowerMesh, uiUpdate, log]);

  // ========== THREE.JS INIT ==========
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a0a);
    scene.fog = new THREE.Fog(0x1a0a0a, 20, 60);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 15);
    camera.lookAt(0, 0, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xff4400, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -5;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    groundPlaneRef.current = ground;

    // Grid
    const grid = new THREE.GridHelper(CONFIG.MAP_WIDTH, Math.floor(CONFIG.MAP_WIDTH / CONFIG.GRID_SIZE), 0x440000, 0x220000);
    grid.position.y = 0.01;
    grid.position.z = -5;
    scene.add(grid);

    // Path visualization
    const pathPoints = PATH_WAYPOINTS.map(p => new THREE.Vector3(p.x, 0.05, p.z));
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathLine = new THREE.Line(
      pathGeometry,
      new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3, transparent: true, opacity: 0.6 })
    );
    scene.add(pathLine);

    // Path markers
    PATH_WAYPOINTS.forEach((wp, i) => {
      const markerGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ff00 : i === PATH_WAYPOINTS.length - 1 ? 0xff0000 : 0xffaa00,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(wp.x, 0.3, wp.z);
      scene.add(marker);
    });

    // Ghost tower
    const ghostGeo = new THREE.CylinderGeometry(0.6, 0.8, 1, 8);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.visible = false;
    scene.add(ghost);
    ghostTowerRef.current = ghost;

    // Selection marker
    const selGeo = new THREE.RingGeometry(0.8, 1, 16);
    const selMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const selMarker = new THREE.Mesh(selGeo, selMat);
    selMarker.rotation.x = -Math.PI / 2;
    selMarker.visible = false;
    scene.add(selMarker);
    selectionMarkerRef.current = selMarker;

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    renderer.render(scene, camera);

    return () => {
      isActiveRef.current = false;
      window.removeEventListener('resize', handleResize);
      // Clear all timers
      for (const timerId of gameRef.current.timers) {
        clearTimeout(timerId);
      }
      gameRef.current.timers = [];
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ========== START GAME LOOP ==========
  useEffect(() => {
    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [gameLoop]);

  // ========== EVENT LISTENERS (with proper closure) ==========
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) return;
      handleMouseMove(e);
    };

    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) return;
      handleClick();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
    };
  }, [handleMouseMove, handleClick]);

  // ========== UI HANDLERS ==========
  const handleProgrev = useCallback(() => {
    gameRef.current.bananas += 4;
    gameRef.current.showProgrev = false;
    uiUpdate();
  }, [uiUpdate]);

  const handlePlaceTower = useCallback(() => {
    const g = gameRef.current;
    if (g.bananas >= CONFIG.TOWER_COST) {
      g.placingMode = true;
      g.selectedTower = null;
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.visible = false;
      }
      uiUpdate();
    }
  }, [uiUpdate]);

  const handleUpgrade = useCallback((mode: 'stalin' | 'zaza') => {
    const g = gameRef.current;
    if (!g.selectedTower) return;

    const cost = g.selectedTower.level * CONFIG.UPGRADE_COST_BASE;
    if (g.coins < cost) return;

    sceneRef.current?.remove(g.selectedTower.mesh);
    const newMesh = createTowerMesh(mode);
    newMesh.position.set(g.selectedTower.x, 0, g.selectedTower.z);
    sceneRef.current?.add(newMesh);

    g.selectedTower.mode = mode;
    g.selectedTower.level++;
    g.selectedTower.mesh = newMesh;
    g.coins -= cost;
    g.selectedUpgrade = mode;

    uiUpdate();
  }, [createTowerMesh, uiUpdate]);

  const handleStartWave = useCallback(() => {
    if (!gameRef.current.waveActive) {
      spawnWave();
      uiUpdate();
    }
  }, [spawnWave, uiUpdate]);

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  // ========== RE-RENDER TRIGGER (watch for game over) ==========
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRef.current.gameOver) {
        uiUpdate();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [uiUpdate]);

  // ========== READ CURRENT STATE FOR JSX ==========
  const g = gameRef.current;

  // ========== RENDER ==========
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        cursor: g.placingMode ? 'crosshair' : g.hoveredCell ? 'pointer' : 'default',
      }} />

      {/* Debug */}
      {g.debug && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(0,0,0,0.8)', color: '#0f0',
          padding: 10, fontFamily: 'monospace', fontSize: 12, zIndex: 100,
        }}>
          {g.debug}
        </div>
      )}

      {/* HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '15px 20px', display: 'flex', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: 15 }}>
          <div style={{
            background: 'linear-gradient(135deg, #8B0000, #4B0000)', padding: '10px 20px',
            borderRadius: 8, border: '2px solid #ff0000', boxShadow: '0 0 10px rgba(255,0,0,0.5)',
          }}>
            <span style={{ color: '#ffdd00', fontSize: 22, fontWeight: 'bold', textShadow: '0 0 5px #ff0000' }}>
              🍌 {g.bananas}
            </span>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #B8860B, #8B6914)', padding: '10px 20px',
            borderRadius: 8, border: '2px solid #ffd700', boxShadow: '0 0 10px rgba(255,215,0,0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>💰 {g.coins}</span>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #000080, #000040)', padding: '10px 20px',
            borderRadius: 8, border: '2px solid #0000ff', boxShadow: '0 0 10px rgba(0,0,255,0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>🌊 {g.wave}</span>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #4B0082, #2E0050)', padding: '10px 20px',
            borderRadius: 8, border: '2px solid #9400D3', boxShadow: '0 0 10px rgba(148,0,211,0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>
              👹 {g.waveActive ? (g.enemiesSpawned - g.enemiesDead - g.enemiesReachedEnd) : 0}
            </span>
          </div>
        </div>

        <button onClick={() => setGameState('menu')} style={{
          padding: '10px 20px', background: 'rgba(0,0,0,0.7)', color: '#fff',
          border: '2px solid #fff', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
        }}>
          ← В МЕНЮ
        </button>
      </div>

      {/* Progrev Button */}
      {g.showProgrev && (
        <button onClick={handleProgrev} style={{
          position: 'absolute', top: 90, left: 20,
          padding: '15px 25px', background: 'linear-gradient(135deg, #ff6600, #cc4400)',
          color: '#fff', border: '3px solid #ffaa00', borderRadius: 10,
          cursor: 'pointer', fontSize: 16, fontWeight: 'bold', zIndex: 10,
          animation: 'pulse 2s infinite', boxShadow: '0 0 20px rgba(255,100,0,0.6)',
        }}>
          🔥 ПРОГРЕВ ГОЕВ +4🍌
        </button>
      )}

      {/* Start Wave Button */}
      {!g.waveActive && !g.gameOver && (
        <button onClick={handleStartWave} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          padding: '25px 50px', background: 'linear-gradient(135deg, #00aa00, #006600)',
          color: '#fff', border: '4px solid #00ff00', borderRadius: 15,
          cursor: 'pointer', fontSize: 28, fontWeight: 'bold', zIndex: 10,
          boxShadow: '0 0 30px rgba(0,255,0,0.5)', textShadow: '0 0 10px #000',
        }}>
          ▶ НАЧАТЬ ВОЛНУ {g.wave}
        </button>
      )}

      {/* Build Menu */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        background: 'linear-gradient(135deg, rgba(139,0,0,0.95), rgba(60,0,0,0.95))',
        padding: 20, borderRadius: 12, border: '3px solid #ff0000', zIndex: 10,
        boxShadow: '0 0 20px rgba(255,0,0,0.4)', minWidth: 200,
      }}>
        <h3 style={{ color: '#ffdd00', marginBottom: 15, textAlign: 'center', textShadow: '0 0 5px #ff0000' }}>
          ⚙ СТРОИТЕЛЬСТВО
        </h3>
        <button
          onClick={handlePlaceTower}
          disabled={g.bananas < CONFIG.TOWER_COST || g.placingMode}
          style={{
            width: '100%', padding: 15,
            background: g.placingMode ? '#00aa00' : g.bananas >= CONFIG.TOWER_COST ? 'linear-gradient(135deg, #cc0000, #880000)' : '#444',
            color: '#fff',
            border: `3px solid ${g.placingMode ? '#00ff00' : '#ff0000'}`,
            borderRadius: 8,
            cursor: g.bananas >= CONFIG.TOWER_COST ? 'pointer' : 'not-allowed',
            fontSize: 16, fontWeight: 'bold',
            boxShadow: g.placingMode ? '0 0 15px rgba(0,255,0,0.5)' : 'none',
          }}
        >
          {g.placingMode ? '💡 КЛИКНИ НА КАРТУ' : `🗼 МИНИГОЙДЕР (${CONFIG.TOWER_COST}🍌)`}
        </button>
        {g.placingMode && (
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            Зелёный = можно, Красный = нельзя
          </p>
        )}
      </div>

      {/* Upgrade Menu */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        background: 'linear-gradient(135deg, rgba(139,0,0,0.95), rgba(60,0,0,0.95))',
        padding: 20, borderRadius: 12, border: '3px solid #ff0000', zIndex: 10,
        boxShadow: '0 0 20px rgba(255,0,0,0.4)', minWidth: 250,
      }}>
        <h3 style={{ color: '#ffdd00', marginBottom: 15, textAlign: 'center', textShadow: '0 0 5px #ff0000' }}>
          ⬆ УЛУЧШЕНИЯ
        </h3>
        {g.selectedTower ? (
          <div>
            <p style={{ color: '#fff', marginBottom: 10 }}>
              Башня #{g.selectedTower.id.toString().slice(-4)} (Ур. {g.selectedTower.level})
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button
                onClick={() => handleUpgrade('stalin')}
                disabled={g.coins < g.selectedTower.level * CONFIG.UPGRADE_COST_BASE}
                style={{
                  flex: 1, padding: 10,
                  background: g.selectedTower.mode === 'stalin' ? '#aa0000' : '#444',
                  color: '#fff',
                  border: `2px solid ${g.selectedTower.mode === 'stalin' ? '#ff0000' : '#666'}`,
                  borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 12,
                }}
              >
                ☭ ЗА СТАЛИНА<br />
                <small style={{ color: '#ff8888' }}>Медленно, Мощно</small><br />
                <small>({g.selectedTower.level * CONFIG.UPGRADE_COST_BASE}💰)</small>
              </button>
              <button
                onClick={() => handleUpgrade('zaza')}
                disabled={g.coins < g.selectedTower.level * CONFIG.UPGRADE_COST_BASE}
                style={{
                  flex: 1, padding: 10,
                  background: g.selectedTower.mode === 'zaza' ? '#00aa00' : '#444',
                  color: '#fff',
                  border: `2px solid ${g.selectedTower.mode === 'zaza' ? '#00ff00' : '#666'}`,
                  borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 12,
                }}
              >
                ⚡ ЗА ЗА ЗА<br />
                <small style={{ color: '#88ff88' }}>Быстро, Слабо</small><br />
                <small>({g.selectedTower.level * CONFIG.UPGRADE_COST_BASE}💰)</small>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <div onClick={() => { gameRef.current.selectedUpgrade = 'stalin'; uiUpdate(); }}
              style={{
                flex: 1, padding: 15,
                background: g.selectedUpgrade === 'stalin' ? '#aa0000' : '#444',
                color: '#fff', border: `2px solid ${g.selectedUpgrade === 'stalin' ? '#ff0000' : '#666'}`,
                borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', textAlign: 'center',
              }}>
              ☭<br />ЗА СТАЛИНА
            </div>
            <div onClick={() => { gameRef.current.selectedUpgrade = 'zaza'; uiUpdate(); }}
              style={{
                flex: 1, padding: 15,
                background: g.selectedUpgrade === 'zaza' ? '#00aa00' : '#444',
                color: '#fff', border: `2px solid ${g.selectedUpgrade === 'zaza' ? '#00ff00' : '#666'}`,
                borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', textAlign: 'center',
              }}>
              ⚡<br />ЗА ЗА ЗА
            </div>
          </div>
        )}
        <p style={{ color: '#aaa', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          {g.selectedTower ? 'Выбери улучшение' : 'Выбери режим для новых башен'}
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: 8, zIndex: 10, textAlign: 'center',
      }}>
        <p style={{ color: '#aaa', fontSize: 12 }}>
          🖱️ Клик на карту = строительство | Выбери башню = улучшение | Враги идут по красной линии
        </p>
      </div>

      {/* Game Over */}
      {g.gameOver && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: 72, color: '#ff0000', marginBottom: 20,
              textShadow: '0 0 30px #ff0000', fontWeight: 900,
            }}>
              ПОРАЖЕНИЕ
            </h2>
            <p style={{ fontSize: 28, color: '#ffdd00', marginBottom: 10 }}>
              Волна: {g.wave} | Монеты: {g.coins}
            </p>
            <p style={{ fontSize: 18, color: '#aaa', marginBottom: 40 }}>
              Гои пробрались сквозь оборону!
            </p>
            <button onClick={handleRestart} style={{
              padding: '20px 50px', background: 'linear-gradient(135deg, #cc0000, #880000)',
              color: '#fff', border: '4px solid #ff0000', borderRadius: 12,
              fontSize: 24, fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(255,0,0,0.5)',
            }}>
              🔄 НАЧАТЬ СНОВА
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,100,0,0.6); }
          50% { transform: scale(1.02); box-shadow: 0 0 30px rgba(255,100,0,0.8); }
        }
      `}</style>
    </div>
  );
}