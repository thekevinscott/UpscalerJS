const canvas = document.getElementById('canvas');
const ctx = canvas.getContext("2d");

const SIZE = 20;
const PADDING = 20;
const width = canvas.width;
const height = canvas.height;
let pos = 0;
let dir = 1;
const step_speed = 3;
const start = () => {
  ctx.clearRect(0,0,width,height);
  ctx.beginPath();
  ctx.arc(PADDING + SIZE + pos, PADDING + SIZE, SIZE, 0, 2 * Math.PI);
  ctx.fill();
  if (pos > width - PADDING - (2 * PADDING) - SIZE) {
    dir = 0;
  }
  if (pos < PADDING - SIZE) {
    dir = 1;
  }
  if (dir === 1) {
    pos += step_speed;
  } else {
    pos -= step_speed;
  }
  window.requestAnimationFrame(start);
}

start();
