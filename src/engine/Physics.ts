import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  public world!: RAPIER.World;
  public characterController!: RAPIER.KinematicCharacterController;
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -18.0, z: 0 });
    this.characterController = this.world.createCharacterController(0.03);
    this.characterController.enableAutostep(0.28, 0.18, true);
    this.characterController.enableSnapToGround(0.25);
    this.characterController.setApplyImpulsesToDynamicBodies(true);
    this.initialized = true;
  }

  public addStaticBox(
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    rotY = 0
  ): RAPIER.Collider {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz);
    if (rotY !== 0) {
      const half = rotY * 0.5;
      bodyDesc.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    }
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      Math.max(0.02, hx),
      Math.max(0.02, hy),
      Math.max(0.02, hz)
    );
    return this.world.createCollider(colliderDesc, body);
  }

  public addStaticCylinder(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    halfHeight: number
  ): RAPIER.Collider {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(
      Math.max(0.02, halfHeight),
      Math.max(0.02, radius)
    );
    return this.world.createCollider(colliderDesc, body);
  }

  public addKinematicDoorBox(
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cx, cy, cz);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public createPlayerBody(x: number, y: number, z: number): {
    body: RAPIER.RigidBody;
    collider: RAPIER.Collider;
  } {
    // Capsule total height = 2 * halfHeight + 2 * radius = 2 * 0.525 + 2 * 0.35 = 1.75m
    // Center Y sits at y + 0.875 when standing on ground y
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      x,
      y + 0.875,
      z
    );
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.525, 0.35);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public step(dt: number): void {
    this.world.timestep = Math.min(dt, 0.05);
    this.world.step();
  }

  public dispose(): void {
    if (this.initialized) {
      this.world.free();
      this.initialized = false;
    }
  }
}
