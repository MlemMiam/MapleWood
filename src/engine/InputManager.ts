import { type ActionName, type KeyBindings, isActionCode } from './InputBindings';

export interface InputSnapshot {
  moveX: number; // -1 left, +1 right
  moveZ: number; // +1 forward, -1 backward
  sprint: boolean;
  jumpJustPressed: boolean;
  interactJustPressed: boolean;
  mapJustPressed: boolean;
  pauseJustPressed: boolean;
  debugJustPressed: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  zoomDelta: number;
}

export class InputManager {
  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private zoomDelta = 0;
  private isDragging = false;
  private bindings: KeyBindings;
  private canvas: HTMLCanvasElement;
  private prevGamepadButtons: boolean[] = [];
  public pointerLocked = false;

  constructor(canvas: HTMLCanvasElement, bindings: KeyBindings) {
    this.canvas = canvas;
    this.bindings = bindings;
    this.attach();
  }

  public setBindings(bindings: KeyBindings): void {
    this.bindings = bindings;
  }

  public clearAll(): void {
    this.keysHeld.clear();
    this.keysJustPressed.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.zoomDelta = 0;
    this.isDragging = false;
  }

  public requestPointerLock(): void {
    if (document.body.dataset.state !== 'playing') return;
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock?.();
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  private attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      return;
    }
    if (!this.keysHeld.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysHeld.add(e.code);

    if (e.code === 'Space' && document.body.dataset.state === 'playing') {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private onBlur = (): void => {
    this.clearAll();
  };

  private onVisibility = (): void => {
    if (document.hidden) {
      this.clearAll();
    }
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (document.body.dataset.state !== 'playing') return;
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (document.body.dataset.state !== 'playing') return;
    if (this.pointerLocked || this.isDragging) {
      this.lookDeltaX += e.movementX;
      this.lookDeltaY += e.movementY;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (document.body.dataset.state !== 'playing') return;
    this.zoomDelta += e.deltaY * 0.004;
  };

  private isActionHeld(action: ActionName): boolean {
    for (const code of this.keysHeld) {
      if (isActionCode(code, action, this.bindings)) return true;
    }
    return false;
  }

  private isActionJustPressed(action: ActionName): boolean {
    for (const code of this.keysJustPressed) {
      if (isActionCode(code, action, this.bindings)) return true;
    }
    return false;
  }

  public consumeSnapshot(): InputSnapshot {
    let moveX = (this.isActionHeld('right') ? 1 : 0) - (this.isActionHeld('left') ? 1 : 0);
    let moveZ = (this.isActionHeld('forward') ? 1 : 0) - (this.isActionHeld('backward') ? 1 : 0);
    let sprint = this.isActionHeld('sprint');
    let jumpJustPressed = this.isActionJustPressed('jump');
    let interactJustPressed = this.isActionJustPressed('interact');
    let mapJustPressed = this.isActionJustPressed('map');
    let pauseJustPressed = this.isActionJustPressed('pause');
    const debugJustPressed = this.keysJustPressed.has('F3');

    let lookDeltaX = this.lookDeltaX;
    let lookDeltaY = this.lookDeltaY;
    const zoomDelta = this.zoomDelta;

    // Gamepad API polling
    const pads = navigator.getGamepads?.() || [];
    const pad = pads.find((p) => p && p.connected);
    if (pad) {
      const deadzone = 0.18;
      const lx = Math.abs(pad.axes[0] || 0) > deadzone ? pad.axes[0] : 0;
      const ly = Math.abs(pad.axes[1] || 0) > deadzone ? pad.axes[1] : 0;
      const rx = Math.abs(pad.axes[2] || 0) > deadzone ? pad.axes[2] : 0;
      const ry = Math.abs(pad.axes[3] || 0) > deadzone ? pad.axes[3] : 0;

      if (Math.abs(lx) > 0) moveX = lx;
      if (Math.abs(ly) > 0) moveZ = -ly;
      lookDeltaX += rx * 14;
      lookDeltaY += ry * 10;

      const btn = (idx: number) => Boolean(pad.buttons[idx]?.pressed);
      const justBtn = (idx: number) => btn(idx) && !this.prevGamepadButtons[idx];

      if (pad.buttons[6]?.value > 0.3) sprint = true; // LT sprint
      if (justBtn(0)) jumpJustPressed = true; // A jump
      if (justBtn(2)) interactJustPressed = true; // X interact
      if (justBtn(8)) mapJustPressed = true; // Select map
      if (justBtn(9)) pauseJustPressed = true; // Start pause

      this.prevGamepadButtons = pad.buttons.map((b) => b.pressed);
    }

    // Normalize diagonal movement
    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    this.keysJustPressed.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.zoomDelta = 0;

    return {
      moveX,
      moveZ,
      sprint,
      jumpJustPressed,
      interactJustPressed,
      mapJustPressed,
      pauseJustPressed,
      debugJustPressed,
      lookDeltaX,
      lookDeltaY,
      zoomDelta,
    };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
