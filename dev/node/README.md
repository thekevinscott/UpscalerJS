# Node dev

From the root, run:

```bash
pnpm dev:node <name_of_script>
```

Where the name of the script matches the script in `src/commands`.

Each script defines its own arguments; see the script file for details.

## GPU support

It's easiest for GPU support to run in Docker.

Build the Dockerfile from the root with:

```
docker build -t upscaler-dev .
```

Then, run it with:

```
docker run -v $PWD:/code \
    --runtime=nvidia --init --rm upscaler-dev \
    pnpm install && pnpm dev:node <script_name>
```
