FROM webdevops/php-nginx:8.1-alpine

ARG CACHEBUST=70

ENV WEB_DOCUMENT_ROOT=/app
ENV php.display_errors=0

RUN mkdir -p /app/core /app/routes

COPY api/index.php        /app/index.php
COPY api/init_db.php      /app/init_db.php
COPY api/.htaccess        /app/.htaccess
COPY api/core/db.php      /app/core/db.php
COPY api/core/helpers.php /app/core/helpers.php
COPY api/routes/auth.php        /app/routes/auth.php
COPY api/routes/obras.php       /app/routes/obras.php
COPY api/routes/metas.php       /app/routes/metas.php
COPY api/routes/historico.php   /app/routes/historico.php
COPY api/routes/restricoes.php  /app/routes/restricoes.php
COPY api/routes/feriados.php    /app/routes/feriados.php

RUN chown -R application:application /app

EXPOSE 80
