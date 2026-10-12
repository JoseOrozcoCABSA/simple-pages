FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY public/ /usr/share/nginx/html/
COPY infra/nginx.conf /etc/nginx/templates/default.conf.template
COPY infra/entrypoint.sh /usr/local/bin/simple-pages-entrypoint

RUN chmod +x /usr/local/bin/simple-pages-entrypoint

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/simple-pages-entrypoint"]

