FROM node:25-alpine
WORKDIR /workspace

RUN apk add --no-cache git doas zsh

RUN npm config set -g ignore-scripts true && npm config set -g engine-strict true
RUN npm install -g pnpm@latest-10

RUN git config --global init.defaultBranch main

# Run terminal under `vscode` user which has `doas`, run containers under `node`
RUN echo 'permit nopass :wheel' > /etc/doas.conf
RUN adduser -D vscode && addgroup vscode wheel
RUN passwd -l root

USER node
