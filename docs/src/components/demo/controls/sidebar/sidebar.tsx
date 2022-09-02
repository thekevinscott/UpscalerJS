import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './sidebar.module.scss';
import { Input } from '@site/src/components/input/input';
import { Icon } from '@site/src/components/icon/icon';
import Images, { SelectImage } from './images/images';
import { Button } from '@site/src/components/button/button';
import { State } from '../../types';
import classNames from 'classnames';
import Animation from './animation/animation';

export default function Sidebar({
  state,
  selectImage,
}: {
  state: State,
  selectImage: SelectImage,
}) {
  const [searchValue, setSearchValue] = useState('');
  const handleChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const timer = useRef<number>();
  const [showUploadButton, setShowUploadButton] = useState(false);
  useEffect(() => {
    clearTimeout(timer.current);
    if (state === State.COMPLETE) {
      timer.current = window.setTimeout(() => {
        setShowUploadButton(true);
      }, 500);
    } else {
      setShowUploadButton(false);
    }

    return () => {
      clearTimeout(timer.current);
    }
  }, [state]);

  return (
    <div id={styles.sidebar}>
      <div id={styles.header}>
        <Animation />
        <div id={styles.uploadAnother} className={classNames({ [styles.visible]: showUploadButton })}>
          <Button variant="primary" onClick={() => selectImage(undefined)}>Upload Image</Button>
        </div>
        <Input placeholder="Search images" size="small" onSlInput={event => handleChange((event.target as HTMLInputElement).value)}>
          <Icon name="search" slot="suffix"></Icon>
        </Input>
        <small className={styles.info}>Images provided from <a target="_blank" href="https://pixabay.com">pixabay</a></small>
      </div>
      <Images searchValue={searchValue} selectImage={selectImage} />
    </div>
  );
}

