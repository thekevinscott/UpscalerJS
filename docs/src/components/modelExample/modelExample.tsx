import React, { useMemo } from 'react';
import { useColorMode } from '@docusaurus/theme-common';

export const ModelExample = ({ model }: { model: string }) => {
  const { colorMode } = useColorMode();

  const src = useMemo(() => `https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/models/${model}/demo?file=index.js&title=@upscalerjs/${model}&theme=${colorMode}`, [
    model,
    colorMode,
  ]);

  return (
    <iframe sandbox="" height="400" width="100%" src={src}></iframe>
  )
}

export default ModelExample;
