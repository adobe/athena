# -----------
# BUILD STAGE
# -----------

FROM node:13.12.0-alpine as build_step

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

RUN npm ci --silent
RUN npm install react-scripts@3.4.1 -g --silent

COPY ./ ./

RUN npm run build

# -----------
# PROD STAGE
# -----------

FROM nginx:stable-alpine

COPY --from=build_step /app/build /usr/share/nginx/html
COPY /config/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]