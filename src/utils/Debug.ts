import Stats from 'stats.js';
import type * as THREE from 'three';

export class DebugOverlay {
  private stats: Stats;
  private infoEl: HTMLDivElement;
  private enabled = false;

  constructor() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.position = 'fixed';
    this.stats.dom.style.left = '12px';
    this.stats.dom.style.bottom = '12px';
    this.stats.dom.style.top = 'auto';
    this.stats.dom.style.display = 'none';
    this.stats.dom.style.zIndex = '60';
    document.body.appendChild(this.stats.dom);

    this.infoEl = document.createElement('div');
    this.infoEl.style.position = 'fixed';
    this.infoEl.style.left = '102px';
    this.infoEl.style.bottom = '12px';
    this.infoEl.style.padding = '6px 10px';
    this.infoEl.style.background = 'rgba(15, 23, 42, 0.9)';
    this.infoEl.style.color = '#f8fafc';
    this.infoEl.style.fontFamily = 'monospace';
    this.infoEl.style.fontSize = '11px';
    this.infoEl.style.borderRadius = '6px';
    this.infoEl.style.display = 'none';
    this.infoEl.style.zIndex = '60';
    this.infoEl.style.pointerEvents = 'none';
    document.body.appendChild(this.infoEl);
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.stats.dom.style.display = this.enabled ? 'block' : 'none';
    this.infoEl.style.display = this.enabled ? 'block' : 'none';
    return this.enabled;
  }

  public beginFrame(): void {
    if (this.enabled) {
      this.stats.begin();
    }
  }

  public endFrame(renderer: THREE.WebGLRenderer, pos: THREE.Vector3): void {
    if (!this.enabled) return;
    this.stats.end();
    const { calls, triangles } = renderer.info.render;
    this.infoEl.textContent = `Draw calls: ${calls} | Tris: ${triangles} | Pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
  }

  public dispose(): void {
    this.stats.dom.remove();
    this.infoEl.remove();
  }
}
