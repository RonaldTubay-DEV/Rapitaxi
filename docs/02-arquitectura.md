# 02 · Arquitectura

## Visión general

RapiTaxi está partido en dos aplicaciones independientes que se comunican por HTTP:

```
   NAVEGADOR (PC o celular)
            │
            ▼
   ┌────────────────────┐      HTTPS / JSON      ┌────────────────────┐
   │  rapitaxi-frontend │ ─────────────────────► │  rapitaxi-backend  │
   │  React 19 + Vite   │ ◄───────────────────── │  Laravel 12 (API)  │
   │  (Netlify)         │   token Bearer         │  (Render, Docker)  │
   └────────────────────┘                        └─────────┬──────────┘
                                                           │
                                          ┌────────────────┴───────────────┐
                                          ▼                                ▼
                                 ┌──────────────────┐          ┌──────────────────────┐
                                 │   PostgreSQL     │          │  Cloudflare R2       │
                                 │   (Render)       │          │  (archivos subidos)  │
                                 └──────────────────┘          └──────────────────────┘
```

**Por qué esta separación.** El backend no sirve ninguna página HTML: solo entrega
datos en JSON. Eso permite que mañana una aplicación móvil nativa consuma la misma
API sin reescribir nada del servidor, y que el frontend se sirva como archivos
estáticos (rápido y barato de alojar).

---

## Tecnologías

### Backend — `rapitaxi-backend/`

| Componente | Versión | Para qué |
|---|---|---|
| PHP | 8.2 | Lenguaje |
| Laravel | 12.x | Framework de la API |
| Laravel Sanctum | 4.3 | Autenticación por token |
| spatie/laravel-permission | 6.25 | Roles y permisos |
| spatie/laravel-activitylog | 4.12 | Auditoría automática |
| league/flysystem-aws-s3-v3 | 3.35 | Acceso a Cloudflare R2 |
| PostgreSQL | — | Base de datos |
| PHPUnit | 11.x | Pruebas automatizadas |

### Frontend — `rapitaxi-frontend/`

| Componente | Versión | Para qué |
|---|---|---|
| React | 19.2 | Interfaz |
| Vite | 8.0 | Compilador y servidor de desarrollo |
| React Router | 7.15 | Navegación entre pantallas |
| Tailwind CSS | 4.x | Estilos |
| lucide-react | 1.16 | Íconos |
| ESLint | 9.x | Análisis estático del código |

---

## Estructura del backend

```
rapitaxi-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/      16 controladores, uno por módulo
│   │   ├── Middleware/
│   │   │   ├── EnsureUserIsActive.php    Corta el acceso a cuentas desactivadas
│   │   │   └── SecurityHeaders.php       Cabeceras de seguridad en cada respuesta
│   │   └── Requests/
│   │       └── LoginRequest.php
│   ├── Models/                   10 modelos Eloquent
│   ├── Rules/
│   │   └── CedulaEcuatoriana.php Validación del dígito verificador
│   ├── Services/
│   │   ├── ArchivoPrivado.php    Enlaces firmados a los archivos de R2
│   │   └── PlanMantenimiento.php Cálculo del estado de mantenimiento por unidad
│   ├── Traits/
│   │   └── TapsActivityWithRequestMeta.php   Agrega IP y navegador a la auditoría
│   └── Providers/
│       └── AppServiceProvider.php  Límites de peticiones y política de contraseñas
├── bootstrap/app.php             Middleware global y manejo de errores
├── config/                       Configuración (sanctum, cors, filesystems…)
├── database/
│   ├── migrations/               30 migraciones
│   └── seeders/                  Roles, admin inicial, frecuencias
├── routes/api.php                Las 61 rutas
├── tests/                        81 pruebas
└── Dockerfile                    Imagen para el despliegue en Render
```

### Responsabilidades

**Controladores.** Reciben la petición, validan los datos, aplican las reglas del
negocio y devuelven JSON. Son la capa donde vive casi toda la lógica.

**Modelos.** Representan las tablas. Definen relaciones, qué campos son asignables
en masa (`$fillable`), qué campos se ocultan al serializar (`$hidden`) y qué se
audita (`getActivitylogOptions`).

**Servicios.** Lógica que no pertenece a un solo controlador. Hoy hay dos:

- `PlanMantenimiento` calcula el estado de cada unidad y lo consumen tanto el
  portal del socio como las pruebas.
- `ArchivoPrivado` arma los enlaces firmados a R2 y los nombres de descarga.
  Los cuatro controladores que entregan archivos (expedientes, libros contables,
  comprobantes de aportación y respaldos de mantenimiento) repetían el plazo, la
  cabecera y la forma de la respuesta; cambiar el plazo obligaba a acordarse de
  los cuatro. Ahora el plazo es la constante `MINUTOS_DE_VIGENCIA`.

**Middleware.** Se ejecuta antes o después de cada petición:

| Middleware | Qué hace |
|---|---|
| `auth:sanctum` | Exige un token válido |
| `EnsureUserIsActive` | Bloquea cuentas desactivadas y revoca su token |
| `role:admin\|operador` | Exige un rol concreto |
| `throttle:api` / `throttle:login` | Limita la cantidad de peticiones |
| `SecurityHeaders` | Agrega cabeceras de seguridad a las respuestas de `/api/*` |

---

## Estructura del frontend

```
rapitaxi-frontend/src/
├── main.jsx                  Punto de entrada: tema y guardián de sesión
├── App.jsx                   Definición de todas las rutas
├── apiConfig.js              URL de la API (desde variable de entorno)
├── index.css                 Estilos globales y TODO el modo oscuro
│
├── components/
│   ├── MainLayout.jsx        Menú lateral y encabezado del panel
│   ├── SocioPortalLayout.jsx Encabezado, pestañas y franja de aviso del portal
│   ├── NotificacionesBell.jsx Campanita de avisos del staff
│   ├── ToastHost.jsx         Mensajes emergentes
│   └── ConfirmHost.jsx       Diálogos de confirmación
│
├── features/auth/
│   ├── AuthContext.jsx       Estado de la sesión (usuario y rol)
│   ├── authService.js        Login y logout
│   ├── AdminLoginScreen.jsx  Pantalla de ingreso
│   ├── SessionIdleWatcher.jsx Vigila la inactividad
│   └── IdleWarningModal.jsx  Aviso con cuenta regresiva
│
├── routes/
│   ├── ProtectedRoute.jsx    Guardia: exige sesión y rol
│   └── AccessDeniedScreen.jsx
│
├── screens/                  12 pantallas del panel administrativo
│   └── portal/               3 pantallas del portal del socio
│
├── lib/
│   ├── apiClient.js          Envoltorio único sobre fetch
│   └── sessionGuard.js       Detecta el token vencido y cierra la sesión
│
├── hooks/useIdleTimer.js     Temporizador de inactividad reutilizable
└── utils/                    Validadores, formateadores, tema, mensajes
```

### Decisiones de diseño del frontend

**Un solo envoltorio sobre `fetch`.** `lib/apiClient.js` arma la URL, agrega el
token y las cabeceras, interpreta el JSON y normaliza los errores en una clase
`ApiError`. Cualquier cambio futuro en el manejo de autenticación se hace en un
solo archivo.

> **Nota:** varias pantallas antiguas todavía llaman a `fetch` directamente.
> Por eso existe `sessionGuard.js`, que intercepta **todas** las respuestas del
> navegador: si la API responde "no autenticado" con una sesión guardada, limpia
> los datos locales y redirige al login. Así ninguna pantalla queda rota en
> silencio cuando caduca el token.

**El modo oscuro vive en un solo archivo.** El proyecto no tiene una librería de
componentes compartidos: son ~19 pantallas con estilos escritos a mano. Aplicar
`dark:` clase por clase habría significado tocar los 19 archivos con alto riesgo
de inconsistencias. En su lugar, `index.css` redefine las clases que Tailwind ya
genera:

```css
.dark .bg-white { background-color: var(--color-neutral-800); }
```

El selector `.dark .bg-white` tiene más peso que `.bg-white` a solas, así que gana
sin necesidad de `!important`. Cambiar la paleta entera es editar un archivo.

**El tema se aplica antes de dibujar.** `main.jsx` llama a `initTheme()` de forma
síncrona **antes** de montar React. Si se hiciera después, la pantalla se vería un
instante en claro y luego saltaría a oscuro.

---

## Flujo de una petición

Ejemplo: un socio abre "Mis Unidades".

1. **Navegador** → `GET /api/mis-unidades` con `Authorization: Bearer <token>`.
2. **`auth:sanctum`** valida el token y lo resuelve a un usuario. Si venció, 401.
3. **`EnsureUserIsActive`** comprueba que la cuenta siga activa. Si no, revoca el
   token y responde 403.
4. **`throttle:api`** verifica que no haya superado 120 peticiones por minuto.
5. **`role:socio`** comprueba el rol. Un admin recibiría 403 aquí.
6. **`SocioPortalController@misUnidades`** obtiene el socio del usuario
   autenticado, verifica que su afiliación esté activa y pide a
   `PlanMantenimiento` el estado de sus vehículos.
7. **Respuesta** JSON solo con los campos públicos, más las cabeceras de seguridad.

En ningún punto el cliente indica *de qué socio* quiere los datos: siempre se
deducen del token. Es imposible pedir los datos de otro.

---

## Almacenamiento de archivos

Los archivos subidos (comprobantes, expedientes, libros contables, respaldos de
mantenimiento) **no se guardan en el servidor de la aplicación**, sino en
**Cloudflare R2**, un almacenamiento compatible con S3.

Razones:

- El disco de Render es efímero: se borra en cada despliegue.
- R2 no cobra por transferencia de salida, a diferencia de S3.
- Permite escalar a varios servidores sin duplicar archivos.

**El bucket es privado.** Para mostrar un archivo, la API genera un enlace
temporal firmado válido por **5 minutos**:

```php
Storage::disk('s3')->temporaryUrl(
    $expediente->ruta_archivo,
    now()->addMinutes(5),
    ['ResponseContentDisposition' => 'inline; filename="..."']
);
```

El archivo viaja directo de R2 al navegador, sin pasar por el servidor de la
aplicación. El parámetro `ResponseContentDisposition` hace que se abra en el
navegador con un nombre legible en vez de descargarse con el nombre aleatorio con
que se guardó.

Carpetas usadas dentro del bucket:

| Carpeta | Contenido |
|---|---|
| `expedientes/` | Documentos de los socios |
| `comprobantes_aportaciones/` | Comprobantes de pago mensual |
| `comprobantes_mantenimiento/` | Respaldos de los trabajos de taller |
| `libros_contables/` | Balances y reportes fiscales |

---

## Despliegue

| Parte | Dónde | Cómo |
|---|---|---|
| Backend | Render | Imagen Docker; al arrancar corre migraciones y seeders |
| Frontend | Netlify | Compilación estática de Vite |
| Base de datos | Render PostgreSQL | Servicio administrado |
| Archivos | Cloudflare R2 | Bucket privado |

Ambos despliegues se disparan solos al hacer `git push` a la rama `main`.

El contenedor del backend ejecuta en cada arranque:

```
php artisan migrate --force && php artisan db:seed --force && php artisan serve
```

Los seeders son **idempotentes**: crean lo que falte y nunca pisan lo existente,
por lo que es seguro que corran en cada reinicio.

Ver [06 - Instalación y despliegue](06-instalacion-y-despliegue.md) para el detalle.
