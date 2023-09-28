#!/bin/bash
export DOCKER_BUILDKIT=1
    # --progress=plain \
docker build \
    -t upscalerjs/actions-image:latest \
    --secret id=GDRIVE_CREDENTIALS_DATA,src=$(pwd)/env/github-actions-dvc.json \
    --build-arg CACHEBUST=$(date +%s) \
    .
