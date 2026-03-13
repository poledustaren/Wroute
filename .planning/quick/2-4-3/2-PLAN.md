---
phase: quick
plan: 2
plan_type: quick-fix
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Level4Canvas.tsx
autonomous: true
requirements:
  - Fix enemy movement
  - Fix tower building
  - Fix 3D model visibility
  - Improve graphics brightness
user_setup: []
must_haves:
  truths:
    - Enemies move along the path when wave starts
    - Towers can be placed on valid grid cells
    - Tower 3D models are visible on the map
    - Enemy 3D models are visible and move
    - Scene has brighter, more vibrant colors
  artifacts:
    - path: src/Level4Canvas.tsx
      provides: Fixed game logic and rendering
  key_links:
    - from: gameLoop enemy update logic
      to: PATH_WAYPOINTS traversal
      pattern: enemy.pathIndex + 1 < PATH_WAYPOINTS.length
---

<objective>
Fix all critical bugs in Level 4: enemy movement, tower building, 3D model visibility, and improve graphics brightness/vibrancy.

Purpose: Make Level 4 fully playable with working tower defense mechanics and better visual appeal.
Output: Fully functional Level4Canvas.tsx with all fixes applied.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/Level4Canvas.tsx

Current issues identified:
1. **Enemies don't move**: Line 366-374 - The end-check condition `nextIdx >= PATH_WAYPOINTS.length` is wrong. It should check if we've reached the last waypoint, not exceeded array bounds. This causes enemies to immediately trigger game over.

2. **Towers don't build**: The handleClick logic at lines 512-574 should work, but there may be raycasting issues or the `isValidPlacement` function might be too restrictive.

3. **3D models not visible**: Scene background is very dark (0x1a0a0a), ambient light is weak (0.4), tower and enemy meshes might not be properly added to scene or have visibility issues.

4. **Graphics too dark**: Background color, lighting, and fog create a dark atmosphere. Materials need brighter colors and higher emissive values.

5. **Not bright/vibrant**: Overall color palette is muted dark reds and browns.
</context>

<tasks>

<task type="auto">
  <name>task 1: Fix enemy movement bug</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Fix the enemy path traversal logic in the gameLoop function (around line 366):
    
    CURRENT BUG:
    ```typescript
    const nextIdx = enemy.pathIndex + 1;
    if (nextIdx >= PATH_WAYPOINTS.length) {
      // Reached end -> game over
    ```
    
    This is wrong because when pathIndex=0, nextIdx=1, and the check happens BEFORE moving. The condition triggers immediately when enemy spawns at index 0.
    
    FIX:
    ```typescript
    // Move enemy first
    const currentWP = PATH_WAYPOINTS[enemy.pathIndex];
    const nextWP = PATH_WAYPOINTS[enemy.pathIndex + 1];
    
    // Check if we're at the final waypoint
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
    ```
    
    Also verify the progress calculation logic works correctly with the delta time.
  </action>
  <verify>
    <automated>grep -n "pathIndex >= PATH_WAYPOINTS.length" src/Level4Canvas.tsx && echo "Fix applied correctly" || echo "Fix not found"</automated>
  </verify>
  <done>Enemy movement logic corrected - enemies now properly traverse all path waypoints before triggering game over</done>
</task>

<task type="auto">
  <name>task 2: Fix tower building and visibility</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Fix tower building issues in handleClick (around line 517-547):
    
    ISSUES TO FIX:
    1. After placing tower, the mesh position might not be visible - ensure y-position is correct
    2. The tower mesh is a THREE.Group but might not render properly - ensure all children are visible
    3. Add explicit logging to confirm tower placement
    
    FIXES:
    ```typescript
    // In handleClick, after creating tower:
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
    ```
    
    Also fix createTowerMesh (around line 205) - ensure group is properly constructed:
    ```typescript
    const createTowerMesh = useCallback((mode: 'base' | 'stalin' | 'zaza'): THREE.Group => {
      const group = new THREE.Group();
      group.visible = true; // Ensure visibility
      
      // ... rest of mesh creation
      
      return group;
    }, []);
    ```
  </action>
  <verify>
    <automated>grep -n "group.visible = true" src/Level4Canvas.tsx && echo "Tower visibility fix applied" || echo "Fix not found"</automated>
  </verify>
  <done>Tower building fixed - towers now properly appear when placed and are visible in the scene</done>
</task>

<task type="auto">
  <name>task 3: Fix enemy visibility</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Fix enemy mesh visibility in createEnemyMesh (around line 251):
    
    CURRENT:
    ```typescript
    const createEnemyMesh = useCallback((type: keyof typeof ENEMIES): THREE.Mesh => {
      const config = ENEMIES[type];
      const geo = new THREE.BoxGeometry(config.scale, config.scale * 0.8, config.scale * 0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    }, []);
    ```
    
    FIXES:
    1. Make enemies more visible with brighter emissive
    2. Ensure mesh is visible
    3. Add slight glow effect
    
    ```typescript
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
    ```
  </action>
  <verify>
    <automated>grep -n "emissiveIntensity: 0.6" src/Level4Canvas.tsx && echo "Enemy brightness fix applied" || echo "Fix not found"</automated>
  </verify>
  <done>Enemies now have higher emissive intensity for better visibility</done>
</task>

<task type="auto">
  <name>task 4: Brighten scene colors and lighting</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Improve scene brightness and vibrancy (around line 580-620):
    
    CURRENT SCENE SETUP (too dark):
    - background: 0x1a0a0a (very dark red)
    - ambient light: 0.4 intensity
    - directional light: 0.8 intensity, orange color
    - ground: 0x2a1a1a (dark brown)
    - fog: 0x1a0a0a
    
    BRIGHTER VERSION:
    ```typescript
    // Background - warmer, brighter tone
    scene.background = new THREE.Color(0x3d1a1a); // Brighter warm red
    scene.fog = new THREE.Fog(0x3d1a1a, 20, 60);
    
    // Camera position - slightly lower for better view
    camera.position.set(0, 20, 12); // Lower height, closer
    camera.lookAt(0, 0, -10);
    
    // Lighting - brighter and more vibrant
    scene.add(new THREE.AmbientLight(0xffffff, 0.7)); // Increased from 0.4
    
    const sun = new THREE.DirectionalLight(0xffaa44, 1.2); // Brighter, warmer
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
    
    // Ground - brighter, more saturated
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a2a2a, // Brighter brown-red
      roughness: 0.8, 
      metalness: 0.1 
    });
    
    // Grid - brighter red
    const grid = new THREE.GridHelper(CONFIG.MAP_WIDTH, Math.floor(CONFIG.MAP_WIDTH / CONFIG.GRID_SIZE), 0xaa0000, 0x660000);
    ```
  </action>
  <verify>
    <automated>grep -n "0x3d1a1a\|AmbientLight(0xffffff, 0.7)" src/Level4Canvas.tsx && echo "Scene brightness fix applied" || echo "Fix not found"</automated>
  </verify>
  <done>Scene is now brighter with improved lighting and more vibrant colors</done>
</task>

<task type="auto">
  <name>task 5: Enhance tower visibility with glow effects</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Make towers more visible with brighter materials (in createTowerMesh):
    
    CURRENT TOWER MATERIALS:
    - base: dark gray (0x333333)
    - turret: emissiveIntensity 0.2
    - barrel: dark (0x111111)
    
    ENHANCED VERSION:
    ```typescript
    const createTowerMesh = useCallback((mode: 'base' | 'stalin' | 'zaza'): THREE.Group => {
      const group = new THREE.Group();
      group.visible = true;
      
      const config = TOWER_TYPES.minigoyder[mode];
      
      // Base - brighter with some shine
      const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8);
      const baseMat = new THREE.MeshStandardMaterial({ 
        color: 0x555555, // Lighter gray
        metalness: 0.8, 
        roughness: 0.2 
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.25;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);
      
      // Turret - brighter, more glow
      const turretGeo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
      const turretMat = new THREE.MeshStandardMaterial({
        color: config.color,
        metalness: 0.6,
        roughness: 0.3,
        emissive: config.color,
        emissiveIntensity: 0.5, // Increased from 0.2
      });
      const turret = new THREE.Mesh(turretGeo, turretMat);
      turret.position.y = 1.1;
      turret.castShadow = true;
      group.add(turret);
      
      // Barrel - slightly lighter
      const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
      const barrelMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333 // Lighter than 0x111111
      });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.3, 0.4);
      group.add(barrel);
      
      // Range indicator - more visible when shown
      const rangeGeo = new THREE.RingGeometry(config.range - 0.1, config.range, 32);
      const rangeMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.3, // Slightly more visible
        side: THREE.DoubleSide,
      });
      const rangeMesh = new THREE.Mesh(rangeGeo, rangeMat);
      rangeMesh.rotation.x = -Math.PI / 2;
      rangeMesh.position.y = 0.05;
      group.add(rangeMesh);
      
      return group;
    }, []);
    ```
  </action>
  <verify>
    <automated>grep -n "emissiveIntensity: 0.5" src/Level4Canvas.tsx && echo "Tower glow enhancement applied" || echo "Fix not found"</automated>
  </verify>
  <done>Towers now have brighter glow effects and are more visible</done>
</task>

<task type="auto">
  <name>task 6: Add point lights for atmosphere</name>
  <files>src/Level4Canvas.tsx</files>
  <action>
    Add additional lighting to make the scene more vibrant:
    
    After the sun light setup (around line 601), add:
    ```typescript
    // Add warm point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xff4400, 0.8, 30);
    pointLight1.position.set(-8, 10, -10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff6600, 0.6, 25);
    pointLight2.position.set(8, 8, -20);
    scene.add(pointLight2);
    
    // Add a rim light for better object definition
    const rimLight = new THREE.DirectionalLight(0xffaa00, 0.5);
    rimLight.position.set(-10, 5, 10);
    scene.add(rimLight);
    ```
    
    Also enhance the path visualization:
    ```typescript
    // Path line - brighter, more visible
    const pathLine = new THREE.Line(
      pathGeometry,
      new THREE.LineBasicMaterial({ 
        color: 0xff3333, // Brighter red
        linewidth: 5, 
        transparent: true, 
        opacity: 0.8 // More opaque
      })
    );
    ```
  </action>
  <verify>
    <automated>grep -n "pointLight1\|rimLight" src/Level4Canvas.tsx && echo "Atmospheric lighting added" || echo "Fix not found"</automated>
  </verify>
  <done>Additional point lights and rim lighting added for vibrant atmosphere</done>
</task>

</tasks>

<verification>
After all fixes applied:
1. Enemy wave starts and enemies move along the red path
2. Clicking "МИНИГОЙДЕР" button and then clicking on valid grid cells places towers
3. Both towers and enemies are clearly visible with glow effects
4. Scene has warm, vibrant lighting with multiple light sources
5. Colors are brighter and more saturated throughout
</verification>

<success_criteria>
- Enemies spawn and follow the path from start to end
- Towers can be built by clicking the build button then clicking on grid
- All 3D models (towers, enemies) are visible and properly rendered
- Scene lighting is bright and vibrant
- Path is clearly visible with bright red line
</success_criteria>

<output>
After completion, verify by:
1. Opening the game in browser
2. Starting Level 4
3. Clicking "НАЧАТЬ ВОЛНУ" - enemies should spawn and move
4. Clicking "МИНИГОЙДЕР" then clicking on map - tower should appear
5. Visual check: scene should be bright with visible glowing towers and enemies
</output>
