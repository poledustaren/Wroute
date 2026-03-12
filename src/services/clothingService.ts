export interface ClothingItem {
  id: string;
  name: string;
  type: 'hat' | 'jacket' | 'pants' | 'shoes' | 'glasses' | 'scarf' | 'gloves' | 'backpack';
  color: number;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export const clothingItems: ClothingItem[] = [
  {
    id: 'ushanka',
    name: 'ушанка',
    type: 'hat',
    color: 0x8B4513,
    position: { x: 0, y: 2.9, z: 0 },
    scale: { x: 0.8, y: 0.4, z: 0.8 }
  },
  {
    id: 'beanie',
    name: 'шапка-бини',
    type: 'hat',
    color: 0xff6b6b,
    position: { x: 0, y: 2.85, z: 0 },
    scale: { x: 0.7, y: 0.35, z: 0.7 }
  },
  {
    id: 'cap',
    name: 'кепка',
    type: 'hat',
    color: 0x333333,
    position: { x: 0, y: 2.85, z: 0 },
    scale: { x: 0.75, y: 0.3, z: 0.75 }
  },
  {
    id: 'jacket_leather',
    name: 'кожаная куртка',
    type: 'jacket',
    color: 0x2c2c2c,
    position: { x: 0, y: 1.2, z: 0 },
    scale: { x: 1.1, y: 1.3, z: 0.6 }
  },
  {
    id: 'jacket_denim',
    name: 'джинсовая куртка',
    type: 'jacket',
    color: 0x4a6fa5,
    position: { x: 0, y: 1.2, z: 0 },
    scale: { x: 1.1, y: 1.3, z: 0.6 }
  },
  {
    id: 'hoodie',
    name: 'худи',
    type: 'jacket',
    color: 0x808080,
    position: { x: 0, y: 1.2, z: 0 },
    scale: { x: 1.05, y: 1.25, z: 0.55 }
  },
  {
    id: 'jeans',
    name: 'джинсы',
    type: 'pants',
    color: 0x1e3a5f,
    position: { x: 0, y: 0.4, z: 0 },
    scale: { x: 0.9, y: 0.8, z: 0.5 }
  },
  {
    id: 'sweatpants',
    name: 'штаны для бега',
    type: 'pants',
    color: 0x2d5a27,
    position: { x: 0, y: 0.4, z: 0 },
    scale: { x: 0.95, y: 0.8, z: 0.5 }
  },
  {
    id: 'sneakers',
    name: 'кроссовки',
    type: 'shoes',
    color: 0xffffff,
    position: { x: 0, y: 0.1, z: 0 },
    scale: { x: 0.5, y: 0.2, z: 0.8 }
  },
  {
    id: 'boots',
    name: 'сапоги',
    type: 'shoes',
    color: 0x4a3728,
    position: { x: 0, y: 0.15, z: 0 },
    scale: { x: 0.5, y: 0.3, z: 0.8 }
  },
  {
    id: 'sunglasses',
    name: 'солнцезащитные очки',
    type: 'glasses',
    color: 0x000000,
    position: { x: 0, y: 2.6, z: 0.35 },
    scale: { x: 0.6, y: 0.15, z: 0.1 }
  },
  {
    id: 'scarf_red',
    name: 'красный шарф',
    type: 'scarf',
    color: 0xcc0000,
    position: { x: 0, y: 2.2, z: 0.2 },
    scale: { x: 0.8, y: 0.2, z: 0.3 }
  },
  {
    id: 'gloves',
    name: 'перчатки',
    type: 'gloves',
    color: 0x222222,
    position: { x: 0, y: 1.0, z: 0 },
    scale: { x: 0.3, y: 0.2, z: 0.3 }
  },
  {
    id: 'backpack',
    name: 'рюкзак',
    type: 'backpack',
    color: 0x8b0000,
    position: { x: 0, y: 1.5, z: -0.4 },
    scale: { x: 0.6, y: 0.8, z: 0.3 }
  }
];

export const getClothingById = (id: string): ClothingItem | undefined => {
  return clothingItems.find(item => item.id === id);
};

export const getRandomClothing = (): ClothingItem => {
  return clothingItems[Math.floor(Math.random() * clothingItems.length)];
};