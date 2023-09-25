const crimsonProgressBar = require("crimson-progressbar");

export class ProgressBar {
  total: number;
  i: number = 0;

  constructor(total: number) {
    this.total = total;
    crimsonProgressBar.renderProgressBar(0, total);
  }

  update(i?: number) {
    if (i !== undefined) {
      if (i < 1) {
        crimsonProgressBar.renderProgressBar(i * this.total, this.total);
      } else {
        crimsonProgressBar.renderProgressBar(i, this.total);
      }
    } else {
      this.i += 1;
      crimsonProgressBar.renderProgressBar(this.i, this.total);
    }
  }

  end() {
    console.log('\n');
  }
}
