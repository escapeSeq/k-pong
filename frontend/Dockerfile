FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy public and src directories
COPY public/ public/
COPY src/ src/

# Copy other necessary files
COPY .env ./

EXPOSE 3000
CMD ["npm", "start"] 