FROM php:8.3-apache

# Extensões necessárias
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Habilita mod_rewrite para as rotas
RUN a2enmod rewrite

# Configuração do Apache — permite .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' \
    /etc/apache2/apache2.conf

# Copia o código da API
COPY ./api /var/www/html

# Permissões
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80
