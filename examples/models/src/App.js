import './App.css';
import Upscaler from 'upscaler';
import React, { useState, useEffect, useRef } from 'react';

function App() {
  const img = useRef();
  const [modelDefinitions, setModelDefinitions] = useState();
  const [upscaledImages, setUpscaledImages] = useState({});

  const upscaleImage = async (key) => {
    const upscaler = new Upscaler({
      model: key,
    });
    const upscaledImage = await upscaler.upscale(img.current, {
      patchSize: 64,
      padding: 5,
    });

    setUpscaledImages(prev => ({
      ...prev,
      [key]: upscaledImage,
    }));
  };

  const getModelDefinitions = async () => {
    const _modelDefinitions = await (new Upscaler()).getModelDefinitions();
    setModelDefinitions(Object.entries(_modelDefinitions).reduce((obj, [key, val]) => {
      if (!val.deprecated) {
        const scale = val.scale;
        upscaleImage(key);
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
  };

  useEffect(() => {
    if (img.current && !modelDefinitions) {
      getModelDefinitions();
    }
  }, [img]);

  if (modelDefinitions) {
    return (
      <div>
        <div>
          <label>Sample image</label>
          <img ref={img} src="/flower.png" />
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
      <img ref={img} src="/flower.png" />
    </div>
  )
}

export default () => {
  return (
    <div className="app">
      <h1>Pre-trained Model Comparison</h1>
      <App />
    </div>
  );
};
