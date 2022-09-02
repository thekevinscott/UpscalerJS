import { useCallback, useEffect, useMemo, useRef } from 'react';

export const useDownload = (name?: string, progress?: number, upscaledSrc?: string) => {
  const isDownloadDisabled = useMemo(() => !(upscaledSrc && progress === undefined), [progress, upscaledSrc]);

  const anchorRef = useRef<HTMLAnchorElement>(document.createElement('a'));

  useEffect(() => {
    const anchor = anchorRef.current;
    if (anchor) {
      anchor.href = upscaledSrc;
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
