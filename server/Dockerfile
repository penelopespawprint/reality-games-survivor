FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for TypeScript)
# Railway might skip dev deps, so we explicitly include them
RUN npm ci --include=dev || npm install --include=dev

# Verify TypeScript is installed
RUN npm list typescript || npm install typescript --save-dev

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Verify build succeeded
RUN ls -la dist/ && test -f dist/server.js || (echo "ERROR: dist/server.js not found after build" && exit 1)

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3001}

# Start server
CMD ["node", "dist/server.js"]
