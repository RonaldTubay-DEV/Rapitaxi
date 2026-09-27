# 09 · Estado actual y pendientes

Inventario honesto de qué está terminado, qué quedó a medias y qué falta.

---

## 1. Funcionalidades terminadas

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación y roles | ✅ Completo | Token con vencimiento, 3 roles separados |
| Gestión de socios | ✅ Completo | Alta, baja con motivo, reactivación con historial |
| Cuentas del portal | ✅ Completo | Creación, activación y desactivación |
| Vehículos | ✅ Completo | Con tipo y combustible según documentos oficiales |
| Expedientes | ✅ Completo | Clasificados por tipo, con control de vencimientos y completitud |
| Aportaciones | ✅ Completo | Pago manual y comprobante con aprobación |
| Mantenimiento | ✅ Completo | Preventivo/correctivo, plan de frecuencias y aprobación |
| Revisiones (RTV) | ✅ Completo | Vencimiento real, aviso al socio y dashboard coherente |
| Libros contables | ✅ Completo | |
| Dashboard | ✅ Completo | 4 indicadores más estado legal y actividad |
| Cuadro maestro (Actas) | ✅ Completo | Con impresión |
| Auditoría | ✅ Completo | Con IP y dispositivo |
| Portal del socio | ✅ Completo | Perfil, unidades y aportaciones |
| Modo oscuro | ✅ Completo | Toda la aplicación |
| Diseño móvil | ✅ Verificado | Probado en 360, 390, 768 y 1366 px |

---

## 2. Terminado a medias

### Notificaciones del panel

**Estado:** funciona parcialmente.

La campanita del panel muestra avisos, pero:

- Solo se generan al registrar socios y vehículos.
- No tienen destinatario (`notificaciones` no tiene `user_id`): son globales.
- El endpoint filtra por dos títulos fijos.
- Un socio no puede recibir ninguna.

El aviso de mantenimiento del portal **no** usa esta tabla: se calcula al vuelo.

**Para completarlo:** agregar `user_id` a la tabla y generar avisos en los eventos
que importan (comprobante pendiente, mantenimiento vencido, socio en mora).

### Permisos granulares

**Estado:** sembrados pero sin usar.

Existen 32 permisos (`socios.crear`, `vehiculos.editar`…) asignados a los roles,
pero la autorización real se hace **por rol**, no por permiso. Las rutas usan
`role:admin|operador`.

**Para completarlo:** cambiar los middleware a `permission:` y construir una
pantalla para asignar permisos. Solo vale la pena si la cooperativa necesita
perfiles más finos que los tres actuales.

### Campo `proximo_mantenimiento_km`

**Estado:** se guarda, se muestra, pero no dispara nada.

Es informativo. El plan de mantenimiento se calcula solo por tiempo, porque el
sistema no conoce el kilometraje actual entre trabajos.

**Para completarlo:** permitir que el socio reporte su odómetro desde el portal y
combinar ambos criterios (lo que ocurra primero).

---

## 3. Deuda técnica

### En la base de datos

| Problema | Impacto | Solución |
|---|---|---|
| `socios.estado_pago` sin uso | Confunde: el valor real se calcula al vuelo | Eliminar la columna |
| `numero_vehiculo` sin índice único | Dos peticiones simultáneas podrían duplicarlo | Agregar índice único parcial como el de `placa` |
| `revisiones` y `expedientes` sin borrado suave | Un borrado es irreversible | Agregar `deleted_at` |
| Archivos huérfanos en R2 | Al borrar en firme, el archivo queda | Limpiar al eliminar definitivamente |
| ~~Claves foráneas sin índice~~ | ~~JOINs lentos al crecer~~ | ✅ **Resuelto** (23/09/2026) |
| ~~`Schema::hasTable()` en el constructor de `Aportacion`~~ | ~~Una consulta al esquema por cada modelo~~ | ✅ **Resuelto** (23/09/2026) |
| ~~`$appends` automáticos en `Socio`~~ | ~~Miles de consultas al anidar socios~~ | ✅ **Resuelto** (23/09/2026) |

### En el backend

| Problema | Impacto |
|---|---|
| `$request->all()` en `VehiculoController` y `RevisionController` | Riesgo de asignación masiva; el resto ya usa listas explícitas |
| Mensajes de validación en inglés | `APP_LOCALE=en`; el frontend traduce solo los más usados |
| Sin versionado de API | Un cambio incompatible rompería a todos los clientes |
| `trustProxies('*')` | La IP de la auditoría es falsificable |

### En el frontend

| Problema | Impacto |
|---|---|
| 41 llamadas a `fetch` que no pasan por `apiClient` | Cada pantalla repite el token, las cabeceras y el manejo de error; mitigado con `sessionGuard.js` |
| 11 avisos de `set-state-in-effect` | Un render extra al montar; no son errores de comportamiento |
| `AuthContext.jsx` exporta componente y hook juntos | El recargado en caliente de Vite no funciona en ese archivo |
| Sin pruebas automatizadas | Toda verificación es manual |
| Tablas con desplazamiento horizontal en móvil | Aceptable pero mejorable con tarjetas |

### Incoherencia entre criterios

El dashboard cuenta "Sin Taller" con un umbral fijo de **6 meses**, mientras que el
portal del socio usa las **frecuencias configurables por tipo**. Son dos
definiciones distintas de "unidad descuidada" conviviendo.

**Recomendación:** que el dashboard pase a contar unidades con algún mantenimiento
vencido según el plan.

La incoherencia equivalente en la RTV **ya se resolvió** (27/09/2026): el
dashboard y el portal usan los dos la fecha de vencimiento del certificado, y la
ventana de 12 meses quedó solo como respaldo para las revisiones cargadas sin
fecha.

---

## 4. Pendientes de infraestructura

### Crítico antes de operar con datos reales

| Pendiente | Por qué es crítico |
|---|---|
| **Base de datos con respaldos automáticos** | El plan gratuito de Render caduca a los 30 días y no respalda nada. Ya existe respaldo manual (`scripts/respaldar-bd.ps1`), pero depende de que alguien lo ejecute |
| **Verificar `APP_DEBUG=false`** | En `true`, un error muestra rutas internas y configuración |
| **Verificar que R2 sea privado** | Un bucket público expondría cédulas escaneadas |
| **Cambiar la clave del admin inicial** | |

### Dependencias con vulnerabilidades

| Gestor | Avisos | Paquetes |
|---|---|---|
| `composer audit` | 25 | guzzle, commonmark, laravel/framework, symfony |
| `npm audit` | 9 | react-router, vite, postcss y otros |

Se resuelven con `composer update` y `npm audit fix`, pero cambian los archivos
`.lock`: hay que probar la suite completa antes de desplegar.

### Sin integración continua

Las pruebas se ejecutan a mano. Un flujo de GitHub Actions que corra
`php artisan test` y `npm run build` en cada push evitaría desplegar código roto.

---

## 5. Campos que faltan según los documentos reales

Del análisis de 337 documentos en 67 carpetas de la cooperativa (resoluciones de
habilitación, matrículas, cartas de cesión, certificados del SRI), estos datos
existen en papel pero no en el sistema:

### Socio

| Campo | Fuente |
|---|---|
| Número de acciones y su valor | Certificado de acciones |
| Fecha de ingreso a la compañía | Carta de cesión |
| RUC | Certificado del SRI |
| Licencia de conducir (tipo y vencimiento) | Licencia |

### Vehículo

| Campo | Fuente |
|---|---|
| Número de chasis y de motor | Matrícula / habilitación |
| Clase, cilindraje, número de pasajeros | Matrícula |
| Fecha de matrícula y su caducidad | Matrícula |
| Propietario que figura en la matrícula | Matrícula (puede no ser el socio) |
| Número y fecha de la resolución de habilitación | Habilitación |

### Historial de traspasos

**El trámite más frecuente y el que no está modelado.** De 66 unidades, 56 tienen
carta de cesión y 16 tienen resolución de cambio de socio.

Hoy solo queda el cambio de `socio_id` en la auditoría, sin resolución, sin fecha
ni cedente/cesionario. Debería existir una tabla `traspasos`.

### Datos de la compañía

Razón social, RUC, gerente y permiso de operación están **fijos en el código**.
Para revender el sistema a otra cooperativa deben ser configurables.

### Vencimientos y alertas

Con la caducidad de matrícula y habilitación cargadas se podrían generar alertas
como las de mantenimiento. El mecanismo ya existe —los expedientes calculan
`Vigente`, `Por vencer` y `Vencido`, y la RTV avisa en el portal—; falta llevar
esos avisos al portal del socio también para sus documentos.

### Privacidad

Las cédulas escaneadas incluyen tipo de sangre, discapacidad y estado civil.
**No conviene guardarlos como campos**: deben quedar solo dentro del archivo
privado.

Además, en la carpeta de la cooperativa hay copias de cédulas de terceros
("cédulas pintores") que no corresponden a socios. Antes de cargar los datos hay
que decidir qué se digitaliza y qué no.

---

## 6. Mejoras sugeridas

> **Coherencia de la RTV (27/09/2026).** El dashboard dejó de contar la vigencia
> con una ventana fija de 12 meses y pasó a usar la fecha de vencimiento del
> certificado, la misma que ya usaba el portal. Antes se equivocaba en los dos
> sentidos: contaba como al día una unidad con la RTV vencida hace poco, y no
> contaba una con el certificado vigente pero revisada hace más de un año.
> Verificado en pantalla: con dos unidades (una vencida ayer, otra vigente diez
> meses más) el dashboard marca 50% y el portal dice *"vencida hace 1 día"* y
> *"vigente hasta 27/7/2027"*. Antes el dashboard habría dicho 100%.

> **Limpieza de código (27/09/2026).** Se quitaron 27 `import React` que React 19
> ya no necesita, 4 iconos importados y nunca usados, y 23 `catch (err)` donde `err`
> no se leía. Las cinco funciones de carga que un efecto usaba sin declararlas como
> dependencia pasaron a `useCallback`. En el backend, los cuatro controladores que
> entregan archivos dejaron de repetir la lógica del enlace firmado: ahora está en
> `ArchivoPrivado`. ESLint bajó de 67 errores a 12 y de 5 avisos a 0. **El paquete
> compilado no cambió** (476,3 kB antes y después): los iconos sin usar ya los
> descartaba el empaquetador, así que la ganancia es de legibilidad, no de tamaño.

> **Alineación con el anteproyecto (26/09/2026).** Se contrastó el documento de
> tesis contra lo implementado y se cerraron tres brechas: los mantenimientos
> distinguen **preventivo de correctivo** (sin eso no hay "historial cronológico
> de fallas"), cada RTV aprobada registra **hasta cuándo vale** y el socio lo ve
> por unidad, y el catálogo de expedientes incorporó **licencia de conducir,
> póliza de seguro y récord de infracciones**, que el documento nombra y el
> sistema no admitía. Cubierto por `ObjetivosDelProyectoTest`.

> **Expedientes (25/09/2026).** El módulo dejó de ser un repositorio de archivos:
> cada documento se clasifica según el catálogo real de la cooperativa, los que
> caducan llevan control de vencimiento y el sistema informa qué falta en cada
> expediente. Es el eje que da nombre al proyecto y era el menos desarrollado.
> Queda pendiente el historial de traspasos de acciones.

> **Rendimiento (23/09/2026).** Se corrigieron tres problemas estructurales de
> consultas. Medido con 202 socios y 4.800 aportaciones: `/socios` pasó de 4.806 a
> **4 consultas** (4.030 ms → 261 ms) y `/aportaciones` de 5.002 a **2 consultas**.
> El detalle está en el [checklist de escalabilidad](10-checklist-escalabilidad.md).
> Queda pendiente paginar los listados.

### Corto plazo

1. Resolver los pendientes críticos de infraestructura.
2. Unificar el criterio de "unidad descuidada" entre dashboard y portal.
3. Traducir los mensajes de validación (`APP_LOCALE=es`).
4. Agregar el índice único a `numero_vehiculo`.
5. Eliminar la columna `estado_pago`.

### Mediano plazo

1. Modelar los **traspasos de acciones**: es el trámite más común de la cooperativa.
2. Agregar los campos de matrícula y habilitación con sus vencimientos.
3. Hacer configurables los datos de la compañía (necesario para revender).
4. Completar las notificaciones con destinatario.
5. Integración continua con GitHub Actions.

### Largo plazo

1. Reportes históricos: morosidad por periodo, gasto de flota, cumplimiento.
2. Aplicación móvil nativa consumiendo la misma API.
3. Recuperación de contraseña por correo.
4. Segundo factor de autenticación para administradores.
5. Panel para el admin con el plan de mantenimiento de **toda** la flota (hoy cada
   socio ve el suyo, pero el staff no tiene una vista consolidada).

---

## 7. Resumen

**Lo que funciona bien.** El núcleo del sistema está completo y probado: socios,
vehículos, documentos, aportaciones y mantenimiento, con separación estricta de
roles, auditoría completa y 110 pruebas que cubren los caminos críticos, los
errores encontrados y lo que el anteproyecto promete.

**Lo que hay que atender antes de producción real.** Respaldos de la base de datos,
verificación de la configuración de producción y actualización de dependencias.

**Lo que falta para que sea un producto vendible.** Los datos de la compañía
configurables, el modelo de traspasos de acciones y los campos de matrícula con
sus vencimientos.
