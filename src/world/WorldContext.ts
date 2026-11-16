import type * as THREE from 'three';
import type { PhysicsWorld } from '../engine/Physics';
import type { MaterialLibrary } from '../utils/Materials';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { InteractiveDoor } from './props/Door';
import type { ClockUpdateRef } from '../utils/Geometry';
import type { ElevatorSystem } from './buildings/ElevatorSystem';

export interface WorldCallbacks {
  onDoorToggle: (open: boolean) => void;
  onInspectLocker: (label: string) => void;
  onInspectWhiteboard: (subject: string) => void;
  onUseComputer: (location: string) => void;
  onUseVending: (kind: 'Boissons' | 'Snacks') => void;
  onReadBook: (title: string) => void;
  onReadNotice: (title: string, details: string) => void;
  onViewBrochure: () => void;
  onUseFountain: () => void;
  onUseSink: () => void;
  onToggleLights: (wing: string) => void;
  onPullFireAlarm: () => void;
  onPickupNotebook: () => void;
  onShootBasketball: () => void;
  onSit?: (x: number, y: number, z: number, yaw: number) => void;
  onOpenElevatorMenu?: (
    side: 'east' | 'west',
    currentFloor: number,
    onSelectFloor: (floorIndex: number) => void
  ) => void;
  onElevatorArrive?: () => void;
}

export interface WindUniforms {
  uWindTime: { value: number };
  uWindStrength: { value: number };
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
  windUniforms: WindUniforms;
  callbacks: WorldCallbacks;
  setElevatorSystem?: (system: ElevatorSystem) => void;
}
