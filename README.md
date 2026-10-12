# Simple Pages CABSA

Página independiente para el tablero de avance de licencias CABSA.

## Seguridad

La página se publica detrás del proxy central con HTTPS y además exige usuario
y contraseña mediante Basic Auth. La contraseña nunca se guarda en texto plano:
`.env` contiene un hash SHA-512 compatible con Nginx.

Genera el hash en Linux:

```bash
openssl passwd -6 'TU_CONTRASENA'
```

Copia `.env.example` a `.env`, coloca el usuario, el hash y el dominio. No
subas `.env` al repositorio.

## Levantamiento manual

```bash
cp .env.example .env
docker network inspect proxy-publico >/dev/null 2>&1 || docker network create proxy-publico
docker compose --env-file .env -f compose.yaml -f compose.central.yaml up -d --build
```

## Integración con manejador-repositorios

El registro del manejador debe contener el proyecto `simple-pages`, con la ruta
`SIMPLE_PAGES_HOST` y el upstream `simple-pages:8080`. Después ejecuta desde el
manejador:

```bash
./gestionar.sh validate simple-pages
./gestionar.sh up simple-pages
./gestionar.sh status
```

Los datos del tablero se guardan en `localStorage` del navegador. Este proyecto
no modifica MySQL ni depende de los servicios SOA.

