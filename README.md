# UpscalerJS

<a target="_blank" href="https://travis-ci.org/github/thekevinscott/UpscalerJS"><img alt="Travis (.org)" src="https://img.shields.io/travis/thekevinscott/upscalerjs"></a>
<a target="_blank" href="https://codecov.io/gh/thekevinscott/upscalerjs"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/thekevinscott/upscalerjs"></a>
<a target="_blank" href="https://www.npmjs.com/package/upscaler"><img alt="npm" src="https://img.shields.io/npm/dw/upscalerjs"></a>
<a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/issues"><img alt="Github issues" src="https://img.shields.io/github/issues/thekevinscott/upscalerjs"></a>

UpscalerJS is a tool for increasing image resolution in Javascript via a Neural Network up to 4x.

There will be a blog post diving into the technical bits.

## Demo

A live demo of the code can be seen at [https://upscaler.ai](https://upscaler.ai), or you can [view runnable code examples](https://github.com/thekevinscott/UpscalerJS/tree/master/examples) on CodeSandbox.

## Quick Start

```
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Documentation

[View the docs here.](https://thekevinscott.github.io/UpscalerJS/)

### License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)

