/**
 * FlowFieldService
 * Champ de potentiel multi-couches sur une grille pour guider la fuite des NPCs
 */
export class FlowFieldService {
  scene: any;
  config: {
    cellSize: number;
    updateIntervalMs: number;
    weightBorders: number;
    weightPlayer: number;
    weightCenter: number;
    playerSigma: number;
    borderMargin: number;
    blurPasses: number;
  };
  lastUpdate: number = 0;
  cols: number = 0;
  rows: number = 0;
  potential: Float32Array = new Float32Array(0);
  gradX: Float32Array = new Float32Array(0);
  gradY: Float32Array = new Float32Array(0);

  constructor(scene: any, config: Record<string, any> = {}) {
    this.scene = scene;
    this.config = {
      cellSize: config.cellSize || 50,
      updateIntervalMs: config.updateIntervalMs || 200,
      weightBorders: config.weightBorders || 1.0,
      weightPlayer: config.weightPlayer || 1.2,
      weightCenter: config.weightCenter || -0.25,
      playerSigma: config.playerSigma || 180,
      borderMargin: config.borderMargin || 140,
      blurPasses: config.blurPasses || 2,
    };

    this.resizeToScene();
  }

  resizeToScene(): void {
    const w = Math.max(1, this.scene.scale.width || 0);
    const h = Math.max(1, this.scene.scale.height || 0);
    const size = Math.max(20, this.config.cellSize);
    this.cols = Math.max(8, Math.round(w / size));
    this.rows = Math.max(6, Math.round(h / size));
    const n = this.cols * this.rows;
    this.potential = new Float32Array(n);
    this.gradX = new Float32Array(n);
    this.gradY = new Float32Array(n);
  }

  index(x: number, y: number): number {
    return y * this.cols + x;
  }

  update(time: number, delta: number): void {
    if (time - this.lastUpdate < this.config.updateIntervalMs) return;
    this.lastUpdate = time;
    const colsExpected = Math.max(8, Math.round((this.scene.scale.width || 0) / Math.max(20, this.config.cellSize)));
    const rowsExpected = Math.max(6, Math.round((this.scene.scale.height || 0) / Math.max(20, this.config.cellSize)));
    if (colsExpected !== this.cols || rowsExpected !== this.rows) {
      this.resizeToScene();
    }
    this.buildPotential();
    this.blurPotential(this.config.blurPasses);
    this.computeGradient();
  }

  buildPotential(): void {
    const w = this.scene.scale.width || 0;
    const h = this.scene.scale.height || 0;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const borderMargin = this.config.borderMargin;
    const player = this.scene.currentLevel?.player;
    const px = player?.sprite?.x ?? cx;
    const py = player?.sprite?.y ?? cy;
    const sigma = Math.max(10, this.config.playerSigma);
    const invTwoSigma2 = 1.0 / (2 * sigma * sigma);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = this.index(x, y);
        const gx = (x + 0.5) * (w / this.cols);
        const gy = (y + 0.5) * (h / this.rows);

        const dxL = Math.max(0, borderMargin - gx);
        const dxR = Math.max(0, borderMargin - (w - gx));
        const dyT = Math.max(0, borderMargin - gy);
        const dyB = Math.max(0, borderMargin - (h - gy));
        const borderP = (dxL + dxR + dyT + dyB) / borderMargin;

        const dpx = gx - px;
        const dpy = gy - py;
        const r2 = dpx * dpx + dpy * dpy;
        const playerP = Math.exp(-r2 * invTwoSigma2);

        const dcx = gx - cx;
        const dcy = gy - cy;
        const centerR = Math.sqrt(dcx * dcx + dcy * dcy);
        const maxC = Math.sqrt(cx * cx + cy * cy);
        const centerP = centerR / Math.max(1, maxC);

        const P = borderP * this.config.weightBorders +
          playerP * this.config.weightPlayer +
          centerP * this.config.weightCenter;
        this.potential[idx] = P;
      }
    }
  }

  blurPotential(passes: number = 1): void {
    const cols = this.cols;
    const rows = this.rows;
    const src = this.potential;
    const tmp = new Float32Array(src.length);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = this.index(x, y);
          let acc = src[idx] * 2;
          let w = 2;
          if (x > 0) {
            acc += src[this.index(x - 1, y)];
            w++;
          }
          if (x < cols - 1) {
            acc += src[this.index(x + 1, y)];
            w++;
          }
          tmp[idx] = acc / w;
        }
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = this.index(x, y);
          let acc = tmp[idx] * 2;
          let w = 2;
          if (y > 0) {
            acc += tmp[this.index(x, y - 1)];
            w++;
          }
          if (y < rows - 1) {
            acc += tmp[this.index(x, y + 1)];
            w++;
          }
          src[idx] = acc / w;
        }
      }
    }
  }

  computeGradient(): void {
    const cols = this.cols;
    const rows = this.rows;
    const src = this.potential;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = this.index(x, y);
        const l = x > 0 ? src[this.index(x - 1, y)] : src[idx];
        const r = x < cols - 1 ? src[this.index(x + 1, y)] : src[idx];
        const t = y > 0 ? src[this.index(x, y - 1)] : src[idx];
        const b = y < rows - 1 ? src[this.index(x, y + 1)] : src[idx];
        this.gradX[idx] = (r - l) * 0.5;
        this.gradY[idx] = (b - t) * 0.5;
      }
    }
  }

  sampleDirection(px: number, py: number): { x: number; y: number } {
    const w = this.scene.scale.width || 0;
    const h = this.scene.scale.height || 0;
    if (w <= 0 || h <= 0) return { x: 0, y: 0 };
    const gx = (px / w) * this.cols - 0.5;
    const gy = (py / h) * this.rows - 0.5;
    const x0 = Math.max(0, Math.min(this.cols - 1, Math.floor(gx)));
    const y0 = Math.max(0, Math.min(this.rows - 1, Math.floor(gy)));
    const x1 = Math.max(0, Math.min(this.cols - 1, x0 + 1));
    const y1 = Math.max(0, Math.min(this.rows - 1, y0 + 1));
    const tx = Math.max(0, Math.min(1, gx - x0));
    const ty = Math.max(0, Math.min(1, gy - y0));

    const i00 = this.index(x0, y0);
    const i10 = this.index(x1, y0);
    const i01 = this.index(x0, y1);
    const i11 = this.index(x1, y1);

    const gx0 = this.gradX[i00] * (1 - tx) + this.gradX[i10] * tx;
    const gx1 = this.gradX[i01] * (1 - tx) + this.gradX[i11] * tx;
    const gy0 = this.gradY[i00] * (1 - tx) + this.gradY[i10] * tx;
    const gy1 = this.gradY[i01] * (1 - tx) + this.gradY[i11] * tx;

    let dx = -((gx0 * (1 - ty) + gx1 * ty));
    let dy = -((gy0 * (1 - ty) + gy1 * ty));

    const mag = Math.hypot(dx, dy);
    if (mag < 1e-3) return { x: 0, y: 0 };
    return { x: dx / mag, y: dy / mag };
  }
}
