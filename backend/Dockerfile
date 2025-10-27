FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код И шрифты
COPY . .

# Собираем TypeScript
RUN npm run build

# Создаем папку для шрифтов в dist и копируем их
RUN mkdir -p dist/fonts && cp -r fonts/* dist/fonts/

# Проверяем что шрифты скопировались
RUN ls -la dist/fonts/

EXPOSE 3000

CMD ["npm", "start"]