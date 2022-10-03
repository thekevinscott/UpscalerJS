import * as tf from '@tensorflow/tfjs';
import Upscaler, { getRowsAndColumns } from "upscaler";
import flower from "./flower.png";
// Variables referencing elements on the page
const button = document.getElementById("button");
const tbody = document.getElementById('output').querySelector('tbody');
const patchSizeControl = document.querySelector('tc-range-slider[name="patch-size"]');
const paddingControl = document.querySelector('tc-range-slider[name="padding"]');
const spaceBetweenPatchesControl = document.querySelector('tc-range-slider[name="space-between-patches"]');

const upscaler = new Upscaler();

// Load the src and wait for it to load; we'll need it loaded before we can turn it into a tensor
const img = new Image();
img.src = flower;
img.onload = () => {
  button.disabled = false;
}

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(`table td { padding: ${spaceBetweenPatchesControl.value}px; }`)
document.adoptedStyleSheets = [stylesheet];

// If there is a change to patch size or padding, abort the upscale event
patchSizeControl.addEventListener('change', e => {
  upscaler.abort();
  tbody.innerHTML = '';
});

paddingControl.addEventListener('change', e => {
  upscaler.abort();
  tbody.innerHTML = '';
});

spaceBetweenPatchesControl.addEventListener('change', e => {
  stylesheet.replaceSync(`table td { padding: ${spaceBetweenPatchesControl.value}px; }`)
});

const upscale = async () => {
  const patchSize = patchSizeControl.value;
  const padding = paddingControl.value;
  const pixels = await tf.browser.fromPixels(img);
  const { columns } = getRowsAndColumns(pixels, patchSize);

  let row = 0;
  let col = 0;
  let currentRow = document.createElement('tr');
  tbody.appendChild(currentRow);
  await upscaler.upscale(pixels, {
    patchSize: patchSize,
    padding: padding,
    progress: (_, slice) => {
      const cell = document.createElement('td');
      const sliceImg = new Image();
      sliceImg.src = slice;
      sliceImg.alt = `Patch ${row}-${col}`;
      sliceImg.title = `Patch ${row}-${col}`;
      cell.appendChild(sliceImg);
      currentRow.appendChild(cell);
      col++;
      if (col >= columns) {
        console.log('new row!')
        row++;
        col = 0;
        currentRow = document.createElement('tr');
        tbody.appendChild(currentRow);
      }
    }
  });
};

button.onclick = () => {
  upscaler.abort();
  upscale();
};
