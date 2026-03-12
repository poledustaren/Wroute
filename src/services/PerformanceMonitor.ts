// Performance monitoring for the game
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private frameTime: number = 0;
  private updateInterval: number = 1000; // Update stats every second
  private lastUpdateTime: number = 0;

  start(): void {
    this.lastFrameTime = performance.now();
  }

  frame(): void {
    const now = performance.now();
    this.frameTime = now - this.lastFrameTime;
    this.frameTimes.push(this.frameTime);
    this.lastFrameTime = now;
    this.frameCount++;

    // Update FPS every second
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastUpdateTime = now;

      // Keep only recent frame times (last 60 frames)
      if (this.frameTimes.length > 60) {
        this.frameTimes = this.frameTimes.slice(-60);
      }
    }
  }

  getFPS(): number {
    return this.fps;
  }

  getFrameTime(): number {
    return this.frameTime;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  getMinFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return Math.min(...this.frameTimes);
  }

  getMaxFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return Math.max(...this.frameTimes);
  }

  // Get performance stats
  getStats(): {
    fps: number;
    frameTime: number;
    avgFrameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
    frameTimePercentile95: number;
  } {
    const sortedTimes = [...this.frameTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95 = sortedTimes[p95Index] || 0;

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      avgFrameTime: this.getAverageFrameTime(),
      minFrameTime: this.getMinFrameTime(),
      maxFrameTime: this.getMaxFrameTime(),
      frameTimePercentile95: p95,
    };
  }

  // Check if performance is acceptable
  isPerformanceGood(targetFPS: number = 60): boolean {
    return this.fps >= targetFPS;
  }

  // Log performance warning if needed
  logPerformanceWarning(): void {
    if (this.fps < 30) {
      console.warn(`Performance warning: FPS is ${this.fps} (below 30)`);
    } else if (this.fps < 45) {
      console.warn(`Performance warning: FPS is ${this.fps} (below 45)`);
    }
  }
}

// Memory usage monitor (approximate)
export class MemoryMonitor {
  private lastCheck: number = 0;
  private checkInterval: number = 5000; // Check every 5 seconds

  getMemoryInfo(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  } | null {
    const memory = (performance as any).memory;
    if (!memory) return null;

    const used = memory.usedJSHeapSize / 1024 / 1024; // MB
    const total = memory.totalJSHeapSize / 1024 / 1024; // MB
    const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
    const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: used,
      totalJSHeapSize: total,
      jsHeapSizeLimit: limit,
      usagePercentage: percentage,
    };
  }

  shouldCheck(): boolean {
    const now = performance.now();
    if (now - this.lastCheck >= this.checkInterval) {
      this.lastCheck = now;
      return true;
    }
    return false;
  }

  logMemoryWarning(): void {
    const info = this.getMemoryInfo();
    if (!info) return;

    if (info.usagePercentage > 90) {
      console.warn(`Memory warning: ${info.usagePercentage.toFixed(1)}% of heap used (${info.usedJSHeapSize.toFixed(1)}MB)`);
    }
  }
}

// Draw call counter (approximate)
export class DrawCallMonitor {
  private drawCalls: number = 0;
  private lastFrameDrawCalls: number = 0;

  increment(): void {
    this.drawCalls++;
  }

  frame(): void {
    this.lastFrameDrawCalls = this.drawCalls;
    this.drawCalls = 0;
  }

  getDrawCalls(): number {
    return this.lastFrameDrawCalls;
  }
}

// Combined performance stats
export interface PerformanceStats {
  fps: number;
  frameTime: number;
  avgFrameTime: number;
  drawCalls: number;
  memoryUsed: number;
  memoryLimit: number;
  memoryPercentage: number;
}

export class GamePerformanceMonitor {
  private fpsMonitor: PerformanceMonitor;
  private memoryMonitor: MemoryMonitor;
  private drawCallMonitor: DrawCallMonitor;
  private enabled: boolean = false;

  constructor() {
    this.fpsMonitor = new PerformanceMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.drawCallMonitor = new DrawCallMonitor();
  }

  start(): void {
    this.enabled = true;
    this.fpsMonitor.start();
  }

  stop(): void {
    this.enabled = false;
  }

  frame(): void {
    if (!this.enabled) return;

    this.fpsMonitor.frame();
    this.drawCallMonitor.frame();

    // Log warnings periodically
    if (this.memoryMonitor.shouldCheck()) {
      this.fpsMonitor.logPerformanceWarning();
      this.memoryMonitor.logMemoryWarning();
    }
  }

  getStats(): PerformanceStats {
    const fpsStats = this.fpsMonitor.getStats();
    const memInfo = this.memoryMonitor.getMemoryInfo();

    return {
      fps: fpsStats.fps,
      frameTime: fpsStats.frameTime,
      avgFrameTime: fpsStats.avgFrameTime,
      drawCalls: this.drawCallMonitor.getDrawCalls(),
      memoryUsed: memInfo?.usedJSHeapSize || 0,
      memoryLimit: memInfo?.jsHeapSizeLimit || 0,
      memoryPercentage: memInfo?.usagePercentage || 0,
    };
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}