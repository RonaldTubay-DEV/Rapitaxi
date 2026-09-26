# 05 · Seguridad

El sistema maneja datos personales de ciudadanos ecuatorianos: cédulas, teléfonos,
direcciones, correos y documentos escaneados que incluyen fotografías y datos
sensibles. Este documento describe qué protege el sistema, cómo, y qué riesgos
siguen abiertos.

---

## 1. Autenticación

### Tokens, no sesiones

El backend es una API sin estado. No usa cookies de sesión: cada petición lleva un
token en la cabecera `Authorization: Bearer <token>`, emitido por Laravel Sanctum
al iniciar sesión.

| Aspecto | Implementación |
|---|---|
| Emisión | `POST /login` tras verificar las credenciales |
| Vencimiento | **12 horas** (`SANCTUM_EXPIRATION_MINUTES`) |
| Revocación | Al cerrar sesión, al desactivar la cuenta, al cambiar clave o rol |
| Almacenamiento en servidor | Solo un hash del token, en `personal_access_tokens` |

> **Por qué 12 horas.** Antes los tokens no vencían nunca: uno filtrado servía para
> siempre. Doce horas cubre una jornada completa sin obligar a reingresar a media
> tarde, y limita la ventana de un token robado.

### Contraseñas

- Se guardan con **bcrypt de 12 rondas**. Nunca en texto plano, ni recuperables.
- Política mínima: **8 caracteres, con letras y números** (`Password::defaults()`
  en `AppServiceProvider`).
- El campo `password` está en `$hidden` del modelo `User`: no puede salir en una
  respuesta JSON ni por accidente.

### Mensajes de error que no revelan información

Un login fallido devuelve **el mismo mensaje** exista o no el correo:

> "Las credenciales ingresadas son incorrectas."

Así un atacante no puede usar el login para averiguar qué correos están
registrados. Hay una prueba automatizada que compara ambas respuestas.

### Bloqueo por intentos fallidos

| Alcance | Límite |
|---|---|
| Por correo | 5 intentos por minuto |
| Por IP | 20 intentos por minuto |

El límite **por correo** frena un ataque distribuido desde muchas IP contra una
cuenta concreta. El límite **por IP** frena a quien pruebe muchos correos desde un
mismo lugar.

### Cierre de sesión por inactividad

En el navegador, `useIdleTimer` vigila mouse, teclado, scroll y toques. A los 18
minutos sin actividad muestra un aviso con cuenta regresiva de 2 minutos; si no hay
reacción, cierra la sesión y redirige al login.

Protege el caso real de la oficina: una computadora desatendida con el panel
abierto.

---

## 2. Autorización

### Tres roles, separación estricta

| Rol | Alcance |
|---|---|
| `admin` | Todo el panel, más usuarios, configuración y auditoría |
| `operador` | El panel operativo, sin usuarios, configuración ni auditoría |
| `socio` | Solo su propia información, en el portal |

La autorización se aplica en el servidor con middleware por grupo de rutas:

```php
Route::middleware('role:admin|operador')->group(function () { ... });
Route::middleware('role:admin')->group(function () { ... });
Route::middleware('role:socio')->group(function () { ... });
```

**Los tres grupos son mutuamente excluyentes.** Un socio que intente llamar a
`/api/socios` recibe 403, aunque conozca la URL y tenga un token válido. Las
pruebas verifican explícitamente que un socio no alcance ninguna ruta del panel y
que el staff no alcance el portal.

> **El frontend no es la protección.** Que el menú no muestre una opción es una
> comodidad visual; la barrera real está en el servidor. Ocultar un botón nunca se
> considera un control de seguridad en este proyecto.

### Un socio solo ve lo suyo

Ningún endpoint del portal acepta un identificador de socio. El socio se deduce
siempre del token:

```php
$socio = $request->user()->socio;
```

Consecuencia: **no existe forma de pedir los datos de otro socio**, ni manipulando
la URL ni el cuerpo de la petición. Para los recursos con id en la ruta (como
registrar un mantenimiento en una unidad), se verifica además la pertenencia:

```php
$vehiculo = Vehiculo::where('id', $vehiculoId)
    ->where('socio_id', $socio->id)   // ← la unidad debe ser suya
    ->first();
```

Si no es suya, responde **404** (no 403): así tampoco revela que esa unidad exista.

### Doble verificación del estado de la cuenta

Un socio queda bloqueado por **dos** condiciones independientes:

1. `users.is_active = false` → el middleware `EnsureUserIsActive` corta el acceso
   a cualquier ruta y **revoca el token en el acto**.
2. `socios.estado != 'Activo'` → el portal responde 403 aunque la cuenta siga
   habilitada.

Al dar de baja a un socio, ambas se activan: se desactiva la cuenta y se borran sus
tokens. No puede seguir usando una sesión ya abierta.

---

## 3. Protección de los datos personales

### Nunca se devuelve el modelo completo

El portal arma manualmente lo que envía, campo por campo:

```php
private function perfilPublico(Socio $socio): array
{
    return [
        'id' => $socio->id,
        'nombre' => $socio->nombre,
        // ... solo lo que el socio necesita ver
    ];
}
```

Qué se excluye deliberadamente:

| Campo oculto | Por qué |
|---|---|
| `observaciones` | Notas internas del staff sobre el socio, incluidos motivos de baja |
| `user_id` | Identificador interno de su cuenta |
| `comprobante_ruta` | Ruta real del archivo en el almacenamiento |
| `revisado_por` | Qué empleado revisó su pago |

> Antes el portal devolvía el modelo entero. Un socio podía leer en su propio
> perfil las notas internas que la administración escribía sobre él. Se corrigió y
> quedó cubierto con pruebas automatizadas que fallan si alguien vuelve a exponer
> esos campos.

### Contraseñas y tokens fuera de las respuestas

Una prueba recorre `/user`, `/usuarios` y `/socios` y verifica que el cuerpo de la
respuesta **no contenga** las cadenas `"password"` ni `remember_token`.

### Archivos: bucket privado y enlaces efímeros

Los documentos (cédulas, matrículas, comprobantes) están en Cloudflare R2 en un
**bucket privado**. No existe una URL pública permanente.

Para verlos, la API genera un enlace firmado válido **5 minutos**. El archivo viaja
de R2 al navegador sin pasar por el servidor.

Implicaciones:

- Un enlace copiado y pegado en WhatsApp deja de funcionar a los 5 minutos.
- Pedir el enlace exige estar autenticado y tener el rol adecuado.
- El servidor no gasta ancho de banda sirviendo archivos.

### Sin caché de datos personales

El middleware `SecurityHeaders` agrega a cada respuesta de `/api/*`:

| Cabecera | Efecto |
|---|---|
| `Cache-Control: no-store, private` | Ningún navegador ni proxy guarda la respuesta |
| `X-Content-Type-Options: nosniff` | El navegador no adivina el tipo de contenido |
| `Referrer-Policy: no-referrer` | No se filtran URLs internas al salir del sitio |
| `X-Frame-Options: DENY` | El sistema no puede incrustarse en un iframe ajeno |

Está registrado de forma **global**, no solo en el grupo `api`, para que también
cubra las respuestas de error (401, 429) que Laravel genera antes de llegar al
grupo.

---

## 4. Validación de entrada

La regla del proyecto: **toda validación se repite en el servidor**, aunque el
formulario ya la aplique. Lo del navegador es comodidad; lo del servidor es la
garantía.

### Identidad

`App\Rules\CedulaEcuatoriana` implementa el algoritmo oficial:

1. Exactamente 10 dígitos.
2. Provincia válida (01-24 o 30).
3. Tercer dígito menor a 6 (persona natural).
4. Dígito verificador correcto por módulo 10.

Hay una prueba unitaria con 12 casos, incluidos cédulas con letras, espacios, todo
ceros y provincia inexistente.

### Texto

| Campo | Regla | Motivo |
|---|---|---|
| `nombre` | Solo letras, espacios, apóstrofes y guiones (3-80) | Nadie tiene números en su nombre |
| `telefono` | `0` + 9 dígitos | Formato ecuatoriano |
| `correo` | Formato de email, hasta 100 | |

La regla del nombre tiene un efecto secundario valioso: **un intento de XSS ni
siquiera llega a guardarse**. Un nombre como `<script>alert(1)</script>` es
rechazado con 422, porque contiene caracteres que un nombre no puede tener. Es más
fuerte que escapar al mostrar.

### Archivos

| Endpoint | Tipos | Tamaño |
|---|---|---|
| Expedientes, comprobantes, respaldos | PDF, JPG, PNG | 5 MB |
| Libros contables | Solo PDF | 10 MB |

Se valida con la regla `mimes:` de Laravel, que inspecciona el **contenido real**
del archivo, no la extensión del nombre. Un `virus.exe` renombrado a `factura.pdf`
es rechazado. Hay pruebas que intentan subir `.exe` y `.php`.

El `Dockerfile` ajusta además los límites de PHP (`upload_max_filesize=6M`,
`post_max_size=8M`), porque la imagen base solo permitía 2 MB y una foto de celular
habría fallado con un error confuso.

### Reglas de negocio validadas

- Fechas no futuras en hechos consumados (pago realizado, trabajo completado,
  revisión aprobada).
- Montos mayores a cero.
- Kilometraje que no retrocede respecto al último trabajo de esa unidad.
- Unicidad de cédula y placa entre los registros activos.
- Motivo obligatorio para dar de baja a un socio o rechazar un comprobante.

---

## 5. Protección contra ataques comunes

| Ataque | Defensa |
|---|---|
| **Inyección SQL** | Eloquent y consultas parametrizadas siempre. Incluso en las búsquedas con `whereRaw` los valores van como parámetros (`?`), nunca concatenados. Hay una prueba que envía `' OR '1'='1` en el buscador y verifica que no devuelva nada de más |
| **XSS** | React escapa por defecto todo lo que renderiza; el proyecto no usa `dangerouslySetInnerHTML` en ningún punto. Sumado a la validación del nombre y a la cabecera CSP |
| **CSRF** | No aplica: la autenticación es por token en una cabecera, no por cookie. Un sitio ajeno no puede provocar peticiones autenticadas |
| **Fuerza bruta** | Límite por correo y por IP en el login |
| **Asignación masiva** | Los controladores usan listas explícitas de campos; `origen` y `revision_estado` se fuerzan en el servidor. Hay una prueba que intenta enviarlos a mano y verifica que se ignoren |
| **Escalada de privilegios** | La autorización es por rol en el servidor; un socio no puede aprobar su propio mantenimiento (probado) |
| **Enumeración de recursos** | Pedir algo ajeno responde 404, no 403 |
| **Clickjacking** | `X-Frame-Options: DENY` y `frame-ancestors 'none'` |

### Política de seguridad de contenido (CSP)

El archivo `rapitaxi-frontend/public/_headers` aplica en Netlify:

```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self' data:; connect-src 'self' https://rapitaxi-api.onrender.com;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Qué logra: aunque alguien consiguiera inyectar un `<script>` en la página, el
navegador se negaría a ejecutarlo si no viene del propio dominio, y bloquearía
cualquier intento de enviar datos a un servidor ajeno (`connect-src`).

> Verificado en un navegador real con la aplicación compilada: la página carga sin
> violaciones de CSP.

### CORS

`config/cors.php` limita qué orígenes pueden llamar a la API: la URL del frontend
(`FRONTEND_URL`) y localhost para desarrollo. `supports_credentials` está en
`false` porque no se usan cookies.

---

## 6. Auditoría

Ocho modelos registran automáticamente cada creación, edición y borrado mediante
`spatie/laravel-activitylog`: Socio, Vehiculo, Aportacion, Mantenimiento,
LibroContable, Revision, Expediente y User.

Cada entrada guarda:

- **Qué** cambió: los valores antes y después, solo de los campos modificados.
- **Quién**: el usuario autenticado.
- **Cuándo**: fecha y hora.
- **Desde dónde**: dirección **IP** y **navegador/dispositivo**.

La IP y el navegador se agregan con el trait `TapsActivityWithRequestMeta`, que
intercepta cada registro antes de guardarlo.

Para que la IP sea la real del usuario y no la del balanceador de Render,
`bootstrap/app.php` declara `trustProxies(at: '*')`.

> **Advertencia:** confiar en todos los proxies implica que un cliente podría
> falsificar la cabecera `X-Forwarded-For` y registrar una IP falsa en la
> auditoría. El riesgo es acotado (la identidad del usuario viene del token, no de
> la IP) pero conviene conocerlo. La solución correcta sería declarar el rango de
> IP de Render en vez de `'*'`.

### Trazabilidad de las decisiones

Más allá del log técnico, el sistema exige justificar las acciones con consecuencias:

| Acción | Qué se exige |
|---|---|
| Dar de baja a un socio | Motivo obligatorio, guardado con fecha en sus observaciones |
| Rechazar un comprobante | Motivo obligatorio, visible para el socio |
| Rechazar un mantenimiento | Motivo obligatorio, visible para el socio |

---

## 7. Gestión de secretos

| Secreto | Dónde vive |
|---|---|
| `APP_KEY` | Variable de entorno |
| Credenciales de PostgreSQL | Variables de entorno |
| Claves de Cloudflare R2 | Variables de entorno |
| Admin inicial | `ADMIN_EMAIL` / `ADMIN_PASSWORD`, opcionales |

El archivo `.env` del backend **está en `.gitignore`** y nunca se versiona. En
producción, Render inyecta las variables desde su panel.

> **Advertencia:** `rapitaxi-frontend/.env` **sí está versionado**, porque solo
> contiene la URL pública de la API (`VITE_API_URL`), que no es un secreto. Hay que
> tener cuidado de no agregar nada sensible ahí: **todo lo que se compila en el
> frontend es visible para cualquiera** que abra las herramientas del navegador.

---

## 8. Cobertura de pruebas de seguridad

De las 81 pruebas, la mayoría de `SeguridadApiTest` son específicamente de
seguridad:

| Área | Qué se verifica |
|---|---|
| Acceso | Rutas protegidas rechazan sin token; cada rol solo alcanza lo suyo |
| Login | No revela correos; bloquea a los 5 intentos; rechaza cuentas desactivadas |
| Sesiones | Los tokens vencen; cambiar clave o rol revoca las otras sesiones |
| Bajas | Dar de baja corta el acceso del socio de inmediato |
| Datos expuestos | Ninguna respuesta filtra contraseñas, tokens, notas internas ni rutas de archivos |
| Aislamiento | Un socio no ve ni toca datos de otro |
| Validación | Cédula, nombre, teléfono, correo, montos, fechas, kilometraje |
| Archivos | Rechaza ejecutables, scripts y archivos demasiado grandes |
| Inyección | SQL en el buscador y HTML en los nombres |
| Cabeceras | Sin caché, `nosniff`, y también en las respuestas de error |
| Límites | La API autenticada y las subidas están limitadas |

---

## 9. Riesgos conocidos

Por transparencia, lo que **no** está resuelto:

| Riesgo | Detalle | Mitigación actual |
|---|---|---|
| **Token en `localStorage`** | Un XSS exitoso podría leerlo | CSP estricta, React escapa por defecto, sin `innerHTML`, vencimiento de 12 h |
| **IP falsificable** | `trustProxies('*')` acepta cabeceras del cliente | La identidad viene del token, no de la IP |
| **Sin recuperación de contraseña** | Si un usuario la olvida, un admin debe cambiársela | Procedimiento manual |
| **Sin segundo factor** | Solo correo y contraseña | Política de contraseñas y límite de intentos |
| **Operadores ven libros contables** | Puede ser más acceso del deseado | Decisión pendiente de la cooperativa |
| **Archivos huérfanos en R2** | Al borrar un socio en firme, sus archivos quedan en el bucket | Pendiente |
| **Dependencias con avisos** | `composer audit` reporta 25 y `npm audit` 9 | Pendiente de actualizar y probar |
| **Base de datos sin respaldo** | El plan gratuito de Render no incluye copias | **Debe resolverse antes de cargar datos reales** |

### Antes de operar con datos reales

1. Confirmar `APP_DEBUG=false` y `APP_ENV=production` en Render.
2. Verificar que el bucket de R2 no tenga acceso público.
3. Contratar una base de datos con respaldos automáticos.
4. Cambiar la contraseña del administrador inicial.
5. Actualizar las dependencias con vulnerabilidades reportadas.
