import React, { useMemo } from 'react';
import StackBlitz from '../stackBlitz/stackBlitz';

export const ModelExample = ({ model }: { model: string }) => {
  const params = useMemo(() => {
    const params = new URLSearchParams();
    params.set('file', 'index.js');
    params.set('title', `@upscalerjs/${model}`);
    return params;
  }, []);

  return (
    <StackBlitz url={`models/${model}/demo`} params={params} />
  );
}

export default ModelExample;
