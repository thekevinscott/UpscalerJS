import React, { useCallback, useState } from 'react';
import styles from './sidebar.module.scss';
import { Input } from '@site/src/components/input/input';
import { Icon } from '@site/src/components/icon/icon';
import Images, { SelectImage } from './images/images';
import { State } from '../../types';
import ControlPane from '../controlPane/controlPane';
import classNames from 'classnames';

const getStateForMobileSidebar = (state: State, open: boolean) => {
  if (open === false) {
    return false;
  }

  if (state === State.UPLOAD) {
    return true;
  }

  return false;
}

export default function MobileSidebar({
  state,
  selectImage,
  open,
}: {
  state: State,
  selectImage: SelectImage,
  open: boolean;
}) {
  const [searchValue, setSearchValue] = useState('');
  const handleChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const [expanded, setFullHeight] = useState(false);

  const handleFocus = useCallback(() => {
    setFullHeight(true);
    setTimeout(() => {

      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 100)
  }, []);

  const handleBlur = useCallback(() => {
    setFullHeight(false);
  }, []);

  return (
    <ControlPane mobile open={getStateForMobileSidebar(state, open)} position="bottom" assumeHeight={!expanded} fullHeight={expanded} minHeight={140}>
      <div id={styles.mobileSidebar} className={classNames({ [styles.expanded]: expanded })}>
        <Icon onClick={handleBlur} id={styles.close} className={classNames({ [styles.visible]: expanded })} name="x-circle" slot="suffix"></Icon>
        <p>Alternatively, you can search for sample images to upscale below.</p>
        <Input placeholder="Search images" size="small" onSlFocus={handleFocus} onSlInput={event => handleChange((event.target as HTMLInputElement).value)}>
          <Icon name="search" slot="suffix"></Icon>
        </Input>
        {expanded && (
          <>
          <small className={styles.info}>Images provided from <a target="_blank" href="https://pixabay.com">pixabay</a></small>
          <Images searchValue={searchValue} selectImage={selectImage} />
          </>
        )}
      </div>
    </ControlPane>
  );
}
