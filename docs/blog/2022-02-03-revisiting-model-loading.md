---
title: Revisiting Model Loading
slug: revisiting-model-loading
authors: kscott
tags: [roadmap]
hide_table_of_contents: false
---

[I posted a discussion to Github about work towards refactoring the way we load models in UpscalerJS](https://github.com/thekevinscott/UpscalerJS/discussions/30). I'll repost it here for posterity.

<!--truncate-->

For the 1.0 release, I'd like to discuss, and potentially revisit, how models are configured in UpscalerJS.

---

There's three ways a user interacts with a model in UpscalerJS:

- No explicit model selection. (`new Upscaler()` - By default, UpscalerJS will use the `idealo/gans`, which afaik is not documented anywhere.)
- Explicit model selection (`new Upscaler({ model: 'div2k-2x', scale: 2 })`)
- Custom model (`new Upscaler({ model: '/path/to/custom/model', scale: 2 })`)

I'd wager the majority of people go with option 1. So it makes sense to choose a sensible default that offers a good tradeoff between performance and accuracy.

That said, there are many valid reasons to encourage people to explore option 2, and make it easy for them to do so. Today those include:

- **Wanting a different scale model**

In the near future, those include:

- **Wanting either a _more accurate_ model than the default, or a _faster_ model than the default**. This is a little theoretical today as we only offer two flavors of models, which is a separate discussion - [how to train and include more models easily](https://github.com/thekevinscott/UpscalerJS/discussions/32) - but UpscalerJS is set up to support different model architectures, so there's no reason we couldn't have a simpler model that runs faster, or a heavier more accurate implementation.
- **A domain-specific model**. There's compelling research indicating that domain-specific models can outperform more general ones (e.g., that a model trained specifically on faces, or one trained on illustrations, can out-perform the more general use case). Being able to experiment with a "face" model, or an "illustration" model, could be very nice. 
- **Different channeled models**. There's [been an ask for models](https://github.com/thekevinscott/UpscalerJS/issues/8) that operate in different _channels_ - aka, supporting transparency. I also think a grayscale version would be interesting to explore as it'd likely be a much faster model operating on a single channel.

Today, if a user wants to see what models are available, they can either call `getModelDefinitions` from within the package, or they're directed to this second repo - https://github.com/thekevinscott/UpscalerJS-models. The reason models live in a separate repo is because of size. Models must be served over the web (aka, not packaged) so we serve them via a CDN. Including these in the core npm library would bloat its download size significantly, which would be particularly frustrating given most users would only need a single model.

That said, that particular repo is missing the default model used (idealo/gans) and doesn't provide a good way of experimenting with models to see how they perform with real world data. It's also hard to keep the two repos up to date (because the core UpscalerJS library must maintain references to the upscalerjs-models repo).

--- 

A word on models and their configuration.

To me, a model encompasses the following:

- A particular architecture, or algorithm - for instance, [ESRGAN](https://arxiv.org/abs/1809.00219)
- A particular implementation of that architecture - for instance, [idealo's implementation of ESRGAN](https://github.com/idealo/image-super-resolution)
- The dataset used to train that model - for instance, [DIV2K](https://data.vision.ee.ethz.ch/cvl/DIV2K/)
- The scale the model is trained at - 2, 3, 4
- _Train-time_ related configuration that can affect inference configuration - for instance, number of supported channels, which would need to be chosen correctly in order to support specific images
- _Train-time_ related configuration that can affect performance - for instance, pruning strategy, along with more architecture-specific training settings such as G and G0 ([as illustrated here](https://github.com/idealo/image-super-resolution#training))
- _Compile-time_ related configuration, such as quantization amount, which could affect performance

The end result of all of this configuration is a single model file.

---

Let's talk questions:

- If you're _not_ using the default model today, how did you find, explore, and choose the model you're using?
- What's the right place to find and explore available models? In the README? In the documentation page? On a dedicated models page, or dedicated repo? All three?
- What's an ergonomic way of choosing a model? Should models have simple-to-understand names (aka, `face-2x-grayscale`), or should they be more verbose, reflecting their underlying configuration (e.g., `esrgan-idealo-div2k-2-1-channel`, or `esrgan/idealo/div2k/2/1-channel`)? If the former, where and how would a user learn more information about the particular model (how it was trained, how to reproduce the results)? If the latter, how do we form that string to effectively communicate the model's configuration?
- Similar to the above - is it better to specify a single path to a model, or is it better to pass an object denoting that model, something like `{ dataset: 'DIV2K', scale: 2, channels: 4 }`? If the latter, how do we handle cases where we don't have a model for a particular configuration?
- Is a _runtime_ method useful for returning information about the model? Or will users only be interacting with these things when developing their software (aka, we can communicate a model's configuration offline)?

My top-level thoughts:
- Making it easy to keep models up-to-date and in-sync is good. I wonder if we could bring the models back into this repo, and use something like `lerna` to publish two npm packages from this single repo.
- Redundancy of documentation is probably good (aka, showing information about the models in multiple places is fine, as people get their documentation from all kinds of places).
- Live interaction in real time is best; there should be a tool that allows for experimentation with different models in real time, that also generates instantiation code for you.

Curious to hear from others on your thoughts!

----

UPDATE (2/3/22)

Some updates since I wrote this post:

> Making it easy to keep models up-to-date and in-sync is good. I wonder if we could bring the models back into this repo, and use something like lerna to publish two npm packages from this single repo.

This is now done. Models live in the repo and are published as a separate package on NPM.

[I also set out a roadmap](https://github.com/thekevinscott/UpscalerJS/discussions/163) that includes Node support as a precursor, so that's another thing worth considering in this discussion. 
