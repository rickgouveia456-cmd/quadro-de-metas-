FROM php:8.1-fpm-alpine

ARG CACHEBUST=10

# Extensao MySQL + nginx
RUN apk add --no-cache nginx \
    && docker-php-ext-install pdo_mysql mysqli

# Config nginx
RUN echo 'server { \
    listen 80; \
    root /var/www/html; \
    index index.php; \
    location / { \
        try_files $uri $uri/ /index.php?$query_string; \
    } \
    location ~ \.php$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
    } \
}' > /etc/nginx/http.d/default.conf

# Copia API
COPY ./api /var/www/html
RUN rm -f /var/www/html/index.html

# Copia SQL
COPY ./db/schema.sql /var/www/html/schema.sql
COPY ./db/seed.sql   /var/www/html/seed.sql

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Script de start: inicia php-fpm E nginx juntos
RUN echo '#!/bin/sh' > /start.sh \
    && echo 'php-fpm -D' >> /start.sh \
    && echo 'nginx -g "daemon off;"' >> /start.sh \
    && chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
