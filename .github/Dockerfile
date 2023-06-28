FROM ubuntu:20.04

WORKDIR /home/runner/work/UpscalerJS

ENV TZ="America/New_York"
ENV NODE_VERSION=16.20.1
ENV NVM_DIR=/root/.nvm
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
ARG GDRIVE_CREDENTIALS_DATA

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
RUN git clone https://github.com/thekevinscott/UpscalerJS /home/runner/work/UpscalerJS/UpscalerJS
WORKDIR /home/runner/work/UpscalerJS/UpscalerJS
RUN pnpm install \
    && dvc pull -v -r gdrive-service-account

# ##### Cleanup
RUN rm -rf /var/lib/apt/lists/*
