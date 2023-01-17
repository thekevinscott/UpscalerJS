# Node dev

It's easiest for GPU support to run in Docker.

Build the Dockerfile from the root with:

```
docker build -t upscaler-dev .
```

Then, run it with:

```
docker run -v $PWD:/code \
    --runtime=nvidia --init --rm upscaler-dev \
    pnpm install && pnpm dev:node
```
