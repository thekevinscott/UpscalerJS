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
import MobileSidebar from './sidebar/mobilesidebar';
import MobileFooter from './sidebar/mobileFooter';

const getStateForActions = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.COMPLETE || state === State.PROCESSING) {
    return true;
  }

  return false;
}

const getStateForSidebar = (state: State, open: boolean) => {
  if (state === State.BENCHMARKING) {
    return false;
  }

  return open;
}

export default function Controls({ 
  selectImage,
  state,
  handleZoom,
  zoom,
  progress,
  cancelUpscale,
  handleDownload,
}: {
  selectImage: SelectImage;
  state: State;
  zoom: number;
  handleZoom: HandleZoom;
  progress: JSX.Element | boolean;
  cancelUpscale: () => void;
  handleDownload?: () => void;
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
      {state !== State.BENCHMARKING && <Toggle handleToggle={handleToggle} open={open} />}
      <ControlPane open={getStateForSidebar(state, open)} position="right">
        <Sidebar selectImage={selectImage} state={state} />
      </ControlPane>
      <ControlPane open={getStateForActions(state, open)} position="bottom" height={120}>
        <Actions handleZoom={handleZoom} zoom={zoom} handleDownload={handleDownload} />
      </ControlPane>
      <MobileSidebar selectImage={selectImage} state={state} open={open} />
      <MobileFooter state={state} open={open}>
        <Actions handleDownload={handleDownload} />
      </MobileFooter>
    </div>
  );
}
