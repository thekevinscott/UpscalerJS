import React, { useCallback, useState } from 'react';
import styles from './sidebar.module.scss';
import { Input } from '@site/src/components/input/input';
import { Icon } from '@site/src/components/icon/icon';
import Images, { SelectImage } from './images/images';
import UploadPane from '../../components/uploadPane/uploadPane';

export default function Sidebar({
  selectImage,
}: {
  selectImage: SelectImage,
}) {
  const [searchValue, setSearchValue] = useState('');
  const handleChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  return (
    <div id={styles.sidebar}>
      <div id={styles.header}>
        <Input placeholder="Search images" size="small" onSlInput={event => handleChange((event.target as any).value)}>
          <Icon name="search" slot="suffix"></Icon>
        </Input>
        <small className={styles.info}>Images provided from <a target="_blank" href="https://pixabay.com">pixabay</a></small>
      </div>
      <Images searchValue={searchValue} selectImage={selectImage} />
    </div>
  );
}

