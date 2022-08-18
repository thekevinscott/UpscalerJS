import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './demo.module.scss';
import * as tf from '@tensorflow/tfjs';
import { SelectImage } from './controls/sidebar/images/images';
import Viewer from './components/viewer/viewer';
import Controls from './controls/controls';
import UploadDialogue from './components/uploadDialogue/uploadDialogue';
import { useColorMode } from '@docusaurus/theme-common';

const getHTML = () => {
  const els = document.getElementsByTagName('html');
  if (els.length !== 1) {
    throw new Error('Bad selection of HTML element');
  }

  return els[0];
};

const SHOELACE_DARK_MODE = 'sl-theme-dark';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
import { ProcessedImage, State, UploadedImage } from './types';
import { UploadContext } from './context/uploadContext';
import { getHTMLImageElement } from './utils/getHTMLImageElement';
import { isTooLarge } from './utils/isTooLarge';
import Warning from './components/configuration/warning/warning';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.80/dist/');

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
  const {colorMode} = useColorMode();
  const { current: html } = useRef(getHTML());
  useEffect(() => {
    if (colorMode === 'dark') {
      html.classList.add(SHOELACE_DARK_MODE);
    } else {
      html.classList.remove(SHOELACE_DARK_MODE);
    }

  }, [html, colorMode]);

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

  const [img, setImg] = useState<ProcessedImage>();

  const selectImage = useCallback<SelectImage>(async (img) => {
    const el = await getHTMLImageElement(img.src);
    setImg({
      ...img,
      el,
    });
  }, []);

  const state = useMemo(() => {
    if (img && isTooLarge(img.el)) {
      return State.WARNING;
    }
    return State.NOT_STARTED;
  }, [img]);

  return (
    <UploadContext.Provider value={{ handleUpload: selectImage }}>
      <div id={styles.page}>
        {state === State.NOT_STARTED && (
          <UploadDialogue />
        )}
        {state === State.WARNING && (
          <Warning height={img.el.height} width={img.el.width} />
        )}
        <Viewer img={img} state={state} /> 
        <Controls selectImage={selectImage} state={state} />
      </div>
    </UploadContext.Provider>
  );
}

// if (shouldProceed === false && parsedImage.width * parsedImage.height > TOO_LARGE * TOO_LARGE) {
