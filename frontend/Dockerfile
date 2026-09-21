FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_KEYCLOAK_ISSUER
ARG VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
