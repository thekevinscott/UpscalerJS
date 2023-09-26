FROM myoung34/github-runner:latest
ARG RUNNER_VERSION="2.309.0"
ARG RUNNER_NAME="UpscalerJS"
ENV NODE_VERSION="16"
ARG REPO="UpscalerJS"
ENV REPO_URL="https://github.com/thekevinscott/$REPO"
ENV RUNNER_WORKDIR="/_work"
ENV EPHEMERAL=true
ARG DEBIAN_FRONTEND=noninteractive

######## 
# system prep
######## 
RUN echo '1'
RUN apt update -y \
	&& apt upgrade -y \
  && apt install -y --no-install-recommends \
    software-properties-common \
    ca-certificates \
    gnupg \
    curl \
    jq \
    build-essential \
    libssl-dev \
    libffi-dev \
    vim \
    git \
    openssl \
    less \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
  ######## 
  # install node
  ######## 
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && apt-get update \
  && apt-get install nodejs -y \
  && corepack enable \
  ######## 
  # prepare start script
  ######## 
  && mkdir -p /_work/$RUNNER_NAME/$REPO \
  && cd /_work/$RUNNER_NAME/$REPO

RUN pip install \
    dvc[s3]=='2.45.1' \
    dvc[gdrive]=='2.45.1' \
    dvc-gdrive \
    dvc-s3

RUN git clone $REPO_URL /_work/$RUNNER_NAME/$REPO
WORKDIR /_work/$RUNNER_NAME/$REPO
######## 
# DVC 
######## 
COPY env/github-actions-dvc.json /_work/github-actions-dvc.json
RUN dvc remote modify \
    gdrive-service-account --local \
    gdrive_service_account_json_file_path /_work/github-actions-dvc.json \
    && dvc pull -vv -r gdrive-service-account \
    && rm /_work/github-actions-dvc.json
######## 
# Refresh
######## 
RUN git fetch
######## 
# Install dependencies
######## 
RUN pnpm install \
  && node node_modules/puppeteer/install.js

WORKDIR /actions-runner
