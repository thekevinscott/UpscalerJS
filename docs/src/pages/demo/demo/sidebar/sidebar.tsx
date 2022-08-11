import React, { useCallback, useState } from 'react';
import styles from './sidebar.module.scss';
import { AiFillCaretLeft } from 'react-icons/ai';
import Input from './input/input';
import Images from './images/images';
import classNames from 'classnames';

export default function Sidebar() {
  const [searchValue, setSearchValue] = useState('');
  const handleChange = useCallback((e) => {
    setSearchValue(e.target.value);
  }, []);
  const [open, setOpen] = useState(true);
  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <div id={styles.sidebar} className={classNames({ [styles.open]: open })}>
      <div id={styles.header}>
        <AiFillCaretLeft size="1.0em" className={classNames({ [styles.open]: open })} id={styles.toggle} onClick={toggle} />
        <Input handleChange={handleChange} />
        <small className={styles.info}>Images provided from <a target="_blank" href="https://pixabay.com">pixabay</a></small>
      </div>
      <Images searchValue={searchValue} />
    </div>
  );
}

