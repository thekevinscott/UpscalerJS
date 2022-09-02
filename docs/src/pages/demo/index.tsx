import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import Demo from '@site/src/components/demo/demo';

export default function DemoPage() {
  return (
    <Layout title="Demo" description="A Demo of UpscalerJS">
      <BrowserOnly>
        {() => <Demo />}
      </BrowserOnly>
    </Layout>
  );
}
