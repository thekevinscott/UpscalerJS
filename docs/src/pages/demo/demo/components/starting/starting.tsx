import React, { useCallback, useRef } from 'react';
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
    if (hasBeenBenchmarked && current) {
      current.click();
    }
  }, [hasBeenBenchmarked, ref]);

  return (
    <tr key={patchSize} onClick={handleClick} className={classNames({ [styles.active]: hasBeenBenchmarked })}>
      <td>
        <div>
        <input
          ref={ref}
          checked={chosenPatchSize === patchSize}
          disabled={!hasBeenBenchmarked}
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
        <strong>Benchmarks</strong>
        <p>
          Patch sizes allow UpscalerJS to subdivide an image into smaller patches for processing, which are 
          stitched together upon completion.
          This allows for a more responsive UI, at the cost of a longer overall upscale.
          Below are measurements for increasing patch sizes in your browser in milliseconds.
        </p>
          {benchmarks ? (
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
                      choosePatchSize={choosePatchSize}
                      chosenPatchSize={chosenPatchSize}
                    />
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Loading />
          )}
          {hasBeenBenchmarked && (
            <p>You can choose a patch size above, or accept the default. Click the Start button when you're ready.</p>
          )}
        <div id={styles.options}>
          <div id={styles.right}>
            <Button size="large" disabled={!hasBeenBenchmarked} variant='primary' onClick={start}>
              Start
            </Button>
          </div>
        </div>
      </div>
      </Pane>
    </Dialogue>
  );
}
