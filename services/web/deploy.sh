#!/bin/bash

# Set the registry, repository, and image details
REGISTRY="us-central1-docker.pkg.dev"
PROJECT="pizzamango-376923"
REPO="pizza-app"
IMAGE="pizza-app-image"
TAG="latest"

# Build the Docker image
echo "Building Docker image..."
docker build -t $REGISTRY/$PROJECT/$REPO/$IMAGE:$TAG . --platform linux/amd64

# Push the Docker image to the Artifact Registry
echo "Pushing Docker image to Artifact Registry..."
docker push $REGISTRY/$PROJECT/$REPO/$IMAGE:$TAG

echo "Deployment complete."
