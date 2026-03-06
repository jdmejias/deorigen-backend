# Tech Lead & QA Automation Guide — DeOrigen Backend
> Última actualización: generado desde análisis estático del codebase  
> BASE_URL = `http://localhost:3001/v1`  
> Swagger UI = `http://localhost:3001/docs`  
> Auth: JWT via header `Authorization: Bearer <token>`  
> Cookie alternativa: `deorigen-auth` con JSON `{ "token": "...", "user": { "role": "ADMIN" } }`

---

## Índice
1. [Endpoint Inventory por módulo](#1-endpoint-inventory-por-módulo)
2. [RBAC Test Cases (25 pruebas)](#2-rbac-test-cases)
3. [Data Isolation Tests (rol × recurso)](#3-data-isolation-tests)
4. [Log / Error Checklist](#4-log--error-checklist)
5. [Variables de entorno para Postman](#5-variables-de-entorno-postman)

---

## 1. Endpoint Inventory por Módulo

### Leyenda de roles
| Símbolo | Significado |
|---------|-------------|
| 🔓 | `@Public()` — sin autenticación |
| 🔐 | Cualquier usuario autenticado |
| 🛡️A | Solo `ADMIN` |
| 🛡️AF | `ADMIN` o `FARMER` |
| 🛡️AP | `ADMIN` o `PARTNER` |

---

### 1.1 Auth
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| A1 | POST | `/v1/auth/register` | 🔓 | 201 | Crea usuario con role inicial |
| A2 | POST | `/v1/auth/login` | 🔓 | 200 | Devuelve `{ token, user }` |
| A3 | GET  | `/v1/auth/profile` | 🔐 | 200 | Perfil del usuario autenticado |

---

### 1.2 Users
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| U1 | GET    | `/v1/users` | 🛡️A | 200 | Listado completo de usuarios |
| U2 | GET    | `/v1/users/me` | 🔐 | 200 | Propio perfil completo |
| U3 | PATCH  | `/v1/users/me` | 🔐 | 200 | Editar propio perfil |
| U4 | GET    | `/v1/users/:id` | 🛡️A | 200 | Consultar cualquier usuario |
| U5 | PATCH  | `/v1/users/:id` | 🛡️A | 200 | Editar cualquier usuario |
| U6 | DELETE | `/v1/users/:id` | 🛡️A | 200 | Eliminar usuario |

---

### 1.3 Products
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| P1 | GET    | `/v1/products` | 🔓 | 200 | Listado público con filtros |
| P2 | GET    | `/v1/products/:slug` | 🔓 | 200 | Detalle por slug |
| P3 | POST   | `/v1/products` | 🛡️AF | 201 | Crear producto |
| P4 | PATCH  | `/v1/products/:id` | 🛡️AF | 200 | Actualizar producto |
| P5 | DELETE | `/v1/products/:id` | 🛡️A | 200 | Eliminar producto |
| P6 | GET    | `/v1/products/admin/pending` | 🛡️A | 200 | Productos pendientes de aprobación |
| P7 | PATCH  | `/v1/products/admin/bulk-approve` | 🛡️A | 200 | Aprobar en bulk `{ ids: [...] }` |
| P8 | PATCH  | `/v1/products/admin/bulk-reject` | 🛡️A | 200 | Rechazar en bulk `{ ids: [...] }` |

---

### 1.4 Categories & Brands (subrecursos de Products)
| # | Método | Ruta | Acceso | HTTP OK |
|---|--------|------|--------|---------|
| C1 | GET    | `/v1/categories` | 🔓 | 200 |
| C2 | POST   | `/v1/categories` | 🛡️A | 201 |

---

### 1.5 Media Uploads
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| M1 | POST   | `/v1/media/upload` | 🛡️AF | 201 | `multipart/form-data`; query: `farmerId`, `productId`, `type`; límite imagen ~5 MB, global 50 MB |
| M2 | GET    | `/v1/media/product/:productId` | 🔐 | 200 | Media de un producto |
| M3 | GET    | `/v1/media/farmer/:farmerId` | 🔐 | 200 | Media de un productor |
| M4 | DELETE | `/v1/media/:id` | 🛡️A | 200 | Eliminar asset |

---

### 1.6 Orders
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| O1 | POST   | `/v1/orders` | 🔓 | 201 | Pedido guest o autenticado |
| O2 | GET    | `/v1/orders` | 🛡️AP | 200 | Admin/Partner: todos los pedidos |
| O3 | GET    | `/v1/orders/my` | 🔐 | 200 | Solo pedidos propios |
| O4 | GET    | `/v1/orders/track/:orderNumber` | 🔓 | 200 | Tracking público por número |
| O5 | GET    | `/v1/orders/:id` | 🔐 | 200 | Detalle — ownership check en servicio |
| O6 | GET    | `/v1/orders/:id/pdf` | 🔐 | 200 | PDF con `supportAmount` separado; `Content-Type: application/pdf` |
| O7 | PATCH  | `/v1/orders/:id/status` | 🛡️AP | 200 | `trackingNumber` requerido si status = `SHIPPED` o `DELIVERED` |
| O8 | GET    | `/v1/orders/country/:countryCode` | 🛡️AP | 200 | Pedidos filtrados por país |

---

### 1.7 SupportAmount (dentro de Orders)
> `supportAmount` es un campo de `Order` que aparece como línea separada en el PDF **sin IVA**.  
> Se envía en el body de `POST /v1/orders`. No tiene endpoint propio.

| Campo | Body param | Validación |
|-------|------------|------------|
| `supportAmount` | número ≥ 0 | Se excluye de la base imponible (IVA) |

---

### 1.8 Payments
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| PY1 | POST   | `/v1/payments/checkout` | 🔓 | 201 | `{ orderId, provider, ... }` |
| PY2 | POST   | `/v1/payments/webhook/:provider` | 🔓 | 200 | Recibe callback del gateway |
| PY3 | GET    | `/v1/payments/transaction/:id` | 🔐 | 200 | Estado de transacción |
| PY4 | PATCH  | `/v1/payments/confirm/:paymentId` | 🛡️A | 200 | Confirmación manual admin |
| PY5 | GET    | `/v1/payments/qr/:orderId` | 🔐 | 200 | QR de trazabilidad por pedido |

---

### 1.9 QR / Trazabilidad
> El QR se genera en `GET /v1/payments/qr/:orderId` (PY5 arriba).  
> El tracking público es `GET /v1/orders/track/:orderNumber` (O4 arriba).

---

### 1.10 Farmers / Wallet
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| F1 | GET    | `/v1/farmers/featured` | 🔓 | 200 | Top 20 productores del mes |
| F2 | GET    | `/v1/farmers` | 🔓 | 200 | Listado público con filtros |
| F3 | GET    | `/v1/farmers/:slug` | 🔓 | 200 | Perfil público por slug |
| F4 | POST   | `/v1/farmers` | 🛡️A | 201 | Crear perfil productor |
| F5 | PATCH  | `/v1/farmers/:id` | 🛡️AF | 200 | Actualizar perfil |
| F6 | DELETE | `/v1/farmers/:id` | 🛡️A | 200 | Eliminar productor |
| F7 | POST   | `/v1/farmers/:id/withdrawals` | 🛡️AF | 201 | **Wallet:** crear retiro. Mueve `availableBalance → lockedBalance` |

---

### 1.11 Withdrawals (Admin)
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| W1 | GET    | `/v1/admin/withdrawals` | 🛡️A | 200 | Incluye `bankAccountInfo` (solo admin) |
| W2 | PATCH  | `/v1/admin/withdrawals/:id/approve` | 🛡️A | 200 | PAID; decrementa `lockedBalance` |
| W3 | PATCH  | `/v1/admin/withdrawals/:id/reject` | 🛡️A | 200 | REJECTED; restaura `availableBalance` |
| W4 | PATCH  | `/v1/admin/withdrawals/bulk-approve` | 🛡️A | 200 | `{ ids: [...] }` — acción en bulk |

---

### 1.12 Projects / Investments
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| I1 | GET    | `/v1/projects` | 🔓 | 200 | Proyectos activos |
| I2 | GET    | `/v1/projects/:slug` | 🔓 | 200 | Detalle público |
| I3 | POST   | `/v1/projects` | 🛡️AF | 201 | Crear proyecto |
| I4 | PATCH  | `/v1/projects/:id` | 🛡️AF | 200 | Actualizar proyecto |
| I5 | POST   | `/v1/projects/invest` | 🔐 | 201 | Invertir (cualquier usuario auth) |
| I6 | GET    | `/v1/projects/investments/my` | 🔐 | 200 | Mis inversiones |
| I7 | PATCH  | `/v1/projects/investments/:id/confirm` | 🛡️A | 200 | Confirma inversión → acredita `raisedAmount` |
| I8 | PATCH  | `/v1/projects/investments/bulk-confirm` | 🛡️A | 200 | `{ ids: [...] }` bulk confirm |

---

### 1.13 Proposals (Leads & Support)
| # | Método | Ruta | Acceso | HTTP OK | Notas |
|---|--------|------|--------|---------|-------|
| L1 | POST   | `/v1/leads` | 🔓 | 201 | Enviar lead (mayorista, participar) |
| L2 | GET    | `/v1/leads` | 🛡️A | 200 | Listar leads; query: `?type=` |
| L3 | PATCH  | `/v1/leads/:id/read` | 🛡️A | 200 | Marcar lead como leído |
| S1 | POST   | `/v1/support` | 🔓 | 201 | Crear ticket de soporte |
| S2 | GET    | `/v1/support` | 🛡️A | 200 | Listar tickets |
| S3 | PATCH  | `/v1/support/:id/status` | 🛡️A | 200 | Actualizar estado ticket |

---

### 1.14 Partners / Countries / Warehouses
| # | Método | Ruta | Acceso | HTTP OK |
|---|--------|------|--------|---------|
| CN1 | GET    | `/v1/countries` | 🔓 | 200 |
| CN2 | POST   | `/v1/countries` | 🛡️A | 201 |
| CN3 | PATCH  | `/v1/countries/:id` | 🛡️A | 200 |
| PT1 | GET    | `/v1/partners` | 🛡️A | 200 |
| PT2 | POST   | `/v1/partners` | 🛡️A | 201 |
| PT3 | PATCH  | `/v1/partners/:id` | 🛡️A | 200 |
| WH1 | GET    | `/v1/warehouses/partner/:partnerId` | 🛡️AP | 200 |
| WH2 | POST   | `/v1/warehouses` | 🛡️A | 201 |
| WH3 | PATCH  | `/v1/warehouses/:id` | 🛡️AP | 200 |

---

### 1.15 Admin Bulk Actions (resumen)
| Endpoint | Payload |
|----------|---------|
| `PATCH /v1/products/admin/bulk-approve` | `{ "ids": ["id1","id2"] }` |
| `PATCH /v1/products/admin/bulk-reject` | `{ "ids": ["id1","id2"] }` |
| `PATCH /v1/admin/withdrawals/bulk-approve` | `{ "ids": ["id1","id2"] }` |
| `PATCH /v1/projects/investments/bulk-confirm` | `{ "ids": ["id1","id2"] }` |

---

## 2. RBAC Test Cases

> **Convención de variables**  
> ```
> BASE=http://localhost:3001/v1
> ADMIN_TOKEN=<token de usuario ADMIN>
> FARMER_TOKEN=<token de usuario FARMER>
> PARTNER_TOKEN=<token de usuario PARTNER>
> BUYER_TOKEN=<token de usuario BUYER>
> ```
> Obtén tokens con:  
> ```bash
> # Admin
> curl -s -X POST $BASE/auth/login \
>   -H "Content-Type: application/json" \
>   -d '{"email":"admin@deorigen.co","password":"AdminPass123!"}' | jq -r '.token'
> ```

---

### Grupo 1 — Rutas `@Public()` deben responder SIN token (esperado 200/201)

```bash
# RBAC-01: Listar productos sin auth
curl -s -o /dev/null -w "%{http_code}" $BASE/products
# ESPERADO: 200

# RBAC-02: Detalle de producto sin auth
curl -s -o /dev/null -w "%{http_code}" $BASE/products/tomates-cherry-organicos
# ESPERADO: 200

# RBAC-03: Track de pedido sin auth
curl -s -o /dev/null -w "%{http_code}" $BASE/orders/track/ORD-0001
# ESPERADO: 200 (o 404 si no existe — nunca 401)

# RBAC-04: Proyectos sin auth
curl -s -o /dev/null -w "%{http_code}" $BASE/projects
# ESPERADO: 200

# RBAC-05: Listado de productores sin auth
curl -s -o /dev/null -w "%{http_code}" $BASE/farmers
# ESPERADO: 200
```

---

### Grupo 2 — Rutas admin deben rechazar BUYER (esperado 403)

```bash
# RBAC-06: BUYER intenta listar todos los pedidos
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/orders
# ESPERADO: 403

# RBAC-07: BUYER intenta listar usuarios
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/users
# ESPERADO: 403

# RBAC-08: BUYER intenta ver retiros admin
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/admin/withdrawals
# ESPERADO: 403

# RBAC-09: BUYER intenta aprobar un pago
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/payments/confirm/some-payment-id
# ESPERADO: 403

# RBAC-10: BUYER intenta ver productos pendientes de aprobación
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/products/admin/pending
# ESPERADO: 403
```

---

### Grupo 3 — Rutas admin deben rechazar FARMER (esperado 403)

```bash
# RBAC-11: FARMER intenta listar todos los usuarios
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  $BASE/users
# ESPERADO: 403

# RBAC-12: FARMER intenta aprobar/rechazar inversión
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  $BASE/projects/investments/some-id/confirm
# ESPERADO: 403

# RBAC-13: FARMER intenta aprobar retiro ajeno
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  $BASE/admin/withdrawals/some-id/approve
# ESPERADO: 403

# RBAC-14: FARMER intenta bulk-approve productos
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["id1"]}' \
  $BASE/products/admin/bulk-approve
# ESPERADO: 403
```

---

### Grupo 4 — Rutas protegidas deben rechazar peticiones SIN token (esperado 401)

```bash
# RBAC-15: Sin token al listar mis pedidos
curl -s -o /dev/null -w "%{http_code}" $BASE/orders/my
# ESPERADO: 401

# RBAC-16: Sin token al consultar perfil
curl -s -o /dev/null -w "%{http_code}" $BASE/auth/profile
# ESPERADO: 401

# RBAC-17: Sin token al consultar transacción de pago
curl -s -o /dev/null -w "%{http_code}" $BASE/payments/transaction/some-id
# ESPERADO: 401

# RBAC-18: Sin token al descargar PDF de pedido
curl -s -o /dev/null -w "%{http_code}" $BASE/orders/some-id/pdf
# ESPERADO: 401

# RBAC-19: Sin token al ver mis inversiones
curl -s -o /dev/null -w "%{http_code}" $BASE/projects/investments/my
# ESPERADO: 401

# RBAC-20: Sin token al solicitar retiro
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"bankAccountInfo":"nro 123"}' \
  $BASE/farmers/some-farmer-id/withdrawals
# ESPERADO: 401
```

---

### Grupo 5 — PARTNER vs rutas exclusivas ADMIN

```bash
# RBAC-21: PARTNER puede ver pedidos
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  $BASE/orders
# ESPERADO: 200

# RBAC-22: PARTNER NO puede crear partners
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  $BASE/partners
# ESPERADO: 403

# RBAC-23: PARTNER NO puede aprobar retiro
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  $BASE/admin/withdrawals/some-id/approve
# ESPERADO: 403

# RBAC-24: PARTNER puede ver bodegas de su partner
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  $BASE/warehouses/partner/PARTNER_ID_HERE
# ESPERADO: 200 (o 404 si el ID no existe)

# RBAC-25: PARTNER NO puede confirmar inversión
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  $BASE/projects/investments/some-id/confirm
# ESPERADO: 403
```

---

## 3. Data Isolation Tests

### 3.1 Buyer solo ve sus propios pedidos

```bash
# Paso 1: autenticar como Buyer A y obtener sus pedidos
BUYER_A_ORDERS=$(curl -s \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/orders/my)
echo $BUYER_A_ORDERS | jq '.[].userId' | sort -u
# TODOS los valores deben ser el ID de Buyer A

# Paso 2: intentar acceder al pedido de otro buyer directamente
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/orders/ORDER_ID_DE_OTRO_BUYER
# ESPERADO: 403 o 404 (nunca 200 con datos ajenos)
```

---

### 3.2 bankAccountInfo NO visible para FARMER ni BUYER

```bash
# El farmer crea un retiro — la respuesta NO debe contener bankAccountInfo
curl -s -X POST \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50, "bankAccountInfo": "Cuenta 123456"}' \
  $BASE/farmers/FARMER_ID/withdrawals | jq 'has("bankAccountInfo")'
# ESPERADO: false

# El admin sí debe verlo en el listado
curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/admin/withdrawals | jq '.[0] | has("bankAccountInfo")'
# ESPERADO: true
```

---

### 3.3 lockedBalance / availableBalance — flujo completo

```bash
# 1. Leer balance actual del farmer
BEFORE=$(curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/farmers/FARMER_ID | jq '{avail: .availableBalance, locked: .lockedBalance}')
echo "Before: $BEFORE"

# 2. Solicitar retiro
WITHDRAWAL=$(curl -s -X POST \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "bankAccountInfo": "Cuenta Banco X 987654321"}' \
  $BASE/farmers/FARMER_ID/withdrawals)
WITHDRAWAL_ID=$(echo $WITHDRAWAL | jq -r '.id')
echo "Withdrawal ID: $WITHDRAWAL_ID"

# 3. Verificar que lockedBalance subió +100 y availableBalance bajó -100
AFTER=$(curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/farmers/FARMER_ID | jq '{avail: .availableBalance, locked: .lockedBalance}')
echo "After request: $AFTER"
# lockedBalance debe ser BEFORE.locked + 100
# availableBalance debe ser BEFORE.avail - 100

# 4. Admin aprueba el retiro
curl -s -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/admin/withdrawals/$WITHDRAWAL_ID/approve | jq '.status'
# ESPERADO: "PAID"

# 5. Verificar que lockedBalance bajó -100 (se pagó)
FINAL=$(curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/farmers/FARMER_ID | jq '{avail: .availableBalance, locked: .lockedBalance}')
echo "After approve: $FINAL"
# lockedBalance debe ser el valor original BEFORE.locked
```

---

### 3.4 Partner ve solo pedidos filtrados por su countryId

```bash
# El PARTNER hace GET /v1/orders — el servicio debe aplicar filtro automático
PARTNER_ORDERS=$(curl -s \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  "$BASE/orders")
echo $PARTNER_ORDERS | jq '[.[].countryId] | unique'
# Todos los countryId deben corresponder al país del partner
# (o vacío si el partner no tiene country asignado)
```

---

### 3.5 raisedAmount solo se acredita con confirmación admin

```bash
# 1. Leer raisedAmount antes
BEFORE_RAISED=$(curl -s $BASE/projects/PROJECT_SLUG | jq '.raisedAmount')
echo "Raised before: $BEFORE_RAISED"

# 2. Invertir (BUYER o cualquier usuario auth)
INVESTMENT=$(curl -s -X POST \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "PROJECT_ID", "amount": 200}' \
  $BASE/projects/invest)
INV_ID=$(echo $INVESTMENT | jq -r '.id')

# 3. Verificar que raisedAmount NO cambió aún
MID_RAISED=$(curl -s $BASE/projects/PROJECT_SLUG | jq '.raisedAmount')
echo "Raised mid (must equal before): $MID_RAISED"
# ESPERADO: igual a BEFORE_RAISED

# 4. Admin confirma
curl -s -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/projects/investments/$INV_ID/confirm | jq '.status'
# ESPERADO: "CONFIRMED"

# 5. raisedAmount debe haber subido +200
AFTER_RAISED=$(curl -s $BASE/projects/PROJECT_SLUG | jq '.raisedAmount')
echo "Raised after: $AFTER_RAISED"
```

---

### 3.6 trackingNumber requerido para SHIPPED / DELIVERED

```bash
# Intentar cambiar estado a SHIPPED sin trackingNumber
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "SHIPPED"}' \
  $BASE/orders/ORDER_ID/status
# ESPERADO: 400 (validación)

# Con trackingNumber debe funcionar
curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "SHIPPED", "trackingNumber": "TRK-0001-XYZ"}' \
  $BASE/orders/ORDER_ID/status
# ESPERADO: 200
```

---

### 3.7 PDF incluye supportAmount como línea sin IVA

```bash
# 1. Crear pedido con supportAmount
ORDER=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "PROD_ID", "quantity": 2}],
    "supportAmount": 15
  }' \
  $BASE/orders)
ORDER_ID=$(echo $ORDER | jq -r '.id')

# 2. Descargar PDF
curl -s \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  $BASE/orders/$ORDER_ID/pdf \
  -o /tmp/pedido.pdf

# 3. Verificar que el PDF fue generado (tamaño > 0 y Content-Type correcto)
file /tmp/pedido.pdf
# ESPERADO: "PDF document"
# Abre en visor para verificar visualmente que aparece línea "Apoyo / Donación: $15.00"
# y que dicha línea no forma parte de la base IVA
```

---

## 4. Log / Error Checklist

### 4.1 Errores esperados en backend (NestJS)
Verifica con `docker compose logs -f api` o en consola del servidor.

| Test | Mensaje esperado en log | Mensaje NO esperado |
|------|------------------------|---------------------|
| Login con password incorrecta | `UnauthorizedException` | Stack trace completo expuesto en response |
| JWT expirado o inválido | `JsonWebTokenError` / `TokenExpiredError` | `500 Internal Server Error` |
| Acceso sin rol suficiente | `ForbiddenException` | Request body expuesto |
| Withdrawal con balance insuficiente | `BadRequestException: Saldo insuficiente` | `Prisma... code P2002` expuesto al cliente |
| Bulk action con `ids: []` | `BadRequestException` / early return | Crash / unhandled |
| PDF para order inexistente | `NotFoundException` | `null` pointer en pdfkit |
| Media upload > 5 MB (video) | Error de validación de tamaño | `413` con body vacío |

---

### 4.2 Verificación en frontend (browser DevTools → Console + Network)

| Área | Qué comprobar | Señal de error |
|------|--------------|----------------|
| Login / Register | No hay `console.error` con el raw error string del backend | Se ve `{"message":"Unauthorized","statusCode":401}` impreso en consola |
| Listado de órdenes | `react-query` invalida cache tras `PATCH /status` | Tabla no actualiza sin refresh manual |
| Wallet (retiros) | Balance se actualiza tras confirmar retiro | Muestra balance stale > 5 s |
| i18n | Ninguna key sin traducción visible (ej. `"orders.status.PENDING"` como texto) | Texto literal de key en UI |
| PDF download | Header `Content-Disposition: attachment` recibido | Blob vacío / error CORS |
| QR trazabilidad | Imagen QR carga correctamente | `ERR_NETWORK` o imagen rota |
| Auth middleware | Usuario con role incorrecto redirigido a `/login` | Pantalla en blanco / 403 sin redirect |

---

### 4.3 Checklist de seguridad mínima (OWASP)

```bash
# SEC-01: Response de login NO expone passwordHash
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deorigen.co","password":"AdminPass123!"}' | jq 'has("passwordHash")'
# ESPERADO: false

# SEC-02: GET /users/:id NO expone passwordHash
curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE/users/USER_ID | jq 'has("passwordHash")'
# ESPERADO: false

# SEC-03: bankAccountInfo en withdrawal NO visible para FARMER
WITHDRAWAL_PAYLOAD=$(curl -s -X POST \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":10,"bankAccountInfo":"Banco XYZ 000001"}' \
  $BASE/farmers/FARMER_ID/withdrawals)
echo $WITHDRAWAL_PAYLOAD | jq 'has("bankAccountInfo")'
# ESPERADO: false

# SEC-04: Bulk action con IDs de otro tenant
curl -s -X PATCH \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["id-no-existente","otro-id-invalido"]}' \
  $BASE/admin/withdrawals/bulk-approve | jq '.updated'
# ESPERADO: 0 (ningún registro no existente fue procesado)
```

---

### 4.4 Health check

```bash
# Verificar que la API esté viva
curl -s $BASE/../health
# o bien
curl -s http://localhost:3001/health
# ESPERADO: { "status": "ok" }
```

---

## 5. Variables de Entorno Postman

Importa este JSON en Postman (Environment → Import raw):

```json
{
  "id": "deorigen-local",
  "name": "DeOrigen Local",
  "values": [
    { "key": "BASE_URL",       "value": "http://localhost:3001/v1", "enabled": true },
    { "key": "SWAGGER_URL",    "value": "http://localhost:3001/docs", "enabled": true },
    { "key": "ADMIN_TOKEN",    "value": "",  "enabled": true, "type": "secret" },
    { "key": "FARMER_TOKEN",   "value": "",  "enabled": true, "type": "secret" },
    { "key": "PARTNER_TOKEN",  "value": "",  "enabled": true, "type": "secret" },
    { "key": "BUYER_TOKEN",    "value": "",  "enabled": true, "type": "secret" },
    { "key": "FARMER_ID",      "value": "",  "enabled": true },
    { "key": "PARTNER_ID",     "value": "",  "enabled": true },
    { "key": "ORDER_ID",       "value": "",  "enabled": true },
    { "key": "PRODUCT_SLUG",   "value": "",  "enabled": true },
    { "key": "PROJECT_SLUG",   "value": "",  "enabled": true },
    { "key": "WITHDRAWAL_ID",  "value": "",  "enabled": true },
    { "key": "INV_ID",         "value": "",  "enabled": true }
  ]
}
```

### Pre-request script recomendado (Postman Collection → Pre-request Script)

```javascript
// Auto-populate token based on role variable
const role = pm.variables.get("ACTIVE_ROLE") || "ADMIN";
const tokenKey = role + "_TOKEN";
pm.request.headers.add({
  key: "Authorization",
  value: "Bearer " + pm.environment.get(tokenKey)
});
```

---

## Resumen de cobertura por módulo

| Módulo | Endpoints | RBAC tests | Data isolation | Bulk action |
|--------|-----------|-----------|----------------|-------------|
| Auth | 3 | RBAC-15,16 | — | — |
| Users | 6 | RBAC-06,07 | — | — |
| Products | 8 | RBAC-08,10,11,14 | — | bulk-approve, bulk-reject |
| Media | 4 | — | — | — |
| Orders | 8 | RBAC-06,15,18 | 3.1, 3.6, 3.7 | — |
| Payments | 5 | RBAC-09,17 | — | — |
| Farmers | 7 | RBAC-20 | 3.2, 3.3 | — |
| Withdrawals | 4 | RBAC-08,13,23 | 3.2, 3.3 | bulk-approve |
| Projects | 8 | RBAC-12,25 | 3.5 | bulk-confirm |
| Leads / Support | 6 | — | — | — |
| Partners / Countries | 9 | RBAC-22,23 | 3.4 | — |
| **Total** | **68** | **25** | **7 escenarios** | **4 acciones** |
