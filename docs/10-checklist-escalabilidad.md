# 10 · Checklist de escalabilidad

Qué falta para que RapiTaxi soporte crecer: más datos, más usuarios y más
cooperativas.

**Cómo usar este documento.** Cada punto tiene una casilla, una prioridad y una
estimación. Los marcados como 🔴 son los que revientan primero.

---

## Estado actual: por qué hoy no se nota

El sistema opera con **66 unidades y ~66 socios**. A ese tamaño cualquier
ineficiencia pasa desapercibida. Los problemas aparecen cuando:

- La cooperativa acumula años de historial (aportaciones y mantenimientos).
- El sistema se vende a varias cooperativas.
- Varias personas lo usan a la vez.

### Medición real

Se cargaron **202 socios, 200 vehículos y 4.800 aportaciones** (dos años de
historial) en la base local para medir, invocando el código real de cada
controlador y contando las consultas con `DB::enableQueryLog()`.

**Resultado de las optimizaciones aplicadas** (ver sección 1):

| Controlador | Antes | Después | Mejora |
|---|---|---|---|
| `SocioController@index` | 4.806 consultas · 4.030 ms · 1.757 KB | **4 consultas · 261 ms · 219 KB** | 1.200× menos consultas |
| `AportacionController@index` | 5.002 consultas · 12.693 ms | **2 consultas · 2.422 ms** | 2.500× menos consultas |
| `VehiculoController@index` | 402 consultas · 873 ms · 207 KB | **2 consultas · 101 ms · 124 KB** | 200× menos consultas |

> `/aportaciones` sigue tardando 2,4 segundos porque devuelve **4.800 registros
> sin paginar**. Las consultas ya no son el problema; el volumen sí. Lo resuelve
> el punto 1.2, que sigue pendiente.

---

## 1. Rendimiento

### 1.1 Quitar la consulta de esquema del modelo `Aportacion` ✅

- [x] **Aplicado el 23/09/2026**

El modelo tenía esto en su constructor:

```php
public function __construct(array $attributes = [])
{
    parent::__construct($attributes);
    $this->table = Schema::hasTable('aportaciones') ? 'aportaciones' : (...);
}
```

`Schema::hasTable()` **consulta la base de datos**. Como está en el constructor,
se ejecuta **una vez por cada objeto que se crea**.

**Medido:** hidratar 500 aportaciones dispara **502 consultas al esquema** (411 ms
solo en eso). Es la causa directa de los 4.800 consultas en los dos endpoints
lentos.

Era un apaño de cuando la tabla se renombró de `pagos` a `aportaciones`. La
migración ya se aplicó hace tiempo.

**Aplicado:** se reemplazó por `protected $table = 'aportaciones';` y se borró el
constructor junto con el `use ...\Schema;`.

**Efecto medido:** hidratar 500 aportaciones pasó de **502 consultas al esquema
(411 ms) a 0 consultas (10 ms)**.

### 1.2 Paginar los listados que crecen sin techo ✅

- [x] **Aplicado el 23/09/2026**

**Criterio:** se paginó lo que crece sin límite; lo acotado por el negocio se
dejó completo porque además alimenta los selectores de los formularios.

| Endpoint | Decisión | Por qué |
|---|---|---|
| `/aportaciones` | ✅ Paginado | 12 filas por socio al año, sin techo |
| `/mantenimientos` | ✅ Paginado | Varios trabajos por unidad al año |
| `/revisiones` | ✅ Paginado | Crece con cada RTV |
| `/auditoria` | ✅ Ya paginaba | |
| `/socios` | Sin paginar | El permiso de operación limita los cupos (66) |
| `/vehiculos` | Sin paginar | Uno por cupo; alimenta los selectores |
| `/usuarios` | Sin paginar | Personal de oficina, pocos |
| `/libros-contables` | Sin paginar | 12 al año |
| `/expedientes` | Sin paginar | Se piden filtrados por socio |

**Lo aplicado:**

- `->paginate()` con 25 por página por defecto, configurable con `?per_page=`
  y **tope de 100**: nadie puede pedir la tabla entera.
- **La búsqueda y los filtros pasaron al servidor.** Filtrar en el navegador
  solo alcanzaría a la página visible: buscar un socio no lo encontraría si
  su registro cayó en la página 3.
- **Las bandejas de pendientes se piden aparte** (`?revision=Pendiente`,
  `?estado=Pendiente`). Si salieran de la página visible, un pendiente en la
  página 3 no se mostraría y nadie lo revisaría nunca.
- **Los catálogos se cargan una sola vez.** Antes cada cambio de página
  recargaba también socios o vehículos, que no cambian al paginar.
- Medio segundo de espera al escribir en el buscador, para no lanzar una
  consulta por cada tecla.
- Componente `Paginacion.jsx` reutilizable por las tres pantallas.

> **Dos detalles que solo aparecieron al probar en el navegador:**
>
> 1. El cambio de formato de respuesta (de arreglo a `{data, total, …}`) rompió
>    una prueba del backend que leía `0.socio.nombre`. Exactamente el mismo
>    error que habría roto las pantallas de no haberlas adaptado.
> 2. Cargar el catálogo en cada cambio de página hacía que la tabla tardara
>    ~3 segundos en refrescar. Separarlo lo dejó en una sola consulta.

### 1.3 Dejar de cargar aportaciones en el listado de socios ✅

- [x] **Aplicado el 23/09/2026**

El controlador hacía:

```php
$socios = $query->with(['vehiculos', 'user', 'aportaciones'])->get();
```

Cargaba **todas** las aportaciones históricas de **todos** los socios solo para
calcular si están al día este mes. Con 24 meses por socio, miles de registros que
nadie mira.

**Aplicado:** se filtra la relación al mes en curso, que es lo único que mira el
accessor `estado_pago_actual`:

```php
'aportaciones' => fn ($q) => $q
    ->where('mes_pagado', now()->month)
    ->where('anio_pagado', now()->year),
```

Antes se verificó que el frontend no consuma `socio.aportaciones` en ninguna
pantalla: solo usa el accessor.

**Efecto medido:** la respuesta de `/socios` pasó de **1.757 KB a 219 KB**.

### 1.3-bis Quitar los accessors automáticos del modelo `Socio` ✅

- [x] **Aplicado el 23/09/2026 · Hallazgo que apareció al volver a medir**

Al medir el código real (no una copia) se vio que `/aportaciones` había
**empeorado a 5.002 consultas**. La causa era distinta a las anteriores:

```php
protected $appends = ['estado_pago_actual', 'numero_vehiculo', 'placa', 'cuenta_activa'];
```

Los cuatro atributos se calculaban **siempre**, incluso cuando el socio viajaba
anidado dentro de otra respuesta. Cada aportación traía su socio, y cada socio
ejecutaba sus cuatro accessors, cada uno con sus propias consultas.

**Aplicado:** se convirtió `$appends` en la constante `Socio::ATRIBUTOS_CALCULADOS`
y los controladores que alimentan la pantalla de Socios los agregan de forma
explícita con `->append(Socio::ATRIBUTOS_CALCULADOS)`.

Antes se verificó en todo el frontend que solo `SociosScreen` los consume; las
pantallas con socio anidado usan únicamente `nombre`, `id` y `cedula`.

**Efecto medido:**

| Controlador | Antes | Después |
|---|---|---|
| `AportacionController@index` | 5.002 consultas · 12.693 ms | 2 consultas · 2.422 ms |
| `VehiculoController@index` | 402 consultas · 873 ms | 2 consultas · 101 ms |

> **Lección:** medir replicando el código del controlador en un script es frágil —
> la copia se desactualiza y miente. Hay que invocar el método real.

### 1.4 Agregar índices a las claves foráneas ✅

- [x] **Aplicado el 23/09/2026**

En PostgreSQL una `FOREIGN KEY` **no crea índice automáticamente** (a diferencia de
MySQL). Sin índice, cada JOIN y cada borrado en cascada recorre la tabla entera.

**Verificado: 8 claves foráneas sin índice**, incluidas las más usadas:

```
aportaciones.socio_id        ← la más crítica
aportaciones.revisado_por
vehiculos.socio_id
mantenimientos.vehiculo_id
mantenimientos.revisado_por
revisiones.vehiculo_id
expedientes.socio_id
role_has_permissions.role_id
```

**Aplicado:** migración `2026_09_23_000001_add_indices_a_claves_foraneas.php` con
índices simples y, donde la consulta lo justifica, compuestos que cubren el patrón
real de búsqueda:

| Tabla | Índice | Consulta que acelera |
|---|---|---|
| `aportaciones` | `(socio_id, anio_pagado, mes_pagado)` | El accessor `estado_pago_actual` |
| `aportaciones` | `(revisado_por)` | |
| `vehiculos` | `(socio_id)` | Vehículos de un socio |
| `mantenimientos` | `(vehiculo_id, estado, fecha_mantenimiento)` | `PlanMantenimiento` |
| `mantenimientos` | `(revisado_por)` | |
| `revisiones` | `(vehiculo_id, estado, fecha_revision)` | RTV vigente del dashboard |
| `expedientes` | `(socio_id)` | Documentos de un socio |

### 1.5 Índice único real en `numero_vehiculo`

- [ ] **Prioridad: media · Esfuerzo: 15 minutos**

Hoy la unicidad se valida solo en la aplicación. Dos peticiones simultáneas podrían
crear duplicados. `placa` sí tiene índice único parcial; `numero_vehiculo` no.

### 1.6 Revisar el resto de consultas N+1

- [ ] **Prioridad: media · Esfuerzo: medio día**

Los accessors `numero_vehiculo` y `placa` del modelo `Socio` hacen
`$this->vehiculos->first()`. Si la relación no viene precargada, es una consulta
por socio.

**Herramienta recomendada:** instalar `laravel-debugbar` en desarrollo para ver el
conteo de consultas por pantalla.

---

## 2. Multi-cooperativa (multi-tenant) 🔴

**Este es el punto que decide si el sistema se puede vender.**

Hoy el sistema asume **una sola cooperativa**. Los datos de RapitaxisMontecristi
están escritos en el código:

```jsx
<h1>Compañía RapitaxisMontecristi S.A.</h1>
<p>Monitoreo en tiempo real de RapitaxisMontecristi S.A.</p>
```

Vender a otra cooperativa hoy exige **duplicar todo el despliegue**: otra base de
datos, otro servicio en Render, otro sitio en Netlify, y mantener N copias del
código.

### 2.1 Decidir la estrategia

- [ ] **Prioridad: crítica · Esfuerzo: decisión de arquitectura**

| Estrategia | Cómo funciona | Ventaja | Desventaja |
|---|---|---|---|
| **Una instancia por cliente** | Cada cooperativa tiene su despliegue | Aislamiento total, cero cambios de código | Costo y mantenimiento se multiplican por cliente |
| **Base de datos por cliente** | Un código, N bases, se elige por dominio | Buen aislamiento, un solo despliegue | Migraciones en N bases |
| **Columna `cooperativa_id`** | Una sola base, todo filtrado | Más barato y simple de operar | Un error de filtrado expone datos de otro cliente |

**Recomendación para este caso:** empezar por **datos de la compañía configurables**
(punto 2.2), que sirve para las tres estrategias, y adoptar **base de datos por
cliente** cuando aparezca el segundo cliente. Evita el riesgo de fuga de datos de
la tercera opción sin multiplicar los despliegues como la primera.

### 2.2 Hacer configurables los datos de la compañía

- [ ] **Prioridad: crítica · Esfuerzo: 1 día**

Crear una tabla `configuracion_empresa` con: razón social, RUC, permiso de
operación, gerente, logo, colores de marca, dirección y teléfono.

Reemplazar todos los textos fijos del frontend por esos valores.

**Sin esto, cada venta exige editar el código fuente.**

### 2.3 Si se elige columna `cooperativa_id`

- [ ] **Prioridad: solo si se elige esa vía · Esfuerzo: 1 semana**

- Agregar `cooperativa_id` a todas las tablas del negocio.
- Un **global scope** de Eloquent que filtre automáticamente en cada consulta.
- **Revisar cada `DB::table()` a mano**: los scopes no aplican al SQL directo
  (ya ocurrió con el borrado suave en el cuadro maestro).
- Pruebas específicas de aislamiento: que un usuario de la cooperativa A no vea
  jamás datos de la B.

---

## 3. Infraestructura 🔴

### 3.1 Base de datos con respaldos

- [ ] **Prioridad: crítica · Esfuerzo: contratar un plan**

El plan gratuito de Render **caduca a los 30 días y no respalda nada**. Perder la
base es perder todo: socios, pagos, historial.

**Mínimo aceptable:** respaldo diario automático con retención de 7 días y una
restauración probada al menos una vez.

### 3.2 Integración continua

- [ ] **Prioridad: alta · Esfuerzo: 3 horas**

Hoy las pruebas se ejecutan a mano. Nada impide desplegar código roto.

Un flujo de GitHub Actions que en cada push ejecute:

```yaml
- php artisan test
- npm run build
- npx eslint src/
```

Y que **bloquee el merge si algo falla**.

### 3.3 Monitoreo de errores

- [ ] **Prioridad: alta · Esfuerzo: 2 horas**

Hoy, si un socio tiene un error en producción, **nadie se entera** salvo que
llame por teléfono. No hay forma de saber qué pasó.

Integrar **Sentry** (tiene plan gratuito) en backend y frontend: captura la
excepción, la traza y el contexto.

### 3.4 Monitoreo de disponibilidad

- [ ] **Prioridad: media · Esfuerzo: 30 minutos**

El endpoint `/up` ya existe. Falta alguien que lo consulte.

Configurar UptimeRobot o similar con aviso por correo si la API deja de responder.

> Detalle del plan gratuito de Render: el servicio **se duerme tras inactividad** y
> la primera petición puede tardar 30 segundos o más. Un monitor cada 5 minutos lo
> mantiene despierto, además de avisar de caídas.

### 3.5 Caché de consultas frecuentes

- [ ] **Prioridad: media · Esfuerzo: medio día**

Datos que cambian poco y se consultan siempre:

- Configuraciones de mantenimiento (se leen en cada carga del portal).
- KPIs del dashboard (se recalculan en cada visita).

`Cache::remember()` con unos minutos de vigencia reduciría la carga notablemente.

> Hoy el driver de caché es `database`, lo que significa que cachear **también
> consulta la base**. Para que valga la pena, conviene pasar a Redis.

### 3.6 Registros de log estructurados

- [ ] **Prioridad: baja · Esfuerzo: 2 horas**

Hoy `LOG_LEVEL=debug` y el canal es un archivo único. En producción conviene
`LOG_LEVEL=warning`, rotación diaria y formato JSON.

---

## 4. Código y mantenibilidad 🟡

### 4.1 Versionado de la API

- [ ] **Prioridad: alta · Esfuerzo: 2 horas**

Las rutas son `/api/socios`. Si mañana cambia el formato de una respuesta, se
rompen todos los clientes a la vez, incluida una futura app móvil.

**Arreglo:** mover a `/api/v1/` y mantener la versión anterior mientras haga falta.
Cuanto antes se haga, menos cuesta.

### 4.2 Respuestas con formato consistente (API Resources)

- [ ] **Prioridad: media · Esfuerzo: 2 días**

Hoy cada controlador arma la respuesta a su manera: algunos devuelven el modelo
completo, otros arreglos construidos a mano. El portal del socio ya tuvo una fuga
de datos internos justamente por devolver el modelo entero.

Los **API Resources** de Laravel centralizan qué campos se exponen de cada entidad.
Es la defensa estructural contra ese tipo de fuga.

### 4.3 Form Requests en vez de validar en el controlador

- [ ] **Prioridad: media · Esfuerzo: 1 día**

Hoy las reglas se repiten entre `store()` y `update()` del mismo controlador, y
entre el panel y el portal. Duplicación que se desincroniza con el tiempo.

### 4.4 Eliminar `$request->all()`

- [ ] **Prioridad: media · Esfuerzo: 1 hora**

Quedan dos casos (`VehiculoController` y `RevisionController`). Cualquier campo
enviado que sea `fillable` se guarda sin control. El resto ya usa listas explícitas.

### 4.5 Pruebas del frontend

- [ ] **Prioridad: media · Esfuerzo: 1 semana**

El backend tiene 81 pruebas; el frontend, ninguna. Toda verificación es manual.

Empezar por lo crítico: `validators.js`, `ProtectedRoute`, `apiClient` y
`sessionGuard`.

### 4.6 Limpiar la deuda conocida

- [ ] **Prioridad: baja · Esfuerzo: medio día**

- Eliminar la columna `socios.estado_pago` (no se usa).
- Agregar borrado suave a `revisiones` y `expedientes`.
- Unificar el criterio de "unidad descuidada" entre dashboard y portal.
- Resolver los errores de ESLint preexistentes.
- `APP_LOCALE=es` para traducir los mensajes de validación.

---

## 5. Seguridad pendiente 🟡

### 5.1 Actualizar dependencias vulnerables

- [ ] **Prioridad: alta · Esfuerzo: medio día con pruebas**

`composer audit` reporta 25 avisos y `npm audit` 9. Se resuelven con
`composer update` y `npm audit fix`, pero cambian los `.lock`: hay que ejecutar la
suite completa antes de desplegar.

### 5.2 Acotar `trustProxies`

- [ ] **Prioridad: media · Esfuerzo: 1 hora**

`trustProxies(at: '*')` permite falsificar la IP que queda en la auditoría.
Declarar el rango real de Render en su lugar.

### 5.3 Recuperación de contraseña

- [ ] **Prioridad: media · Esfuerzo: 1 día**

Hoy, si un socio olvida su contraseña, un admin debe cambiársela a mano. Con 66
socios es manejable; con varias cooperativas se vuelve una carga de soporte diaria.

Requiere configurar el envío de correo (hoy `MAIL_MAILER=log`).

### 5.4 Limpiar archivos huérfanos en R2

- [ ] **Prioridad: baja · Esfuerzo: medio día**

Al eliminar un socio en firme, sus expedientes se borran de la base pero los
archivos quedan en el bucket ocupando espacio.

### 5.5 Segundo factor para administradores

- [ ] **Prioridad: baja · Esfuerzo: 2 días**

Deseable cuando el sistema maneje datos de varias cooperativas.

---

## 6. Producto 🟢

### 6.1 Modelar los traspasos de acciones

- [ ] **Prioridad: alta · Esfuerzo: 3 días**

**Es el trámite más frecuente de la cooperativa** y no está modelado: de 66
unidades, **56 tienen carta de cesión** y 16 tienen resolución de cambio de socio.

Hoy solo queda el cambio de `socio_id` en la auditoría, sin resolución, sin fecha,
sin cedente ni cesionario.

### 6.2 Campos de matrícula y habilitación

- [ ] **Prioridad: alta · Esfuerzo: 2 días**

Chasis, motor, cilindraje, fecha de matrícula y su caducidad, número de resolución.
Con las fechas de caducidad se pueden generar alertas como las de mantenimiento.

### 6.3 Vista consolidada de la flota para el staff

- [ ] **Prioridad: media · Esfuerzo: 1 día**

Cada socio ve el plan de mantenimiento de sus unidades, pero **el staff no tiene
una vista de toda la flota**. El servicio `PlanMantenimiento` ya hace el cálculo:
falta el endpoint y la pantalla.

### 6.4 Notificaciones con destinatario

- [ ] **Prioridad: media · Esfuerzo: 2 días**

La tabla `notificaciones` no tiene `user_id`. Agregarlo y generar avisos en los
eventos que importan (comprobante pendiente, mantenimiento vencido, socio en mora).

### 6.5 Reportes históricos

- [ ] **Prioridad: baja · Esfuerzo: 1 semana**

Morosidad por periodo, cumplimiento de mantenimiento, historial por unidad.

### 6.6 Exportar a Excel o PDF

- [ ] **Prioridad: baja · Esfuerzo: 3 días**

Hoy solo se puede imprimir el cuadro maestro desde el navegador.

---

## Orden sugerido

### Semana 1 — Lo que revienta primero

1. [x] ~~Quitar `Schema::hasTable()` del modelo `Aportacion`~~ ✅ **hecho**
2. [x] ~~Índices en las 8 claves foráneas~~ ✅ **hecho**
3. [x] ~~No cargar todas las aportaciones en `/socios`~~ ✅ **hecho**
4. [x] ~~Quitar los accessors automáticos del modelo `Socio`~~ ✅ **hecho** *(apareció al medir)*
5. [x] ~~Paginar los listados que crecen sin techo~~ ✅ **hecho**
6. [ ] Contratar base de datos con respaldos *(crítico antes de datos reales)*

> Con esto el bloque de rendimiento queda cerrado: las consultas bajaron de
> miles a menos de cinco por endpoint, y las respuestas de megabytes a páginas
> de 25 registros. Lo que queda de la Semana 1 es infraestructura, no código.

### Semana 2 — Que no se rompa en silencio

6. [ ] Integración continua con GitHub Actions
7. [ ] Sentry en backend y frontend
8. [ ] Monitoreo de disponibilidad
9. [ ] Actualizar dependencias vulnerables

### Mes 1 — Preparar la venta

10. [ ] Datos de la compañía configurables
11. [ ] Decidir la estrategia multi-cooperativa
12. [ ] Versionado de la API (`/api/v1/`)
13. [ ] Modelar traspasos de acciones

### Mes 2-3 — Consolidar

14. [ ] API Resources y Form Requests
15. [ ] Pruebas del frontend
16. [ ] Recuperación de contraseña
17. [ ] Campos de matrícula con alertas de vencimiento
18. [ ] Limpiar deuda técnica

---

## Cómo saber si está funcionando

Métricas a vigilar después de cada bloque:

| Métrica (con 202 socios y 4.800 aportaciones) | Inicial | Hoy | Objetivo |
|---|---|---|---|
| Consultas en `GET /socios` | 4.806 | **4** ✅ | Menos de 10 |
| Tiempo de `GET /socios` | 4.030 ms | **261 ms** ✅ | Menos de 300 ms |
| Tamaño de `GET /socios` | 1.757 KB | **219 KB** | Menos de 100 KB *(requiere paginar)* |
| Consultas en `GET /aportaciones` | 5.002 | **2** ✅ | Menos de 10 |
| Tiempo de `GET /aportaciones` | 12.693 ms | **~60 ms** ✅ *(paginado a 25)* | Menos de 300 ms |
| Cobertura de pruebas del frontend | 0 % | 0 % | Rutas críticas cubiertas |
| Tiempo de detección de un error en producción | Indefinido | Indefinido | Minutos |

> La medición se puede repetir con el script usado para este documento: crear
> volumen de prueba, contar consultas con `DB::enableQueryLog()` y limpiar después.
> **Marcar los datos de prueba con una etiqueta reconocible para poder borrarlos.**
