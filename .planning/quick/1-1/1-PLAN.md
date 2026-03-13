---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Level0Canvas.tsx
autonomous: true
requirements:
  - FIX-01
must_haves:
  truths:
    - Level 0 transitions to transition01 state when score reaches 100
    - Player sees clear indication that they've unlocked Level 1
    - Game state changes properly trigger the LevelTransition01 component
  artifacts:
    - path: src/Level0Canvas.tsx
      provides: "Level 0 game with working progression to Level 1"
      contains: "setGameState('transition01') when totalScore >= 100"
  key_links:
    - from: Level0Canvas score tracking
      to: App.tsx transition01 state
      via: setGameState prop
---

<objective>
Fix Level 1 not starting after guide closes by adding missing progression logic from Level 0.

Purpose: The game is stuck in Level 0 because reaching 100 points doesn't trigger the transition to Level 1. This makes the game unplayable beyond Level 0.
Output: Working Level 0 → Level 1 transition when player reaches 100 points.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/Level0Canvas.tsx
@src/App.tsx
@src/components/LevelTransition01.tsx

**Problem Analysis:**
- Level 0 tracks `totalScore` in state (line 173)
- Score updates after each insult (line 264-274)
- Progress bar shows `totalScore % 100` (line 442)
- **MISSING**: No check to trigger Level 1 transition when score >= 100
- App.tsx has `transition01` state that shows LevelTransition01 component (lines 130-139)
- LevelTransition01 calls `onComplete` which triggers Level 1 start via `handleTransition01Complete`
</context>

<tasks>

<task type="auto">
  <name>task 1: Add Level 1 transition trigger in Level0Canvas</name>
  <files>src/Level0Canvas.tsx</files>
  <action>
    Add useEffect hook to monitor totalScore and trigger transition to Level 1 when score reaches 100.

    After line 186 (existing useEffect that generates first client message), add:

    ```typescript
    // Check for Level 1 unlock
    useEffect(() => {
      if (totalScore >= 100) {
        // Small delay to let player see the final score
        const timer = setTimeout(() => {
          setGameState('transition01');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }, [totalScore, setGameState]);
    ```

    Also update the progress bar (around line 438-448) to show completion state:
    - Change the progress bar to show 100% when totalScore >= 100
    - Add visual indicator that Level 1 is unlocked

    Update lines 438-448 to:
    ```tsx
    {/* Прогресс бар */}
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1/2">
      <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            totalScore >= 100 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
              : 'bg-gradient-to-r from-red-500 to-orange-500'
          }`}
          style={{ width: `${Math.min(100, totalScore >= 100 ? 100 : (totalScore % 100))}%` }}
        ></div>
      </div>
      <div className="text-center text-white text-sm mt-1">
        {totalScore >= 100 
          ? '✅ Уровень 1 разблокирован! Переход...' 
          : `Прогресс: ${totalScore % 100}/100`
        }
      </div>
    </div>
    ```
  </action>
  <verify>
    <automated>grep -n "setGameState('transition01')" src/Level0Canvas.tsx</automated>
  </verify>
  <done>Level 0 automatically transitions to transition01 state when totalScore reaches 100, with visual feedback showing "Уровень 1 разблокирован!"</done>
</task>

<task type="auto">
  <name>task 2: Add visual celebration for Level 1 unlock</name>
  <files>src/Level0Canvas.tsx</files>
  <action>
    Add a celebratory overlay when score reaches 100 to make the transition clear to the player.

    After the progress bar div (around line 448), add:

    ```tsx
    {/* Level 1 Unlocked Celebration */}
    {totalScore >= 100 && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 animate-fade-in">
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-8 rounded-2xl shadow-2xl text-center animate-bounce">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-black mb-2">УРОВЕНЬ 1 РАЗБЛОКИРОВАН!</h2>
          <p className="text-lg">Переход в офис...</p>
        </div>
      </div>
    )}
    ```

    Also add the fade-in animation style to the component's style section or use inline styles.
  </action>
  <verify>
    <automated>grep -n "УРОВЕНЬ 1 РАЗБЛОКИРОВАН" src/Level0Canvas.tsx</automated>
  </verify>
  <done>Players see a clear celebration overlay when unlocking Level 1</done>
</task>

</tasks>

<verification>
1. Run `npm run dev` to start the development server
2. Play Level 0 and send insults until score reaches 100
3. Verify that:
   - Progress bar turns green at 100
   - Text shows "✅ Уровень 1 разблокирован! Переход..."
   - Celebration overlay appears
   - After ~1.5 seconds, LevelTransition01 starts
   - After transition completes, Level 1 game starts properly
</verification>

<success_criteria>
- Level 0 automatically transitions to Level 1 when score reaches 100
- Progress bar shows completion state (green) at 100 points
- Celebration overlay informs player of Level 1 unlock
- LevelTransition01 plays correctly after Level 0
- Level 1 game starts properly after transition completes
</success_criteria>

<output>
After completion, create `.planning/quick/1-1/1-SUMMARY.md`
</output>
