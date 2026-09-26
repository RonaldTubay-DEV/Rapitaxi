# 04 · Referencia de la API

**URL base**

| Entorno | Dirección |
|---|---|
| Local | `http://127.0.0.1:8000/api` |
| Producción | `https://rapitaxi-api.onrender.com/api` |

Todas las respuestas son JSON. Todos los endpoints salvo `/login` exigen el token:

```
Authorization: Bearer <token>
Accept: application/json
```

---

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Correcto |
| 201 | Creado |
| 401 | Sin token, o token vencido o revocado |
| 403 | Autenticado pero sin permiso (rol incorrecto o cuenta desactivada) |
| 404 | No existe, o existe pero no te pertenece |
| 422 | Datos inválidos o regla de negocio incumplida |
| 429 | Demasiadas peticiones |
| 503 | La base de datos no responde |

## Listados paginados

Los listados que crecen sin techo devuelven una **respuesta paginada**, no un
arreglo:

| Endpoint | Formato |
|---|---|
| `/aportaciones`, `/mantenimientos`, `/revisiones`, `/auditoria` | Paginado |
| `/socios`, `/vehiculos`, `/usuarios`, `/libros-contables`, `/expedientes` | Arreglo completo |

Los segundos no se paginan porque están acotados por el negocio (el permiso de
operación limita los cupos) y alimentan los selectores de los formularios.

```json
{
  "data": [ ... ],
  "current_page": 1,
  "last_page": 3,
  "per_page": 25,
  "total": 60,
  "from": 1,
  "to": 25
}
```

Parámetros comunes:

| Parámetro | Efecto |
|---|---|
| `?page=2` | Página a devolver |
| `?per_page=50` | Registros por página. Entre 1 y **100** |
| `?search=` | Busca en el servidor, sobre **todo** el conjunto, no solo la página |

> **Importante:** la búsqueda y los filtros deben resolverse en el servidor. Un
> filtro aplicado en el cliente solo alcanzaría a la página visible: un registro
> que cayó en la página 3 no aparecería nunca.

---

Los errores de validación llegan así:

```json
{
  "message": "The cedula field is required.",
  "errors": { "cedula": ["The cedula field is required."] }
}
```

> Los mensajes de validación de Laravel están **en inglés** porque `APP_LOCALE`
> sigue en `en`. El frontend los traduce en las pantallas más usadas.

---

## Autenticación

### `POST /login` — Iniciar sesión

Público. Limitado a **5 intentos por minuto y por correo**, y 20 por minuto y por IP.

```json
{ "email": "admin@rapitaxi.com", "password": "secreto123" }
```

Respuesta:

```json
{
  "message": "Ingreso exitoso",
  "token": "3|xxxxxxxxxxxxxxxxxxxx",
  "user": { "id": 1, "name": "Administrador", "email": "...", "role": "admin" }
}
```

El token vence a las **12 horas**.

- Credenciales incorrectas: 422 con un mensaje idéntico exista o no el correo.
- Cuenta desactivada: 422.
- Usuario sin rol asignado: 422.

### `POST /logout` — Cerrar sesión

Revoca el token actual.

### `GET /user` — Usuario autenticado

Devuelve los datos del usuario del token. Sin contraseña ni `remember_token`.

---

## Panel administrativo — `admin` y `operador`

### Socios

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/socios` | Listado. Acepta `?search=` (nombre, cédula, unidad o placa) |
| POST | `/socios` | Crear |
| GET | `/socios/{id}` | Ver uno |
| PUT | `/socios/{id}` | Actualizar |
| DELETE | `/socios/{id}` | Dar de baja (borrado suave) |
| GET | `/socios/eliminados` | Listar los dados de baja. Acepta `?search=` |
| PUT | `/socios/{id}/restaurar` | Reactivar |

**Campos al crear o actualizar:**

| Campo | Regla |
|---|---|
| `nombre` | Obligatorio. Solo letras, espacios, apóstrofes y guiones (3-80) |
| `cedula` | Obligatoria. 10 dígitos con verificador válido. Única entre activos |
| `telefono` | Obligatorio. `0` + 9 dígitos |
| `correo` | Obligatorio. Formato válido, hasta 100 |
| `estado` | Obligatorio. `Activo` o `Inactivo` |
| `direccion` | Opcional, hasta 150 |
| `observaciones` | Opcional, hasta 500 |
| `motivo_baja` | **Obligatorio** al pasar de Activo a Inactivo, y al eliminar |

**Efectos secundarios de la baja:** el motivo se antepone a las observaciones con
la fecha, la cuenta del portal se desactiva y sus tokens se revocan.

**Restaurar** falla con 422 si otro socio activo ya tomó esa cédula. La cuenta del
portal **no** se reactiva sola.

### Vehículos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/vehiculos` | Listado con su socio |
| POST | `/vehiculos` | Crear |
| GET | `/vehiculos/{id}` | Ver uno |
| PUT | `/vehiculos/{id}` | Actualizar |
| DELETE | `/vehiculos/{id}` | Eliminar (borrado suave) |

| Campo | Regla |
|---|---|
| `socio_id` | Obligatorio. Debe ser un socio no eliminado |
| `numero_vehiculo` | Obligatorio. `^[0-9]{3}-[0-9]{2}$`. Único entre activos |
| `placa` | Obligatoria. `^[A-Z]{3}-[0-9]{4}$`. Única entre activos |
| `marca` | Obligatoria, hasta 50 |
| `tipo_vehiculo` | Obligatorio. De la lista cerrada |
| `combustible` | Obligatorio. De la lista cerrada |
| `anio_fabricacion` | Obligatorio. 1980 al año próximo |

La placa se convierte a mayúsculas y el color se fija en `Amarillo`.

### Mantenimientos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/mantenimientos` | **Paginado.** Acepta `?revision=`, `?estado=`, `?search=`, `?page=` |
| POST | `/mantenimientos` | Registrar |
| PUT | `/mantenimientos/{id}` | Actualizar estado |
| DELETE | `/mantenimientos/{id}` | Eliminar |
| GET | `/mantenimientos/{id}/comprobante` | Enlace temporal al respaldo |
| PUT | `/mantenimientos/{id}/aprobar` | Confirmar el registro de un socio |
| PUT | `/mantenimientos/{id}/rechazar` | Rechazar con `motivo_rechazo` |

**Al crear**, exige `vehiculo_id`, `fecha_mantenimiento`, `tipo_mantenimiento` y
`estado`. Si el estado es `Completado`, exige además: fecha no futura,
`kilometraje_actual`, `observaciones` y `comprobante` (archivo). Para aceite,
frenos y llantas exige también `proximo_mantenimiento_km` mayor al kilometraje.

Reglas adicionales:

- El kilometraje no puede ser menor al del último trabajo completado de esa unidad.
- Un mantenimiento `Completado` no se puede modificar ni eliminar.
- El estado no retrocede de `En Proceso` a `Programado`.
- `origen` y `revision_estado` se fuerzan en el servidor; mandarlos no tiene efecto.

**Aprobar / rechazar** solo funcionan sobre registros en `Pendiente`; si ya se
revisó, devuelven 422.

### Revisiones

| Método | Ruta |
|---|---|
| GET | `/revisiones` — **Paginado.** Acepta `?estado=`, `?search=`, `?page=` |
| POST | `/revisiones` |
| GET | `/revisiones/{id}` |
| PUT | `/revisiones/{id}` |
| DELETE | `/revisiones/{id}` |

`fecha_revision` no puede ser futura si el estado es `Aprobada` o `Rechazada`.

### Aportaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/aportaciones` | **Paginado.** Acepta `?estado=`, `?search=`, `?page=`, `?per_page=` |
| POST | `/aportaciones` | Registrar pago manual (nace aprobado) |
| DELETE | `/aportaciones/{id}` | Eliminar |
| GET | `/aportaciones/{id}/comprobante` | Enlace temporal |
| PUT | `/aportaciones/{id}/aprobar` | Aprobar el comprobante de un socio |
| PUT | `/aportaciones/{id}/rechazar` | Rechazar con `motivo_rechazo` |

`monto` mayor a 0, `fecha_pago` no futura. No se permite una segunda aportación
para el mismo mes y año salvo que la anterior esté `Rechazado`.

### Expedientes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/expedientes` | Acepta `?socio_id=` |
| POST | `/expedientes` | Subir (`multipart/form-data`) |
| DELETE | `/expedientes/{id}` | Eliminar (también borra el archivo en R2) |
| GET | `/expedientes/{id}/download` | Enlace temporal de 5 minutos |

Archivo: PDF, JPG o PNG, máximo 5 MB.

### Libros contables

| Método | Ruta |
|---|---|
| GET | `/libros-contables` |
| POST | `/libros-contables` |
| DELETE | `/libros-contables/{id}` |
| GET | `/libros-contables/{id}/download` |

Solo PDF, máximo 10 MB.

### Reportes y dashboard

**`GET /reportes/cuadro-maestro`** — Matriz de la flota: unidad, placa, socio,
estado de pago y última revisión aprobada. Excluye socios y vehículos eliminados.

**`GET /dashboard/stats`**

```json
{
  "kpis": {
    "socios_activos": 12,
    "flota_total": 10,
    "vehiculos_al_dia": 7,
    "taller_pendientes": 2,
    "unidades_sin_mantenimiento": 3,
    "meses_sin_mantenimiento": 6
  },
  "actividad_reciente": [ ... ]
}
```

Definiciones exactas:

- `socios_activos`: socios con `estado = 'Activo'`.
- `vehiculos_al_dia`: unidades con revisión **aprobada** en los últimos 12 meses.
- `taller_pendientes`: trabajos programados o en proceso, en vehículos vigentes.
- `unidades_sin_mantenimiento`: unidades sin ningún trabajo **completado** en los
  últimos 6 meses (incluye las que nunca tuvieron ninguno).

`actividad_reciente` devuelve solo los campos que la pantalla muestra: no incluye
rutas de archivos ni datos personales del socio más allá del nombre.

### Notificaciones

| Método | Ruta |
|---|---|
| GET | `/notificaciones` |
| PUT | `/notificaciones/{id}/leer` |
| PUT | `/notificaciones/leer-todas` |

Devuelve las últimas 20, filtradas a los títulos "Socio registrado" y
"Vehiculo registrado".

---

## Solo administrador

### Usuarios internos

| Método | Ruta |
|---|---|
| GET | `/usuarios` |
| POST | `/usuarios` |
| PUT | `/usuarios/{id}` |
| DELETE | `/usuarios/{id}` |

Solo gestiona roles `admin` y `operador`; un usuario con rol `socio` responde 404
para que esta pantalla no pueda tocarlo.

| Campo | Regla |
|---|---|
| `name` | Obligatorio, hasta 80 |
| `email` | Obligatorio, único |
| `password` | Mínimo 8, con letras y números. Opcional al actualizar |
| `role` | `admin` u `operador` |

Protecciones: no puedes eliminar tu propia cuenta; siempre debe quedar al menos un
admin; cambiar contraseña o rol revoca las demás sesiones de ese usuario.

### Cuentas de socios

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/socios/{socio}/cuenta` | Crear acceso al portal (`email`, `password`) |
| PUT | `/socios/{socio}/cuenta/estado` | Activar o desactivar (`activa`: booleano) |

### Configuración de mantenimiento

| Método | Ruta |
|---|---|
| GET | `/configuraciones-mantenimiento` |
| PUT | `/configuraciones-mantenimiento` |

```json
{
  "configuraciones": [
    { "id": 1, "meses_frecuencia": 3, "dias_anticipacion": 15 }
  ]
}
```

`meses_frecuencia` entre 1 y 60; `dias_anticipacion` entre 0 y 180.

### Auditoría

**`GET /auditoria`** — Paginado. Filtros: `?modulo=`, `?evento=`, `?per_page=`
(máximo 100).

Cada entrada trae módulo, evento, sujeto, usuario, **IP**, **navegador**, los
campos que cambiaron y la fecha.

---

## Portal del socio — rol `socio`

Ningún endpoint recibe el id del socio: siempre se deduce del token.
Todos devuelven 403 si la afiliación del socio no está `Activo`.

### `GET /mi-perfil`

Devuelve **solo campos públicos**: id, nombre, cédula, teléfono, correo,
dirección, estado y sus vehículos.

> Nunca incluye `observaciones` (notas internas del staff) ni `user_id`.

### `PUT /mi-perfil`

Solo acepta `telefono` (obligatorio), `correo` (obligatorio) y `direccion`.
Cualquier otro campo enviado se ignora: el socio no puede cambiar su nombre,
cédula ni estado de afiliación.

### `GET /mis-aportaciones`

Su historial. Cada registro trae periodo, monto, fecha, estado y motivo de rechazo.

> Nunca incluye `comprobante_ruta` ni `revisado_por`.

### `POST /mis-aportaciones`

`multipart/form-data` con `mes_pagado`, `anio_pagado`, `monto` y `comprobante`
(PDF/JPG/PNG, máx. 5 MB). Nace en estado `Pendiente`.

Rechaza con 422 si ya existe una aportación vigente para ese mes.

### `GET /mis-unidades`

```json
{
  "unidades": [
    {
      "id": 1,
      "numero_vehiculo": "012-01",
      "placa": "MBC-4650",
      "marca": "KIA",
      "tipo_vehiculo": "Sedán",
      "resumen": "Vencido",
      "mantenimientos": [
        {
          "tipo": "Cambio de Aceite",
          "meses_frecuencia": 3,
          "ultima_fecha": "2026-05-22",
          "proxima_fecha": "2026-08-22",
          "dias_restantes": -32,
          "estado": "Vencido"
        }
      ],
      "pendientes_revision": [ ... ],
      "rechazados": [ ... ]
    }
  ],
  "tipos_mantenimiento": ["Cambio de Aceite", "Frenos", ...]
}
```

Estados posibles: `Al día`, `Por vencer`, `Sin registro`, `Vencido`.
El `resumen` de la unidad toma el más urgente, en ese orden de prioridad:
Vencido, Sin registro, Por vencer, Al día.

`dias_restantes` negativo indica días de atraso.

### `POST /mis-unidades/{vehiculo}/mantenimientos`

`multipart/form-data` con `tipo_mantenimiento` (de la lista configurada),
`fecha_mantenimiento` (no futura ni de hace más de un año), `kilometraje_actual`,
`observaciones` y `comprobante`.

- Devuelve **404** si la unidad no pertenece a ese socio.
- Devuelve **422** si ya hay un registro pendiente del mismo tipo, o si el
  kilometraje retrocede.
- Nace con `revision_estado = 'Pendiente'` y `origen = 'socio'`.

---

## Límites de peticiones

| Alcance | Límite |
|---|---|
| `POST /login` por correo | 5 por minuto |
| `POST /login` por IP | 20 por minuto |
| API autenticada | 120 por minuto por usuario |
| Peticiones con archivos | 20 por minuto por usuario |

Al superarlos: **429** con un mensaje en español. Las respuestas incluyen las
cabeceras `X-RateLimit-Limit` y `X-RateLimit-Remaining`.
