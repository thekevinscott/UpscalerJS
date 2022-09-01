import React, { useCallback, useContext } from 'react';
import styles from './uploadPane.module.scss';
import { Button } from '@site/src/components/button/button';
import {useDropzone} from 'react-dropzone'
import classNames from 'classnames';
import { UploadContext } from '../../context/uploadContext';
import Pane from '../pane/pane';
import Upload from '../upload/upload';

const readFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()

  reader.onabort = () => reject('File reading was aborted');
  reader.onerror = () => reject('File reading has failed');
  reader.onload = () => {
    if (typeof(reader.result) === 'string') {
      resolve(reader.result);
    } else {
      reject('No valid result could be found');
    }
  };
  reader.readAsDataURL(file);
});

export default function UploadPane({
  size,
}: {
  size: 'small' | 'large';
}) {
  return (
    <Upload>
      {({ isDragActive }) => (
        <Pane 
          classes={{
            [styles.active]: isDragActive,
            [styles.uploadPane]: true,
          }}
          size={size}
        >
          <p>Upload an image from your computer, or choose from one of the images in the search field.</p>
          <Button size="large" variant="primary">{isDragActive ? 'Drop Image' : 'Upload Image' }</Button>
        </Pane>
      )}
    </Upload>
  );
}


