FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
