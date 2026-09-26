# Documentación del Sistema RapiTaxi

Sistema de gestión para la **Compañía de Taxis Convencionales RapitaxisMontecristi S.A.**
(Montecristi, Manabí, Ecuador).

El sistema administra los socios accionistas de la cooperativa, sus vehículos, los
documentos habilitantes, las aportaciones mensuales y el mantenimiento de la flota.
Incluye además un portal donde cada socio consulta y gestiona su propia información.

---

## Índice de la documentación

| Documento | Contenido | Para quién |
|---|---|---|
| [01 - Manual de usuario](01-manual-de-usuario.md) | Cómo usar el sistema, pantalla por pantalla, según el rol | Personal de la cooperativa y socios |
| [02 - Arquitectura](02-arquitectura.md) | Tecnologías, estructura de carpetas, cómo se comunican las partes | Desarrolladores, tribunal |
| [03 - Base de datos](03-base-de-datos.md) | Todas las tablas, columnas, relaciones e índices | Desarrolladores, tribunal |
| [04 - Referencia de la API](04-api-referencia.md) | Los 63 endpoints, sus parámetros y permisos | Desarrolladores |
| [05 - Seguridad](05-seguridad.md) | Autenticación, roles, validaciones, protección de datos personales | Desarrolladores, tribunal |
| [06 - Instalación y despliegue](06-instalacion-y-despliegue.md) | Cómo levantarlo en local y cómo se publica en producción | Desarrolladores |
| [07 - Pruebas automatizadas](07-pruebas.md) | Qué cubren las 107 pruebas y cómo ejecutarlas | Desarrolladores, tribunal |
| [08 - Reglas de negocio](08-reglas-de-negocio.md) | Las decisiones del dominio que el código hace cumplir | Todos |
| [09 - Estado actual y pendientes](09-estado-y-pendientes.md) | Qué está terminado, qué falta, deuda técnica conocida | Desarrolladores, tribunal |
| [10 - Checklist de escalabilidad](10-checklist-escalabilidad.md) | Qué falta para crecer, con mediciones reales y orden sugerido | Desarrolladores |

---

## Resumen del sistema

### Qué resuelve

La cooperativa administraba su información en carpetas físicas: una por unidad
(`012-01` a `012-66`), con resoluciones de habilitación, matrículas, cédulas, cartas
de cesión de acciones y certificados del SRI. El sistema digitaliza ese archivo y
automatiza el control que antes se llevaba a mano.

### Los tres tipos de usuario

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **admin** | El gerente o el encargado del sistema | Todo: además gestiona usuarios internos, configura el sistema y consulta la auditoría |
| **operador** | Personal de oficina | Opera el día a día: socios, vehículos, aportaciones, mantenimientos, documentos |
| **socio** | Cada accionista de la compañía | Solo su propia información: sus datos de contacto, sus unidades y sus aportaciones |

### Módulos implementados

**Panel administrativo** (admin y operador)

- **Dashboard**: indicadores de la cooperativa en tiempo real.
- **Socios**: alta, edición, baja con motivo obligatorio y reactivación con historial.
- **Expedientes**: archivo digital de documentos por socio.
- **Actas**: cuadro maestro de la flota, listo para imprimir.
- **Vehículos**: unidades, placas y especificaciones técnicas.
- **Mantenimiento**: registro de trabajos y aprobación de los que envían los socios.
- **Revisiones**: bitácora de RTV y trámites con la ANT/GAD.
- **Aportaciones**: pagos mensuales y aprobación de comprobantes.
- **Libros contables**: archivo de balances y reportes fiscales.
- **Usuarios** (solo admin): cuentas del personal interno.
- **Configuración** (solo admin): preferencias y frecuencia de mantenimientos.
- **Auditoría** (solo admin): quién hizo qué, cuándo, desde qué IP y con qué dispositivo.

**Portal del socio**

- **Mi Perfil**: consulta sus datos y actualiza su contacto.
- **Mis Unidades**: estado de mantenimiento de cada unidad y registro de trabajos.
- **Mis Aportaciones**: historial de pagos y envío del comprobante mensual.

### Cifras del proyecto

| | |
|---|---|
| Endpoints de la API | 63 |
| Tablas en la base de datos | 22 (13 del negocio, 9 de infraestructura de Laravel) |
| Pantallas del panel administrativo | 12 |
| Pantallas del portal del socio | 3 |
| Roles | 3 |
| Pruebas automatizadas | 107 (468 verificaciones) |
| Migraciones | 33 |

---

## Convenciones de esta documentación

- Las rutas de archivos son relativas a la raíz del repositorio.
- `rapitaxi-backend/` es la API en Laravel; `rapitaxi-frontend/` es la interfaz en React.
- Cuando se menciona "el staff" se habla de los roles **admin** y **operador** juntos.
- Los bloques marcados como **Nota** señalan decisiones de diseño; los marcados como
  **Advertencia** señalan limitaciones reales que conviene conocer antes de operar.

---

*Última actualización: septiembre de 2026.*
