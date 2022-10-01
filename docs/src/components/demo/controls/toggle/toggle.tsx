import React from 'react';
import styles from './toggle.module.scss';
import { Button } from '@site/src/components/button/button';

type HandleToggle = () => void;

const getMessage = (open: boolean) => (open ? 'Hide Controls' : 'Show Controls');

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
