import { useCallback, useMemo } from 'react';

export const useDownload = (name?: string, progress?: number, upscaledSrc?: string) => {
  const isDownloadDisabled = useMemo(() => !(upscaledSrc && progress === undefined), [progress, upscaledSrc]);

  const handleDownload = useCallback(() => {
    if (!isDownloadDisabled) {
      const a = document.createElement("a");
      a.href = upscaledSrc;
      a.download = name;
      a.click();

    }
  }, [isDownloadDisabled]);

  return {
    handleDownload: isDownloadDisabled ? undefined : handleDownload,
  }
};
