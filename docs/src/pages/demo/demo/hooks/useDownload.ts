import { useCallback, useMemo } from 'react';

const parseName = (name: string) => {
  const parts = name.split('.');
  if (parts.length <= 1) {
    return `${name}.upscaled.png`;
  }
  const ext = parts.pop();
  return [...parts, 'upscaled', ext].join('.');
}

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
