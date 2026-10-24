FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY public ./public

RUN npm run build


FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 运行时只需要：构建产物 + 服务端源码 + 共享转换核心
COPY --from=build /app/dist ./dist
COPY shared ./shared
COPY server ./server
COPY tsconfig.json ./

EXPOSE 8787

CMD ["npx", "tsx", "server/index.ts"]
