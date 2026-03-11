import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Joystick } from './components/Joystick';

export const inputState2 = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  shootLighter: false,
  shootCoffee: false,
  ult: false,
  mouseX: 0,
  mouseY: 0,
  isMoving: false,
  joyX: 0,
  joyY: 0,
};

interface Level2CanvasProps {
  key?: number | string;
  gameState: string;
  setGameState: (state: 'menu' | 'playing' | 'playing2' | 'gameover') => void;
  setScore: (score: number) => void;
  setAmmo: (ammo: number) => void;
  setBuffs: (buffs: string[]) => void;
  showPopup: (text: string) => void;
}

const createPlayer = () => {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1.5, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);

  return group;
};

const createEnemy = (type: 'strelok' | 'dushnila' | 'vaper' | 'boss') => {
  const group = new THREE.Group();
  
  let color = 0x880000;
  let width = 1, height = 1.5, depth = 1;
  let hp = 1;
  let speed = 8;
  
  if (type === 'dushnila') {
    color = 0x555555;
    width = 1.2; height = 1.8; depth = 1.2;
    speed = 3;
    hp = 5;
  } else if (type === 'vaper') {
    color = 0x00ffff;
    width = 0.8; height = 1.6; depth = 0.8;
    speed = 5;
    hp = 1;
  } else if (type === 'boss') {
    color = 0xff00ff;
    width = 3; height = 4; depth = 3;
    speed = 4;
    hp = 20;
  }

  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = type === 'vaper' ? height / 2 + 1 : height / 2;
  body.castShadow = true;
  group.add(body);
  
  group.userData = { type, hp, speed, color, width };
  return group;
};

const createCigaretteProjectile = () => {
  const group = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const matOrange = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  
  const whitePart = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8), matWhite);
  whitePart.rotation.x = Math.PI / 2;
  whitePart.position.z = 0.4;
  group.add(whitePart);
  
  const orangePart = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8), matOrange);
  orangePart.rotation.x = Math.PI / 2;
  orangePart.position.z = -0.15;
  group.add(orangePart);
  
  return group;
};

const createLighterProjectile = () => {
  const geo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
};

const createCoffeeProjectile = () => {
  const geo = new THREE.CylinderGeometry(0.2, 0.15, 0.4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
};

const createAshtray = () => {
  const geo = new THREE.CylinderGeometry(0.6, 0.5, 0.2, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
};

const createTextSprite = (text: string, color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3, 1.5, 1);
  return sprite;
};

export default function Level2Canvas({ gameState, setGameState, setScore, setAmmo, setBuffs, showPopup }: Level2CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef(gameState);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState<'cigarette' | 'ashtray'>('cigarette');
  const selectedWeaponRef = useRef(selectedWeapon);

  useEffect(() => {
    selectedWeaponRef.current = selectedWeapon;
  }, [selectedWeapon]);
  
  useEffect(() => {
    gameStateRef.current = gameState;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [gameState]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    scene.add(dirLight);

    // Room
    const roomSize = 40;
    const floorGeo = new THREE.BoxGeometry(roomSize, 1, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
    const wallGeo1 = new THREE.BoxGeometry(roomSize, 4, 1);
    const wallN = new THREE.Mesh(wallGeo1, wallMat);
    wallN.position.set(0, 2, -roomSize/2 - 0.5);
    scene.add(wallN);
    const wallS = new THREE.Mesh(wallGeo1, wallMat);
    wallS.position.set(0, 2, roomSize/2 + 0.5);
    scene.add(wallS);
    
    const wallGeo2 = new THREE.BoxGeometry(1, 4, roomSize);
    const wallE = new THREE.Mesh(wallGeo2, wallMat);
    wallE.position.set(roomSize/2 + 0.5, 2, 0);
    scene.add(wallE);
    const wallW = new THREE.Mesh(wallGeo2, wallMat);
    wallW.position.set(-roomSize/2 - 0.5, 2, 0);
    scene.add(wallW);

    const player = createPlayer();
    scene.add(player);

    let playerX = 0;
    let playerZ = 0;
    let scoreCounter = 0;
    let currentAmmo = 30; // Start with 30 cigarettes
    setAmmo(currentAmmo);
    
    const enemies: THREE.Group[] = [];
    const projectiles: { mesh: THREE.Group | THREE.Mesh, velocity: THREE.Vector3, type: 'cigarette' | 'lighter' | 'coffee' }[] = [];
    
    let ashtrayMesh: THREE.Mesh | null = null;
    let ashtrayTimer = 0;

    let lastShootTime = 0;
    let enemySpawnTimer = 0;
    let enemySpawnRate = 2.0;
    let time = 0;
    let bossSpawned = false;

    interface Debris {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
    }
    const debrisList: Debris[] = [];

    interface FloatingText {
      sprite: THREE.Sprite;
      life: number;
      maxLife: number;
    }
    const floatingTexts: FloatingText[] = [];

    const collectibles: { mesh: THREE.Group | THREE.Mesh, type: 'coffee' | 'gossip' | 'ammo' }[] = [];

    const spawnCollectible = (position: THREE.Vector3, type: 'coffee' | 'gossip' | 'ammo') => {
      let mesh;
      if (type === 'coffee') {
        const geo = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        mesh = new THREE.Mesh(geo, mat);
      } else if (type === 'gossip') {
        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geo, mat);
      } else {
        const geo = new THREE.BoxGeometry(0.4, 0.2, 0.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geo, mat);
      }
      mesh.position.copy(position);
      mesh.position.y = 1.0;
      scene.add(mesh);
      collectibles.push({ mesh, type });
    };

    const spawnText = (position: THREE.Vector3, text: string, color: string = '#ffffff') => {
      const sprite = createTextSprite(text, color);
      sprite.position.copy(position);
      sprite.position.y += 2;
      scene.add(sprite);
      floatingTexts.push({ sprite, life: 1.0, maxLife: 1.0 });
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      window.speechSynthesis.speak(utterance);
    };

    const spawnDebris = (position: THREE.Vector3, color: number, count: number) => {
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const mat = new THREE.MeshStandardMaterial({ color });
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.x += (Math.random() - 0.5) * 1.5;
        mesh.position.y += (Math.random() - 0.5) * 1.5 + 1;
        mesh.position.z += (Math.random() - 0.5) * 1.5;
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        scene.add(mesh);
        debrisList.push({
          mesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 10 + 5, (Math.random() - 0.5) * 15),
          life: 1.0 + Math.random() * 0.5
        });
      }
    };

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playShootSound = () => {
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
    };

    const shoot = (type: 'cigarette' | 'ashtray') => {
      const now = performance.now();
      if (now - lastShootTime < 300) return;
      playShootSound();
      lastShootTime = now;

      // Aim direction is now player's facing direction
      const dir = new THREE.Vector3(0, 0, 1);
      dir.applyQuaternion(player.quaternion);
      dir.y = 0;
      dir.normalize();

      if (type === 'cigarette' && currentAmmo > 0) {
        currentAmmo--;
        setAmmo(currentAmmo);
        
        const proj = createCigaretteProjectile();
        proj.position.copy(player.position);
        proj.position.y = 1.0;
        
        const angle = Math.atan2(dir.x, dir.z);
        proj.rotation.y = angle;
        
        scene.add(proj);
        projectiles.push({ mesh: proj, velocity: dir.multiplyScalar(25), type: 'cigarette' });
      } else if (type === 'ashtray' || (type === 'cigarette' && currentAmmo <= 0)) {
        // Melee with ashtray
        if (ashtrayTimer <= 0) {
          if (!ashtrayMesh) {
            ashtrayMesh = createAshtray();
            scene.add(ashtrayMesh);
          }
          ashtrayTimer = 0.3; // Attack duration
          
          // Check melee hits
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const dist = player.position.distanceTo(e.position);
            const hitDist = e.userData.width / 2 + 2.5; // Increased hit range slightly
            if (dist < hitDist) {
              let damage = 0;
              if (e.userData.type === 'dushnila') damage = 5; // One shot dushnila
              else damage = 1;

              e.userData.hp -= damage;
              if (e.userData.hp <= 0) {
                  spawnDebris(e.position, e.userData.color, 15 * Math.ceil(e.userData.width));
                  spawnText(e.position, "НА ПО БАШКЕ ПЕПЕЛЬНИЦЕЙ!", "#ffaa00");
                  scene.remove(e);
                  enemies.splice(i, 1);
                  scoreCounter += 50;
                  if (e.userData.type === 'boss') scoreCounter += 1000;
                  if (e.userData.type === 'dushnila') scoreCounter += 150;
                  setScore(scoreCounter);
              } else {
                  spawnText(e.position, "Н-НА!", "#ffaa00");
              }
            }
          }
        }
      }
    };

    let fireExtinguisherTimer = 0;
    let fireExtinguisherCooldown = 0;
    let gossipTimer = 0;

    let animationFrameId: number;
    let lastTime = performance.now();
    let isGameOver = false;
    let gameOverTimer = 0;

    scene.fog = new THREE.FogExp2(0xcccccc, 0);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      lastTime = now;

      if (gameStateRef.current !== 'playing2') return;

      time += dt;

      if (fireExtinguisherCooldown > 0) fireExtinguisherCooldown -= dt;
      if (fireExtinguisherTimer > 0) fireExtinguisherTimer -= dt;
      if (gossipTimer > 0) gossipTimer -= dt;

      if (inputState2.ult && fireExtinguisherCooldown <= 0) {
        fireExtinguisherTimer = 5;
        fireExtinguisherCooldown = 30;
        showPopup("ОГНЕТУШИТЕЛЬ АКТИВИРОВАН!");
      }

      let targetFogDensity = 0;
      const vaperCount = enemies.filter(e => e.userData.type === 'vaper').length;
      targetFogDensity = vaperCount * 0.005; // Reduced fog density
      if (fireExtinguisherTimer > 0) targetFogDensity = 0;
      
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density += (targetFogDensity - scene.fog.density) * dt;
      }

      if (isGameOver) {
        gameOverTimer -= dt;
        if (gameOverTimer <= 0) {
          setGameState('gameover');
        }
        
        // Update debris even in game over
        for (let i = debrisList.length - 1; i >= 0; i--) {
          const d = debrisList[i];
          d.life -= dt;
          if (d.life <= 0) {
            scene.remove(d.mesh);
            debrisList.splice(i, 1);
          } else {
            d.velocity.y -= 40 * dt;
            d.mesh.position.addScaledVector(d.velocity, dt);
            if (d.mesh.position.y < 0.15) {
              d.mesh.position.y = 0.15;
              d.velocity.y *= -0.5;
              d.velocity.x *= 0.8;
              d.velocity.z *= 0.8;
            }
          }
        }
        renderer.render(scene, camera);
        return;
      }

      // Player Movement
      const moveSpeed = 12;
      let moveX = 0;
      let moveZ = 0;
      
      if (inputState2.isMoving) {
        // Move in the direction the player is facing
        moveX = Math.sin(player.rotation.y);
        moveZ = Math.cos(player.rotation.y);
      } else if (Math.abs(inputState2.joyX) > 0.1 || Math.abs(inputState2.joyY) > 0.1) {
        moveX = inputState2.joyX;
        moveZ = inputState2.joyY;
      } else {
        if (inputState2.up) moveZ -= 1;
        if (inputState2.down) moveZ += 1;
        if (inputState2.left) moveX -= 1;
        if (inputState2.right) moveX += 1;
      }
      
      if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        playerX += (moveX / length) * moveSpeed * dt;
        playerZ += (moveZ / length) * moveSpeed * dt;

        // Aiming rotation follows movement
        const targetAngle = Math.atan2(moveX, moveZ);
        player.rotation.y = targetAngle;
      }

      // Clamp to room
      const limit = roomSize / 2 - 1;
      if (playerX < -limit) playerX = -limit;
      if (playerX > limit) playerX = limit;
      if (playerZ < -limit) playerZ = -limit;
      if (playerZ > limit) playerZ = limit;

      player.position.set(playerX, 0, playerZ);

      if (inputState2.shoot) {
        shoot(selectedWeaponRef.current);
      }

      // Ashtray animation
      if (ashtrayTimer > 0) {
        ashtrayTimer -= dt;
        if (ashtrayMesh) {
          ashtrayMesh.visible = true;
          const angle = player.rotation.y + (0.15 - Math.abs(ashtrayTimer - 0.15)) * 10;
          ashtrayMesh.position.set(
            player.position.x + Math.sin(angle) * 1.5,
            1.0,
            player.position.z + Math.cos(angle) * 1.5
          );
        }
      } else if (ashtrayMesh) {
        ashtrayMesh.visible = false;
      }

      // Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.addScaledVector(p.velocity, dt);
        
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = p.mesh.position.x - e.position.x;
          const dz = p.mesh.position.z - e.position.z;
          const distSq = dx * dx + dz * dz;
          
          const hitRadiusSq = (e.userData.width / 2 + 0.5) ** 2;
          
          if (distSq < hitRadiusSq) {
            let damage = 0;
            if (e.userData.type === 'strelok' && p.type === 'cigarette') damage = 1;
            if (e.userData.type === 'vaper' && p.type === 'lighter') damage = 1;
            if (e.userData.type === 'boss' && p.type === 'coffee') damage = 1;
            if (e.userData.type === 'dushnila') {
                spawnText(e.position, "А ты знаешь, что капля никотина убивает лошадь?", "#aaaaaa");
            }
            
            if (damage > 0) {
                e.userData.hp -= damage;
                spawnDebris(p.mesh.position, 0xffffff, 5);
                
                if (e.userData.hp <= 0) {
                    spawnDebris(e.position, e.userData.color, 15 * Math.ceil(e.userData.width));
                    if (e.userData.type === 'boss') {
                        spawnText(e.position, "УВОЛЕН ПО СОБСТВЕННОМУ!", "#ff00ff");
                        scoreCounter += 1000;
                    } else if (e.userData.type === 'vaper') {
                        spawnText(e.position, "ПАРЮ ГДЕ ХОЧУ!", "#00ffff");
                        scoreCounter += 100;
                    } else if (e.userData.type === 'strelok') {
                        spawnText(e.position, "От души!", "#ff4444");
                        scoreCounter += 50;
                    }
                    scene.remove(e);
                    enemies.splice(j, 1);
                } else {
                    spawnText(e.position, "АУЧ!", "#ffffff");
                }
            }
            
            hit = true;
            setScore(scoreCounter);
            break;
          }
        }

        if (hit || Math.abs(p.mesh.position.x) > roomSize/2 || Math.abs(p.mesh.position.z) > roomSize/2) {
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
        }
      }

      // Collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        c.mesh.rotation.y += dt * 2;
        c.mesh.position.y = 1.0 + Math.sin(time * 3) * 0.2;
        
        if (c.mesh.position.distanceTo(player.position) < 1.5) {
          if (c.type === 'coffee') {
            setBuffs(['Кофе 3-в-1 (Ускорение)']);
            spawnText(c.mesh.position, "КОФЕ 3-В-1!", "#ffaa00");
            scoreCounter += 100;
          } else if (c.type === 'gossip') {
            gossipTimer = 3;
            setBuffs(['Сплетня (Заморозка)']);
            spawnText(c.mesh.position, "А ВЫ СЛЫШАЛИ ПРО...", "#ff00ff");
            scoreCounter += 100;
          } else if (c.type === 'ammo') {
            currentAmmo += 10;
            setAmmo(currentAmmo);
            spawnText(c.mesh.position, "+10 СИГАРЕТ", "#00ff00");
          }
          setScore(scoreCounter);
          scene.remove(c.mesh);
          collectibles.splice(i, 1);
        }
      }

      // Enemy Spawning
      enemySpawnTimer -= dt;
      if (enemySpawnTimer <= 0) {
        const wave = Math.floor(time / 15);
        enemySpawnRate = Math.max(0.4, 2.5 - wave * 0.2);
        enemySpawnTimer = enemySpawnRate;
        
        const getEdgePos = () => {
          const edge = Math.floor(Math.random() * 4);
          let ex = 0, ez = 0;
          if (edge === 0) { ex = (Math.random() - 0.5) * roomSize; ez = -roomSize/2; }
          if (edge === 1) { ex = (Math.random() - 0.5) * roomSize; ez = roomSize/2; }
          if (edge === 2) { ex = -roomSize/2; ez = (Math.random() - 0.5) * roomSize; }
          if (edge === 3) { ex = roomSize/2; ez = (Math.random() - 0.5) * roomSize; }
          return { ex, ez };
        };

        if (time > 60 && !bossSpawned) {
          bossSpawned = true;
          showPopup("БОСС ПРИШЕЛ ПОКУРИТЬ!");
          const { ex, ez } = getEdgePos();
          const boss = createEnemy('boss');
          boss.position.set(ex, 0, ez);
          scene.add(boss);
          enemies.push(boss);
          
          // Boss escort
          for (let i = 0; i < 3; i++) {
            const escort = createEnemy('dushnila');
            escort.position.set(ex + (Math.random() - 0.5) * 4, 0, ez + (Math.random() - 0.5) * 4);
            scene.add(escort);
            enemies.push(escort);
          }
        } else {
          const patternRand = Math.random();
          
          if (patternRand < 0.2 && wave > 1) {
            // Pattern 1: Vaper Swarm (3-5 fast enemies)
            const swarmSize = Math.floor(Math.random() * 3) + 3;
            const { ex, ez } = getEdgePos();
            for (let i = 0; i < swarmSize; i++) {
              const enemy = createEnemy('vaper');
              enemy.position.set(ex + (Math.random() - 0.5) * 3, 0, ez + (Math.random() - 0.5) * 3);
              scene.add(enemy);
              enemies.push(enemy);
            }
          } else if (patternRand < 0.4 && wave > 2) {
            // Pattern 2: Circle Surround (Streloks from all sides)
            for (let i = 0; i < 4; i++) {
              const enemy = createEnemy('strelok');
              let ex = 0, ez = 0;
              if (i === 0) { ex = 0; ez = -roomSize/2; }
              if (i === 1) { ex = 0; ez = roomSize/2; }
              if (i === 2) { ex = -roomSize/2; ez = 0; }
              if (i === 3) { ex = roomSize/2; ez = 0; }
              enemy.position.set(ex, 0, ez);
              scene.add(enemy);
              enemies.push(enemy);
            }
          } else if (patternRand < 0.6 && wave > 3) {
            // Pattern 3: Dushnila Escort
            const { ex, ez } = getEdgePos();
            const dushnila = createEnemy('dushnila');
            dushnila.position.set(ex, 0, ez);
            scene.add(dushnila);
            enemies.push(dushnila);
            
            for (let i = 0; i < 2; i++) {
              const strelok = createEnemy('strelok');
              strelok.position.set(ex + (Math.random() - 0.5) * 3, 0, ez + (Math.random() - 0.5) * 3);
              scene.add(strelok);
              enemies.push(strelok);
            }
          } else {
            // Standard single spawn
            let enemyType: 'strelok' | 'dushnila' | 'vaper' = 'strelok';
            if (time > 30 && Math.random() < 0.4) enemyType = 'dushnila';
            else if (time > 15 && Math.random() < 0.3) enemyType = 'vaper';
            
            const { ex, ez } = getEdgePos();
            const enemy = createEnemy(enemyType);
            enemy.position.set(ex, 0, ez);
            scene.add(enemy);
            enemies.push(enemy);
          }
        }

        if (Math.random() < 0.3) {
          const type = Math.random() < 0.3 ? 'coffee' : (Math.random() < 0.6 ? 'gossip' : 'ammo');
          const cx = (Math.random() - 0.5) * (roomSize - 4);
          const cz = (Math.random() - 0.5) * (roomSize - 4);
          spawnCollectible(new THREE.Vector3(cx, 1, cz), type);
        }
      }

      // Enemy Movement & Collision
      for (const e of enemies) {
        if (gossipTimer <= 0 && fireExtinguisherTimer <= 0) {
          const dir = new THREE.Vector3().subVectors(player.position, e.position);
          dir.y = 0;
          dir.normalize();
          e.position.addScaledVector(dir, e.userData.speed * dt);
          e.lookAt(player.position.x, e.position.y, player.position.z);
        }

        const hitDist = e.userData.width / 2 + 0.6;
        if (e.position.distanceTo(player.position) < hitDist) {
          isGameOver = true;
          gameOverTimer = 2.0;
          spawnDebris(player.position, 0x333333, 50);
          player.visible = false;
          break;
        }
      }

      // Update Debris
      for (let i = debrisList.length - 1; i >= 0; i--) {
        const d = debrisList[i];
        d.life -= dt;
        if (d.life <= 0) {
          scene.remove(d.mesh);
          debrisList.splice(i, 1);
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

      // Update Floating Texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= dt;
        if (ft.life <= 0) {
          scene.remove(ft.sprite);
          floatingTexts.splice(i, 1);
        } else {
          ft.sprite.position.y += dt * 2;
          ft.sprite.material.opacity = ft.life / ft.maxLife;
        }
      }

      // Camera follow
      camera.position.x = playerX * 0.5;
      camera.position.z = playerZ * 0.5 + 15;
      camera.lookAt(playerX * 0.5, 0, playerZ * 0.5);

      renderer.render(scene, camera);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputState2.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputState2.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputState2.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputState2.right = true;
      if (e.code === 'Space') inputState2.ult = true;
      if (e.code === 'KeyQ') inputState2.shootLighter = true;
      if (e.code === 'KeyE') inputState2.shootCoffee = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputState2.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputState2.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputState2.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputState2.right = false;
      if (e.code === 'Space') inputState2.ult = false;
      if (e.code === 'KeyQ') inputState2.shootLighter = false;
      if (e.code === 'KeyE') inputState2.shootCoffee = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      inputState2.mouseX = e.clientX;
      inputState2.mouseY = e.clientY;
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) inputState2.shoot = true;
      if (e.button === 2) inputState2.shootLighter = true;
      if (e.button === 1) inputState2.shootCoffee = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) inputState2.shoot = false;
      if (e.button === 2) inputState2.shootLighter = false;
      if (e.button === 1) inputState2.shootCoffee = false;
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      const x = touch.clientX;
      const y = touch.clientY;

      // Aiming touch
      inputState2.mouseX = x;
      inputState2.mouseY = y;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('touchmove', handleTouch);

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full block cursor-crosshair" />
      
      {isMobile && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Left Side: Weapon Icons and Shoot Button */}
          <div className="absolute bottom-10 left-10 flex flex-col gap-6 pointer-events-auto">
            {/* Weapon Icons Row */}
            <div className="flex gap-2 bg-black/40 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
              {(['cigarette', 'ashtray'] as const).map((w) => (
                <button
                  key={w}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWeapon(w);
                  }}
                  className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                    selectedWeapon === w 
                      ? 'bg-white/40 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.6)]' 
                      : 'bg-white/10 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">
                      {w === 'cigarette' ? '🚬' : '🥣'}
                    </span>
                    <span className="text-[9px] text-white font-black uppercase tracking-tighter">
                      {w === 'cigarette' ? 'Сига' : 'Пепел'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Shoot Button */}
            <button
              className="w-32 h-32 bg-red-600/70 rounded-full border-4 border-red-400/80 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-90 active:bg-red-500/90 transition-all touch-none select-none ring-4 ring-red-900/20"
              onTouchStart={(e) => { e.stopPropagation(); inputState2.shoot = true; }}
              onTouchEnd={(e) => { e.stopPropagation(); inputState2.shoot = false; }}
              onMouseDown={(e) => { e.stopPropagation(); inputState2.shoot = true; }}
              onMouseUp={(e) => { e.stopPropagation(); inputState2.shoot = false; }}
            >
              <div className="flex flex-col items-center">
                <span className="leading-none">ОГОНЬ</span>
                <span className="text-[10px] opacity-60 mt-1">SHOOT</span>
              </div>
            </button>
          </div>

          {/* Right Side: Joystick */}
          <div className="absolute bottom-10 right-10 pointer-events-auto">
            <Joystick 
              size={150}
              onMove={(x, y) => {
                inputState2.joyX = x;
                inputState2.joyY = y;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
