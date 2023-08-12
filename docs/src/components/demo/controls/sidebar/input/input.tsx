import React, { ChangeEvent, useCallback, useMemo, useRef } from 'react';
import styles from './input.module.scss';
import { BiSearchAlt } from 'react-icons/bi';

const fontSize = '0.75em';

export default function Input({
  handleChange,
}: {
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const id = useMemo(() => `input-${Math.random()}`, []);

  return (
    <label id={styles.container} htmlFor={id}>
      <div id={styles.input}>
        <input id={id} style={{ fontSize }} placeholder="Search for images" onChange={handleChange} />
        <BiSearchAlt size={fontSize} />
      </div>
    </label>
  );
}

