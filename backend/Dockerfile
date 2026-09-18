FROM php:8.3-apache

# Corrige erro "More than one MPM loaded"
RUN a2dismod mpm_event mpm_worker 2>/dev/null || true && \
    a2enmod mpm_prefork

# Extensoes necessarias
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Habilita mod_rewrite
RUN a2enmod rewrite

# Permite .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copia API e db
COPY ./api /var/www/html
COPY ./db  /var/www/db

# Corrige path do schema/seed no init_db.php
RUN sed -i "s|__DIR__ . '/../db/|'/var/www/db/|g" /var/www/html/init_db.php

# Permissoes
RUN chown -R www-data:www-data /var/www/html /var/www/db && \
    chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]