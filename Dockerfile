FROM node:16

# Create api directory
WORKDIR /usr/src/api

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate