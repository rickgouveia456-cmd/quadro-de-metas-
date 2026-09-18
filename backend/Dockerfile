FROM php:8.1-apache

# Cache bust - forca rebuild sem cache
ARG CACHEBUST=2

# Extensao MySQL
RUN docker-php-ext-install pdo_mysql mysqli

# Habilita rewrite, corrige MPM, permite .htaccess
RUN a2enmod rewrite \
    && a2dismod mpm_event 2>/dev/null || true \
    && a2enmod mpm_prefork 2>/dev/null || true \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copia API
COPY ./api /var/www/html

# Remove index.html padrao
RUN rm -f /var/www/html/index.html

# Copia SQL para dentro da imagem junto com a API
COPY ./db/schema.sql /var/www/html/schema.sql
COPY ./db/seed.sql   /var/www/html/seed.sql

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
