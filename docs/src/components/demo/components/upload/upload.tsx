import React, { useCallback, useContext } from 'react';
import styles from './upload.module.scss';
import {useDropzone} from 'react-dropzone'
import { UploadContext } from '../../context/uploadContext';

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

export default function Upload({
  children,
}: {
  children: (opts: { isDragActive: boolean }) => (JSX.Element | JSX.Element[]);
}) {
  const { handleUpload } = useContext(UploadContext);
  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0];
    const src = await readFile(file);
    handleUpload({ src, filename: file.name });
  }, [handleUpload]);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: 'image/jpeg, image/png',
    multiple: false,
  });
  
  return (
    <div
      {...getRootProps()}
      id={styles.upload}
    >
      <input {...getInputProps()} />
      {children({ isDragActive })}
    </div>
  );
}



