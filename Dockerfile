FROM envoyproxy/envoy

RUN apt update -y \
    && apt -y upgrade \
    && apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates \
    && curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt -y install nodejs

WORKDIR /usr/src/app
COPY . .
RUN npm install
EXPOSE 5000-5100

CMD ["npm", "run", "create-cluster"]


