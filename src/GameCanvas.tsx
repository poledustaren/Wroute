import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const inputState = {
  left: false,
  right: false,
  jump: false,
  goyda: false,
};

interface GameCanvasProps {
  key?: number | string;
  gameState: 'menu' | 'playing' | 'gameover';
  setGameState: (state: 'menu' | 'playing' | 'gameover') => void;
  setScore: (score: number) => void;
  setAmmo: (ammo: number) => void;
  setBuffs: (buffs: string[]) => void;
  showPopup: (text: string) => void;
}

const createGoydaSprite = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ГОЙДА', 128, 64);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 1, 1);
  return sprite;
};

const createPlayer = (color = 0x333333) => {
  const group = new THREE.Group();
  
  // Body
  const bodyGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.5;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.55;
  head.castShadow = true;
  group.add(head);

  // Tie
  const tieGeo = new THREE.BoxGeometry(0.2, 0.8, 0.1);
  const tieMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
  const tie = new THREE.Mesh(tieGeo, tieMat);
  tie.position.set(0, 1.8, 0.3);
  group.add(tie);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.7, 2.0, 0);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.y = -0.5;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);
  group.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.7, 2.0, 0);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.y = -0.5;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);
  group.add(rightArmGroup);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.25, 1.2, 0);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.y = -0.6;
  leftLeg.castShadow = true;
  leftLegGroup.add(leftLeg);
  group.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.25, 1.2, 0);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.y = -0.6;
  rightLeg.castShadow = true;
  rightLegGroup.add(rightLeg);
  group.add(rightLegGroup);

  return { group, leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup };
};

const createDesk = () => {
  const group = new THREE.Group();
  const topGeo = new THREE.BoxGeometry(1.8, 0.1, 1.2);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
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
};

const createEnemy = () => {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.BoxGeometry(1.2, 1.6, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x880000 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.5;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.65;
  head.castShadow = true;
  group.add(head);

  const hornGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.25, 3.1, 0);
  group.add(leftHorn);
  const rightHorn = new THREE.Mesh(hornGeo, hornMat);
  rightHorn.position.set(0.25, 3.1, 0);
  group.add(rightHorn);

  return group;
};

const createFlyingEnemy = () => {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x550055 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  
  const wingGeo = new THREE.BoxGeometry(2.5, 0.1, 0.5);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.y = 0.5;
  group.add(wings);
  
  group.userData = { hoverOffset: Math.random() * Math.PI * 2 };
  return group;
};

const createCigarette = () => {
  const group = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const matOrange = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  
  const whitePart = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), matWhite);
  whitePart.position.y = 0.75;
  group.add(whitePart);
  
  const orangePart = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), matOrange);
  orangePart.position.y = 1.75;
  group.add(orangePart);
  
  group.userData = { jumpOffset: Math.random() * Math.PI * 2 };
  return group;
};

const createPizza = () => {
  const group = new THREE.Group();
  // A slice of pizza
  const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 3, 1, false, 0, Math.PI * 2 / 3);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.z = Math.PI / 2;
  group.add(mesh);
  
  const pepGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8);
  const pepMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
  const pep1 = new THREE.Mesh(pepGeo, pepMat);
  pep1.position.set(0.2, 0, 0.2);
  pep1.rotation.x = Math.PI / 2;
  group.add(pep1);
  
  return group;
};

const createGramota = () => {
  const group = new THREE.Group();
  const paperGeo = new THREE.BoxGeometry(0.8, 1.1, 0.05);
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  group.add(paper);

  const starGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 5);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  const star = new THREE.Mesh(starGeo, starMat);
  star.rotation.x = Math.PI / 2;
  star.position.z = 0.03;
  group.add(star);

  return group;
};

const createNeuronka = (color: number) => {
  const group = new THREE.Group();
  
  const coreGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const coreMat = new THREE.MeshStandardMaterial({ 
    color: color, 
    emissive: color,
    emissiveIntensity: 0.5,
    wireframe: true 
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const innerGeo = new THREE.IcosahedronGeometry(0.3, 0);
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  group.add(inner);

  return group;
};

export default function GameCanvas({ gameState, setGameState, setScore, setAmmo, setBuffs, showPopup }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef(gameState);
  
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Dark office ceiling
    scene.fog = new THREE.Fog(0x1a1a1a, 20, 80);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    scene.add(dirLight);

    // Players
    const player = createPlayer(0x333333);
    const playerLeft = createPlayer(0x0033aa); // Blue suit
    const playerRight = createPlayer(0xaa3300); // Red suit
    
    scene.add(player.group);
    scene.add(playerLeft.group);
    scene.add(playerRight.group);
    
    playerLeft.group.visible = false;
    playerRight.group.visible = false;

    // Game State Variables
    let playerZ = 0;
    let playerX = 0;
    let playerY = 0;
    let velocityY = 0;
    const gravity = -40;
    const jumpForce = 15;
    let speed = 15;
    let scoreCounter = 0;
    let lastReportedScore = 0;
    let isGameOver = false;

    let currentAmmo = 10;
    let infiniteAmmoTimer = 0;
    let slowdownTimer = 0;
    let pizzaTimer = 0;
    let lastReportedBuffs = '';

    const roadWidth = 12;
    const chunkLength = 50;
    let lastGeneratedZ = 10;
    let time = 0;

    // Object Arrays
    const platforms: { group: THREE.Group, z: number }[] = [];
    const obstacles: THREE.Group[] = [];
    const enemies: THREE.Group[] = [];
    const flyingEnemies: THREE.Group[] = [];
    const cigarettes: THREE.Group[] = [];
    const projectiles: THREE.Sprite[] = [];
    const gramotas: THREE.Group[] = [];
    const greenNeuronkas: THREE.Group[] = [];
    const blueNeuronkas: THREE.Group[] = [];
    const pizzas: THREE.Group[] = [];

    // Procedural Generation
    const generateChunk = (startZ: number) => {
      const chunkGroup = new THREE.Group();
      
      // Floor (Carpet)
      const floorGeo = new THREE.BoxGeometry(roadWidth, 1, chunkLength);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(0, -0.5, startZ - chunkLength / 2);
      floor.receiveShadow = true;
      chunkGroup.add(floor);

      // Walls
      const wallGeo = new THREE.BoxGeometry(1, 10, chunkLength);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
      
      const leftWall = new THREE.Mesh(wallGeo, wallMat);
      leftWall.position.set(-roadWidth / 2 - 0.5, 4.5, startZ - chunkLength / 2);
      leftWall.receiveShadow = true;
      chunkGroup.add(leftWall);

      const rightWall = new THREE.Mesh(wallGeo, wallMat);
      rightWall.position.set(roadWidth / 2 + 0.5, 4.5, startZ - chunkLength / 2);
      rightWall.receiveShadow = true;
      chunkGroup.add(rightWall);

      // Ceiling
      const ceilingGeo = new THREE.BoxGeometry(roadWidth, 1, chunkLength);
      const ceiling = new THREE.Mesh(ceilingGeo, wallMat);
      ceiling.position.set(0, 9.5, startZ - chunkLength / 2);
      chunkGroup.add(ceiling);

      // Lights on ceiling
      for (let z = startZ - 5; z > startZ - chunkLength; z -= 10) {
        const lightGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(0, 8.9, z);
        chunkGroup.add(light);
      }

      scene.add(chunkGroup);
      platforms.push({ group: chunkGroup, z: startZ - chunkLength / 2 });

      // Difficulty scaling: more items over time
      const difficultyMultiplier = 1 + Math.floor(time / 20) * 0.5;
      const numItems = Math.floor((Math.random() * 3 + 2) * difficultyMultiplier);
      
      for (let i = 0; i < numItems; i++) {
        const zPos = startZ - Math.random() * chunkLength;
        const xPos = (Math.random() - 0.5) * (roadWidth - 3);
        
        const rand = Math.random();
        if (rand < 0.4) {
          // Enemies
          const enemyTypeRand = Math.random();
          if (time > 40 && enemyTypeRand < 0.3) {
            const cig = createCigarette();
            cig.position.set(xPos, 0, zPos);
            scene.add(cig);
            cigarettes.push(cig);
            enemies.push(cig); // Add to general enemies for collision
          } else if (time > 20 && enemyTypeRand < 0.6) {
            const fly = createFlyingEnemy();
            fly.position.set(xPos, 3 + Math.random() * 2, zPos);
            scene.add(fly);
            flyingEnemies.push(fly);
            enemies.push(fly);
          } else {
            const enemy = createEnemy();
            enemy.position.set(xPos, 0, zPos);
            scene.add(enemy);
            enemies.push(enemy);
          }
        } else if (rand < 0.6) {
          const obs = createDesk();
          obs.position.set(xPos, 0, zPos);
          scene.add(obs);
          obstacles.push(obs);
        } else if (rand < 0.75) {
          const gramota = createGramota();
          gramota.position.set(xPos, 1.5, zPos);
          scene.add(gramota);
          gramotas.push(gramota);
        } else if (rand < 0.85) {
          const green = createNeuronka(0x00ff00);
          green.position.set(xPos, 1.5, zPos);
          scene.add(green);
          greenNeuronkas.push(green);
        } else if (rand < 0.95) {
          const blue = createNeuronka(0x0088ff);
          blue.position.set(xPos, 1.5, zPos);
          scene.add(blue);
          blueNeuronkas.push(blue);
        } else {
          const pizza = createPizza();
          pizza.position.set(xPos, 1.5, zPos);
          scene.add(pizza);
          pizzas.push(pizza);
        }
      }
    };

    for (let i = 0; i < 4; i++) {
      generateChunk(lastGeneratedZ);
      lastGeneratedZ -= chunkLength;
    }

    let lastShootTime = 0;
    const shootGoyda = () => {
      const now = performance.now();
      if (now - lastShootTime < 500) return;
      if (currentAmmo <= 0 && infiniteAmmoTimer <= 0) return;
      
      lastShootTime = now;

      if (infiniteAmmoTimer <= 0) {
        currentAmmo -= 1;
        setAmmo(currentAmmo);
      }

      const spawnProjectile = (offsetX: number) => {
        const proj = createGoydaSprite();
        proj.position.copy(player.group.position);
        proj.position.x += offsetX;
        proj.position.y += 2;
        scene.add(proj);
        projectiles.push(proj);
      };

      spawnProjectile(0);
      if (pizzaTimer > 0) {
        spawnProjectile(-1.5);
        spawnProjectile(1.5);
      }
    };

    // Improved collision check for meshes
    const checkCollision = (obj1: THREE.Object3D, obj2: THREE.Object3D, margin = 0.2) => {
      obj1.updateMatrixWorld(true);
      obj2.updateMatrixWorld(true);
      
      const box1 = new THREE.Box3().setFromObject(obj1);
      const box2 = new THREE.Box3().setFromObject(obj2);
      
      const size1 = new THREE.Vector3();
      box1.getSize(size1);
      if (size1.x > margin * 2) { box1.min.x += margin; box1.max.x -= margin; }
      if (size1.y > margin * 2) { box1.min.y += margin; box1.max.y -= margin; }
      if (size1.z > margin * 2) { box1.min.z += margin; box1.max.z -= margin; }

      const size2 = new THREE.Vector3();
      box2.getSize(size2);
      if (size2.x > margin * 2) { box2.min.x += margin; box2.max.x -= margin; }
      if (size2.y > margin * 2) { box2.min.y += margin; box2.max.y -= margin; }
      if (size2.z > margin * 2) { box2.min.z += margin; box2.max.z -= margin; }
      
      return box1.intersectsBox(box2);
    };

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      lastTime = now;

      if (gameStateRef.current !== 'playing' || isGameOver) return;

      time += dt;

      // Update Timers
      if (infiniteAmmoTimer > 0) {
        infiniteAmmoTimer -= dt;
        if (infiniteAmmoTimer <= 0) infiniteAmmoTimer = 0;
      }
      if (slowdownTimer > 0) {
        slowdownTimer -= dt;
        if (slowdownTimer <= 0) slowdownTimer = 0;
      }
      if (pizzaTimer > 0) {
        pizzaTimer -= dt;
        if (pizzaTimer <= 0) {
          pizzaTimer = 0;
          playerLeft.group.visible = false;
          playerRight.group.visible = false;
        } else {
          playerLeft.group.visible = true;
          playerRight.group.visible = true;
        }
      }

      // Update Buffs UI
      const newBuffs = [];
      if (infiniteAmmoTimer > 0) newBuffs.push(`Бесконечная Гойда (${Math.ceil(infiniteAmmoTimer)}s)`);
      if (slowdownTimer > 0) newBuffs.push(`Замедление (${Math.ceil(slowdownTimer)}s)`);
      if (pizzaTimer > 0) newBuffs.push(`Тройная Гойда (${Math.ceil(pizzaTimer)}s)`);
      
      const buffsString = newBuffs.join(',');
      if (buffsString !== lastReportedBuffs) {
        setBuffs(newBuffs);
        lastReportedBuffs = buffsString;
      }

      let currentSpeed = speed;
      if (slowdownTimer > 0) {
        currentSpeed = speed * 0.5; // Slow down by 50%
      }

      playerZ -= currentSpeed * dt;
      scoreCounter += currentSpeed * dt * 0.1;
      
      const currentScore = Math.floor(scoreCounter);
      if (currentScore !== lastReportedScore) {
        setScore(currentScore);
        lastReportedScore = currentScore;
      }

      speed += dt * 0.05;

      const moveSpeed = 15;
      if (inputState.left) playerX -= moveSpeed * dt;
      if (inputState.right) playerX += moveSpeed * dt;
      
      const maxOffsetX = roadWidth / 2 - 1.0;
      if (playerX < -maxOffsetX) playerX = -maxOffsetX;
      if (playerX > maxOffsetX) playerX = maxOffsetX;

      if (inputState.jump && playerY === 0) {
        velocityY = jumpForce;
      }
      velocityY += gravity * dt;
      playerY += velocityY * dt;
      if (playerY < 0) {
        playerY = 0;
        velocityY = 0;
      }

      if (inputState.goyda) {
        shootGoyda();
        inputState.goyda = false;
      }

      player.group.position.set(playerX, playerY, playerZ);
      
      if (pizzaTimer > 0) {
        playerLeft.group.position.set(playerX - 1.5, playerY, playerZ);
        playerRight.group.position.set(playerX + 1.5, playerY, playerZ);
      }

      // Player Animation
      const animatePlayer = (p: { group: THREE.Group, leftArmGroup: THREE.Group, rightArmGroup: THREE.Group, leftLegGroup: THREE.Group, rightLegGroup: THREE.Group }) => {
        if (playerY === 0) {
          const runCycle = time * currentSpeed * 0.5;
          p.leftArmGroup.rotation.x = Math.sin(runCycle) * 0.8;
          p.rightArmGroup.rotation.x = Math.sin(runCycle + Math.PI) * 0.8;
          p.leftLegGroup.rotation.x = Math.sin(runCycle + Math.PI) * 0.8;
          p.rightLegGroup.rotation.x = Math.sin(runCycle) * 0.8;
        } else {
          p.leftArmGroup.rotation.x = -Math.PI / 4;
          p.rightArmGroup.rotation.x = -Math.PI / 4;
          p.leftLegGroup.rotation.x = -Math.PI / 6;
          p.rightLegGroup.rotation.x = Math.PI / 6;
        }
      };
      
      animatePlayer(player);
      if (pizzaTimer > 0) {
        animatePlayer(playerLeft);
        animatePlayer(playerRight);
      }

      camera.position.x = playerX * 0.3;
      camera.position.y = playerY + 6;
      camera.position.z = playerZ + 10;
      camera.lookAt(playerX * 0.5, playerY + 2, playerZ - 10);

      // Animate special enemies
      for (const fly of flyingEnemies) {
        fly.position.y = 3 + Math.sin(time * 3 + fly.userData.hoverOffset) * 1.5;
        fly.position.x += Math.sin(time * 2 + fly.userData.hoverOffset) * 2 * dt;
      }
      
      for (const cig of cigarettes) {
        cig.position.y = Math.abs(Math.sin(time * 5 + cig.userData.jumpOffset)) * 3;
        cig.position.z -= 2 * dt; // Move slightly towards player
      }

      // Collectibles Animation & Collision
      const checkCollectible = (arr: THREE.Group[], action: () => void) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          const item = arr[i];
          item.rotation.y += dt * 2;
          item.position.y = 1.5 + Math.sin(time * 3 + item.position.z) * 0.2;
          
          let hit = false;
          const distSq = (playerX - item.position.x) ** 2 + (playerZ - item.position.z) ** 2;
          if (distSq < 2.25) hit = true; // 1.5 radius squared
          
          if (!hit && pizzaTimer > 0) {
            const distSqL = (playerLeft.group.position.x - item.position.x) ** 2 + (playerLeft.group.position.z - item.position.z) ** 2;
            const distSqR = (playerRight.group.position.x - item.position.x) ** 2 + (playerRight.group.position.z - item.position.z) ** 2;
            if (distSqL < 2.25 || distSqR < 2.25) hit = true;
          }
          
          if (hit) {
            scene.remove(item);
            arr.splice(i, 1);
            action();
          }
        }
      };

      checkCollectible(gramotas, () => {
        currentAmmo += 5;
        setAmmo(currentAmmo);
        scoreCounter += 10;
        showPopup("норм темка");
      });
      
      checkCollectible(greenNeuronkas, () => { 
        slowdownTimer = 5; 
        showPopup("ты выбрал нейронку для затупа");
      });
      
      checkCollectible(blueNeuronkas, () => { 
        infiniteAmmoTimer = 10; 
        showPopup("нейро удача, вышла новая нейронка, а не говно");
      });
      
      checkCollectible(pizzas, () => { 
        pizzaTimer = 5; 
        showPopup("работаем братьч, пиццу привезли");
      });

      // Projectiles vs Enemies
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.position.z -= (currentSpeed + 30) * dt;

        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          
          // Simple 2D distance check (X and Z) for projectiles
          const dx = p.position.x - e.position.x;
          const dz = p.position.z - e.position.z;
          const distSq = dx * dx + dz * dz;
          
          if (distSq < 2.25) { // 1.5 radius squared
            scene.remove(e);
            enemies.splice(j, 1);
            
            // Also remove from specific arrays if needed
            const flyIdx = flyingEnemies.indexOf(e);
            if (flyIdx > -1) flyingEnemies.splice(flyIdx, 1);
            const cigIdx = cigarettes.indexOf(e);
            if (cigIdx > -1) cigarettes.splice(cigIdx, 1);
            
            hit = true;
            scoreCounter += 50;
            const newScore = Math.floor(scoreCounter);
            setScore(newScore);
            lastReportedScore = newScore;
            break;
          }
        }

        if (hit || p.position.z < playerZ - 60) {
          scene.remove(p);
          projectiles.splice(i, 1);
        }
      }

      // Player vs Obstacles/Enemies
      const checkFatalCollision = (arr: THREE.Group[]) => {
        for (const item of arr) {
          if (checkCollision(player.group, item, 0.4)) return true;
          if (pizzaTimer > 0) {
            if (checkCollision(playerLeft.group, item, 0.4)) return true;
            if (checkCollision(playerRight.group, item, 0.4)) return true;
          }
        }
        return false;
      };

      if (checkFatalCollision(obstacles) || checkFatalCollision(enemies)) {
        isGameOver = true;
        setGameState('gameover');
        return;
      }

      if (playerZ - 60 < lastGeneratedZ) {
        generateChunk(lastGeneratedZ);
        lastGeneratedZ -= chunkLength;
      }

      // Cleanup
      if (platforms.length > 6) {
        const oldFloor = platforms.shift();
        if (oldFloor) scene.remove(oldFloor.group);
      }
      
      const cleanupArray = (arr: THREE.Object3D[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].position.z > playerZ + 10) {
            scene.remove(arr[i]);
            arr.splice(i, 1);
          }
        }
      };
      
      cleanupArray(obstacles);
      cleanupArray(enemies);
      cleanupArray(flyingEnemies);
      cleanupArray(cigarettes);
      cleanupArray(gramotas);
      cleanupArray(greenNeuronkas);
      cleanupArray(blueNeuronkas);
      cleanupArray(pizzas);

      renderer.render(scene, camera);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') inputState.left = true;
      if (e.code === 'ArrowRight') inputState.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp') inputState.jump = true;
      if (e.code === 'KeyG' || e.code === 'Enter') inputState.goyda = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') inputState.left = false;
      if (e.code === 'ArrowRight') inputState.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp') inputState.jump = false;
      if (e.code === 'KeyG' || e.code === 'Enter') inputState.goyda = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    renderer.render(scene, camera);
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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full block" />;
}
