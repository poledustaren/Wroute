import * as THREE from 'three';

export interface RendererConfig {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
}

export class CoreRenderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    constructor(config: RendererConfig) {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            config.width / config.height,
            0.1,
            2000
        );

        this.renderer = new THREE.WebGLRenderer({
            canvas: config.canvas,
            antialias: false, // Turn off native AA if we use PP (SMAA/FXAA)
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
        });

        this.renderer.setSize(config.width, config.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Color management
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    public resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    public destroy(): void {
        this.renderer.dispose();
    }
}
