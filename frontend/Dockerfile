FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public/ public/
COPY src/ src/
COPY docker-entrypoint.sh /docker-entrypoint.sh
# Strip Windows CRLF so Linux can exec the entrypoint
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENV REACT_APP_BACKEND_URL=https://k-pong-backend.fly.dev
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"] 