FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 5001

CMD ["node", "src/server.js"] 