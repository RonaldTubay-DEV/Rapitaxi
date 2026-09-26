# 03 · Base de datos

Motor: **PostgreSQL**, tanto en desarrollo como en producción.
Total: **22 tablas** (13 del negocio y 9 de infraestructura de Laravel).

---

## Diagrama de relaciones

```
                    ┌───────────┐
                    │   users   │  Cuentas de acceso (staff y socios)
                    └─────┬─────┘
                          │ 1:1 (opcional)
                          ▼
   ┌──────────────┐   ┌───────────┐   ┌────────────────┐
   │ expedientes  │◄──│  socios   │──►│  aportaciones  │
   │ (documentos) │   │(accionista)│   │ (pago mensual) │
   └──────────────┘   └─────┬─────┘   └────────────────┘
                            │ 1:N
                            ▼
                      ┌───────────┐
                      │ vehiculos │
                      └─────┬─────┘
                            │ 1:N
              ┌─────────────┴─────────────┐
              ▼                           ▼
     ┌─────────────────┐         ┌──────────────┐
     │ mantenimientos  │         │  revisiones  │
     │   (taller)      │         │ (RTV / ANT)  │
     └─────────────────┘         └──────────────┘

   Tablas sin relación directa:
   · configuraciones_mantenimiento   Frecuencia de cada tipo de trabajo
   · libro_contables                 Balances y reportes fiscales
   · notificaciones                  Avisos del panel administrativo
   · activity_log                    Auditoría de todo el sistema
```

---

## Tablas del negocio

### `users` — Cuentas de acceso

Toda persona que entra al sistema tiene un registro aquí, sea personal interno o
socio. El rol determina qué puede hacer.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | Clave primaria |
| `name` | varchar | no | Nombre para mostrar |
| `email` | varchar | no | **Único**. Con él inicia sesión |
| `email_verified_at` | timestamp | sí | No se usa actualmente |
| `password` | varchar | no | Hash bcrypt (12 rondas). **Nunca texto plano** |
| `remember_token` | varchar | sí | Heredado de Laravel |
| `is_active` | boolean | no | `false` bloquea el acceso. Por defecto `true` |
| `created_at` / `updated_at` | timestamp | sí | |

**Relaciones:** `hasOne(Socio)` — una cuenta puede estar vinculada a un socio.

### `socios` — Accionistas de la compañía

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `nombre` | varchar | no | Solo letras y espacios (3-80) |
| `cedula` | varchar | sí | 10 dígitos con verificador válido. **Único entre los no eliminados** |
| `telefono` | varchar | sí | 10 dígitos empezando en 0 |
| `correo` | varchar | sí | |
| `direccion` | varchar | sí | |
| `estado` | varchar | no | `Activo` / `Inactivo`. Por defecto `Activo` |
| `estado_pago` | varchar | no | **Sin uso** (ver advertencia) |
| `observaciones` | text | sí | Notas internas del staff. **Nunca se muestran al socio** |
| `user_id` | bigint | sí | **Único**. Cuenta del portal, si tiene |
| `deleted_at` | timestamp | sí | Borrado suave |

**Índices especiales:**

```sql
CREATE UNIQUE INDEX socios_cedula_unique ON socios (cedula) WHERE deleted_at IS NULL;
```

Este índice **parcial** es la pieza que permite dar de baja a un socio y que otro
pueda usar esa cédula después, sin perder el registro histórico del primero. Un
`UNIQUE` normal lo impediría para siempre.

> **Advertencia — `estado_pago`:** la columna existe pero **no se usa**. El estado
> real se calcula al vuelo con el accessor `estado_pago_actual` del modelo, que
> consulta si hay una aportación **aprobada** del mes en curso. Es deuda técnica:
> la columna debería eliminarse.

> **Nota — campos nulos:** `cedula`, `telefono` y `correo` admiten `NULL` en la
> base de datos porque hay registros anteriores a que se volvieran obligatorios.
> Desde ahora la API los exige al crear o editar.

### `vehiculos` — Unidades de la flota

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `socio_id` | bigint | no | FK a `socios`, **on delete cascade** |
| `numero_vehiculo` | varchar | no | Formato `012-01` |
| `placa` | varchar | no | Formato `MBC-4650`. **Única entre las no eliminadas** |
| `marca` | varchar | no | |
| `tipo_vehiculo` | varchar | no | Sedán, Hatchback, SUV, Station Wagon, Furgoneta, Pickup, Van |
| `combustible` | varchar | no | Gasolina, Diesel, GLP, Eléctrico, Híbrido. Por defecto `Gasolina` |
| `anio_fabricacion` | integer | no | Entre 1980 y el año próximo |
| `color` | varchar | sí | Se fija en `Amarillo` |
| `deleted_at` | timestamp | sí | Borrado suave |

> **Advertencia:** `numero_vehiculo` se valida como único **solo en la capa de la
> aplicación**; no tiene índice único en la base de datos como sí lo tiene `placa`.
> Dos peticiones simultáneas podrían, en teoría, crear duplicados.

> **Nota histórica:** la columna `tipo_vehiculo` se llamaba `modelo` y guardaba
> texto libre ("Aveo Family"). Se renombró y pasó a lista cerrada para coincidir
> con la clasificación de la resolución de habilitación del GAD.

### `aportaciones` — Pagos mensuales

> El nombre interno de la secuencia (`pagos_id_seq`) delata que la tabla se llamó
> `pagos` originalmente y fue renombrada.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `socio_id` | bigint | no | FK a `socios`, cascade |
| `mes_pagado` | integer | no | 1-12 |
| `anio_pagado` | integer | no | |
| `monto` | numeric | no | Mayor a 0 |
| `fecha_pago` | date | no | No puede ser futura |
| `metodo_pago` | varchar | no | Por defecto `Efectivo` |
| `estado` | varchar | no | `Aprobado` / `Pendiente` / `Rechazado`. Por defecto `Aprobado` |
| `comprobante_ruta` | varchar | sí | Ruta en R2. **Nunca se envía al socio** |
| `motivo_rechazo` | varchar | sí | Lo ve el socio |
| `revisado_por` | bigint | sí | FK a `users`, **on delete set null** |
| `revisado_en` | timestamp | sí | |
| `deleted_at` | timestamp | sí | Borrado suave |

**Regla clave:** solo las aportaciones con `estado = 'Aprobado'` cuentan para
considerar al socio "Al día".

### `mantenimientos` — Trabajos de taller

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `vehiculo_id` | bigint | no | FK a `vehiculos`, cascade |
| `fecha_mantenimiento` | date | no | No futura si está completado |
| `tipo_mantenimiento` | varchar | no | |
| `kilometraje_actual` | integer | no | No puede retroceder respecto al anterior |
| `proximo_mantenimiento_km` | integer | sí | Referencia informativa |
| `comprobante_ruta` | varchar | sí | Respaldo del trabajo en R2 |
| `mecanico` | varchar | sí | |
| `estado` | varchar | no | `Programado` / `En Proceso` / `Completado` |
| `observaciones` | text | sí | Detalle del trabajo |
| `revision_estado` | varchar | no | `Aprobado` / `Pendiente` / `Rechazado`. Por defecto `Aprobado` |
| `origen` | varchar | no | `staff` / `socio`. Por defecto `staff` |
| `motivo_rechazo` | text | sí | |
| `revisado_por` | bigint | sí | FK a `users`, set null |
| `revisado_en` | timestamp | sí | |
| `deleted_at` | timestamp | sí | Borrado suave |

**Dos estados distintos, a propósito:**

- `estado` describe **el trabajo**: si está programado, en curso o terminado.
- `revision_estado` describe **el registro**: si el staff ya lo confirmó.

Un mantenimiento que envía un socio nace con `estado = 'Completado'` (el trabajo ya
se hizo) pero `revision_estado = 'Pendiente'`. Solo cuando pasa a `Aprobado`
cuenta para poner la unidad al día. Los que registra el staff nacen aprobados.

> **Nota histórica:** existía una columna `costo`. Se eliminó porque cada socio
> paga sus propios trabajos: la compañía solo necesita saber qué se hizo y cuándo.

### `revisiones` — RTV y trámites

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `vehiculo_id` | bigint | no | FK a `vehiculos`, cascade |
| `fecha_revision` | date | no | No futura si está Aprobada o Rechazada |
| `tipo` | varchar | no | Por defecto `RTV Manta` |
| `estado` | varchar | no | `Aprobada` / `Rechazada` / `Pendiente` |
| `observaciones` | text | sí | |

> **Advertencia:** esta tabla **no tiene borrado suave**. Eliminar una revisión la
> borra definitivamente.

### `expedientes` — Documentos de los socios

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `socio_id` | bigint | no | FK a `socios`, cascade |
| `nombre_documento` | varchar | no | Ej. "Matrícula 2026" |
| `tipo_documento` | varchar | no | Extensión real del archivo |
| `ruta_archivo` | varchar | no | Ruta en R2 |

> **Advertencia:** sin borrado suave. Además, al eliminar un socio en firme, la
> cascada borra sus expedientes de la base, pero **los archivos quedan en R2**.

### `libro_contables` — Balances y reportes

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `titulo` | varchar | no | |
| `mes_anio` | varchar | sí | |
| `archivo_ruta` | varchar | no | PDF en R2 |
| `descripcion` | text | sí | |
| `deleted_at` | timestamp | sí | Borrado suave |

### `configuraciones_mantenimiento` — Frecuencias

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `tipo_mantenimiento` | varchar | no | |
| `meses_frecuencia` | integer | no | Cada cuánto toca. Por defecto 6 |
| `dias_anticipacion` | integer | no | Con cuánto avisar. Por defecto 7 |

Se siembra con cinco tipos (aceite, frenos, suspensión, llantas, sistema eléctrico)
en cada arranque del contenedor, sin pisar lo que el admin haya cambiado.

> **Nota histórica:** tenía una columna `km_anticipacion` que se eliminó. El aviso
> se calcula solo por tiempo, porque el sistema no conoce el kilometraje actual de
> una unidad entre un mantenimiento y otro.

### `notificaciones` — Avisos del panel

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | bigint | no | |
| `tipo` | varchar | no | Por defecto `info` |
| `titulo` | varchar | no | |
| `mensaje` | text | no | |
| `leida` | boolean | no | Por defecto `false` |

> **Advertencia:** estas notificaciones **no tienen destinatario**. Son globales
> para el staff y alimentan la campanita del panel. El endpoint solo devuelve las
> de título "Socio registrado" y "Vehiculo registrado". No sirven para notificar a
> un socio: el aviso de mantenimiento del portal se calcula al vuelo, no sale de
> esta tabla.

### `activity_log` — Auditoría

Tabla de spatie/laravel-activitylog.

| Columna | Tipo | Notas |
|---|---|---|
| `log_name` | varchar | Módulo: `socios`, `vehiculos`, `usuarios`… |
| `description` | text | `created`, `updated`, `deleted` |
| `subject_type` / `subject_id` | varchar / bigint | Sobre qué registro |
| `causer_type` / `causer_id` | varchar / bigint | Qué usuario lo hizo |
| `properties` | json | Valores antes y después, más `ip` y `user_agent` |
| `event` | varchar | Tipo de evento |
| `batch_uuid` | uuid | Agrupa cambios relacionados |

Ocho modelos se auditan automáticamente: Socio, Vehiculo, Aportacion,
Mantenimiento, LibroContable, Revision, Expediente y User.

---

## Tablas de roles y permisos

De spatie/laravel-permission:

| Tabla | Contenido |
|---|---|
| `roles` | 3 filas: `admin`, `operador`, `socio` |
| `permissions` | 32 permisos con formato `modulo.accion` |
| `model_has_roles` | Qué rol tiene cada usuario |
| `role_has_permissions` | Qué permisos tiene cada rol |
| `model_has_permissions` | Permisos directos a un usuario (sin uso) |

Los 32 permisos cubren: usuarios, socios, vehículos, expedientes, mantenimientos,
revisiones, aportaciones, libros-contables, reportes y configuración, con las
acciones ver, crear, editar y eliminar según el módulo.

> **Importante:** los permisos están sembrados pero **la autorización real se hace
> por rol**, no por permiso. Las rutas usan `role:admin|operador`, no
> `permission:socios.editar`. La estructura está lista para una autorización más
> granular en el futuro, pero hoy no se consulta.

---

## Tablas de infraestructura de Laravel

| Tabla | Para qué |
|---|---|
| `migrations` | Control de versiones del esquema (30 aplicadas) |
| `personal_access_tokens` | Tokens de sesión de Sanctum, con `expires_at` |
| `cache` / `cache_locks` | Caché y contadores de límite de peticiones |
| `jobs` / `job_batches` / `failed_jobs` | Cola de tareas (sin uso por ahora) |
| `password_reset_tokens` | Recuperación de contraseña (sin implementar) |
| `sessions` | Sesiones web (no se usa: la API es sin estado) |

---

## Índices de rendimiento

En PostgreSQL una `FOREIGN KEY` **no crea índice automáticamente**, a diferencia de
MySQL. Sin índice, cada JOIN con la tabla padre y cada borrado en cascada recorre
la tabla entera.

La migración `2026_09_23_000001_add_indices_a_claves_foraneas` agregó los que
faltaban, con índices compuestos donde la consulta real filtra por varias columnas:

| Tabla | Índice | Consulta que acelera |
|---|---|---|
| `aportaciones` | `(socio_id, anio_pagado, mes_pagado)` | El accessor `estado_pago_actual` |
| `aportaciones` | `(revisado_por)` | Quién revisó cada comprobante |
| `vehiculos` | `(socio_id)` | Vehículos de un socio |
| `mantenimientos` | `(vehiculo_id, estado, fecha_mantenimiento)` | `PlanMantenimiento` |
| `mantenimientos` | `(revisado_por)` | |
| `revisiones` | `(vehiculo_id, estado, fecha_revision)` | RTV vigente del dashboard |
| `expedientes` | `(socio_id)` | Documentos de un socio |

> Al agregar una tabla nueva con clave foránea, **hay que crear su índice a mano**.

### Atributos calculados del modelo `Socio`

El modelo expone cuatro atributos que no son columnas: `estado_pago_actual`,
`numero_vehiculo`, `placa` y `cuenta_activa`.

**No se agregan automáticamente.** Antes estaban en `$appends`, lo que los
calculaba siempre, incluso cuando el socio viajaba anidado dentro de otra
respuesta: listar 4.800 aportaciones con su socio costaba unas 5.000 consultas.

Ahora viven en la constante `Socio::ATRIBUTOS_CALCULADOS` y los controladores que
alimentan la pantalla de Socios los agregan de forma explícita:

```php
$socios = $query->with([...])->get()->append(Socio::ATRIBUTOS_CALCULADOS);
```

> Si una pantalla nueva necesita esos valores, hay que agregarlos en su
> controlador. Si aparecen en `null`, es porque falta ese `append()`.

---

## Estrategia de borrado

El sistema **casi nunca borra de verdad**. Siete tablas usan borrado suave
(`deleted_at`): al "eliminar", el registro se marca con la fecha y desaparece de
las consultas normales, pero se conserva.

Razones:

1. Un socio dado de baja puede volver, y su historial debe seguir ahí.
2. La cooperativa necesita poder demostrar qué pasó con cada unidad.
3. Un borrado por error es recuperable.

**Trampa conocida.** El borrado suave es una regla de Eloquent, no de la base de
datos. Una consulta escrita en SQL directo (`DB::table(...)`) **sí ve los
registros eliminados**. Esto ya causó un error real: un socio dado de baja seguía
apareciendo en el cuadro maestro. Se corrigió agregando `whereNull('deleted_at')`
explícitamente en `ReporteController`.

> Al escribir consultas con `DB::table()` hay que filtrar los eliminados a mano.

---

## Cómo inspeccionar la base de datos

```bash
cd rapitaxi-backend

# Estado de las migraciones
php artisan migrate:status

# Estructura de una tabla
php artisan db:table socios

# Consultas interactivas
php artisan tinker
>>> App\Models\Socio::withTrashed()->count()
```
