# UpscalerJS

<a href="https://github.com/thekevinscott/UpscalerJS/blob/master/LICENSE"><img alt="NPM" src="https://img.shields.io/npm/l/upscaler" /></a>
<a href="https://www.npmjs.com/package/upscaler"><img alt="npm" src="https://img.shields.io/npm/dw/upscaler" /></a>
<a href="https://travis-ci.org/github/thekevinscott/UpscalerJS"><img alt="Travis" src="https://img.shields.io/travis/thekevinscott/upscalerjs" /></a>
<a href="https://codecov.io/gh/thekevinscott/upscalerjs"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/thekevinscott/upscalerjs" /></a>
<a href="https://github.com/thekevinscott/UpscalerJS/issues"><img alt="Github issues" src="https://img.shields.io/github/issues/thekevinscott/upscalerjs" /></a>

UpscalerJS is a tool for increasing image resolution in Javascript via Tensorflow.js.

<table>
<thead><tr><th>Original</th><th>Upscaled</th></tr></thead>
<tbody><tr><td><img src="https://github.com/thekevinscott/UpscalerJS/blob/main/assets/baboon-bicubic.png?raw=true" /></td><td><img src="https://github.com/thekevinscott/UpscalerJS/blob/main/assets/baboon-upscaled.png?raw=true" /></td></tr></tbody>
</table>

[A live demo is here](https://upscalerjs.com/demo).

## Quick Start

```javascript
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Documentation

[View the docs here.](https://upscalerjs.com)

## Support the Project

Add a ⭐️ [star on GitHub](https://github.com/thekevinscott/UpscalerJS) or ❤️ [tweet](https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fthekevinscott%2Fupscaler&via=thekevinscott&hashtags=javascript,image-enhancement,tensorflow.js,super-resolution) to support the project!

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
