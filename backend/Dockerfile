FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Instala Apache + PHP
RUN apt-get update && apt-get install -y \
    apache2 \
    php8.1 \
    php8.1-mysql \
    libapache2-mod-php8.1 \
    && rm -rf /var/lib/apt/lists/*

# Habilita mod_rewrite
RUN a2enmod rewrite

# Remove pagina padrao do Ubuntu que bloqueia nosso index.php
RUN rm -f /var/www/html/index.html

# Configura Apache para permitir .htaccess e PHP em /var/www/html
RUN echo '<Directory /var/www/html>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/quadro.conf \
    && a2enconf quadro

# Copia API e banco
COPY ./api /var/www/html
COPY ./db  /var/www/db

# Permissoes
RUN chown -R www-data:www-data /var/www/html /var/www/db \
    && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apachectl", "-D", "FOREGROUND"]
