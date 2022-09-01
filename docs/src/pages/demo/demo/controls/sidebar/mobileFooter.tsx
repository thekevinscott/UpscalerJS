import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './sidebar.module.scss';
import { Input } from '@site/src/components/input/input';
import { Icon } from '@site/src/components/icon/icon';
import Images, { SelectImage } from './images/images';
import { State } from '../../types';
import ControlPane from '../controlPane/controlPane';
import classNames from 'classnames';

export default function MobileFooter({
  state,
  open,
  children,
}: {
  open?: boolean;
  state: State;
  children: JSX.Element;
}) {
  return (
    <div id={styles.mobileFooter} className={classNames({ [styles.open]: getStateForMobileFooter(state, open)})}>
      {children}
    </div>
  );
}

const getStateForMobileFooter = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.COMPLETE || state === State.PROCESSING) {
    return true;
  }

  return false;
}
