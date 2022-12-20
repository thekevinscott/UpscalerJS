---
sidebar_position: 6
hide_table_of_contents: true
parent: performance
code_embed:
  type: 'stackblitz'
  url: '/examples/webworker'
---

# Web Worker Integration

This guide demonstrates how to integrate UpscalerJS into a Web Worker.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/webworker?file=index.js&title=UpscalerJS: Web Worker Integration">Open in Stackblitz</a>.

## Motivation

Another strategy for speeding up inference calls in the browser is to move the upscaling process to a Web Worker.


:::caution

While incorporating a Web Worker will help improve UI performance, larger images, slower models, or older hardware will still suffer from performance hits.
it won't mitigate UI jank entirely.

:::
