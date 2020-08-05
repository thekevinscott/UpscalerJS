import * as tf from '@tensorflow/tfjs';
import './App.css';
import Upscaler from 'upscaler';
import { getTensorDimensions, getRowsAndColumns } from 'upscaler/upscale';
import React, { useState, useEffect } from 'react';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import tensorAsBase64 from 'tensor-as-base64';

const size = 100;
const src = `https://picsum.photos/${size}/${size}`;

const upscaler = new Upscaler({
  model: "div2k/rdn-C3-D10-G64-G064-x2"
});
const scale = 2;
function App() {
  const [img, setImg] = useState();
  const [upscaling, setUpscaling] = useState(false);
  const [state, setState] = useState({
    patchSize: 50,
    padding: 5,
    space: 2,
  });
  const [upscaledImageSources, setUpscaledImageSources] = useState();

  useEffect(() => {
    const _img = new Image();
    _img.crossOrigin = 'anonymous';
    _img.src = src;
    _img.onload = () => setImg(_img);
  });

  const upscale = async (e) => {
    e.preventDefault();
    setUpscaling(true);
    const pixels = tf.browser.fromPixels(img);
    const { rows, columns } = getRowsAndColumns(pixels, state.patchSize);
    const [_, height, width] = pixels.shape;
    const total = rows * columns;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const { origin, size, sliceOrigin, sliceSize } = getTensorDimensions(
          row,
          col,
          state.patchSize,
          state.padding,
          height,
          width,
        );
        const slicedPixels = pixels.slice(
          [0, origin[0], origin[1]],
          [-1, size[0], size[1]],
        );
        await tf.nextFrame();
        const prediction = upscaler.upscale(slicedPixels, {
          output: 'tensor',
        });
        await tf.nextFrame();
        slicedPixels.dispose();
        await tf.nextFrame();
        if (progress) {
          const index = row * columns + col + 1;
          progress(index / total);
        }
        const slicedPrediction = prediction.slice(
          [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale],
          [-1, sliceSize[0] * scale, sliceSize[1] * scale],
        ).squeeze();
        await tf.nextFrame();
        prediction.dispose();
        await tf.nextFrame();

        const src = await tensorAsBase64(slicedPrediction);

        setUpscaledImageSources(prev => ({
          ...prev,
          [row]: {
            ...prev[row],
            [col]: src,
          }
        }))
      }
    }
    setUpscaling(false);
  };

  const handleChange = (key) => value => setState(prev => ({
    ...prev,
    [key]: value,
  }));

  if (img) {
    return (
      <div id="image-container">
        <div>
          <span>(Actual image is {size}x{size})</span><br />
          <a href={src} target="_blank"><img src={src} height={100} /></a>
        </div>
        <div id="inputs">
          <div className="input">
            <label>Patch Size</label>
            <InputRange
              disabled={upscaling}
              maxValue={size}
              minValue={0}
              defaultValue={state.patchSize}
              onChange={handleChange('patchSize')}
            />
          </div>
          <div className="input">
            <label>Padding</label>
            <InputRange
              disabled={upscaling}
              maxValue={size}
              minValue={0}
              defaultValue={state.padding}
              onChange={handleChange('padding')}
            />
          </div>
          <div className="input">
            <label>Space Between Patches</label>
            <InputRange
              disabled={upscaling}
              maxValue={20}
              minValue={0}
              defaultValue={state.space}
              onChange={handleChange('space')}
            />
          </div>
          <button id="upscale" onClick={upscale}>Upscale</button>
        </div>
        <table id="upscaled-image">
          <tbody>
            {Object.keys(upscaledImageSources).sort().map(rowKey => {
              const row = upscaledImageSources[rowKey]
              return (
              <tr key={rowKey}>
                  {Object.keys(row).sort().map(colKey => {
                    const src = row[colKey];
                    return (
                      <td key={colKey}>
                        <img src={src} />
                      </td>
                    );
                  })}
              </tr>
              );
            })}

          </tbody>
        </table>
      </div>
    );
  }

  return 'Loading...';
}

export default () => {
  return (
    <div className="app">
      <h1>Patch Sizes</h1>
      <p>For larger images, we can use patch sizes as a way to provide a more performant UI.</p>
      <App />
    </div>
  );
};
