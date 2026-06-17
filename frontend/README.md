# Smart Car Control Panel

Frontend React + Vite para controlar un carrito 4WD mediante el backend existente y visualizar la imagen enviada por la ESP32-CAM.

## Instalacion

```bash
cd frontend
npm install
copy .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

## Ejecucion

Modo desarrollo:

```bash
npm run dev
```

Build de produccion:

```bash
npm run build
```

Vista previa del build:

```bash
npm run preview
```

Servidor de produccion:

```bash
npm start
```

## Variables de entorno

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_API_TOKEN=change_me
```

- `VITE_API_BASE_URL`: URL base del backend Express.
- `VITE_SOCKET_URL`: URL del servidor socket.io.
- `VITE_API_TOKEN`: token usado en `Authorization: Bearer VITE_API_TOKEN` para enviar comandos.

El token debe coincidir con `API_TOKEN` en el `.env` del backend.

En desarrollo, Vite lee las variables `VITE_*` desde `.env`.

En produccion, el servidor `npm start` genera `/config.js` en runtime. Puedes usar `VITE_*` o estos alias:

```text
PUBLIC_API_BASE_URL=https://tu-backend.com
PUBLIC_SOCKET_URL=https://tu-backend.com
PUBLIC_API_TOKEN=tu_api_token
```

Esto permite cambiar la URL del backend o token desde variables del host sin reconstruir el bundle.

## Deploy

Este frontend incluye `Procfile`, `heroku-postbuild` y un servidor Node estatico para servir `dist/`. Puede desplegarse en Heroku, Railway, Render, Fly.io, VPS u otro host Node.

Variables recomendadas de produccion:

```text
PUBLIC_API_BASE_URL=https://tu-backend.com
PUBLIC_SOCKET_URL=https://tu-backend.com
PUBLIC_API_TOKEN=tu_api_token
```

Comandos genericos:

```text
Build command: npm install && npm run build
Start command: npm start
```

Ver [DEPLOYMENT.md](../DEPLOYMENT.md) para ejemplos por plataforma.

## Conexion esperada con el Backend

El backend debe estar activo antes de abrir el Front.

Rutas usadas:

```text
POST /api/commands
GET /api/camera/latest.jpg
```

Eventos socket.io escuchados:

```text
car:command
car:status
camera:frame
camera:info
```

El Front envia comandos por HTTP y recibe actualizaciones en tiempo real por socket.io. La camara se actualiza con `camera:frame`; si no hay frame por socket, tambien intenta cargar `/api/camera/latest.jpg`.

## Teclas de control

```text
A              -> forward
S              -> stop
Flecha izquierda -> left
Flecha derecha   -> right
Q              -> zero_left
E              -> zero_right
```

La velocidad por defecto es `180` y se puede ajustar con el slider de `0` a `255`.

Para evitar peticiones repetidas, el Front ignora eventos repetidos cuando una tecla se mantiene presionada. El comando `stop` se envia de inmediato al presionar el boton o la tecla `S`.

## Interfaz

La pantalla principal incluye:

- `SMART CAR CONTROL PANEL`
- `CAMERA FEED`
- `MOTOR CONTROL`
- `DEVICE STATUS`
- Estado de conexion socket online/offline
- Ultimo comando enviado, velocidad, `leftSpeed`, `rightSpeed`, modo y timestamp
- Estado recibido desde la ESP32 principal
