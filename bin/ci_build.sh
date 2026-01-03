#!/bin/bash
#
# Copyright (c) 2025. Encore Digital Group.
# All Rights Reserved.
#

git config --global user.name "EncoreBot"
git config --global user.email "ghbot@encoredigitalgroup.com"

cd "$GITHUB_WORKSPACE"

# Run build and capture exit code
npm run build
BUILD_EXIT_CODE=$?

# If build failed, exit with the same code
if [ $BUILD_EXIT_CODE -ne 0 ]; then
  echo "Build failed with exit code $BUILD_EXIT_CODE"
  exit $BUILD_EXIT_CODE
fi

# Run format and capture exit code
npm run format
FORMAT_EXIT_CODE=$?

# If format failed, exit with the same code
if [ $FORMAT_EXIT_CODE -ne 0 ]; then
  echo "Format failed with exit code $FORMAT_EXIT_CODE"
  exit $FORMAT_EXIT_CODE
fi

# Build and format succeeded, check for changes
if [ -z "$(git status --porcelain)" ]; then
  # Working directory clean
  echo "Working Tree is Clean! Nothing to commit."
else
  # Add all changes to staging
  git add .

  # Commit changes
  commit_message="Build Assets Using Vite"
  git commit -m "$commit_message"

  # Push changes to origin
  git push origin --force
fi