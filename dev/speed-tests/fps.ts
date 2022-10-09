export class FPS {
  private last: number;
  private durations: number[] = []
  private stopped = false;

  constructor() {
    this.last = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  loop() {
    const now = performance.now();
    this.durations.push(now - this.last);
    this.last = now;
    if (this.stopped === false) {
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  report() {
    this.stopped = true;
    return 1000 / this.durations.reduce((sum, s) => sum + s, 0) / this.durations.length;
  }
}
