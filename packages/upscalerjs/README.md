# UpscalerJS

<a href="https://www.npmjs.com/package/upscaler"><img alt="Latest UpscalerJS NPM Version" src="https://badge.fury.io/js/upscaler.svg" /></a>
<a href="https://github.com/thekevinscott/UpscalerJS/blob/master/LICENSE"><img alt="License for UpscalerJS" src="https://img.shields.io/npm/l/upscaler" /></a>
<a href="https://www.npmjs.com/package/upscaler"><img alt="Downloads per week on NPM for UpscalerJS" src="https://img.shields.io/npm/dw/upscaler" /></a>
<a href="https://github.com/thekevinscott/UpscalerJS/actions/workflows/tests.yml"><img src="https://github.com/thekevinscott/UpscalerJS/actions/workflows/tests.yml/badge.svg" alt="Status of tests for UpscalerJS repository" /></a>
<a href="https://codecov.io/gh/thekevinscott/upscalerjs"><img alt="Code Coverage for UpscalerJS" src="https://img.shields.io/codecov/c/github/thekevinscott/upscalerjs" /></a>
<a href="https://deepsource.io/gh/thekevinscott/UpscalerJS/?ref=repository-badge"><img alt="DeepSource issues for UpscalerJS" src="https://deepsource.io/gh/thekevinscott/UpscalerJS.svg/?label=active+issues&show_trend=true" /></a>

Enhance Images with Javascript and AI. Increase resolution, retouch, denoise, and more. Open Source, Browser & Node Compatible, MIT License.

- 🎁 **Pretrained Models:** Enhance images using UpscalerJS's diverse pretrained models, designed to suit various image styles and requirements including increasing image resolution, denoising, deblurring, and more.
- 🔌 **Seamless Platform Integration:** Integrate UpscalerJS across Browser, Node (CPU and GPU), and Workers environments.
- 📘 **Comprehensive Documentation:** Leverage UpscalerJS confidently with extensive documentation, thorough examples, and TypeScript support.
- 🚀 **UI-Focused Enhancement:** Performant UI support with built-in patch-based processing that supports performance without sacrificing quality.
- 📱 **Device Compatibility:** Consistent image enhancement across a variety of devices, including desktops, tablets, and phones.
- 🧩 **Custom Model Integration:** Extend UpscalerJS by integrating your own pretrained models for personalized image enhancements.

![Demo](docs/assets/assets/demo.png)

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


## Guides

You can [view runnable code examples](https://upscalerjs.com/documentation/guides/). You can also find the [guides here on Github](https://github.com/thekevinscott/UpscalerJS/tree/main/examples).


## Support the Project

Add a ⭐️ [star on GitHub](https://github.com/thekevinscott/UpscalerJS) or ❤️ [tweet](https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fthekevinscott%2Fupscaler&via=thekevinscott&hashtags=javascript,image-enhancement,tensorflow.js,super-resolution) to support the project!

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
