FROM php:8.1-apache

# Instala extensao mysql
RUN docker-php-ext-install pdo_mysql mysqli

# Habilita rewrite e desativa mods conflitantes de MPM
RUN a2enmod rewrite \
    && a2dismod mpm_event || true \
    && a2enmod mpm_prefork \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Remove index.html padrao do Debian/Apache
RUN rm -f /var/www/html/index.html

# Copia arquivos da API
COPY ./api /var/www/html
COPY ./db  /var/www/db

RUN chown -R www-data:www-data /var/www/html /var/www/db \
    && chmod -R 755 /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
