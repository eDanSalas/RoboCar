# Despliegue en Heroku

Este proyecto esta preparado como monorepo:

```text
RobotCar/
  backend/
  frontend/
```

Para Heroku se recomienda crear dos apps: una para el backend API/socket.io y otra para el frontend React compilado.

## 1. Subir a GitHub

Desde la raiz del proyecto:

```powershell
git init
git branch -M main
git add .
git commit -m "Prepare robot car app for Heroku"
git remote add origin https://github.com/TU_USUARIO/RobotCar.git
git push -u origin main
```

No subas archivos `.env`, `node_modules`, `dist` ni caches. El `.gitignore` raiz ya los excluye.

## 2. Backend en Heroku

```powershell
heroku login
heroku create robotcar-backend
heroku git:remote -a robotcar-backend -r heroku-backend
```

Config Vars:

```powershell
heroku config:set -a robotcar-backend `
  FRONTEND_ORIGIN=https://robotcar-frontend.herokuapp.com `
  DEVICE_ID=carrito-001 `
  DEVICE_TOKEN=TU_DEVICE_TOKEN `
  API_TOKEN=TU_API_TOKEN `
  COMMAND_TTL_MS=2000 `
  MAX_FRAME_SIZE_MB=2
```

Desplegar solo `backend/`:

```powershell
git subtree push --prefix backend heroku-backend main
```

Probar:

```text
https://robotcar-backend.herokuapp.com/api/health
```

## 3. Frontend en Heroku

```powershell
heroku create robotcar-frontend
heroku git:remote -a robotcar-frontend -r heroku-frontend
```

Config Vars antes de desplegar, porque Vite las inserta durante el build:

```powershell
heroku config:set -a robotcar-frontend `
  VITE_API_BASE_URL=https://robotcar-backend.herokuapp.com `
  VITE_SOCKET_URL=https://robotcar-backend.herokuapp.com `
  VITE_API_TOKEN=TU_API_TOKEN
```

Desplegar solo `frontend/`:

```powershell
git subtree push --prefix frontend heroku-frontend main
```

Probar:

```text
https://robotcar-frontend.herokuapp.com
```

## 4. Firmware

Cuando el backend este en Heroku, la ESP32 principal y la ESP32-CAM ya no deben usar la IP local:

```text
http://10.14.226.34:3000
```

Deben usar la URL publica HTTPS:

```text
https://robotcar-backend.herokuapp.com
```

Endpoints:

```text
ESP32 principal:
https://robotcar-backend.herokuapp.com/api/devices/carrito-001/command

ESP32-CAM:
https://robotcar-backend.herokuapp.com/api/camera/frame
```

Headers del firmware:

```text
Authorization: Bearer TU_DEVICE_TOKEN
Content-Type: image/jpeg
```

Si usas `https://...herokuapp.com` desde ESP32, usa `WiFiClientSecure` o configura la CA correspondiente. Para una prueba rapida puede usarse `client.setInsecure()`, pero para produccion conviene validar certificado.

## 5. Consideraciones

- Heroku define `PORT` automaticamente. No configures `PORT` manualmente salvo que tengas una razon especifica.
- No uses `.env` en Heroku. Usa Config Vars.
- El estado actual vive en memoria. Si Heroku reinicia el dyno, se pierde el ultimo comando, estado y frame.
- Para produccion real, mueve estado y frames a Redis, Postgres, S3 o un servicio equivalente.
- `VITE_API_TOKEN` queda visible en el navegador. Para una app publica, agrega autenticacion real para usuarios.
- Con un solo dyno, socket.io funciona normalmente. Si escalas a varios dynos, usa un adaptador compartido como Redis.
