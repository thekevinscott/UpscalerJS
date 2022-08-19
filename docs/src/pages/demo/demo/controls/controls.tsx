import React, { useCallback, useState } from 'react';
import styles from './controls.module.scss';
import { SelectImage } from './sidebar/images/images';
import ControlPane from './controlPane/controlPane';
import Toggle from './toggle/toggle';
import Sidebar from './sidebar/sidebar';
import Actions, { HandleZoom } from './actions/actions';
import { State } from '../types';
import classNames from 'classnames';
import { Button } from '@site/src/components/button/button';

export default function Controls({ 
  selectImage,
  state,
  handleZoom,
  zoom,
  progress,
  cancelUpscale,
}: {
  selectImage: SelectImage;
  state: State;
  zoom: number;
  handleZoom: HandleZoom;
  progress: JSX.Element | boolean;
  cancelUpscale: () => void;
}) {
  const [open, setOpen] = useState(true);
  const handleToggle = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <div id={styles.controls}>
      <div id={styles.progress} className={classNames({ [styles.right]: open, [styles.bottom]: getStateForActions(state, open) })}>
        {state === State.PROCESSING && <Button onClick={cancelUpscale}>Cancel Upscale</Button>}
        <div id={styles.progressBar}>
          {progress}
        </div>
      </div>
      <Toggle handleToggle={handleToggle} open={open} />
      <ControlPane open={open} position="right" width={200}>
        <Sidebar selectImage={selectImage} />
      </ControlPane>
      <ControlPane open={getStateForActions(state, open)} position="bottom" height={120}>
        <Actions handleZoom={handleZoom} zoom={zoom} />
      </ControlPane>
    </div>
  );
}

const getStateForActions = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.COMPLETE || state === State.PROCESSING) {
    return true;
  }

  return false;
}
