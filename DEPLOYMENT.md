# Despliegue Local y Produccion

Este proyecto esta preparado como monorepo:

```text
RobotCar/
  backend/
  frontend/
```

Puedes ejecutar localmente cada app por separado o desplegarlas como dos servicios Node independientes en Heroku, Railway, Render, Fly.io, VPS u otro host.

## Variables Generales

Backend:

```text
PORT=3000
HOST=0.0.0.0
FRONTEND_ORIGIN=http://localhost:5173
DEVICE_ID=carrito-001
DEVICE_TOKEN=change_me
API_TOKEN=change_me
COMMAND_TTL_MS=2000
COMMAND_QUEUE_MAX=30
MAX_FRAME_SIZE_MB=2
```

Frontend:

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_API_TOKEN=change_me
VITE_DEVICE_ID=carrito-001
```

En produccion, el frontend tambien acepta estas variables runtime si el host ejecuta `npm start`:

```text
PUBLIC_API_BASE_URL=https://tu-backend.com
PUBLIC_SOCKET_URL=https://tu-backend.com
PUBLIC_API_TOKEN=tu_api_token
PUBLIC_DEVICE_ID=carrito-001
```

Tambien puedes usar `VITE_API_BASE_URL`, `VITE_SOCKET_URL` y `VITE_API_TOKEN` en produccion. El servidor del frontend genera `/config.js` en runtime, asi puedes cambiar URLs/tokens desde variables del host sin reconstruir el bundle.

## Ejecucion Local

Backend:

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

URLs locales:

```text
Backend: http://localhost:3000
Frontend: http://localhost:5173
```

## Produccion Generica

Cada servicio debe usar Node 24.x o compatible.

Backend:

```text
Build command: npm install
Start command: npm start
```

Frontend:

```text
Build command: npm install && npm run build
Start command: npm start
```

El host debe definir `PORT`; si no lo hace, backend usa `3000` y frontend usa `5173`.

## Subir a GitHub

Desde la raiz del proyecto:

```powershell
git init
git branch -M main
git add .
git commit -m "Prepare robot car app"
git remote add origin https://github.com/TU_USUARIO/RobotCar.git
git push -u origin main
```

No subas `.env`, `node_modules`, `dist` ni caches. El `.gitignore` raiz ya los excluye.

## Despliegue Desde Monorepo

Si tu host permite elegir carpeta raiz:

```text
Backend root directory: backend
Frontend root directory: frontend
```

Si tu host no permite elegir carpeta raiz y usas Git remoto por app, puedes desplegar con subtree.

Backend:

```powershell
git subtree push --prefix backend <remote-backend> main
```

Frontend:

```powershell
git subtree push --prefix frontend <remote-frontend> main
```

## Ejemplo Heroku

Backend:

```powershell
heroku create robotcar-backend
heroku git:remote -a robotcar-backend -r heroku-backend
heroku config:set -a robotcar-backend `
  FRONTEND_ORIGIN=https://robotcar-frontend.herokuapp.com `
  DEVICE_ID=carrito-001 `
  DEVICE_TOKEN=TU_DEVICE_TOKEN `
  API_TOKEN=TU_API_TOKEN `
  COMMAND_TTL_MS=2000 `
  COMMAND_QUEUE_MAX=30 `
  MAX_FRAME_SIZE_MB=2
git subtree push --prefix backend heroku-backend main
```

Frontend:

```powershell
heroku create robotcar-frontend
heroku git:remote -a robotcar-frontend -r heroku-frontend
heroku config:set -a robotcar-frontend `
  PUBLIC_API_BASE_URL=https://robotcar-backend.herokuapp.com `
  PUBLIC_SOCKET_URL=https://robotcar-backend.herokuapp.com `
  PUBLIC_API_TOKEN=TU_API_TOKEN `
  PUBLIC_DEVICE_ID=carrito-001
git subtree push --prefix frontend heroku-frontend main
```

## Ejemplo Railway o Similar

Crea dos servicios desde el mismo repositorio.

Backend:

```text
Root directory: backend
Build command: npm install
Start command: npm start
Variables: FRONTEND_ORIGIN, DEVICE_ID, DEVICE_TOKEN, API_TOKEN, COMMAND_TTL_MS, COMMAND_QUEUE_MAX, MAX_FRAME_SIZE_MB
```

Frontend:

```text
Root directory: frontend
Build command: npm install && npm run build
Start command: npm start
Variables: PUBLIC_API_BASE_URL, PUBLIC_SOCKET_URL, PUBLIC_API_TOKEN, PUBLIC_DEVICE_ID
```

## Firmware

En local:

```text
http://IP_LOCAL_DEL_BACKEND:3000
```

En produccion:

```text
https://tu-backend-publico.com
```

Endpoints:

```text
ESP32 principal:
/api/devices/carrito-001/command

ESP32-CAM:
/api/camera/frame
```

Headers:

```text
Authorization: Bearer TU_DEVICE_TOKEN
Content-Type: image/jpeg
```

Si usas HTTPS desde ESP32, usa `WiFiClientSecure` o configura la CA correspondiente. Para una prueba rapida puede usarse `client.setInsecure()`, pero para produccion conviene validar certificado.

## Consideraciones

- No uses `.env` en produccion. Usa las variables del host.
- El estado actual vive en memoria. Si el servicio reinicia, se pierde el ultimo comando, estado y frame.
- Para produccion real, mueve estado y frames a Redis, Postgres, S3 o un servicio equivalente.
- `VITE_API_TOKEN` o `PUBLIC_API_TOKEN` queda visible en el navegador. Para una app publica, agrega autenticacion real para usuarios.
- Con un solo proceso, socket.io funciona normalmente. Si escalas a varios procesos/instancias, usa un adaptador compartido como Redis.
