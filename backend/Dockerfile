FROM node:20-slim

# Install ffmpeg and build tools for canvas/fluent-ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Ensure directories exist
RUN mkdir -p uploads processed
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
