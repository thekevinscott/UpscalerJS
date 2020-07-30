# UpscalerJS

![Travis (.org)](https://img.shields.io/travis/thekevinscott/upscalerjs)
![Codecov](https://img.shields.io/codecov/c/github/thekevinscott/upscalerjs)
![npm](https://img.shields.io/npm/dw/upscalerjs)
![GitHub issues](https://img.shields.io/github/issues/thekevinscott/upscalerjs)

UpscalerJS is a tool for increasing image resolution in Javascript via a Neural Network up to 4x.

There will be a blog post diving into the technical bits.

## Demo

View a live demo somewhere.

## Quick Start

```
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Install

Install the package with `yarn`:

```
yarn add upscaler
```

Or `npm`:

```
npm install upscaler
```

## Documentation

[View the docs here.](https://thekevinscott.github.io/UpscalerJS/)

### License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)

