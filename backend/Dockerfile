FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Instala Apache + PHP sem imagem base php:apache (evita MPM conflict)
RUN apt-get update && apt-get install -y \
    apache2 \
    php8.1 \
    php8.1-mysql \
    libapache2-mod-php8.1 \
    && a2enmod rewrite \
    && sed -i "s/AllowOverride None/AllowOverride All/g" /etc/apache2/apache2.conf \
    && rm -rf /var/lib/apt/lists/*

# Copia API e banco
COPY ./api /var/www/html
COPY ./db  /var/www/db

# Permissoes
RUN chown -R www-data:www-data /var/www/html /var/www/db \
    && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apachectl", "-D", "FOREGROUND"]
