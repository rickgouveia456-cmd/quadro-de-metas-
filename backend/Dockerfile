FROM php:8.1-fpm-alpine

ARG CACHEBUST=60

# Passo 1: dependencias do sistema
RUN apk add --no-cache nginx

# Passo 2: dependencias de compilacao para extensoes PHP
RUN apk add --no-cache --virtual .build-deps \
    build-base autoconf linux-headers

# Passo 3: extensoes PHP
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Passo 4: remove dependencias de build (reduz tamanho)
RUN apk del .build-deps

# Passo 5: config Nginx
RUN mkdir -p /etc/nginx/http.d && printf '\
server {\n\
    listen 80;\n\
    root /var/www/html;\n\
    index index.php;\n\
    location / { try_files $uri /index.php?$query_string; }\n\
    location ~ \\.php$ {\n\
        fastcgi_pass 127.0.0.1:9000;\n\
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;\n\
        fastcgi_param REQUEST_URI $request_uri;\n\
        fastcgi_param QUERY_STRING $query_string;\n\
        include fastcgi_params;\n\
    }\n\
}\n' > /etc/nginx/http.d/default.conf

# Passo 6: copia arquivos PHP
RUN mkdir -p /var/www/html/core /var/www/html/routes

COPY api/index.php          /var/www/html/index.php
COPY api/init_db.php        /var/www/html/init_db.php
COPY api/.htaccess          /var/www/html/.htaccess
COPY api/core/db.php        /var/www/html/core/db.php
COPY api/core/helpers.php   /var/www/html/core/helpers.php
COPY api/routes/auth.php        /var/www/html/routes/auth.php
COPY api/routes/obras.php       /var/www/html/routes/obras.php
COPY api/routes/metas.php       /var/www/html/routes/metas.php
COPY api/routes/historico.php   /var/www/html/routes/historico.php
COPY api/routes/restricoes.php  /var/www/html/routes/restricoes.php
COPY api/routes/feriados.php    /var/www/html/routes/feriados.php

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Script de inicializacao
RUN printf '#!/bin/sh\nphp-fpm -D\nnginx -g "daemon off;"\n' > /start.sh \
    && chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
