# PolicyBenefits Realtime Alerts (Backend)

Express + Socket.IO backend to broadcast events from your landing page to admin panels that play a chime.

## Quick Start

```bash
npm i
cp .env.example .env
# edit .env: set BUTTON_SECRET and ALLOWED_ORIGINS
npm run start
```

The server listens on `PORT` (default 9010).

## Endpoint

`POST /api/event`

**Headers**
- `Content-Type: application/json`
- `x-button-secret: <BUTTON_SECRET>`

**Body**
```json
{
  "type": "qualified | call_click | quiz_progress | ...",
  "who": "policybenefits-landing",
  "meta": { "any": "json" }
}
```

**Response**
```json
{ "ok": true }
```

## Realtime (Admin)

Admin pages connect to Socket.IO at your server origin and listen for the event:

```js
socket.on("site:event", (payload) => {
  // { at, type, who, meta }
});
```

## CORS

Set `ALLOWED_ORIGINS` in `.env` to a comma-separated list of allowed origins
for both REST and WebSocket connections, e.g.:

```env
ALLOWED_ORIGINS=https://policybenefits.org,https://admin.policybenefits.org,http://localhost:5173
```

## Deploy Notes

- Ensure the port is exposed (e.g., Render, Railway, Fly.io, VPS).
- Keep `BUTTON_SECRET` private.
- Use HTTPS in production.
- Scale horizontally if needed—Socket.IO supports sticky sessions (required with load balancers).
```

