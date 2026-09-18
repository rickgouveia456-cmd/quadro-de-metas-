FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apache2 \
    php8.1 \
    php8.1-mysql \
    libapache2-mod-php8.1 \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Configura AllowOverride para .htaccess funcionar
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' \
    /etc/apache2/apache2.conf

# Copia nossos arquivos para /var/www/html
COPY ./api /var/www/html
COPY ./db  /var/www/db

# Remove o index.html padrao DEPOIS do COPY (garante que nao volta)
RUN rm -f /var/www/html/index.html

RUN chown -R www-data:www-data /var/www/html /var/www/db \
    && chmod -R 755 /var/www/html

EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]
