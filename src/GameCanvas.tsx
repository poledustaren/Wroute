import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ConversationPopup } from './components/ConversationPopup';
import GameGuide from './components/GameGuide';

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

// Улучшенная графика - создание текстур
const createTexture = (drawFunc: (ctx: CanvasRenderingContext2D) => void, width = 256, height = 256) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFunc(ctx);
  }
  return new THREE.CanvasTexture(canvas);
};

const createGoydaSprite = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Градиентный фон
    const gradient = ctx.createRadialGradient(128, 64, 0, 128, 64, 100);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, '#ff0000');
    gradient.addColorStop(1, '#990000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 128);
    
    // Текст с обводкой
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('ГОЙДА', 128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ГОЙДА', 128, 64);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 1, 1);
  return sprite;
};

// Создание банана (транспортное средство)
const createBanana = () => {
  const group = new THREE.Group();
  
  // Тело банана
  const bananaShape = new THREE.Shape();
  bananaShape.moveTo(0, 0);
  bananaShape.quadraticCurveTo(1.5, 0.5, 2, 1.5);
  bananaShape.quadraticCurveTo(2.2, 2, 1.8, 2.5);
  bananaShape.quadraticCurveTo(1, 2.8, 0, 2.5);
  bananaShape.quadraticCurveTo(-0.5, 2, -0.3, 1);
  bananaShape.quadraticCurveTo(-0.2, 0.5, 0, 0);
  
  const extrudeSettings = { depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
  const bananaGeo = new THREE.ExtrudeGeometry(bananaShape, extrudeSettings);
  const bananaMat = new THREE.MeshStandardMaterial({ 
    color: 0xffdd00,
    roughness: 0.3,
    metalness: 0.1
  });
  const banana = new THREE.Mesh(bananaGeo, bananaMat);
  banana.rotation.x = -Math.PI / 2;
  banana.position.set(-1, 0, -0.4);
  banana.castShadow = true;
  group.add(banana);
  
  // Пятна на банане
  const spotGeo = new THREE.CircleGeometry(0.15, 8);
  const spotMat = new THREE.MeshStandardMaterial({ color: 0x886600 });
  for (let i = 0; i < 5; i++) {
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.position.set(
      Math.random() * 1.5 - 0.5,
      Math.random() * 0.5 + 0.5,
      0.41
    );
    group.add(spot);
  }
  
  group.userData = { health: 100, maxHealth: 100, type: 'banana' };
  return group;
};

// Создание обезьяны (второе транспортное средство)
const createMonkey = () => {
  const group = new THREE.Group();
  
  // Тело обезьяны
  const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.8
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 1.2, 0.8);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  
  // Голова
  const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 1.5, 0.3);
  head.castShadow = true;
  group.add(head);
  
  // Лицо
  const faceGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xDEB887 });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 1.4, 0.5);
  group.add(face);
  
  // Глаза
  const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, 1.55, 0.7);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, 1.55, 0.7);
  group.add(rightEye);
  
  // Уши
  const earGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(-0.5, 1.6, 0);
  group.add(leftEar);
  const rightEar = new THREE.Mesh(earGeo, bodyMat);
  rightEar.position.set(0.5, 1.6, 0);
  group.add(rightEar);
  
  // Руки
  const armGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.9, 0.8, 0);
  leftArm.rotation.z = Math.PI / 4;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.9, 0.8, 0);
  rightArm.rotation.z = -Math.PI / 4;
  group.add(rightArm);
  
  // Ноги
  const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.6, 8);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.4, -0.3, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.4, -0.3, 0);
  group.add(rightLeg);
  
  // Хвост
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, -0.6),
    new THREE.Vector3(0, 0.5, -1),
    new THREE.Vector3(0.3, 0.8, -1.2),
    new THREE.Vector3(0.5, 1.2, -1)
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 20, 0.08, 8, false);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  group.add(tail);
  
  group.userData = { health: 150, maxHealth: 150, type: 'monkey' };
  return group;
};

const createPlayer = (color = 0x333333) => {
  const group = new THREE.Group();
  
  // Улучшенные материалы
  const skinMat = new THREE.MeshStandardMaterial({ 
    color: 0xffccaa,
    roughness: 0.5,
    metalness: 0
  });
  const hairMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111,
    roughness: 0.9
  });
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: color,
    roughness: 0.6,
    metalness: 0.1
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

  return { group, leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup };
};

const createDesk = () => {
  const group = new THREE.Group();
  const topGeo = new THREE.BoxGeometry(1.8, 0.1, 1.2);
  const topMat = new THREE.MeshStandardMaterial({ 
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.1
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
};

// Новые типы врагов
const createEnemy = () => {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.BoxGeometry(1.2, 1.4, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x880000,
    roughness: 0.6
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

  const hornGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.3, 3.1, 0);
  leftHorn.rotation.z = 0.2;
  group.add(leftHorn);
  const rightHorn = new THREE.Mesh(hornGeo, hornMat);
  rightHorn.position.set(0.3, 3.1, 0);
  rightHorn.rotation.z = -0.2;
  group.add(rightHorn);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.8, 1.5, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.8, 1.5, 0);
  group.add(rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.5, 1.0, 0.5);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.3, 0.5, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.3, 0.5, 0);
  group.add(rightLeg);

  group.userData = { color: 0x880000, health: 1 };
  return group;
};

// Босс враг
const createBossEnemy = () => {
  const group = new THREE.Group();
  
  // Большое тело
  const bodyGeo = new THREE.BoxGeometry(2, 2.5, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x440044,
    roughness: 0.4,
    metalness: 0.3
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2;
  body.castShadow = true;
  group.add(body);

  // Голова
  const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xff8888 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 3.8;
  head.castShadow = true;
  group.add(head);

  // Глаза босса
  const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.3, 3.9, 0.6);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.3, 3.9, 0.6);
  group.add(rightEye);

  // Рога
  const hornGeo = new THREE.ConeGeometry(0.2, 1, 6);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.5, 4.8, 0);
  leftHorn.rotation.z = 0.3;
  group.add(leftHorn);
  const rightHorn = new THREE.Mesh(hornGeo, hornMat);
  rightHorn.position.set(0.5, 4.8, 0);
  rightHorn.rotation.z = -0.3;
  group.add(rightHorn);

  // Руки
  const armGeo = new THREE.BoxGeometry(0.6, 2, 0.6);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-1.3, 2, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(1.3, 2, 0);
  group.add(rightArm);

  // Ноги
  const legGeo = new THREE.BoxGeometry(0.7, 1.5, 0.7);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.5, 0.75, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.5, 0.75, 0);
  group.add(rightLeg);

  group.userData = { color: 0x440044, health: 5, isBoss: true };
  return group;
};

// Летающий враг
const createFlyingEnemy = () => {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x550055,
    roughness: 0.5
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  
  const wingGeo = new THREE.BoxGeometry(2.5, 0.1, 0.5);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.y = 0.5;
  group.add(wings);
  
  // Eye
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.1), 
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  eye.position.set(0, 0, 0.51);
  group.add(eye);

  group.userData = { hoverOffset: Math.random() * Math.PI * 2, color: 0x550055, health: 1 };
  return group;
};

// Скоростной враг
const createFastEnemy = () => {
  const group = new THREE.Group();
  
  // Тонкое тело
  const bodyGeo = new THREE.BoxGeometry(0.6, 1.5, 0.4);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x00aa00,
    roughness: 0.3,
    metalness: 0.2
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Голова
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x88ff88 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);

  // Глаза
  const eyeGeo = new THREE.BoxGeometry(0.15, 0.08, 0.08);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12, 2.25, 0.26);
  const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pupilMat);
  leftPupil.position.set(0, 0, 0.02);
  leftEye.add(leftPupil);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12, 2.25, 0.26);
  const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pupilMat);
  rightPupil.position.set(0, 0, 0.02);
  rightEye.add(rightPupil);
  group.add(rightEye);

  // Руки (маленькие)
  const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.4, 1.3, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.4, 1.3, 0);
  group.add(rightArm);

  // Ноги (длинные)
  const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.15, 0.4, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.15, 0.4, 0);
  group.add(rightLeg);

  group.userData = { color: 0x00aa00, health: 1, speed: 2 };
  return group;
};

const createCigarette = () => {
  const group = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const matOrange = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
  
  const whitePart = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), matWhite);
  whitePart.position.y = 0.75;
  group.add(whitePart);
  
  const orangePart = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), matOrange);
  orangePart.position.y = 1.75;
  group.add(orangePart);

  const cherry = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8), matRed);
  cherry.position.y = 2.05;
  group.add(cherry);
  
  group.userData = { jumpOffset: Math.random() * Math.PI * 2, color: 0xffffff, health: 1 };
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

// Частицы для улучшенной графики
interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export default function GameCanvas({ gameState, setGameState, setScore, setAmmo, setBuffs, showPopup }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef(gameState);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [conversationCooldown, setConversationCooldown] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    gameStateRef.current = gameState;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [gameState]);

  // Функция для запуска беседы
  const startConversation = useCallback(() => {
    if (!conversationCooldown && gameState === 'playing') {
      setShowConversation(true);
      setConversationCooldown(true);
      
      // Кулдаун 30 секунд между беседами
      setTimeout(() => {
        setConversationCooldown(false);
      }, 30000);
    }
  }, [conversationCooldown, gameState]);

  // Состояние для контекста игры
  const [gameContext, setGameContext] = useState<{
    score?: number;
    recentEvent?: string;
    isGameOver?: boolean;
    hasVehicle?: boolean;
  }>({});

  // Ref для доступа к контексту внутри useEffect
  const gameContextRef = useRef(gameContext);
  gameContextRef.current = gameContext;

  // Случайный запуск бесед каждые 20 секунд
  useEffect(() => {
    if (gameState !== 'playing') return;

    const scheduleRandomConversation = () => {
      const delay = 20000; // 20 секунд
      return setTimeout(() => {
        if (!conversationCooldown && gameState === 'playing') {
          startConversation();
        }
        scheduleRandomConversation();
      }, delay);
    };

    const timeoutId = scheduleRandomConversation();
    return () => clearTimeout(timeoutId);
  }, [gameState, conversationCooldown, startConversation]);

  // Функция для обновления контекста игры
  const updateGameContext = useCallback((context: typeof gameContext) => {
    setGameContext(context);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Улучшенная настройка сцены
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15); // Более тёмный фон
    scene.fog = new THREE.Fog(0x0a0a15, 20, 80);

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени

    // Улучшенное освещение
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Дополнительные источники света для атмосферы
    const pointLight1 = new THREE.PointLight(0xff6600, 0.5, 30);
    pointLight1.position.set(-5, 8, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0066ff, 0.5, 30);
    pointLight2.position.set(5, 8, 0);
    scene.add(pointLight2);

    // Players
    const player = createPlayer(0x333333);
    const playerLeft = createPlayer(0x0033aa); // Blue suit
    const playerRight = createPlayer(0xaa3300); // Red suit
    
    scene.add(player.group);
    scene.add(playerLeft.group);
    scene.add(playerRight.group);
    
    playerLeft.group.visible = false;
    playerRight.group.visible = false;

    // Транспортные средства
    let currentVehicle: THREE.Group | null = null;
    let vehicleHealth = 100;
    let vehicleType: 'banana' | 'monkey' | null = null;
    let vehicleBroken = false;

    const spawnVehicle = (type: 'banana' | 'monkey') => {
      if (currentVehicle) {
        scene.remove(currentVehicle);
      }
      
      if (type === 'banana') {
        currentVehicle = createBanana();
        vehicleHealth = 100;
      } else {
        currentVehicle = createMonkey();
        vehicleHealth = 150;
      }
      
      vehicleType = type;
      vehicleBroken = false;
      
      if (currentVehicle) {
        currentVehicle.position.copy(player.group.position);
        currentVehicle.position.y = -0.5;
        scene.add(currentVehicle);
      }
    };

    // Начинаем с банана
    spawnVehicle('banana');

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
    
    // New Buff Timers
    let speedBuffTimer = 0;
    let shieldBuffTimer = 0;
    let powerGoydaBuffTimer = 0;
    
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
    const fastEnemies: THREE.Group[] = [];
    const bossEnemies: THREE.Group[] = [];
    const cigarettes: THREE.Group[] = [];
    const projectiles: THREE.Sprite[] = [];
    const gramotas: THREE.Group[] = [];
    const greenNeuronkas: THREE.Group[] = [];
    const blueNeuronkas: THREE.Group[] = [];
    const pizzas: THREE.Group[] = [];
    
    // New Bonus Arrays
    const speedBonuses: THREE.Group[] = [];
    const shieldBonuses: THREE.Group[] = [];
    const powerGoydaBonuses: THREE.Group[] = [];
    
    // Частицы
    const particles: Particle[] = [];

    interface Debris {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
    }
    const debrisList: Debris[] = [];

    const spawnDebris = (position: THREE.Vector3, color: number, count: number) => {
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const mat = new THREE.MeshStandardMaterial({ color });
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.x += (Math.random() - 0.5) * 1.5;
        mesh.position.y += (Math.random() - 0.5) * 1.5;
        mesh.position.z += (Math.random() - 0.5) * 1.5;
        
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        
        scene.add(mesh);
        debrisList.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 15
          ),
          life: 1.5 + Math.random() * 0.5
        });
      }
    };

    // Создание частиц эффекта
    const spawnParticles = (position: THREE.Vector3, color: number, count: number) => {
      const geo = new THREE.SphereGeometry(0.1, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ 
        color,
        transparent: true,
        opacity: 0.8
      });
      
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat.clone());
        mesh.position.copy(position);
        scene.add(mesh);
        
        particles.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 10
          ),
          life: 1.0 + Math.random() * 0.5,
          maxLife: 1.5
        });
      }
    };

    // Procedural Generation
    const generateChunk = (startZ: number) => {
      const chunkGroup = new THREE.Group();
      
      // Улучшенный пол (ковёр с текстурой)
      const floorGeo = new THREE.BoxGeometry(roadWidth, 1, chunkLength);
      const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a3a4a,
        roughness: 0.9,
        metalness: 0
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(0, -0.5, startZ - chunkLength / 2);
      floor.receiveShadow = true;
      chunkGroup.add(floor);

      // Линии на полу
      const lineGeo = new THREE.BoxGeometry(0.1, 0.01, chunkLength);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x4a5a6a });
      for (let x = -roadWidth/2 + 1; x < roadWidth/2; x += 2) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(x, 0.01, startZ - chunkLength / 2);
        chunkGroup.add(line);
      }

      // Стены с улучшенной текстурой
      const wallGeo = new THREE.BoxGeometry(1, 10, chunkLength);
      const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8
      });
      
      const leftWall = new THREE.Mesh(wallGeo, wallMat);
      leftWall.position.set(-roadWidth / 2 - 0.5, 4.5, startZ - chunkLength / 2);
      leftWall.receiveShadow = true;
      chunkGroup.add(leftWall);

      const rightWall = new THREE.Mesh(wallGeo, wallMat);
      rightWall.position.set(roadWidth / 2 + 0.5, 4.5, startZ - chunkLength / 2);
      rightWall.receiveShadow = true;
      chunkGroup.add(rightWall);

      // Потолок
      const ceilingGeo = new THREE.BoxGeometry(roadWidth, 1, chunkLength);
      const ceiling = new THREE.Mesh(ceilingGeo, wallMat);
      ceiling.position.set(0, 9.5, startZ - chunkLength / 2);
      chunkGroup.add(ceiling);

      // Улучшенные светильники на потолке
      for (let z = startZ - 5; z > startZ - chunkLength; z -= 10) {
        const lightGroup = new THREE.Group();
        
        // Корпус светильника
        const fixtureGeo = new THREE.BoxGeometry(2.5, 0.2, 0.8);
        const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        lightGroup.add(fixture);
        
        // Светящаяся поверхность
        const lightGeo = new THREE.BoxGeometry(2, 0.05, 0.6);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.y = -0.1;
        lightGroup.add(light);
        
        lightGroup.position.set(0, 8.9, z);
        chunkGroup.add(lightGroup);
      }

      scene.add(chunkGroup);
      platforms.push({ group: chunkGroup, z: startZ - chunkLength / 2 });

      // Difficulty scaling: more items over time
      const difficultyMultiplier = 1 + Math.floor(time / 20) * 0.5;
      
      const patternRand = Math.random();
      
      if (patternRand < 0.15 && time > 10) {
        // Pattern 1: Wall of Desks with a gap
        const gapIndex = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
        const zPos = startZ - chunkLength / 2;
        for (let i = -2; i <= 2; i++) {
          if (i === gapIndex) {
            // Put a bonus in the gap
            if (Math.random() > 0.3) {
               const green = createNeuronka(0x00ff00);
               green.position.set(i * 3, 1.5, zPos);
               scene.add(green);
               greenNeuronkas.push(green);
            }
            continue;
          }
          const obs = createDesk();
          obs.position.set(i * 3, 0, zPos);
          scene.add(obs);
          obstacles.push(obs);
        }
      } else if (patternRand < 0.3 && time > 20) {
        // Pattern 2: V-Formation of enemies
        const zPos = startZ - chunkLength / 4;
        for (let i = 0; i < 3; i++) {
          const enemy = createEnemy();
          enemy.position.set(0, 0, zPos - i * 3);
          scene.add(enemy);
          enemies.push(enemy);
          
          if (i > 0) {
            const enemyL = createEnemy();
            enemyL.position.set(-i * 2.5, 0, zPos - i * 3);
            scene.add(enemyL);
            enemies.push(enemyL);
            
            const enemyR = createEnemy();
            enemyR.position.set(i * 2.5, 0, zPos - i * 3);
            scene.add(enemyR);
            enemies.push(enemyR);
          }
        }
      } else if (patternRand < 0.45 && time > 30) {
        // Pattern 3: Zig-Zag Obstacles with Enemies
        for (let i = 0; i < 4; i++) {
          const zPos = startZ - (i + 1) * (chunkLength / 5);
          const xPos = (i % 2 === 0) ? -3.5 : 3.5;
          const obs = createDesk();
          obs.position.set(xPos, 0, zPos);
          scene.add(obs);
          obstacles.push(obs);
          
          // Add enemy on the opposite side
          const enemy = createEnemy();
          enemy.position.set(-xPos, 0, zPos);
          scene.add(enemy);
          enemies.push(enemy);
        }
      } else if (patternRand < 0.55 && time > 40) {
        // Pattern 4: Boss encounter
        const boss = createBossEnemy();
        boss.position.set(0, 0, startZ - chunkLength / 2);
        scene.add(boss);
        enemies.push(boss);
        bossEnemies.push(boss);
        
        // Add some minions
        for (let i = 0; i < 3; i++) {
          const minion = createEnemy();
          minion.position.set((i - 1) * 3, 0, startZ - chunkLength / 2 - 5);
          scene.add(minion);
          enemies.push(minion);
        }
      } else {
        // Pattern 5: Random Scatter (Original logic with new enemies)
        const numItems = Math.floor((Math.random() * 3 + 2) * difficultyMultiplier);
        
        for (let i = 0; i < numItems; i++) {
          const zPos = startZ - Math.random() * chunkLength;
          const xPos = (Math.random() - 0.5) * (roadWidth - 3);
          
          const rand = Math.random();
          if (rand < 0.4) {
            // Enemies
            const enemyTypeRand = Math.random();
            if (time > 50 && enemyTypeRand < 0.2) {
              // Босс (редко)
              const boss = createBossEnemy();
              boss.position.set(xPos, 0, zPos);
              scene.add(boss);
              enemies.push(boss);
              bossEnemies.push(boss);
            } else if (time > 35 && enemyTypeRand < 0.4) {
              // Скоростной враг
              const fast = createFastEnemy();
              fast.position.set(xPos, 0, zPos);
              scene.add(fast);
              enemies.push(fast);
              fastEnemies.push(fast);
            } else if (time > 40 && enemyTypeRand < 0.5) {
              const cig = createCigarette();
              cig.position.set(xPos, 0, zPos);
              scene.add(cig);
              cigarettes.push(cig);
              enemies.push(cig);
            } else if (time > 20 && enemyTypeRand < 0.7) {
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
          } else if (rand < 0.93) {
            const blue = createNeuronka(0x0088ff);
            blue.position.set(xPos, 1.5, zPos);
            scene.add(blue);
            blueNeuronkas.push(blue);
          } else if (rand < 0.95) {
            const speedBonus = createNeuronka(0xffff00); // Yellow for speed
            speedBonus.position.set(xPos, 1.5, zPos);
            scene.add(speedBonus);
            speedBonuses.push(speedBonus);
          } else if (rand < 0.97) {
            const shieldBonus = createNeuronka(0xffffff); // White for shield
            shieldBonus.position.set(xPos, 1.5, zPos);
            scene.add(shieldBonus);
            shieldBonuses.push(shieldBonus);
          } else if (rand < 0.99) {
            const powerBonus = createNeuronka(0xff4400); // Red/Orange for power
            powerBonus.position.set(xPos, 1.5, zPos);
            scene.add(powerBonus);
            powerGoydaBonuses.push(powerBonus);
          } else {
            const pizza = createPizza();
            pizza.position.set(xPos, 1.5, zPos);
            scene.add(pizza);
            pizzas.push(pizza);
          }
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
      
      playShootSound();
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
        
        if (powerGoydaBuffTimer > 0) {
          proj.scale.set(4, 2, 1); // Double size
          proj.userData = { power: 2 };
        } else {
          proj.userData = { power: 1 };
        }
        
        scene.add(proj);
        projectiles.push(proj);
        
        // Эффект выстрела
        spawnParticles(proj.position, 0xff6600, 5);
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
    let gameOverTimer = 0;

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

    // Звук разрушения транспорта
    const playBreakSound = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    };

    interface FloatingText {
      sprite: THREE.Sprite;
      life: number;
      maxLife: number;
    }
    const floatingTexts: FloatingText[] = [];

    const spawnFloatingText = (text: string, position: THREE.Vector3) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      
      // Градиент для текста
      const gradient = ctx.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(1, '#ff8800');
      ctx.fillStyle = gradient;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, 128, 40);
      ctx.fillText(text, 128, 40);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(position);
      sprite.position.y += 3;
      sprite.scale.set(4, 1, 1);
      scene.add(sprite);
      floatingTexts.push({ sprite, life: 1.5, maxLife: 1.5 });
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      window.speechSynthesis.speak(utterance);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      lastTime = now;

      // Обновление плавающего текста
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

      // Обновление частиц
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        } else {
          p.velocity.y += gravity * dt * 0.5;
          p.mesh.position.addScaledVector(p.velocity, dt);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = (p.life / p.maxLife) * 0.8;
        }
      }

      if (gameStateRef.current !== 'playing') return;

      time += dt;

      // Update Debris
      for (let i = debrisList.length - 1; i >= 0; i--) {
        const d = debrisList[i];
        d.life -= dt;
        if (d.life <= 0) {
          scene.remove(d.mesh);
          debrisList.splice(i, 1);
        } else {
          d.velocity.y += gravity * dt;
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

      if (isGameOver) {
        gameOverTimer -= dt;
        if (gameOverTimer <= 0) {
          setGameState('gameover');
        }
        renderer.render(scene, camera);
        return;
      }

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
      
      // Update New Buff Timers
      if (speedBuffTimer > 0) {
        speedBuffTimer -= dt;
        if (speedBuffTimer <= 0) speedBuffTimer = 0;
      }
      if (shieldBuffTimer > 0) {
        shieldBuffTimer -= dt;
        if (shieldBuffTimer <= 0) {
          shieldBuffTimer = 0;
          player.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material.transparent = false;
              child.material.opacity = 1.0;
            }
          });
        } else {
          // Visual feedback for shield
          player.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material.transparent = true;
              child.material.opacity = 0.6 + Math.sin(time * 10) * 0.2;
            }
          });
        }
      }
      if (powerGoydaBuffTimer > 0) {
        powerGoydaBuffTimer -= dt;
        if (powerGoydaBuffTimer <= 0) powerGoydaBuffTimer = 0;
      }

      // Update Buffs UI
      const newBuffs = [];
      if (infiniteAmmoTimer > 0) newBuffs.push(`Бесконечная Гойда (${Math.ceil(infiniteAmmoTimer)}s)`);
      if (slowdownTimer > 0) newBuffs.push(`Замедление (${Math.ceil(slowdownTimer)}s)`);
      if (pizzaTimer > 0) newBuffs.push(`Тройная Гойда (${Math.ceil(pizzaTimer)}s)`);
      if (speedBuffTimer > 0) newBuffs.push(`Ускорение (${Math.ceil(speedBuffTimer)}s)`);
      if (shieldBuffTimer > 0) newBuffs.push(`Щит (${Math.ceil(shieldBuffTimer)}s)`);
      if (powerGoydaBuffTimer > 0) newBuffs.push(`Мощная Гойда (${Math.ceil(powerGoydaBuffTimer)}s)`);
      
      const buffsString = newBuffs.join(',');
      if (buffsString !== lastReportedBuffs) {
        setBuffs(newBuffs);
        lastReportedBuffs = buffsString;
      }

      let currentSpeed = speed;
      if (slowdownTimer > 0) {
        currentSpeed = speed * 0.5; // Slow down by 50%
      }
      if (speedBuffTimer > 0) {
        currentSpeed = speed * 1.5; // Speed up by 50%
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

      // Обновление транспорта
      if (currentVehicle && !vehicleBroken) {
        currentVehicle.position.set(playerX, -0.5 + playerY * 0.3, playerZ);
        currentVehicle.rotation.y = Math.sin(time * 2) * 0.1;
        
        // Анимация в зависимости от типа транспорта
        if (vehicleType === 'monkey') {
          // Обезьяна качается
          currentVehicle.rotation.z = Math.sin(time * 3) * 0.05;
        }
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
      
      // Анимация скоростных врагов
      for (const fast of fastEnemies) {
        fast.position.z -= 5 * dt; // Двигаются быстрее к игроку
        fast.rotation.y = Math.sin(time * 10) * 0.2;
      }
      
      // Анимация боссов
      for (const boss of bossEnemies) {
        boss.position.y = Math.sin(time * 2) * 0.3;
        boss.rotation.y = Math.sin(time) * 0.1;
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
            // Эффект сбора
            spawnParticles(item.position, 0x00ff00, 10);
          }
        }
      };

      checkCollectible(gramotas, () => {
        currentAmmo += 5;
        setAmmo(currentAmmo);
        scoreCounter += 10;
        spawnFloatingText("норм темка", player.group.position);
      });
      
      checkCollectible(greenNeuronkas, () => { 
        slowdownTimer = 5; 
        spawnFloatingText("ты выбрал нейронку для затупа", player.group.position);
      });
      
      checkCollectible(blueNeuronkas, () => { 
        infiniteAmmoTimer = 10; 
        spawnFloatingText("нейро удача", player.group.position);
      });
      
      checkCollectible(pizzas, () => { 
        pizzaTimer = 5; 
        spawnFloatingText("работаем братьч", player.group.position);
      });
      
      checkCollectible(speedBonuses, () => {
        speedBuffTimer = 10;
        spawnFloatingText("УСКОРЕНИЕ!", player.group.position);
      });
      
      checkCollectible(shieldBonuses, () => {
        shieldBuffTimer = 5;
        spawnFloatingText("ЩИТ!", player.group.position);
      });
      
      checkCollectible(powerGoydaBonuses, () => {
        powerGoydaBuffTimer = 10;
        spawnFloatingText("МОЩНАЯ ГОЙДА!", player.group.position);
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
          
          const hitRadiusSq = (powerGoydaBuffTimer > 0) ? 9 : 2.25; // 3 radius vs 1.5 radius
          
          if (distSq < hitRadiusSq) {
            // Уменьшаем здоровье врага
            e.userData.health -= p.userData.power || 1;
            
            if (e.userData.health <= 0) {
              spawnDebris(e.position, e.userData.color || 0x880000, 20);
              spawnParticles(e.position, e.userData.color || 0xff0000, 15);
              scene.remove(e);
              enemies.splice(j, 1);
              
              // Also remove from specific arrays if needed
              const flyIdx = flyingEnemies.indexOf(e);
              if (flyIdx > -1) flyingEnemies.splice(flyIdx, 1);
              const cigIdx = cigarettes.indexOf(e);
              if (cigIdx > -1) cigarettes.splice(cigIdx, 1);
              const fastIdx = fastEnemies.indexOf(e);
              if (fastIdx > -1) fastEnemies.splice(fastIdx, 1);
              const bossIdx = bossEnemies.indexOf(e);
              if (bossIdx > -1) bossEnemies.splice(bossIdx, 1);
              
              hit = true;
              const scoreGain = e.userData.isBoss ? 200 : 50;
              scoreCounter += scoreGain;
              const newScore = Math.floor(scoreCounter);
              setScore(newScore);
              lastReportedScore = newScore;
              
              if (e.userData.isBoss) {
                spawnFloatingText("БОСС ПОВАЛЕН!", player.group.position);
              }
            } else {
              // Враг ранен - меняем цвет
              e.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material.emissive = new THREE.Color(0xff0000);
                  child.material.emissiveIntensity = 0.5;
                }
              });
            }
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

      // Проверка столкновения с транспортом
      if (currentVehicle && !vehicleBroken) {
        for (const item of [...obstacles, ...enemies]) {
          if (checkCollision(currentVehicle, item, 0.3)) {
            // Транспорт получает урон
            vehicleHealth -= 25;
            spawnParticles(currentVehicle.position, 0xffdd00, 10);
            
            if (vehicleHealth <= 0) {
              // Транспорт сломался
              vehicleBroken = true;
              playBreakSound();
              spawnDebris(currentVehicle.position, vehicleType === 'banana' ? 0xffdd00 : 0x8B4513, 30);
              scene.remove(currentVehicle);
              
              if (vehicleType === 'banana') {
                // Банан сломался - спавним обезьяну
                spawnFloatingText("Банан сломался! Едем на обезьяне!", player.group.position);
                spawnVehicle('monkey');
              } else {
                // Обезьяна сломалась - игрок пешком
                spawnFloatingText("Обезьяна устала! Бежим пешком!", player.group.position);
                currentVehicle = null;
                vehicleType = null;
              }
            } else {
              spawnFloatingText(`Транспорт: ${vehicleHealth}%`, player.group.position);
            }
            break;
          }
        }
      }

      if (!isGameOver && shieldBuffTimer <= 0 && (checkFatalCollision(obstacles) || checkFatalCollision(enemies))) {
        // Если есть транспорт, он ломается вместо смерти
        if (currentVehicle && !vehicleBroken) {
          vehicleHealth = 0;
          vehicleBroken = true;
          playBreakSound();
          spawnDebris(currentVehicle.position, vehicleType === 'banana' ? 0xffdd00 : 0x8B4513, 30);
          scene.remove(currentVehicle);
          
          if (vehicleType === 'banana') {
            spawnFloatingText("Банан сломался! Едем на обезьяне!", player.group.position);
            spawnVehicle('monkey');
          } else {
            spawnFloatingText("Обезьяна устала! Бежим пешком!", player.group.position);
            currentVehicle = null;
            vehicleType = null;
          }
        } else {
          // Смерть игрока
          isGameOver = true;
          gameOverTimer = 2.0;
          spawnDebris(player.group.position, 0x333333, 50);
          player.group.visible = false;
          if (pizzaTimer > 0) {
            spawnDebris(playerLeft.group.position, 0x0033aa, 30);
            spawnDebris(playerRight.group.position, 0xaa3300, 30);
            playerLeft.group.visible = false;
            playerRight.group.visible = false;
          }
          return;
        }
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
      cleanupArray(fastEnemies);
      cleanupArray(bossEnemies);
      cleanupArray(cigarettes);
      cleanupArray(gramotas);
      cleanupArray(greenNeuronkas);
      cleanupArray(blueNeuronkas);
      cleanupArray(pizzas);
      cleanupArray(speedBonuses);
      cleanupArray(shieldBonuses);
      cleanupArray(powerGoydaBonuses);

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

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      const x = touch.clientX;
      const y = touch.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Bottom left area (Goyda and Jump)
      if (x < w * 0.4 && y > h * 0.6) return;
      
      // Bottom right area (Weapon)
      if (x > w * 0.6 && y > h * 0.6) return;

      // Tap screen to move left/right
      if (x < w / 2) {
        inputState.left = true;
        inputState.right = false;
      } else {
        inputState.right = true;
        inputState.left = false;
      }
    };

    const handleTouchEnd = () => {
      inputState.left = false;
      inputState.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('touchmove', handleTouch);
    window.addEventListener('touchend', handleTouchEnd);

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
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Game Guide */}
      {showGuide && (
        <GameGuide level={1} onClose={() => setShowGuide(false)} />
      )}
      
      <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full block" />
      
      {isMobile && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Bottom Left: Goyda and Weapon Change */}
          <div className="absolute bottom-10 left-10 flex flex-col gap-4 pointer-events-auto">
            <button
              className="w-24 h-24 bg-red-500/50 rounded-full border-2 border-red-500/80 flex items-center justify-center text-white font-bold active:bg-red-500/80 touch-none"
              onTouchStart={() => { inputState.goyda = true; }}
              onTouchEnd={() => { inputState.goyda = false; }}
            >
              ГОЙДА
            </button>
            <button
              className="w-24 h-24 bg-yellow-500/50 rounded-full border-2 border-yellow-500/80 flex flex-col items-center justify-center text-white font-bold active:bg-yellow-500/80 touch-none"
              onClick={() => showPopup("Смена оружия пока недоступна")}
            >
              <span className="text-xs">ОРУЖИЕ</span>
              <span className="text-[10px] opacity-70">ГОЙДА v1</span>
            </button>
          </div>

          {/* Top Right: Conversation Button */}
          <div className="absolute top-10 right-10 pointer-events-auto">
            <button
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-white font-bold transition-all ${
                conversationCooldown 
                  ? 'bg-gray-500/50 border-gray-500/80 cursor-not-allowed' 
                  : 'bg-purple-500/50 border-purple-500/80 active:bg-purple-500/80'
              }`}
              onClick={startConversation}
              disabled={conversationCooldown}
            >
              <span className="text-2xl">🎲</span>
            </button>
          </div>

          {/* Bottom Right: Jump */}
          <div className="absolute bottom-10 right-10 pointer-events-auto">
            <button
              className="w-24 h-24 bg-blue-500/50 rounded-full border-2 border-blue-500/80 flex items-center justify-center text-white font-bold active:bg-blue-500/80 touch-none"
              onTouchStart={() => { inputState.jump = true; }}
              onTouchEnd={() => { inputState.jump = false; }}
            >
              ПРЫЖОК
            </button>
          </div>
        </div>
      )}

      {/* Desktop Conversation Button */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-20">
          <button
            className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 text-white font-bold transition-all ${
              conversationCooldown 
                ? 'bg-gray-500/50 border-gray-500/80 cursor-not-allowed' 
                : 'bg-purple-500/50 border-purple-500/80 hover:bg-purple-500/70'
            }`}
            onClick={startConversation}
            disabled={conversationCooldown}
          >
            <span>🎲 Беседа</span>
            {conversationCooldown && <span className="text-xs">(кулдаун)</span>}
          </button>
        </div>
      )}

      {/* Conversation Popup */}
      <ConversationPopup
        isVisible={showConversation}
        onClose={() => setShowConversation(false)}
        gameContext={gameContext}
      />
    </div>
  );
}