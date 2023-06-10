FROM tensorflow/tensorflow:latest-devel-gpu
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=18.14.2
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN pnpm --version
RUN mkdir -p /node_modules
RUN pnpm config set global-dir /node_modules
WORKDIR /code
COPY . /code
RUN pnpm install
CMD /bin/bash
