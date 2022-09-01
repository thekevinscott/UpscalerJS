import React from 'react';
import styles from './sidebar.module.scss';
import { State } from '../../types';
import classNames from 'classnames';

const getStateForMobileFooter = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.COMPLETE || state === State.PROCESSING) {
    return true;
  }

  return false;
}

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
