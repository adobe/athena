FROM node:13.7-alpine

RUN apk update \
    && apk upgrade \
    && apk add curl g++ python3-dev libffi-dev openssl-dev git && \
    apk add --update python && \
    apk add --update redis && \
    pip3 install --upgrade pip setuptools

WORKDIR /etc/athena
COPY package.json .
RUN npm install && npm install -g pm2
EXPOSE 5000

COPY . .

CMD [ "node", "athena.js", "run"]