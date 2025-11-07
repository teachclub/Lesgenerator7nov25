# Gebruik een officiële Node.js runtime als basis image
FROM node:18-slim
WORKDIR /usr/src/app
# Kopieer package.json en installeer dependencies
COPY package*.json ./
RUN npm install --omit=dev 
COPY . .
EXPOSE 9090
CMD [ "node", "server.cjs" ]
