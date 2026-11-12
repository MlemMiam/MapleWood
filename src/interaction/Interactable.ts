import type * as THREE from 'three';

export type InteractableType =
  | 'door'
  | 'locker'
  | 'vending'
  | 'whiteboard'
  | 'computer'
  | 'book'
  | 'fountain'
  | 'switch'
  | 'fire_alarm'
  | 'sink'
  | 'notebook'
  | 'npc';

export interface Interactable {
  id: string;
  label: string;
  type: InteractableType;
  targetObject: THREE.Object3D;
  worldPosition: THREE.Vector3;
  maxDistance?: number;
  onInteract: () => void;
}
