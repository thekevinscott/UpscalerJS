import clsx from 'clsx';
import React from 'react';
import styles from './demo-video-nav.module.scss';

export const DemoVideoNav = ({
  images,
  active,
  handleClick,
}: {
  active: number;
  images: number;
  handleClick: (i: number) => void;
}) => {
  return (
    <ul className={styles.nav}>
      {Array(images).fill('').map((_, i) => i).map(i => (
        <li 
          role="button"
          key={i}
          onClick={() => handleClick(i)}
          onKeyUp={() => handleClick(i)}
          className={clsx(active === i ? styles.active : '')}
        >
          <button></button>
        </li>
      ))}
    </ul>
  );
}

