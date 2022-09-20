import React, { useCallback, useRef, useState } from 'react';
import styles from './starting.module.scss';
import { Alert } from '@site/src/components/alert/alert';
import { Icon } from '@site/src/components/icon/icon';
import { Button } from '@site/src/components/button/button';
import { Spinner } from '@site/src/components/spinner/spinner';
import { Loading } from '@site/src/components/loading/loading';
import Dialogue from '../dialogue/dialogue';
import Pane from '../pane/pane';
import classNames from 'classnames';

const Row = ({
  patchSize,
  duration,
  hasBeenBenchmarked,
  chosenPatchSize,
  choosePatchSize,
}: {
  patchSize: number;
  duration: number;
  hasBeenBenchmarked: boolean;
  chosenPatchSize?: number,
  choosePatchSize: (patchSize: number) => void,
}) => {
  const ref = useRef<HTMLInputElement>();
  const id = `patch-size-${patchSize}`;
  const handleClick = useCallback(() => {
    const current = ref.current;
    current.click();
  }, [hasBeenBenchmarked, ref]);

  return (
    <tr key={patchSize} onClick={handleClick} className={classNames({ [styles.active]: hasBeenBenchmarked })}>
      <td>
        <div>
        <input
          ref={ref}
          checked={chosenPatchSize === patchSize}
          type="radio"
          id={id}
          name="patch-size"
          value={patchSize}
          onChange={() => choosePatchSize(patchSize)}
        />
        </div>
      </td>
      <td>
        <div>
        {patchSize}px
        </div>
      </td>
      <td>
        <div>
        {duration ? `${duration}ms` : <Spinner />}

        </div>
      </td>
    </tr>
  );
}

export default function Starting({
  hasBeenBenchmarked,
  start,
  benchmarks,
  patchSize: chosenPatchSize,
  choosePatchSize,
}: {
  hasBeenBenchmarked: boolean;
  start: () => void;
  benchmarks?: Record<number, number | undefined>;
  patchSize?: number,
  choosePatchSize: (patchSize: number) => void,
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [customPatchSize, setCustomPatchSize] = useState<number>();
  const disabled = chosenPatchSize === undefined;
  return (
    <Dialogue>
      <Pane> 
      <div id={styles.starting}>

        <Alert variant={hasBeenBenchmarked ? "success" : "neutral"} open>
          {hasBeenBenchmarked ? (
            <>
              <Icon slot="icon" name="check2-circle" />
              <strong>Benchmarking Complete</strong>
            </>
          ) : (
            <>
              <Icon slot="icon" name="gear" />
              <strong>Benchmarking Performance</strong>
            </>
          )}
        </Alert>
        <h1>Benchmarks</h1>
        <p>
          Patch sizes allow UpscalerJS to subdivide an image into smaller patches for processing.
          Below are live measurements for your browser processing at various patch sizes.
        </p>
          {benchmarks ? (
            <>
            <table>
              <thead><tr><th></th><th>Patch Size</th><th>Duration</th></tr></thead>
              <tbody>
                {Object.entries(benchmarks).map(([_patchSize, duration]) => {
                  const patchSize = parseInt(_patchSize, 10);
                  return (
                    <Row
                      key={_patchSize}
                      hasBeenBenchmarked={hasBeenBenchmarked}
                      patchSize={patchSize}
                      duration={duration}
                      choosePatchSize={patchSize => {
                        setIsCustom(false);
                        choosePatchSize(patchSize);
                      }}
                      chosenPatchSize={!isCustom ? chosenPatchSize : undefined}
                    />
                  );
                })}
                <tr>
                  <td>
                    <input
                      type="radio"
                      name="patch-size"
                      value="custom"
                      checked={isCustom}
                      onChange={() => {
                        choosePatchSize(customPatchSize);
                      }}
                    />
                  </td>
                  <td colSpan={2}>
                    <div id={styles.customPatchSizeContainer}>
                    <input 
                    onFocus={() => {
                      setIsCustom(true);
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomPatchSize(parseInt(value, 10));
                      choosePatchSize(parseInt(value, 10));
                      setIsCustom(true);
                    }}
                    id={styles.customPatchSize} type="number" placeholder="Choose a custom patch size" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p>You can choose a patch size above, or accept the default. Click the Start button when you&apos;re ready.</p>
            </>
          ) : (
            <Loading />
          )}
        <div id={styles.options}>
          <div id={styles.right}>
            <Button size="large" variant='primary' onClick={start} disabled={disabled}>
              Start
            </Button>
          </div>
        </div>
      </div>
      </Pane>
    </Dialogue>
  );
}
