import React from 'react';
import Layout from '@theme/Layout';
import Demo from './demo/demo';

export default function DemoPage() {
  return (
    <Layout title="Demo" description="A Demo of UpscalerJS">
      <input type="file" />
      <Demo />
    </Layout>
  );
}
