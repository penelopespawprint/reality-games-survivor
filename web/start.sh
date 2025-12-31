#!/bin/sh
set -e

# Serve the pre-built Vite app (build happens in Railway build step)
npx serve dist -s -l $PORT
