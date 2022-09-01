import { useCallback, useMemo } from 'react';

export const useDownload = (name?: string, progress?: number, upscaledSrc?: string) => {
  const isDownloadDisabled = useMemo(() => !(upscaledSrc && progress === undefined), [progress, upscaledSrc]);

  const handleDownload = useCallback(() => {
    if (!isDownloadDisabled) {
      const anchor = document.createElement("a");
      anchor.href = upscaledSrc;
      anchor.download = name;
      anchor.click();

    }
  }, [isDownloadDisabled]);

  return {
    handleDownload: isDownloadDisabled ? undefined : handleDownload,
  }
};
