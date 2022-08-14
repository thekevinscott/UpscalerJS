import React, { useCallback, useState } from 'react';
import styles from './demo.module.scss';
import Checkerboard from '@site/src/components/checkboard';
import Sidebar from './sidebar/sidebar';
import * as tf from '@tensorflow/tfjs';

// const doIt = () => {
//   const fileInput = document.getElementsByTagName('input')[0];
      
//   const formData = new FormData();
  
//   formData.append('file', fileInput.files[0]);
//       // formData.append('width', 16);
//       // formData.append('height', 16);
  
//       const options = {
//         method: 'POST',
//         body: formData,
//         // If you add this, upload won't work
//         // headers: {
//         //   'Content-Type': 'multipart/form-data',
//         // }
//       };
      
//   fetch('http://localhost:8787', options).then(r => r.json()).then(resp => {
//       console.log(resp);
//       const upscaledSrc = resp.response.upscaledSrc;
//       try {    document.getElementById('upscaledImg').remove(); } catch(err) {}
//       const canvas = document.createElement('canvas')
//       canvas.id = 'upscaledImg';
//       document.body.prepend(canvas);
//       const t = tf.tensor(resp.response.upscaledSrc, [1, 64, 64, 3])
//       tf.browser.toPixels(t, canvas)
      
//   }).catch(console.error)
//   }

export default function Demo() {
  // // const [file, setFile] = useState();
  // const handleFileChange = useCallback(e => {
  //   // setFile(e.files[0]);
  //   doit(e.files[0]);
  // }, []);
  // const doit = useCallback((file: File) => {
  //   const formData = new FormData();
    
  //   formData.append('file', file);
  
  //     const options = {
  //       method: 'POST',
  //       body: formData,
  //     };
      
  //   fetch('http://localhost:8787', options).then(r => r.json()).then(resp => {
  //     try { document.getElementById('upscaledImg').remove(); } catch (err) { }
  //     const canvas = document.createElement('canvas')
  //     canvas.id = 'upscaledImg';
  //     document.body.prepend(canvas);
  //     const t = tf.tensor(resp.response.upscaledSrc, [64, 64, 3]) as tf.Tensor3D;
  //     tf.browser.toPixels(t, canvas);
  //   });
      
  // }, []);

  return (
    <div id={styles.page}>
      <Checkerboard />
      <Sidebar />
    </div>
  );
}

