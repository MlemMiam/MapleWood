import type * as THREE from 'three';
import type { PhysicsWorld } from '../engine/Physics';
import type { MaterialLibrary } from '../utils/Materials';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { InteractiveDoor } from './props/Door';
import type { ClockUpdateRef } from '../utils/Geometry';

export interface WorldCallbacks {
  onDoorToggle: (open: boolean) => void;
  onInspectLocker: (label: string) => void;
  onInspectWhiteboard: (subject: string) => void;
  onUseComputer: (location: string) => void;
  onUseVending: (kind: 'Boissons' | 'Snacks') => void;
  onReadBook: (title: string) => void;
  onReadNotice: (title: string, details: string) => void;
  onUseFountain: () => void;
  onUseSink: () => void;
  onToggleLights: (wing: string) => void;
  onPullFireAlarm: () => void;
  onPickupNotebook: () => void;
  onShootBasketball: () => void;
}

export interface WorldBuildContext {
  scene: THREE.Scene;
  physics: PhysicsWorld;
  mats: MaterialLibrary;
  interactions: InteractionSystem;
  doors: InteractiveDoor[];
  clocks: ClockUpdateRef[];
  cameraColliders: THREE.Object3D[];
  animatedObjects: Array<(elapsed: number, dt: number) => void>;
  wingLights: Record<string, THREE.PointLight[]>;
  callbacks: WorldCallbacks;
}
