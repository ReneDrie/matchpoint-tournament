FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

FROM php:8.3-apache
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install curl pdo_mysql \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite headers
COPY --from=vendor /app/vendor /var/www/html/vendor
COPY . /var/www/html
COPY apache.conf /etc/apache2/sites-available/000-default.conf
