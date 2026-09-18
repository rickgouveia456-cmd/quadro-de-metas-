FROM php:8.1-fpm-alpine

# Cache bust com timestamp - forca rebuild completo
ARG CACHEBUST=20260918130000

# PRIMEIRO copia os arquivos (invalida o cache do contexto)
COPY ./api /var/www/html

# Depois instala dependencias
RUN apk add --no-cache nginx build-base autoconf linux-headers

RUN docker-php-ext-install pdo pdo_mysql mysqli

# Config Nginx
RUN mkdir -p /etc/nginx/http.d && printf '\
server {\n\
    listen 80;\n\
    root /var/www/html;\n\
    index index.php;\n\
    location / {\n\
        try_files $uri /index.php?$query_string;\n\
    }\n\
    location ~ \\.php$ {\n\
        fastcgi_pass 127.0.0.1:9000;\n\
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;\n\
        fastcgi_param REQUEST_URI $request_uri;\n\
        fastcgi_param QUERY_STRING $query_string;\n\
        include fastcgi_params;\n\
    }\n\
}\n' > /etc/nginx/http.d/default.conf

RUN rm -f /var/www/html/index.html \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

RUN printf '#!/bin/sh\nphp-fpm -D\nnginx -g "daemon off;"\n' > /start.sh \
    && chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
