FROM node:21 as build

WORKDIR /app

COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.21
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html