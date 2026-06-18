# Robot Car Backend

Backend Node.js/Express para conectar el Front, una ESP32 principal, una ESP32-CAM y un modulo A7670SA por red movil.

El servidor no intenta conectarse directamente a la ESP32. La ESP32 consulta periodicamente el backend para recibir el ultimo comando disponible.

## Tecnologias

- Node.js
- Express
- socket.io
- CORS
- dotenv
- Estado en memoria, sin base de datos

## Instalacion

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y cambia los tokens antes de usar el backend fuera de desarrollo.

## Ejecucion

Modo desarrollo:

```bash
npm run dev
```

Modo produccion/local simple:

```bash
npm start
```

Por defecto el backend escucha en todas las interfaces de red:

```text
http://0.0.0.0:3000
```

Desde el mismo equipo puedes usar:

```text
http://localhost:3000
```

Desde otros dispositivos en la misma red local debes usar la IP local del equipo que ejecuta el backend, por ejemplo:

```text
http://192.168.1.50:3000
```

## Variables de entorno

```text
PORT=3000
HOST=0.0.0.0
FRONTEND_ORIGIN=http://localhost:5173
DEVICE_ID=carrito-001
DEVICE_TOKEN=change_me
API_TOKEN=change_me
COMMAND_TTL_MS=2000
MAX_FRAME_SIZE_MB=2
```

El backend escucha en `0.0.0.0` por defecto. En produccion, el host suele asignar `PORT` automaticamente. `FRONTEND_ORIGIN` acepta varios origenes separados por coma. Para desarrollo rapido tambien puedes usar `FRONTEND_ORIGIN=*`, aunque para pruebas reales conviene listar el origen exacto del Front.

## Deploy

Este backend esta listo para desplegarse como app Node.js en Heroku, Railway, Render, Fly.io, VPS u otro host. Usa variables del host en lugar de `.env`.

Variables recomendadas:

```text
FRONTEND_ORIGIN=https://tu-frontend.com
DEVICE_ID=carrito-001
DEVICE_TOKEN=tu_token_del_dispositivo
API_TOKEN=tu_token_del_front
COMMAND_TTL_MS=2000
MAX_FRAME_SIZE_MB=2
```

Comandos genericos:

```text
Build command: npm install
Start command: npm start
```

Ver [DEPLOYMENT.md](../DEPLOYMENT.md) para ejemplos por plataforma.

## Acceso desde red local

1. Ejecuta el backend en el equipo servidor.
2. Busca la IP local de ese equipo. En Windows puedes usar `ipconfig` y revisar la direccion IPv4 de Wi-Fi o Ethernet.
3. Configura `.env` con `HOST=0.0.0.0`.
4. Si el Front se abre desde otro equipo o celular, agrega su origen a `FRONTEND_ORIGIN`. Ejemplo: `http://192.168.1.50:5173`.
5. En el Front usa `VITE_API_BASE_URL=http://192.168.1.50:3000` y `VITE_SOCKET_URL=http://192.168.1.50:3000`.
6. Si no responde desde otro dispositivo, permite el puerto `3000` en el firewall del equipo servidor.

Ejemplos desde otro dispositivo:

```bash
curl http://192.168.1.50:3000/api/health
```

```text
ESP32 principal:
http://192.168.1.50:3000/api/devices/carrito-001/command

ESP32-CAM:
http://192.168.1.50:3000/api/camera/frame
```

## Flujo

1. El Front envia comandos a `POST /api/commands`.
2. El backend guarda el ultimo comando en memoria.
3. La ESP32 principal consulta `GET /api/devices/:deviceId/command`.
4. Si el comando expiro por `COMMAND_TTL_MS`, el backend responde `stop`.
5. La ESP32-CAM sube JPEGs a `POST /api/camera/frame`.
6. La ESP32 puede reportar GPS dentro de `/status` o en `POST /api/devices/:deviceId/gps`.
7. El Front consulta `GET /api/camera/latest.jpg` o escucha eventos socket.io.

## Comandos validos

```text
forward
backward
stop
brake
left
right
```

Si no se envia `speed`, se usa `180`. El valor se limita entre `0` y `255`.

Conversion enviada a la ESP32:

| Comando | leftSpeed | rightSpeed | mode |
| --- | ---: | ---: | --- |
| `forward` | `speed` | `speed` | `drive` |
| `backward` | `-speed` | `-speed` | `drive` |
| `stop` | `0` | `0` | `drive` |
| `brake` | `0` | `0` | `brake` |
| `left` | `speed` | `speed * 0.6` | `drive` |
| `right` | `speed * 0.6` | `speed` | `drive` |

Para `left` y `right`, el body puede incluir `direction` con `forward` o `backward`. Si `direction` es `backward`, las velocidades del giro se envian en negativo.

## Endpoints

### Health

```http
GET /api/health
```

Ejemplo:

```bash
curl http://localhost:3000/api/health
```

### Enviar comando desde el Front

```http
POST /api/commands
Authorization: Bearer API_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "command": "forward",
  "speed": 180
}
```

Para giros combinados con avance o reversa:

```json
{
  "command": "left",
  "speed": 180,
  "direction": "backward"
}
```

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Authorization: Bearer change_me" \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"forward\",\"speed\":180}"
```

### Consultar comando desde la ESP32 principal

```http
GET /api/devices/:deviceId/command
Authorization: Bearer DEVICE_TOKEN
```

Ejemplo:

```bash
curl http://localhost:3000/api/devices/carrito-001/command \
  -H "Authorization: Bearer change_me"
```

Respuesta activa:

```json
{
  "ok": true,
  "deviceId": "carrito-001",
  "command": {
    "command": "forward",
    "speed": 180,
    "leftSpeed": 180,
    "rightSpeed": 180,
    "mode": "drive",
    "active": true,
    "reason": "latest_command",
    "createdAt": "2026-06-14T12:00:00.000Z",
    "expiresAt": "2026-06-14T12:00:02.000Z",
    "ttlMs": 2000,
    "deviceId": "carrito-001",
    "serverTime": "2026-06-14T12:00:00.500Z"
  }
}
```

Respuesta cuando expiro o no hay comando:

```json
{
  "ok": true,
  "deviceId": "carrito-001",
  "command": {
    "command": "stop",
    "speed": 0,
    "leftSpeed": 0,
    "rightSpeed": 0,
    "mode": "drive",
    "active": false,
    "reason": "expired",
    "createdAt": null,
    "expiresAt": null,
    "serverTime": "2026-06-14T12:00:03.000Z"
  }
}
```

### Enviar estado desde la ESP32 principal

```http
POST /api/devices/:deviceId/status
Authorization: Bearer DEVICE_TOKEN
Content-Type: application/json
```

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/devices/carrito-001/status \
  -H "Authorization: Bearer change_me" \
  -H "Content-Type: application/json" \
  -d "{\"battery\":7.4,\"rssi\":-70,\"network\":\"lte\"}"
```

Si el body incluye un objeto `gps`, el backend lo guarda y emite `gps:update`:

```json
{
  "state": "online",
  "gps": {
    "valid": true,
    "lat": 19.432608,
    "lng": -99.133209,
    "satellites": 8
  }
}
```

### Enviar GPS desde la ESP32 principal

```http
POST /api/devices/:deviceId/gps
Authorization: Bearer DEVICE_TOKEN
Content-Type: application/json
```

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/devices/carrito-001/gps \
  -H "Authorization: Bearer change_me" \
  -H "Content-Type: application/json" \
  -d "{\"valid\":true,\"lat\":19.432608,\"lng\":-99.133209,\"satellites\":8,\"hdop\":1.2}"
```

### Consultar ultimo GPS desde el Front

```http
GET /api/devices/:deviceId/gps
Authorization: Bearer API_TOKEN
```

### Subir frame desde la ESP32-CAM

```http
POST /api/camera/frame
Authorization: Bearer DEVICE_TOKEN
Content-Type: image/jpeg
```

El cuerpo debe ser el JPEG binario crudo, no JSON, no multipart/form-data y no base64. En firmware ESP32, este formato es correcto:

```cpp
http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
http.addHeader("Content-Type", "image/jpeg");
int httpCode = http.POST(fb->buf, fb->len);
```

El header `X-Device-Id: carrito-001` puede enviarse como metadata, pero este endpoint valida el dispositivo por `DEVICE_TOKEN`. Actualmente no requiere `X-Device-Id`.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/camera/frame \
  -H "Authorization: Bearer change_me" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@frame.jpg"
```

Codigos esperados:

- `201`: frame recibido correctamente.
- `401`: falta `Authorization: Bearer ...`.
- `403`: token incorrecto.
- `413`: imagen mayor que `MAX_FRAME_SIZE_MB`.
- `415`: `Content-Type` no es `image/jpeg`.
- `500`: error interno. Si `/api/health` funciona pero este endpoint responde `500`, revisa que el backend haya cargado `backend/.env` y que `DEVICE_TOKEN` exista.

### Obtener la imagen mas reciente

```http
GET /api/camera/latest.jpg
```

Ejemplo:

```bash
curl http://localhost:3000/api/camera/latest.jpg --output latest.jpg
```

## Eventos socket.io para el Front

El Front debe conectarse al backend con socket.io y escuchar:

```text
car:command
car:status
gps:update
camera:frame
camera:info
```

Payloads principales:

- `car:command`: comando normalizado con `leftSpeed`, `rightSpeed`, `mode`, `createdAt` y `expiresAt`.
- `car:status`: ultimo estado reportado por la ESP32 principal.
- `gps:update`: ultima ubicacion GPS normalizada.
- `camera:frame`: metadatos del frame mas `data` en base64.
- `camera:info`: metadatos del ultimo frame sin imagen.

Ejemplo de conexion desde un Front:

```js
import { io } from 'socket.io-client';

const socket = io('http://192.168.1.50:3000');

socket.on('car:command', (command) => {
  console.log(command);
});

socket.on('camera:frame', (frame) => {
  const imageUrl = `data:${frame.mimeType};base64,${frame.data}`;
  console.log(imageUrl);
});
```

## Notas para A7670SA

- La ESP32 no necesita una conexion entrante desde el servidor.
- La ESP32 principal debe hacer polling a `/api/devices/carrito-001/command`.
- Usa un intervalo menor que `COMMAND_TTL_MS` para que el carrito no se quede con un comando viejo.
- Si el backend no recibe comandos nuevos dentro del TTL, responde `stop`.
