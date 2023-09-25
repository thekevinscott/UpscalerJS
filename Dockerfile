FROM myoung34/github-runner:latest
ARG RUNNER_VERSION="2.309.0"
ENV NODE_VERSION=16
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG DEBIAN_FRONTEND=noninteractive

######## 
# system prep
######## 
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
  && cd /_work

  RUN git clone https://github.com/thekevinscott/upscalerjs
  # RUN ls
  # RUN cd upscalerjs
  # RUN ls
  # RUN pnpm install
  # RUN node node_modules/puppeteer/install.js
  # RUN pip install dvc[s3]=='2.45.1' dvc[gdrive]=='2.45.1'
  # RUN dvc --version
  # RUN dvc doctor
  # RUN mkdir /dvc-cache-dir
  # RUN dvc cache dir /dvc-cache-dir
  # RUN dvc config cache.shared group
  # RUN dvc config cache.type hardlink,symlink
  # RUN dvc pull -vv -r gdrive-service-account
  # # GDRIVE_CREDENTIALS_DATA : ${{ inputs.gdrive_credentials_data }}          
