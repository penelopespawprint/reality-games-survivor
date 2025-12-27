FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for TypeScript)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Verify build
RUN test -f dist/server.js || (echo "ERROR: dist/server.js not found" && exit 1)

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/server.js"]
