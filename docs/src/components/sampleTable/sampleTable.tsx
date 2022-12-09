import React, { useMemo, useState } from 'react';
import styles from './sampleTable.module.scss';
import flower from './flower.png';

interface IProps {
  packageName: string;
  models: string[];
  scales: number[];
}

const IMAGE_WIDTH = 128;

export default function SampleTable ({ packageName, models, scales }: IProps) {
  const [bicubic, setBicubic] = useState(false);
  const [sameSize, setSameSize] = useState(false);

  const maxScale = useMemo(() => scales.reduce((max, scale) => {
    return max < scale ? scale : max;
  }, -Infinity), [scales]);
  const tableWidth = useMemo(() => scales.reduce((width, scale) => {
    if (sameSize) {
      return width + (maxScale * IMAGE_WIDTH);
    }
    return width + (scale * IMAGE_WIDTH);
  }, sameSize ? maxScale * IMAGE_WIDTH : IMAGE_WIDTH), [scales, sameSize]);

  return (
    <>
      <div className={styles.options}>
        <div className={styles.option}>
          <label htmlFor="bicubic">View non-upscaled versions</label>
          <input onClick={() => setBicubic(prev => !prev)} type="checkbox" id="bicubic" name="bicubic" />
        </div>
        <div className={styles.option}>
          <label htmlFor="sameSize">View images all at same size</label>
          <input onClick={() => setSameSize(prev => !prev)} type="checkbox" id="sameSize" name="same-size" />
        </div>
      </div>
      <div className={styles.container}>
        <table className={styles.sampleTable} width={tableWidth}>
          <thead>
            <tr>
              <th>Original</th>
              {models.map(label => (
                <th key={label}>{label} {bicubic ? 'Original' : 'Upscaled'}</th>))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><img alt="Original image" src={flower} width={sameSize ? maxScale * IMAGE_WIDTH : IMAGE_WIDTH} /></td>
              {models.map((model, i) => {
                const scale = scales[i];
                const imageWidth = (sameSize ? maxScale : scale) * IMAGE_WIDTH;
                const src = bicubic ? flower : `/assets/sample-images/${packageName}/samples/${model}/flower.png`;
                return (
                  <td key={model}>
                    <img
                      alt={`Upscaled image using ${packageName}/${model}`}
                      src={src}
                      width={imageWidth}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
