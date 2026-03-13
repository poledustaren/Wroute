import * as THREE from 'three';
import { 
    EffectComposer, 
    RenderPass, 
    BloomEffect, 
    EffectPass, 
    SMAAEffect, 
    SMAAPreset,
    EdgeDetectionMode,
    SSAOEffect,
    BlendFunction
} from 'postprocessing';

export class PostProcessor {
    public composer: EffectComposer;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.composer = new EffectComposer(renderer);

        // 1. Main Render Pass
        this.composer.addPass(new RenderPass(scene, camera));

        // 2. Bloom (Glow)
        const bloomEffect = new BloomEffect({
            blendFunction: BlendFunction.ADD,
            mipmapBlur: true,
            luminanceThreshold: 0.1, // Much lower threshold to ensure visibility
            luminanceSmoothing: 0.2,
            intensity: 1.5
        });
 
        // 3. SMAA (Anti-aliasing)
        const smaaEffect = new SMAAEffect(
            {
                preset: SMAAPreset.ULTRA,
                edgeDetectionMode: EdgeDetectionMode.COLOR
            }
        );
 
        const effectPass = new EffectPass(camera, bloomEffect, smaaEffect);
        this.composer.addPass(effectPass);
    }

    public render(dt: number): void {
        try {
            this.composer.render(dt);
        } catch (e) {
            console.error("PostProcessor failed, falling back to raw render:", e);
        }
    }

    public setSize(width: number, height: number): void {
        this.composer.setSize(width, height);
    }
}
