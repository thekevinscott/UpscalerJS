import './App.css';
import Upscaler from 'upscaler';
import React, { useCallback, useState, useEffect, useRef } from 'react';

function App() {
  const img = useRef();
  const [modelDefinitions, setModelDefinitions] = useState();
  const [upscaledImages, setUpscaledImages] = useState({});
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [started, setStarted] = useState({});

  const upscaleImage = useCallback(async (key) => {
    const upscaler = new Upscaler({
      model: key,
    });
    await upscaler.warmup([[img.current.height, img.current.width]]);
    const start = new Date().getTime();
    const upscaledImage = await upscaler.upscale(img.current);
    const elapsedTime = new Date().getTime() - start;

    return {
      elapsedTime,
      src: upscaledImage,
    }
  }, [img]);

  const getModelDefinitions = useCallback(async () => {
    const _modelDefinitions = await (new Upscaler()).getModelDefinitions();
    setModelDefinitions(Object.entries(_modelDefinitions).reduce((obj, [key, val]) => {
      if (!val.deprecated) {
        const scale = val.scale;
        return {
          ...obj,
          [scale]: {
            ...obj[scale],
            [key]: val,
          },
        };
      }
      return obj;
    }, {}));
  }, []);

  useEffect(() => {
    (async () => {
      const scaleEntries = Object.entries(modelDefinitions || {});
      for (let j = 0; j < scaleEntries.length; j++) {
        const [_, modelDefinitionsForScales] = scaleEntries[j];
        const entries = Object.entries(modelDefinitionsForScales || {});
        for (let i = 0; i < entries.length; i++) {
          const [key] = entries[i];
          if (!started[key]) {
            setStarted(prev => ({
              ...prev,
              [key]: true,
            }))
            const {
              elapsedTime,
              src,
            } = await upscaleImage(key);

            setElapsedTimes(prev => ({
              ...prev,
              [key]: elapsedTime,
            }))

            setUpscaledImages(prev => ({
              ...prev,
              [key]: src,
            }));
          }
        }
      }
    })();
  }, [started, modelDefinitions, upscaleImage]);

  useEffect(() => {
    if (img.current && !modelDefinitions) {
      getModelDefinitions();
    }
  }, [img, modelDefinitions, getModelDefinitions]);

  if (modelDefinitions) {
    return (
      <div>
        <div>
          <label>Sample image</label>
          <img ref={img} src="/flower.png" alt="Flower" crossorigin="anonymous" />
        </div>
        {Object.entries(modelDefinitions).map(([scale, defs]) => {
          return (
            <div key={scale}>
              <h2>{scale}x</h2>
              <table>
                <thead>
                  <tr>
                    <td>Key</td>
                    <td>Description</td>
                    <td>Output</td>
                    <td>Elapsed Time</td>
                  </tr>
                </thead>
                <tbody>
                {Object.entries(defs).map(([key, def]) => {
                  return (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="description">
                        {def.description.split('\n').map(line => (<p key={line}>{line}</p>))}
                      </td>
                      <td>{upscaledImages[key] ? (
                        <img src={upscaledImages[key]} alt={key} />
                      ) : 'Upscaling...'}</td>
                      <td>{elapsedTimes[key]}</td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <label>Sample image</label>
      <img ref={img} src="/flower.png" alt="Flower" crossorigin="anonymous" />
      <p>Loading models...</p>
    </div>
  )
}

const main = () => {
  return (
    <div className="app">
      <h1>Pre-trained Model Comparison</h1>
      <App />
    </div>
  );
};

export default main;
