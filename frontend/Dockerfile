FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5173

# Use vite preview to serve built files
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]