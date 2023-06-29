############################################################
#
# Dockerfile for CI.
#
# Steps to build and push:
#
# ```
# docker build -t upscalerjs \
#     --build-arg GDRIVE_CREDENTIALS_DATA="$(cat path_to_json_creds)" .
# docker tag upscalerjs upscalerjs/upscalerjs:latest
# docker push upscalerjs/upscalerjs:latest
# ```
#
############################################################
FROM ubuntu:20.04

WORKDIR /__w/UpscalerJS

ENV TZ="America/New_York"
ENV NODE_VERSION=16.20.1
ENV NVM_DIR=/root/.nvm
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
ENV DVC_VERSION="2.45.1"

##### System
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y \
    software-properties-common \
    git \
    curl \
    wget \
    # unzip \
    vim \
    jq \
    ##### Python
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y \
    python3.11 \
    python3-pip \
    python3-venv \
    && pip3 install --upgrade pip \
    ##### DVC
    && python3 -m pip install \
        dvc[gdrive]==${DVC_VERSION} \
        dvc[s3]==${DVC_VERSION} \
    ##### Node
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} \
    && . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION} \
    && . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION} \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    ##### Puppeteer
    # https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
    && apt-get install -y \
        gnupg \
        && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        google-chrome-stable \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf \
        libxss1 \
    && groupadd -r pptruser \
    && useradd -r -g pptruser -G audio,video pptruser  \
    ##### Clean up system
    && apt-get purge -y \
        curl \
        wget \
    # && apt-get purge -y ca-certificates \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

##### Repo
RUN git clone https://github.com/thekevinscott/UpscalerJS /__w/UpscalerJS/UpscalerJS
WORKDIR /__w/UpscalerJS/UpscalerJS


RUN mkdir /dvc-cache-dir \
    && dvc cache dir /dvc-cache-dir \
    && dvc config cache.shared group \
    && dvc config cache.type hardlink,symlink

# ##### Puppeteer
# RUN mkdir -p /home/pptruser/Downloads \
#     mkdir -p ./node_modules \
#     && chown -R pptruser:pptruser /home/pptruser \
#     && chown -R pptruser:pptruser node_modules \
#     && chown -R pptruser:pptruser package.json \
#     && chown -R pptruser:pptruser pnpm-lock.yaml
# # Run everything after as non-privileged user.
# USER pptruser


RUN pnpm install

ARG GDRIVE_CREDENTIALS_DATA
RUN dvc pull -v -r gdrive-service-account
