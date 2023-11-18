import React from 'react';
import styles from './uploadPane.module.scss';
import { Button } from '@site/src/components/button/button';
import Pane from '../pane/pane';
import Upload from '../upload/upload';
import Link from '@docusaurus/Link';

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
          <p>This demo is using the <Link style={{ margin: 3 }} to="/models/available/upscaling/esrgan-medium"> ESRGAN Medium </Link> model.  </p>
          <Button size="large" variant="primary">{isDragActive ? 'Drop Image' : 'Upload Image'}</Button>
        </Pane>
      )}
    </Upload>
  );
}


