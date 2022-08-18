import React, { useCallback, useState } from 'react';
import styles from './controls.module.scss';
import { SelectImage } from './sidebar/images/images';
import ControlPane from './controlPane/controlPane';
import Toggle from './toggle/toggle';
import Sidebar from './sidebar/sidebar';
import Actions from './actions/actions';
import { State } from '../types';

export default function Controls({ 
  selectImage,
  state,
}: {
  selectImage: SelectImage;
  state: State;
}) {
  const [open, setOpen] = useState(true);
  const handleToggle = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <div id={styles.controls}>
      <Toggle handleToggle={handleToggle} open={open} />
      <ControlPane open={open} position="right" width={200}>
        <Sidebar selectImage={selectImage} />
      </ControlPane>
      <ControlPane open={getStateForActions(state, open)} position="bottom" height={120}>
        <Actions />
      </ControlPane>
    </div>
  );
}

const getStateForActions = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.COMPLETE) {
    return true;
  }

  return false;
}
