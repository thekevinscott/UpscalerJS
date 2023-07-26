# Electron

Demonstrates how to integrate UpscalerJS into an Electron app.

## Getting Started

This guide requires running the example locally.

Clone the UpscalerJS repo:

```bash
git clone https://github.com/thekevinscott/UpscalerJS.git
```

And navigate to the electron example folder and install the dependencies:

```bash
cd UpscalerJS/examples/electron
npm install
```

Then, start the electron app with:

```bash
npm run start
```

## Code

In our Electron app, we are using the [_browser_](/documentation/getting-started#browser-setup) version of UpscalerJS.

We've set up the app to first bundle the code (`npm run prebuild`), which allows us to import UpscalerJS and its dependencies into a browser-compatible file.

The browser version of UpscalerJS by default loads the neural networks from a CDN over http. In an Electron app, we're not guaranteed to have access to the internet, and by default the security settings disallow loading files remotely. Therefore, we have to host our models locally.

We can do that by specifying an explicit _path_ to UpscalerJS:

```javascript
import Upscaler from 'upscaler';
import defaultModel from '@upscalerjs/default-model';

const upscaler = new Upscaler({
  model: {
    ...defaultModel,
    path: './node_modules/@upscalerjs/default-model/models/model.json',
  },
});
```

Here, we load the configuration for `default-model`, but we update the `path` to point to our local `node_modules` folder. (You could change this to point to wherever you wish to host your models.)

You will also want to ensure you have the following `Content-Security-Policy`:

```html
<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:; default-src 'self'; script-src 'self'">
```

In particular, `img-src 'self' data:` ensures that base64-encoded images will be available to load in the app. (Otherwise, you'll get broken images.)
