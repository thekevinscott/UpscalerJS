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
    dvc[gdrive] \
    dvc[s3] \
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
RUN pnpm install
ARG GDRIVE_CREDENTIALS_DATA
RUN dvc pull -v -r gdrive-service-account

# ##### Cleanup
RUN rm -rf /var/lib/apt/lists/*
