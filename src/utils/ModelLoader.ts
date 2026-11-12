import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

/**
 * Attempts to load an external GLTF/GLB model from /public/assets/models/.
 * Falls back transparently to the procedural THREE.Group builder when absent.
 */
export async function loadOptionalGltfModel(
  url: string,
  fallbackBuilder: () => THREE.Group
): Promise<THREE.Group> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return fallbackBuilder();
    }
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return root;
  } catch {
    return fallbackBuilder();
  }
}
