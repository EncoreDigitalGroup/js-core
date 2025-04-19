#!/bin/bash
#
# Copyright (c) 2025. Encore Digital Group.
# All Rights Reserved.
#

git config --global user.name "EncoreBot"
git config --global user.email "ghbot@encoredigitalgroup.com"

cd "$GITHUB_WORKSPACE"

npm run build

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
  # Uncommitted changes
fi