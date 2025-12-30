#!/bin/sh
set -e

# Build and serve the Vite app
npm install
npm run build
npm run start
#!/bin/bash
npx serve dist -s -l $PORT
