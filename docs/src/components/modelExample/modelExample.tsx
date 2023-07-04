import React, { useMemo } from 'react';
import CodeEmbed from '../codeEmbed/codeEmbed';

export const ModelExample = ({ model }: { model: string }) => {
  const params = useMemo(() => {
    const params = new URLSearchParams();
    params.set('file', 'index.js');
    params.set('title', `@upscalerjs/${model}`);
    params.set('ctl', '1');
    return params;
  }, []);

  return (
    <CodeEmbed url={`models/${model}/demo`} params={params} />
  );
}

export default ModelExample;
