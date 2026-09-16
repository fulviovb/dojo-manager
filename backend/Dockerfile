FROM node:20-slim

# LibreOffice headless: usado só pra converter os anexos preenchidos
# (Incentivo ao Esporte, docx → pdf) via `soffice --headless`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
