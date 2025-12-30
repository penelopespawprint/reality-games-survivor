#!/bin/sh
set -e

# Web deployment helper for Railway when the service root isn't set
cd web
npm install
npm run build
npm run start
