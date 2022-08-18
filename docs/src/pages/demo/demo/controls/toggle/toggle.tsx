import React from 'react';
import styles from './toggle.module.scss';
import { Button } from '@site/src/components/button/button';

type HandleToggle = () => void;

export default function Toggle({ 
  open,
  handleToggle,
}: {
  open: boolean;
  handleToggle: HandleToggle,
}) {
  return (
    <div id={styles.toggle}>
    <Button onClick={handleToggle}>{getMessage(open)}</Button>
    </div>
  );
}


const getMessage = (open: boolean) => {
  if (open) {
    return 'Hide Controls';
  }

  return 'Show Controls';
}
