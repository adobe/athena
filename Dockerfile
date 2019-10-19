FROM node:12.11-buster
WORKDIR /usr/src/app
COPY . .
RUN npm install
EXPOSE 5000-5100
CMD ["npm", "run", "create-cluster"]