import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { Homepage } from '@site/src/components/homepage/homepage';

export default function Home() {
  const { siteConfig: {
    title,
    description,
  } } = useDocusaurusContext();
  return (
    <Layout title={title} description={description}>
      <Homepage />
    </Layout>
  );
}
