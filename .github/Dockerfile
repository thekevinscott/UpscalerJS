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
    unzip \
    vim \
    jq && \
    ##### Puppeteer
    # https://www.howtogeek.com/devops/how-to-run-puppeteer-and-headless-chrome-in-a-docker-container/
    fonts-liberation \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgbm-dev \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libicu-dev \
    libjpeg-dev \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpng-dev \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils\
    ##### Python
    add-apt-repository ppa:deadsnakes/ppa \
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
    && corepack prepare pnpm@latest --activate




##### Repo
RUN git clone https://github.com/thekevinscott/UpscalerJS /__w/UpscalerJS/UpscalerJS
WORKDIR /__w/UpscalerJS/UpscalerJS

RUN mkdir /dvc-cache-dir \
    && dvc cache dir /dvc-cache-dir \
    && dvc config cache.shared group \
    && dvc config cache.type hardlink,symlink

RUN pnpm install

ARG GDRIVE_CREDENTIALS_DATA
RUN dvc pull -v -r gdrive-service-account

##### Cleanup
RUN rm -rf /var/lib/apt/lists/*
