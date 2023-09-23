# Cancel Example

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/usage/cancel">View this page on the UpscalerJS website</a>

Demonstrates how to cancel an inflight `upscale` request.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/cancel?file=index.js&title=UpscalerJS: Cancel Example">Open in Codesandbox</a>.

## Cancelling requests

The mechanism for cancelling inflight requests [leverages the `AbortSignal` object](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

To cancel a request, create an instance of an `AbortController`, and then cancel it.

```javascript
import Upscaler from 'upscaler'
import imagePath from '/path/to/image.png'

const upscaler = new Upscaler()
const abortController = new AbortController()
upscaler.upscale(imagePath, {
  signal: abortController.signal,
}).catch(abortError => {
  console.log('UpscalerJS has been aborted', abortError)
})

// at some later point in time ...

abortController.abort()
```

When `abort` is triggered during an upscale request, an `AbortError` is thrown. (`AbortError` is exported from the core UpscalerJS package.)

## Cancelling all requests

UpscalerJS provides a convenience method for cancelling _all_ inflight requests at once:

```javascript
upscaler.abort()
```

Calling this will cancel all inflight requests (and each will emit an `AbortError`).

This method can be convenient, particularly if only one upscale request is ever active at a time.
