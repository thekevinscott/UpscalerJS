# UpscalerJS

<a href="https://github.com/thekevinscott/UpscalerJS/blob/master/LICENSE"><img alt="NPM" src="https://img.shields.io/npm/l/upscaler" /></a>
<a href="https://www.npmjs.com/package/upscaler"><img alt="npm" src="https://img.shields.io/npm/dw/upscaler" /></a>
<a href="https://github.com/thekevinscott/UpscalerJS/actions/workflows/tests.yml"><img src="https://github.com/thekevinscott/UpscalerJS/actions/workflows/tests.yml/badge.svg" alt="Tests" /></a>
<a href="https://codecov.io/gh/thekevinscott/upscalerjs"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/thekevinscott/upscalerjs" /></a>
<a href="https://deepsource.io/gh/thekevinscott/UpscalerJS/?ref=repository-badge"><img alt="DeepSource" src="https://deepsource.io/gh/thekevinscott/UpscalerJS.svg/?label=active+issues&show_trend=true" /></a>


UpscalerJS is a tool for increasing image resolution in Javascript via a [Neural Network](https://github.com/thekevinscott/upscalerjs-models) up to 4x.

![Demo](assets/demo.gif)

[A live demo is here](https://upscaler.ai).

## Announcement


[A beta version of `1.0.0`](http://npmjs.com/package/upscaler) was released on 7/15/22. [Learn more here](https://twitter.com/upscalerjs/status/1547662175950344192) about what's included.

If you are migrating from `<=0.12`, and you are using a custom model, [you will need to modify how you load models](https://upscalerjs.com/#/?id=instantiation). If you are using the default model (e.g., not providing a `model` argument) then no changes are needed.

## Examples

You can [view runnable code examples](https://github.com/thekevinscott/UpscalerJS/tree/master/examples) on CodeSandbox.

To run an example locally, navigate to the relevant folder and run:

```
pnpm start
```

If you are developing UpscalerJS locally and wish to run an example during development, use the following command:

```
pnpm example {folder-name-of-example}
```

This will automatically start a watcher in the example folder, as well as set the local UpscalerJS package to build in the background.

## Quick Start

```javascript
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Documentation

[View the docs here.](https://thekevinscott.github.io/UpscalerJS/)

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)

