FROM node:15

WORKDIR /app
COPY *.json ./
RUN npm install
COPY   *.ts ./
RUN npm run build
ENV MEDIA_ROOT=/media
CMD ["node", "index.js"]
