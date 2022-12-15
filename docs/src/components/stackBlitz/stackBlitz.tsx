import React, { useMemo } from 'react';
import { useColorMode } from '@docusaurus/theme-common';

const ROOT_URL = 'https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main';

const getParamsWithColorMode = (params: URLSearchParams | string, colorMode: string) => {
  if (typeof params === 'string') {
    return `${params}&theme=${colorMode}`;
  }

  params.set('theme', colorMode);
  return params.toString();
}

export const StackBlitz = ({ url, params = new URLSearchParams(), height= '400', width = '100%'}: { url: string, params?: URLSearchParams | string, height?: string, width?: string }) => {
  const { colorMode } = useColorMode();

  const src = useMemo(() => {
    const builtURL = [
      ...ROOT_URL.split('/'),
      ...url.split('/'),
    ].filter(Boolean).join('/');
    return `${builtURL}?${getParamsWithColorMode(params, colorMode)}`;
  }, [
    url,
    params.toString(),
    colorMode,
  ]);

  return (
    <iframe height={height} width={width} src={src}></iframe>
  )
}

export default StackBlitz;
