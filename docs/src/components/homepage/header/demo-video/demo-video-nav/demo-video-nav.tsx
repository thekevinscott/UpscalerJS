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
          key={i}
        >
          <button
            onClick={() => handleClick(i)}
            onKeyUp={() => handleClick(i)}
            className={clsx(active === i ? styles.active : '')}
          >
            <div className={styles.dot}></div>

          </button>
        </li>
      ))}
    </ul>
  );
}

