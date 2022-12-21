import React, { useMemo } from 'react';
import styles from './modelTooltip.module.scss';

const splitModelName = (model: string): [string, string] => {
  const parts = model.split('/');
  return [
    parts[0],
    // `@upscalerjs/${parts[0]}`,
    parts.slice(1).join('/'),
  ];
};

const getUpscaledImageSrc = (packageName: string, modelName: string) => {
  return `http://localhost:3000/assets/sample-images/${packageName}/samples/${modelName}/flower.png`;
}

const useModelInfo = (model: string) => {
  const [packageName, modelName] = useMemo(() => splitModelName(model), [model]);
  const upscaledImageSrc = useMemo(() => getUpscaledImageSrc(packageName, modelName), [packageName, modelName]);
  console.log(upscaledImageSrc);

  return {
    packageName,
    modelName,
    upscaledImageSrc,
  }
}

export const ModelTooltip = ({ model }: { model: string }) => {
  const { upscaledImageSrc, packageName, modelName } = useModelInfo(model);

  return (
    <div className={styles.modelTooltip}>
      <h1><a href={`/models/Models/${packageName}#${modelName}`}><span className={styles.packageName}>{packageName}</span> / {modelName}</a></h1>
      <table>
        <tbody>
          <tr>
            <td>
              Original
            </td>
            <td>
              Upscaled
            </td>
          </tr>
          <tr>
            <td>
              <img src="/assets/flower.png" alt="Original Image" title="Original non-upscaled image" />
            </td>
            <td>
              <img src={upscaledImageSrc} alt="Upscaled Image" title={`Upscaled by ${packageName} with model ${modelName}`} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
