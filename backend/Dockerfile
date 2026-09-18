FROM php:8.3-apache

# Extensões necessárias
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Habilita mod_rewrite
RUN a2enmod rewrite

# Permite .htaccess em todo o DocumentRoot
RUN sed -i 's|<Directory /var/www/>|<Directory /var/www/html/>|g' \
        /etc/apache2/apache2.conf && \
    sed -i 's/AllowOverride None/AllowOverride All/g' \
        /etc/apache2/apache2.conf

# Copia API
COPY ./api /var/www/html

# db/ fica acessível para o init_db.php
COPY ./db  /var/www/db

# Atualiza path do schema/seed no init_db.php para o caminho correto no container
RUN sed -i "s|__DIR__ . '/../db/|'/var/www/db/|g" /var/www/html/init_db.php

# Permissões
RUN chown -R www-data:www-data /var/www/html /var/www/db \
    && chmod -R 755 /var/www/html

# Porta Railway (pode ser 80 ou PORT env)
EXPOSE 80

CMD ["apache2-foreground"]
