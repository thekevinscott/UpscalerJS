# Web Worker Integration

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/performance/webworker">View this page on the UpscalerJS website</a>

This guide demonstrates how to integrate UpscalerJS into a Web Worker.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/webworker?file=index.js&title=UpscalerJS: Web Worker Integration">Open in Codesandbox</a>.

## Motivation

Another strategy for speeding up inference calls in the browser is to move the upscaling process to a Web Worker.

This guide won't cover how to build a web worker; [MDN has a great overview of that](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). This guide will instead focus on what's necessary to incorporate UpscalerJS into a web worker.

:::caution

While incorporating a Web Worker will help improve UI performance, it's not a panacea. Larger images, slower models, or older hardware can still suffer from UI jank.

:::

## Code

In a Web Worker, we don't have access to `HTMLImageElement`, which means that we need to rely on `tensor` inputs and outputs.

In the UI thread, we can load our image and get its data with:

```javascript
// UI thread
const pixels = tf.browser.fromPixels(image)
const data = await pixels.data()
```

When passing messages between a UI thread and a web worker, the data is serialized and then deserialized. Therefore, we need to transform our `tensor` (which is not serializable) into a format that can be serialized.

We pass `data` along with the tensor's `shape` to our worker:

```javascript
// UI thread
worker.postMessage([data, pixels.shape])
```

In our worker, we'll turn this into a tensor:

```javascript
// Worker thread
const tensor = tf.tensor(data, shape)
```

Now we can pass this tensor to our upscaler. We will also specify it's `output` as a `tensor`; otherwise, we'll get an error (since `HTMLImageElement` is not available):

```javascript
// Worker thread
const upscaledImg = await upscaler.upscale(tensor, {
  output: 'tensor',
})
```

To get our image back to the UI thread, we'll again need to transform it into a serializable format:

```javascript
// Worker thread
const upscaledShape = upscaledImg.shape
const upscaledData = await upscaledImg.data()
postMessage([upscaledData, upscaledShape])
```

Finally, we receive it in our UI thread and can work with it as normal:

```javascript
// UI thread
worker.onmessage = async (e) => {
  const [ data, shape ] = e.data
  const tensor = tf.tensor(data, shape)
}
```
