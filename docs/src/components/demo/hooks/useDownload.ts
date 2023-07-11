import { MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react';

export const useDownload = (name?: string, progress?: number, upscaledSrc?: MutableRefObject<HTMLCanvasElement>) => {
  const isDownloadDisabled = useMemo(() => !(upscaledSrc && progress === undefined), [progress, upscaledSrc]);

  const anchorRef = useRef<HTMLAnchorElement>(document.createElement('a'));

  useEffect(() => {
    const anchor = anchorRef.current;
    const upscaled = upscaledSrc?.current;
    if (anchor && upscaled) {
      anchor.href = upscaled.toDataURL();
      anchor.download = name;
    }
  }, [upscaledSrc, name]);

  const handleDownload = useCallback(() => {
    const anchor = anchorRef.current;
    if (anchor) {
      anchor.click();
    }
  }, [anchorRef]);

  return {
    handleDownload: isDownloadDisabled ? undefined : handleDownload,
  }
};
