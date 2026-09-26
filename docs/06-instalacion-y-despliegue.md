# 06 · Instalación y despliegue

---

## 1. Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| PHP | 8.2 o superior | Con extensiones `pdo_pgsql`, `mbstring`, `gd`, `bcmath` |
| Composer | 2.x | |
| Node.js | 20 o superior | Incluye npm |
| PostgreSQL | 14 o superior | |

Comprobar que todo esté disponible:

```bash
php -v && composer -V && node -v && psql --version
php -m | grep -E "pdo_pgsql|mbstring"
```

---

## 2. Instalación local

### 2.1 Backend

```bash
cd rapitaxi-backend

composer install
cp .env.example .env
php artisan key:generate
```

Crear la base de datos:

```sql
CREATE DATABASE rapitaxi;
```

Editar `.env` con los datos de conexión:

```env
APP_ENV=local
APP_DEBUG=true
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=rapitaxi
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña

# Cloudflare R2 (sin esto, las subidas de archivos fallan)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=true

# Admin inicial (opcional pero recomendado la primera vez)
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@rapitaxi.com
ADMIN_PASSWORD=una_clave_con_letras_y_numeros
```

Crear el esquema y los datos base:

```bash
php artisan migrate
php artisan db:seed
```

Los seeders crean los 3 roles con sus permisos, las 5 frecuencias de mantenimiento
y —si definiste `ADMIN_EMAIL` y `ADMIN_PASSWORD`— el administrador inicial.

Levantar el servidor:

```bash
php artisan serve
# http://127.0.0.1:8000
```

Comprobar que responde:

```bash
curl http://127.0.0.1:8000/up     # debe devolver 200
```

### 2.2 Frontend

```bash
cd rapitaxi-frontend
npm install
```

Apuntar `.env` al backend local:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

> **Cuidado:** este archivo **está versionado** y en la rama `main` contiene la URL
> de **producción**. Cámbialo para trabajar en local, pero **no lo incluyas en un
> commit**: romperías el despliegue de Netlify.

```bash
npm run dev
# http://localhost:5173
```

### 2.3 Crear el primer administrador (si no usaste las variables)

```bash
cd rapitaxi-backend
php artisan tinker
```

```php
$u = App\Models\User::create([
    'name' => 'Administrador',
    'email' => 'admin@rapitaxi.com',
    'password' => 'clave123segura',
    'is_active' => true,
]);
$u->assignRole('admin');
```

> Un usuario **sin rol no puede iniciar sesión**: el login lo rechaza
> explícitamente.

---

## 3. Almacenamiento de archivos (Cloudflare R2)

Sin R2 configurado, el sistema funciona salvo las subidas de archivos.

1. En el panel de Cloudflare, sección **R2**, crear un bucket
   (por ejemplo `rapitaxi-documents`).
2. **Dejarlo privado.** No habilitar acceso público.
3. Crear un token de API con permiso de lectura y escritura sobre ese bucket.
4. Copiar las credenciales al `.env`.

Detalles a tener en cuenta:

- `AWS_DEFAULT_REGION` debe ser exactamente `auto`.
- `AWS_ENDPOINT` **no lleva el nombre del bucket al final**; ese va aparte en
  `AWS_BUCKET`.
- `AWS_USE_PATH_STYLE_ENDPOINT` debe estar en `true`.

Probar que funciona:

```bash
php artisan tinker
>>> Storage::disk('s3')->put('prueba.txt', 'hola');
>>> Storage::disk('s3')->exists('prueba.txt');   // true
>>> Storage::disk('s3')->delete('prueba.txt');
```

---

## 4. Comandos de uso diario

### Backend

```bash
php artisan serve              # Servidor de desarrollo
php artisan test               # Las 81 pruebas
php artisan migrate            # Aplicar migraciones nuevas
php artisan migrate:status     # Ver cuáles están aplicadas
php artisan db:seed            # Sembrar datos base (idempotente)
php artisan cache:clear        # Limpiar caché (incluye el límite de login)
php artisan route:list --path=api
php artisan tinker             # Consola interactiva
```

> **Truco frecuente:** si al probar el login te bloquea por intentos fallidos,
> `php artisan cache:clear` reinicia el contador.

### Frontend

```bash
npm run dev       # Desarrollo con recarga automática
npm run build     # Compilar para producción (genera dist/)
npm run preview   # Ver la compilación
npx eslint src/   # Análisis del código
```

---

## 5. Despliegue en producción

### 5.1 Backend en Render

El repositorio incluye un `Dockerfile` listo. Render lo detecta solo.

**Servicio web**

| Opción | Valor |
|---|---|
| Tipo | Web Service |
| Entorno | Docker |
| Rama | `main` |
| Directorio raíz | `rapitaxi-backend` |

**Variables de entorno en Render**

```env
APP_NAME=RapiTaxi
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...            # generar con php artisan key:generate --show
APP_URL=https://rapitaxi-api.onrender.com

FRONTEND_URL=https://rapitaxi-frontend.netlify.app

DB_CONNECTION=pgsql
DB_HOST=...                   # del panel de PostgreSQL en Render
DB_PORT=5432
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=auto
AWS_BUCKET=rapitaxi-documents
AWS_ENDPOINT=https://....r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=true

ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

> **`APP_DEBUG=false` es obligatorio en producción.** En `true`, un error muestra
> la traza completa con rutas internas y fragmentos de configuración.

**Qué hace el contenedor al arrancar**

```
php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=80
```

Migraciones y seeders corren en cada arranque. Los seeders son idempotentes: crean
lo que falta y no pisan lo existente.

El `Dockerfile` además ajusta PHP:

```
upload_max_filesize=6M
post_max_size=8M
expose_php=Off
```

Sin esto, la imagen base limita las subidas a 2 MB y anuncia la versión de PHP en
cada respuesta.

### 5.2 Frontend en Netlify

| Opción | Valor |
|---|---|
| Directorio base | `rapitaxi-frontend` |
| Comando de compilación | `npm run build` |
| Directorio de publicación | `rapitaxi-frontend/dist` |

La variable `VITE_API_URL` se toma del archivo `.env` versionado. Si cambias el
dominio de la API, hay que editar ese archivo y hacer commit.

Dos archivos en `public/` se copian tal cual a la compilación:

- **`_redirects`**: `/* /index.html 200`. Necesario para que las rutas del
  navegador funcionen al recargar la página.
- **`_headers`**: las cabeceras de seguridad, incluida la CSP.

> Si cambia el dominio de la API, hay que actualizar también `connect-src` en
> `_headers`, o el navegador bloqueará las llamadas.

### 5.3 Respaldos de la base de datos

**Sin respaldo, lo que se pierde no se recupera.** Los archivos (PDF, fotos) viven
en Cloudflare R2 y sobreviven aparte, pero la base guarda el *significado* de esos
archivos: qué documento es cada uno, de qué socio y cuándo vence. Si se pierde la
base, R2 queda con cientos de archivos de nombre aleatorio que nadie puede
identificar.

La base es pequeña —unos pocos megas incluso con la cooperativa entera cargada—
porque el peso está en R2. Respaldarla es rápido y barato.

#### Crear un respaldo

```powershell
cd rapitaxi-backend
.\scripts\respaldar-bd.ps1
```

Genera `respaldos\rapitaxi_AAAA-MM-DD_HHMM.dump` leyendo las credenciales del
`.env`. Para respaldar producción, se apunta a otro archivo de entorno:

```powershell
.\scripts\respaldar-bd.ps1 -Env .env.render
```

> **La carpeta `respaldos/` está en `.gitignore` a propósito.** Un respaldo
> contiene cédulas, teléfonos y correos de los socios: subirlo a GitHub sería
> filtrar datos personales.

#### Restaurar

Para **verificar** que un respaldo sirve, se restaura en una base aparte:

```powershell
.\scripts\restaurar-bd.ps1 -Archivo respaldos\rapitaxi_2026-09-25_2244.dump -BaseDestino rapitaxi_verificacion
```

Para restaurar **sobre la base real** (reemplaza lo que haya), se omite
`-BaseDestino`. El script pide escribir el nombre de la base para confirmar.

#### Verificar que el respaldo sirve

Un respaldo que nunca se restauró no es un respaldo, es un archivo. Conviene
comprobarlo al menos una vez y después de cada cambio de esquema:

```bash
# Contar filas en la base original y en la restaurada; deben coincidir
psql -U postgres -d rapitaxi -c "SELECT count(*) FROM socios"
psql -U postgres -d rapitaxi_verificacion -c "SELECT count(*) FROM socios"
```

> Verificado el 25/09/2026: el respaldo restauró las 9 tablas con el mismo número
> de filas, 54 índices y 12 claves foráneas, idénticos al original.

#### Cuándo respaldar

| Momento | Por qué |
|---|---|
| Antes de cada despliegue con migraciones | Una migración mal hecha puede perder datos |
| Antes de cargar datos masivamente | Para poder volver atrás si la carga sale mal |
| Periódicamente con datos reales | Diario o semanal según cuánto se mueva |

> **El respaldo manual es el mínimo, no la solución definitiva.** Depende de que
> alguien se acuerde de ejecutarlo. Con datos reales en producción conviene un
> plan de base de datos con respaldos automáticos (ver abajo).

---

### 5.4 Base de datos en Render

**El plan gratuito caduca a los 30 días y no incluye respaldos.**

Al recrear la base de datos:

1. Crear la nueva instancia de PostgreSQL.
2. Copiar las credenciales al servicio web.
3. Reiniciar el servicio: las migraciones y seeders corren solos.
4. **Nunca eliminar el servicio web `Rapitaxi-api`**, solo la base de datos.

Antes de operar con datos reales hay que pasar a un plan con respaldos automáticos.

---

## 6. Flujo de trabajo de despliegue

```
  Cambios en local
        │
        ├── php artisan test        (las 81 pruebas deben pasar)
        ├── npm run build           (debe compilar sin errores)
        └── npx eslint src/
        │
        ▼
  git commit  (sin rapitaxi-frontend/.env)
        │
        ▼
  git push origin main
        │
        ├──► Render:  reconstruye la imagen, migra, siembra y publica
        └──► Netlify: compila y publica
```

Tras cada despliegue conviene verificar:

1. Que `/up` responda 200 en la API.
2. Que el login cargue sin errores de CSP (consola del navegador).
3. Que `APP_DEBUG` siga en `false`.

---

## 7. Problemas frecuentes

**"Could not connect to database" en local**
PostgreSQL no está corriendo, o las credenciales del `.env` no coinciden.
Probar: `psql -U postgres -d rapitaxi -c "SELECT 1"`.

**El frontend no se comunica con la API (error de CORS)**
`FRONTEND_URL` en el backend debe coincidir **exactamente** con el origen del
navegador, incluido el puerto.

> Detalle: `php artisan serve` no lee variables de entorno del sistema. Para probar
> con un origen distinto, usar `php -S 127.0.0.1:8000 -t public public/index.php`
> con la variable exportada.

**"Too many login attempts"**
Se activó el límite. Esperar un minuto o `php artisan cache:clear`.

**Las subidas de archivos fallan**
Revisar las credenciales de R2 y que `AWS_DEFAULT_REGION=auto`. En producción,
comprobar que la imagen se reconstruyó con los límites de PHP del `Dockerfile`.

**Un usuario no puede iniciar sesión**
Verificar tres cosas: que tenga rol asignado, que `is_active` sea `true` y —si es
socio— que su afiliación esté `Activo` y no esté eliminado.

**La pantalla se ve en claro y luego salta a oscuro**
`initTheme()` debe ejecutarse en `main.jsx` **antes** de montar React.
