import * as THREE from 'three';
import type { Interactable } from './Interactable';

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _playerForward = new THREE.Vector3();
const _toTarget = new THREE.Vector3();

export class InteractionSystem {
  private interactables: Interactable[] = [];
  private raycaster = new THREE.Raycaster();
  private nearbyHitMeshes: THREE.Object3D[] = [];
  private currentTarget: Interactable | null = null;

  public register(item: Interactable): void {
    this.interactables.push(item);
    item.targetObject.userData.interactable = item;
    item.targetObject.traverse((child) => {
      child.userData.interactable = item;
    });
  }

  public unregister(id: string): void {
    const idx = this.interactables.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.interactables.splice(idx, 1);
    }
  }

  public update(
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    playerYaw: number
  ): Interactable | null {
    // Pre-filter non-NPC interactables within range so we never raycast distant rooms or heavy VRM meshes
    this.nearbyHitMeshes.length = 0;
    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      if (item.type === 'npc') continue;
      const limit = (item.maxDistance ?? 3.1) + 1.5;
      const dx = item.worldPosition.x - playerPos.x;
      const dz = item.worldPosition.z - playerPos.z;
      if (dx * dx + dz * dz <= limit * limit) {
        this.nearbyHitMeshes.push(item.targetObject);
      }
    }

    // 1. Raycast from camera center toward nearby interactables
    let best: Interactable | null = null;
    if (this.nearbyHitMeshes.length > 0) {
      _rayOrigin.copy(camera.position);
      camera.getWorldDirection(_rayDir);
      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.near = 0.2;
      this.raycaster.far = 8.5;

      const hits = this.raycaster.intersectObjects(this.nearbyHitMeshes, true);
      for (const hit of hits) {
        const item = hit.object.userData.interactable as Interactable | undefined;
        if (!item) continue;
        const distToPlayer = playerPos.distanceTo(item.worldPosition);
        const limit = item.maxDistance ?? 3.1;
        if (distToPlayer <= limit) {
          best = item;
          break;
        }
      }
    }

    // 2. Fallback proximity cone in front of player (makes 3rd-person E interaction reliable)
    if (!best) {
      _playerForward.set(-Math.sin(playerYaw), 0, -Math.cos(playerYaw)).normalize();
      let bestScore = Infinity;
      for (const item of this.interactables) {
        const limit = item.maxDistance ?? 2.6;
        const dx = item.worldPosition.x - playerPos.x;
        const dz = item.worldPosition.z - playerPos.z;
        const dy = Math.abs(item.worldPosition.y - (playerPos.y + 1.0));
        const dist = Math.hypot(dx, dz);
        if (dist <= limit && dy < 2.2) {
          _toTarget.set(dx, 0, dz).normalize();
          const dot = _playerForward.dot(_toTarget);
          if (dot > 0.25 || dist < 1.3) {
            const score = dist - dot * 0.6;
            if (score < bestScore) {
              bestScore = score;
              best = item;
            }
          }
        }
      }
    }

    this.currentTarget = best;
    return best;
  }

  public triggerCurrent(): boolean {
    if (!this.currentTarget) return false;
    this.currentTarget.onInteract();
    return true;
  }

  public getCurrent(): Interactable | null {
    return this.currentTarget;
  }
}
