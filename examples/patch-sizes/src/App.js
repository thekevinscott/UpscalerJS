import * as tf from '@tensorflow/tfjs';
import './App.css';
import Upscaler, { getRowsAndColumns } from 'upscaler';
import React, { useState, useEffect, useCallback } from 'react';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';

const size = 100;
const src = `https://picsum.photos/id/220/${size}/${size}`;

const upscaler = new Upscaler();
function App() {
  const [img, setImg] = useState();
  const [upscaling, setUpscaling] = useState(false);
  const [state, setState] = useState({
    patchSize: 20,
    padding: 5,
    space: 2,
  });
  const [upscaledImageSources, setUpscaledImageSources] = useState({});

  useEffect(() => {
    const _img = new Image();
    _img.crossOrigin = 'anonymous';
    _img.src = src;
    _img.onload = () => setImg(_img);
  }, []);

  const upscale = useCallback(async (e) => {
    e.preventDefault();
    setUpscaling(true);
    setUpscaledImageSources({});
    let row = 0;
    let col = 0;
    const pixels = tf.browser.fromPixels(img);
    const { columns } = getRowsAndColumns(pixels, state.patchSize);
    await upscaler.upscale(pixels, {
      patchSize: state.patchSize,
      padding: state.padding,
      progress: (_, slice) => {
        setUpscaledImageSources(prev => ({
          ...prev,
          [row]: {
            ...prev[row],
            [col]: slice,
          }
        }));
        col++;
        if (col >= columns) {
          row++;
          col = 0;
        }
      }
    });
    setUpscaling(false);
  }, [img, state.padding, state.patchSize]);

  const handleChange = useCallback((key) => value => setState(prev => ({
    ...prev,
    [key]: value,
  })), []);

  if (img) {
    return (
      <div id="image-container">
        <div>
          <span>(Actual image is {size}x{size})</span><br />
          <a href={src} target="_blank" rel="noopener noreferrer"><img alt="Original" src={src} height={100} /></a>
        </div>
        <div id="inputs">
          <div className="input">
            <label>Patch Size</label>
            <InputRange
              disabled={upscaling}
              maxValue={size}
              minValue={0}
              value={state.patchSize}
              onChange={handleChange('patchSize')}
            />
          </div>
          <div className="input">
            <label>Padding</label>
            <InputRange
              disabled={upscaling}
              maxValue={size}
              minValue={0}
              value={state.padding}
              onChange={handleChange('padding')}
            />
          </div>
          <div className="input">
            <label>Space Between Patches</label>
            <InputRange
              disabled={upscaling}
              maxValue={20}
              minValue={0}
              value={state.space}
              onChange={handleChange('space')}
            />
          </div>
          <button id="upscale" onClick={upscale}>Upscale</button>
        </div>
        <div>
          <table id="upscaled-image">
            <tbody>
              {Object.keys(upscaledImageSources).sort().map(rowKey => {
                const row = upscaledImageSources[rowKey]
                return (
                  <tr key={rowKey}>
                    {Object.keys(row).sort().map(colKey => {
                      const src = row[colKey];
                      return (
                        <td
                          key={colKey}
                          style={{
                            padding: state.space,
                          }}
                        >
                          <img src={src} alt={`Patch ${rowKey}-${colKey}`} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return 'Loading...';
}

const main = () => {
  return (
    <div className="app">
      <h1>Patch Sizes</h1>
      <p>For larger images, we can use patch sizes as a way to provide a more performant UI.</p>
      <App />
    </div>
  );
};

export default main;
