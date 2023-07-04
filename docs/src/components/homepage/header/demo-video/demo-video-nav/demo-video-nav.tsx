import clsx from 'clsx';
import React from 'react';
import styles from './demo-video-nav.module.scss';

export const DemoVideoNav = ({
  images,
  active,
  handleMouseOver,
  handleMouseOut,
  handleClick,
}: {
  active: number;
  images: number;
  handleMouseOver: (i: number) => void;
  handleMouseOut: (i: number) => void;
  handleClick: (i: number) => void;
}) => {
  return (
    <ul className={styles.nav}>
      {Array(images).fill('').map((_, i) => i).map(i => (
        <li 
          key={i}
          onMouseOver={() => handleMouseOver(i)}
          onMouseOut={() => handleMouseOut(i)}
          onClick={() => handleClick(i)}
          className={clsx(active === i ? styles.active : '')}
        >
          <button></button>
        </li>
      ))}
    </ul>
  );
}

