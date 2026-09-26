# 07 · Pruebas automatizadas

**107 pruebas · 468 verificaciones · ~15 segundos de ejecución**

---

## Cómo ejecutarlas

```bash
cd rapitaxi-backend

php artisan test                                  # Todas
php artisan test --compact                        # Salida resumida
php artisan test --filter=PlanMantenimientoTest   # Un archivo
php artisan test --filter=test_el_login_no_revela  # Una prueba
```

Las pruebas usan **SQLite en memoria**, no la base de datos real. Cada prueba
arranca con un esquema limpio construido desde las migraciones
(`RefreshDatabase`), y las subidas de archivos usan un disco falso
(`Storage::fake('s3')`): **nunca tocan Cloudflare R2 ni los datos de trabajo**.

---

## Organización

```
tests/
├── Concerns/
│   └── CreaEscenarioApi.php        Utilidades compartidas
├── Feature/
│   ├── SeguridadApiTest.php        68 pruebas de acceso, datos, validación y paginación
│   ├── PlanMantenimientoTest.php   19 pruebas del plan de mantenimiento
│   ├── ExpedienteClasificadoTest.php  13 pruebas de clasificación y vencimientos
│   └── ObjetivosDelProyectoTest.php    7 pruebas de lo que promete el anteproyecto
└── Unit/
    └── CedulaEcuatorianaTest.php   12 casos del algoritmo de cédula
```

### El trait `CreaEscenarioApi`

Evita repetir el montaje en cada prueba:

| Método | Para qué |
|---|---|
| `prepararRoles()` | Siembra los 3 roles con sus permisos |
| `crearUsuario($rol)` | Usuario activo con el rol indicado |
| `tokenDe($usuario)` | Token de Sanctum para ese usuario |
| `api($token)` | Petición autenticada, limpiando el guard entre llamadas |
| `crearSocioConCuenta()` | Socio con su cuenta de portal vinculada |
| `crearVehiculo($socio)` | Vehículo válido para ese socio |
| `cedulaValida($n)` | Genera una cédula con dígito verificador correcto |

> **Detalle importante:** `api()` llama a `forgetGuards()` antes de cada petición.
> Sin eso, Laravel recuerda al usuario de la petición anterior dentro de la misma
> prueba, y los cambios (token revocado, cuenta desactivada) no se notarían. Sin
> ese detalle, varias pruebas de seguridad pasarían sin comprobar nada real.

---

## Qué cubren

### Control de acceso

- Todas las rutas protegidas rechazan peticiones sin token.
- Un **socio** no alcanza **ninguna** ruta del panel administrativo.
- Un **operador** no alcanza usuarios, auditoría ni configuración.
- El **staff** no alcanza el portal del socio.
- Un socio no puede aprobar su propio mantenimiento.

### Autenticación y sesiones

- El login devuelve el mismo mensaje exista o no el correo.
- Se bloquea al sexto intento fallido del mismo correo.
- Una cuenta desactivada no inicia sesión ni puede usar un token previo.
- Los tokens tienen vencimiento configurado.
- Un usuario sin rol no se presenta como admin.
- El seeder no convierte en admin a usuarios sin rol.
- Cambiar la contraseña de un usuario cierra sus otras sesiones.
- Quien cambia su propia contraseña conserva su sesión actual.
- Las contraseñas débiles son rechazadas.

### Bajas y su efecto en el acceso

- Eliminar un socio desactiva su cuenta y corta su sesión abierta.
- Pasarlo a Inactivo produce el mismo efecto.
- Restaurar un socio **no** reactiva su cuenta: el admin debe hacerlo aparte.

### Datos que no deben exponerse

- Ninguna respuesta contiene contraseñas ni `remember_token`.
- El portal no muestra al socio las observaciones internas ni su `user_id`.
- El portal no expone rutas de archivos ni quién revisó cada pago.
- Un socio solo ve sus propias aportaciones y unidades.
- Un socio no puede cambiar su nombre, cédula, estado ni observaciones.

### Validación

- Cédula con dígito verificador (12 casos unitarios).
- Nombres con números o HTML son rechazados.
- Teléfono y correo obligatorios y con formato.
- Montos en cero o negativos rechazados.
- Fechas futuras rechazadas donde no corresponden.
- Archivos: se rechazan `.exe`, `.php` y los mayores al límite.
- Número de unidad y placa únicos entre activos.
- Tipo de vehículo y combustible restringidos a sus listas.
- Kilometraje que no retrocede.
- Inyección SQL en el buscador no devuelve registros de más.

### Dashboard

- Cuenta solo socios activos.
- "Al día" exige revisión aprobada reciente de un vehículo vigente.
- Los pendientes de taller ignoran vehículos eliminados.
- No queda ningún rastro de costos.
- Cuenta correctamente las unidades sin mantenimiento reciente.
- Un trabajo apenas programado no cuenta como unidad atendida.

### Plan de mantenimiento

- Una unidad sin trabajos aparece como "Sin registro".
- El estado cambia correctamente entre Al día, Por vencer y Vencido según la
  frecuencia configurada.
- Cambiar la frecuencia desde administración cambia el aviso del socio de inmediato.
- Un registro pendiente de revisión **no** pone la unidad al día.
- Con varias unidades, cada una mantiene su estado por separado.
- Un socio no ve ni registra en unidades ajenas.
- El staff rechaza con motivo y el socio puede reenviar.
- No se puede enviar dos veces el mismo tipo mientras siga pendiente.
- Lo que registra el staff no pasa por revisión.
- Las unidades siguen visibles aunque no haya frecuencias configuradas.
- El seeder deja las frecuencias listas sin pisar lo que el admin cambió.

### Expedientes clasificados

- El catálogo declara qué tipos existen, cuáles caducan y cuáles son obligatorios.
- Subir un documento exige clasificarlo; un tipo inventado se rechaza.
- Los tipos que caducan exigen fecha de vencimiento; los que no, se aceptan sin ella.
- Un documento no puede vencer antes de emitirse.
- El estado de vigencia se calcula bien en los cuatro casos (vigente, por vencer,
  vencido, sin vencimiento).
- El resumen dice qué obligatorios faltan por socio.
- Un obligatorio **vencido** deja el expediente incompleto aunque el archivo exista.
- Un socio no puede ver el catálogo ni el resumen.

### Objetivos del proyecto

Estas pruebas no verifican una pantalla ni un endpoint: verifican que el sistema
cumpla lo que el anteproyecto de tesis promete. Nacieron de contrastar el
documento contra el código y encontrar tres cosas que faltaban.

- Un mantenimiento se registra como **preventivo o correctivo**, y sin indicarlo
  se rechaza. El anteproyecto promete un *historial cronológico de fallas*, y eso
  solo existe si se distingue el trabajo planificado del que nace de una avería.
- El socio también indica desde el portal si su trabajo fue por una falla.
- Una revisión **aprobada exige hasta cuándo vale**; sin fecha de vencimiento se
  rechaza.
- El socio ve en su portal cuándo vence la revisión técnica de **cada** unidad.
- Una unidad sin revisión aprobada no reporta vigencia (no se inventa una fecha).
- El expediente admite los documentos que plantea el proyecto: cédula,
  habilitación, matrícula, licencia, póliza de seguro y récord de infracciones.
- Una póliza de seguro avisa antes de expirar, como cualquier otro documento que
  caduca.

### Paginación

- Los listados que crecen sin techo devuelven `{data, total, current_page, …}`.
- El tamaño de página es configurable pero tiene tope: pedir `per_page=99999`
  devuelve 100, y `per_page=0` devuelve 1.
- La búsqueda se resuelve en el servidor: encuentra un registro aunque esté en
  otra página.
- La bandeja de pendientes se pide aparte y no depende de la página visible.

### Atributos calculados

- La pantalla de Socios recibe `estado_pago_actual`, `numero_vehiculo`, `placa`
  y `cuenta_activa`. Falla si alguien olvida un `append()`.
- Un socio anidado en otra respuesta **no** los arrastra (cada uno costaba
  consultas propias).

### Cabeceras y límites

- Las respuestas llevan `no-store` y `nosniff`, también en los errores.
- La API autenticada y las subidas tienen límite de peticiones.

---

## Cómo están escritas

**Nombres que describen la regla, no el método.**

```php
public function test_un_registro_pendiente_de_revision_no_pone_la_unidad_al_dia()
public function test_dar_de_baja_a_un_socio_desactiva_su_cuenta_y_cierra_su_sesion()
```

Al fallar, el nombre ya dice qué regla del negocio se rompió.

**Se prueba el comportamiento observable, no la implementación.**
Las pruebas llaman a la API como lo haría el frontend y verifican la respuesta. Un
cambio interno que preserve el comportamiento no las rompe.

**Se prueba también lo que debe fallar.** Buena parte verifica que el sistema
**rechace** correctamente: archivos peligrosos, accesos ajenos, datos inválidos.

**Casos límite reales.** Un ejemplo de `PlanMantenimientoTest`: con frecuencia de 3
meses y aviso de 15 días, se mueve la fecha del último trabajo y se comprueba que
el estado pase por "Al día", "Por vencer" y "Vencido" en los tres momentos.

---

## Valor comprobado

Las pruebas no se escribieron para adornar: encontraron **22 errores reales** que
estaban en producción, entre ellos:

| Error encontrado | Consecuencia que tenía |
|---|---|
| El portal devolvía el modelo completo del socio | El socio leía las notas internas que el staff escribía sobre él |
| Los tokens no vencían nunca | Un token filtrado servía para siempre |
| Dar de baja no cortaba el acceso | El socio seguía entrando al portal |
| Un usuario sin rol se presentaba como admin | Escalada de privilegios |
| El seeder promovía a admin a cualquiera sin rol | En cada reinicio del contenedor |
| No había límite en la API autenticada | Sin protección ante abuso |
| El dashboard contaba socios inactivos | Cifras equivocadas |
| El gasto del mes sumaba otros años | Cifras equivocadas |
| Un socio eliminado aparecía en el cuadro maestro | Reporte con datos de bajas |

Cada uno quedó cubierto con una prueba que **falla si el error vuelve**.

---

## Lo que no cubren

Con honestidad, lo que queda fuera:

- **El frontend no tiene pruebas automatizadas.** Se verifica manualmente con un
  navegador real (Edge sin ventana), comprobando que no haya errores de JavaScript,
  violaciones de CSP ni desbordes horizontales en 360, 390, 768 y 1366 píxeles.
- **No hay integración continua.** Las pruebas se ejecutan a mano antes de cada
  despliegue; no corren solas al hacer push.
- **No se prueba contra PostgreSQL.** Las pruebas usan SQLite; las diferencias de
  motor podrían esconder algún problema. Los cambios se verifican además a mano
  contra la base PostgreSQL local.
- **No hay pruebas de carga.** No se sabe cómo responde con miles de registros.

---

## Al agregar una funcionalidad

1. Escribir primero la prueba que describe la regla nueva.
2. Confirmar que **falla** (si pasa sin escribir código, no está probando nada).
3. Implementar hasta que pase.
4. Ejecutar la suite completa para verificar que nada se rompió.
5. Compilar el frontend y revisar el lint.
