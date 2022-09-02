import React, { useCallback, useState, useEffect, useRef } from 'react';
import styles from './images.module.scss';
import Loading from '@site/src/components/loading/loading';
import type { UploadedImage } from '../../../types';

const IMAGE_SEARCH_ROOT = 'https://image-search-prod.upscaler.workers.dev';
// const IMAGE_SEARCH_ROOT = 'https://image-search.upscalerjs.com';

export type SelectImage = (img: UploadedImage) => void;
export default function Images({
  searchValue,
  selectImage,
}: {
  searchValue: string;
  selectImage: SelectImage;
}) {
  const timer = useRef<number>();
  const [first, setFirst] = useState(false);
  const [images, setImages] = useState<undefined | { tags: string, pageURL: string, url: string }[]>();

  const search = useCallback(async (value: string) => {
    const resp = await fetch(`${IMAGE_SEARCH_ROOT}?q=${value}`);
    const { response: { hits }} = await resp.json();
    setImages(hits.map(hit => ({
      url: hit.previewURL,
      pageURL: hit.pageURL,
      tags: hit.tags,
    })));
  }, []);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    setImages(undefined);

    timer.current = window.setTimeout(() => {
      search(searchValue);
    }, first === false ? 0 : 800);

    setFirst(true);

    return () => {
      clearTimeout(timer.current);
    }
  }, [timer, searchValue]);

  return (
    <div id={styles.images}>
      {images ? (
        <div id={styles.imageList}>{images.map(image => (
          <div className={styles.image} key={image.url}>
            <a onClick={e => {
              e.preventDefault();
              selectImage({ src: image.url, filename: image.tags });
            }}><img src={image.url} /></a>
          </div>
        ))}</div>
      ) : (
        <div id={styles.loading}>
          <Loading />
        </div>
      )}
    </div>
  );
}


