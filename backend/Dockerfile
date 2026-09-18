FROM php:8.1-apache

ARG CACHEBUST=3

# Extensao MySQL
RUN docker-php-ext-install pdo_mysql mysqli

# Corrige MPM: remove mpm_event e mpm_worker, deixa so mpm_prefork
# Faz isso manipulando os symlinks diretamente (mais confiavel que a2dismod)
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load \
          /etc/apache2/mods-enabled/mpm_event.conf \
          /etc/apache2/mods-enabled/mpm_worker.load \
          /etc/apache2/mods-enabled/mpm_worker.conf \
    && ln -sf /etc/apache2/mods-available/mpm_prefork.load \
              /etc/apache2/mods-enabled/mpm_prefork.load \
    && ln -sf /etc/apache2/mods-available/mpm_prefork.conf \
              /etc/apache2/mods-enabled/mpm_prefork.conf

# Rewrite + AllowOverride
RUN ln -sf /etc/apache2/mods-available/rewrite.load \
           /etc/apache2/mods-enabled/rewrite.load \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copia API
COPY ./api /var/www/html
RUN rm -f /var/www/html/index.html

# Copia SQL
COPY ./db/schema.sql /var/www/html/schema.sql
COPY ./db/seed.sql   /var/www/html/seed.sql

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
