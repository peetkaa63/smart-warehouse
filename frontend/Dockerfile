FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine

# Копируем собранное приложение
COPY --from=build /app/build /usr/share/nginx/html

# Копируем nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]