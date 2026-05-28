FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public/ public/
COPY src/ src/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV REACT_APP_BACKEND_URL=https://k-pong-backend.fly.dev
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"] 