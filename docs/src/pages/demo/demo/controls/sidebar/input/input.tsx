import React, { ChangeEvent, useCallback, useRef } from 'react';
import styles from './input.module.scss';
import { BiSearchAlt } from 'react-icons/bi';

const fontSize = '0.75em';

export default function Input({
  handleChange,
}: {
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const input = useRef<HTMLInputElement>();
  const focus = useCallback(() => {
    input.current.focus();
  }, [input.current]);
  return (
      <div id={styles.container} onClick={focus}>
        <div id={styles.input}>
          <input style={{ fontSize }} placeholder="Search for images" onChange={handleChange} ref={input} />
          <BiSearchAlt size={fontSize} />
        </div>
      </div>
  );
}

