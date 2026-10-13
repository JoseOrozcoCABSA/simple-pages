#!/bin/sh
set -eu

: "${SIMPLE_PAGES_USER:?Falta SIMPLE_PAGES_USER}"
: "${SIMPLE_PAGES_PASSWORD_HASH:?Falta SIMPLE_PAGES_PASSWORD_HASH}"

# Nginx lee este archivo con un hash compatible con crypt/SHA-512.
umask 077
printf '%s:%s\n' "$SIMPLE_PAGES_USER" "$SIMPLE_PAGES_PASSWORD_HASH" > /etc/nginx/.htpasswd
# Nginx cambia al usuario no privilegiado `nginx` para atender las peticiones.
# Sin estos permisos, la solicitud autenticada termina en HTTP 500.
chown nginx:nginx /etc/nginx/.htpasswd
chmod 640 /etc/nginx/.htpasswd

exec nginx -g 'daemon off;'

