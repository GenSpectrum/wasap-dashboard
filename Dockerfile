FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# Application without config, use bind mount to configure
FROM nginx:alpine AS app
COPY --from=build /app/dist /usr/share/nginx/html
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
EOF

# production config already built in
FROM app AS prod
COPY public/config.prod.example.json /usr/share/nginx/html/config.json
