# Gebruik een officiële Node.js runtime als basis image
FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
# RUN npm install --omit=dev # Alleen als je dependencies hebt
COPY . .
EXPOSE 9090
CMD [ "node", "server.cjs" ]
