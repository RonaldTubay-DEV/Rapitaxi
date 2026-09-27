# 08 · Reglas de negocio

Las decisiones del dominio que el código hace cumplir, con el motivo detrás de cada
una. Este documento explica **por qué** el sistema se comporta como lo hace.

---

## 1. Socios

### Un socio es un accionista

La cooperativa es una **sociedad anónima**. Cada socio posee acciones y está
calificado en el permiso de operación del GAD de Montecristi con un número de
unidad (`012-01` a `012-66`).

### Datos obligatorios

Nombre, cédula, teléfono y correo son obligatorios. Es el mínimo para identificar
y contactar a un socio real.

- **Nombre:** solo letras, espacios, apóstrofes y guiones, entre 3 y 80 caracteres.
  Una persona no tiene números en su nombre ni un nombre de 200 letras.
- **Cédula:** validada con el algoritmo oficial ecuatoriano (provincia, tercer
  dígito y verificador por módulo 10). No basta con que sean 10 dígitos.
- **Teléfono:** 10 dígitos empezando en 0.

### Dar de baja exige justificación

Ninguna baja ocurre sin motivo escrito. Se guarda en las observaciones del socio
con la fecha, y la auditoría registra quién, cuándo y desde dónde.

**Por qué:** dar de baja a un socio tiene consecuencias patrimoniales —deja de
figurar como accionista operativo— y la cooperativa debe poder explicar cada caso
meses después.

### Una baja corta el acceso de inmediato

Al dar de baja a un socio, su cuenta del portal se desactiva y sus sesiones
abiertas se cierran. No puede seguir usando una pestaña ya abierta.

### Las bajas no borran información

El borrado es suave: el registro se marca como eliminado pero conserva todo su
historial. Un socio reactivado recupera sus aportaciones, vehículos y documentos.

### La cédula se puede reutilizar tras una baja

Un índice único **parcial** (`WHERE deleted_at IS NULL`) permite que la cédula de un
socio dado de baja quede libre para otro registro, sin perder el histórico del
primero.

**Por qué:** en la práctica un socio puede salir y volver a entrar, o puede haberse
registrado mal. Un `UNIQUE` tradicional bloquearía esa cédula para siempre.

### Reactivar no devuelve el acceso automáticamente

Al restaurar un socio, su cuenta del portal **sigue desactivada**. El admin decide
por separado si la habilita.

**Por qué:** reactivar el registro administrativo y devolver el acceso al sistema
son dos decisiones distintas, y conviene que sean deliberadas.

---

## 2. Cuentas de usuario

### Dos poblaciones separadas

| Pantalla | Crea cuentas para | Roles |
|---|---|---|
| **Usuarios** (admin) | Personal interno | `admin`, `operador` |
| **Socios** → ícono de llave | Socios | `socio` |

Nunca se mezclan: la pantalla de Usuarios responde 404 ante un usuario con rol
`socio`, para que no pueda tocarlo ni por error.

### Siempre debe quedar un administrador

El sistema impide eliminar o degradar al último admin. Sin esta regla, la
cooperativa podría quedarse sin acceso a la configuración y a la auditoría.

### Nadie elimina su propia cuenta en uso

Evita que un admin se deje fuera del sistema por accidente.

### Cambiar clave o rol cierra las otras sesiones

Si se cambia la contraseña de un usuario (porque se sospecha que fue comprometida)
o su rol, sus demás sesiones se invalidan. La sesión propia se conserva si uno se
edita a sí mismo, para no autoexpulsarse.

### Un usuario sin rol no entra

El login rechaza explícitamente a quien no tenga rol asignado, en vez de asumir uno
por defecto.

**Por qué:** antes el sistema asumía `admin` cuando no encontraba rol. Cualquier
usuario creado sin rol entraba con privilegios totales.

---

## 3. Aportaciones

### Solo las aprobadas cuentan

Un socio figura "Al día" en un mes únicamente si tiene una aportación **aprobada**
de ese mes y año. Un comprobante pendiente no alcanza.

**Por qué:** el comprobante lo sube el socio y nadie lo ha verificado todavía. Si
un pendiente contara, bastaría con subir cualquier archivo para aparecer al día.

### Dos caminos para registrar un pago

| Origen | Estado inicial |
|---|---|
| El staff lo registra (pago en oficina) | `Aprobado` |
| El socio sube su comprobante | `Pendiente` |

### Un pago por mes

No se permite una segunda aportación para el mismo mes y año, **salvo que la
anterior haya sido rechazada**. Así el socio puede corregir y reenviar.

### Rechazar exige motivo

El motivo es obligatorio y el socio lo ve en su portal. Sin esto, el socio sabría
que fue rechazado pero no qué corregir.

### El monto debe ser mayor a cero y la fecha no puede ser futura

Un pago de cero no es un pago, y un pago con fecha futura no ha ocurrido.

---

## 4. Vehículos

### Un socio puede tener varias unidades

La relación es uno a muchos. Por eso el portal muestra cada unidad por separado
con su propio estado: un socio con dos unidades necesita saber **cuál** llevar al
taller.

### Identificadores únicos entre unidades activas

Tanto el número de unidad (`012-01`) como la placa (`MBC-4650`) son únicos entre
los vehículos no eliminados. Si una unidad se da de baja, su placa queda libre.

### Clasificación oficial

El tipo de vehículo usa una lista cerrada (Sedán, Hatchback, SUV, Station Wagon,
Furgoneta, Pickup, Van) que replica el campo "TIPO" de la resolución de
habilitación del GAD. Así los datos del sistema coinciden con los documentos.

### El color es siempre amarillo

Se fija automáticamente: son taxis y la normativa lo exige.

---

## 5. Mantenimiento

### La compañía no maneja el dinero

Cada socio paga los trabajos de su propia unidad. La cooperativa **no** registra
costos ni los audita: solo necesita saber **qué se hizo y cuándo**, para verificar
que las unidades asociadas estén operativas.

Por eso el sistema no tiene ningún campo de costo.

### El respaldo es obligatorio para cerrar un trabajo

Para marcar un mantenimiento como Completado hay que adjuntar factura, orden de
taller o una foto. Es la evidencia de que el trabajo realmente se hizo.

### Preventivo o correctivo

Cada trabajo se registra como una de dos cosas:

| Naturaleza | Qué significa |
|---|---|
| **Preventivo** | Planificado por frecuencia (el cambio de aceite que tocaba) |
| **Correctivo** | Se hizo porque algo falló (se dañó el cilindro de frenos) |

**Por qué se distinguen:** el planteamiento del proyecto habla de llevar el
"historial cronológico de fallas" de cada unidad. Sin esta distinción, un cambio
de frenos programado y uno por avería se ven idénticos, y no hay forma de saber
qué unidad está fallando más de lo normal.

Ambos cuentan igual para el plan: si a una unidad le cambiaron los frenos por una
falla, el próximo mantenimiento preventivo de frenos se cuenta desde esa fecha.

### Dos estados distintos, a propósito

| Campo | Describe | Valores |
|---|---|---|
| `estado` | El trabajo | Programado, En Proceso, Completado |
| `revision_estado` | El registro | Aprobado, Pendiente, Rechazado |

Un mantenimiento que sube un socio nace `Completado` (el trabajo ya ocurrió) pero
`Pendiente` de revisión. Solo cuando el staff lo aprueba pone la unidad al día.

### El estado del trabajo solo avanza

De Programado a En Proceso a Completado. Nunca al revés.

### Un trabajo completado no se modifica ni se elimina

Es un registro histórico con su respaldo adjunto. Permitir editarlo abriría la
puerta a alterar el historial de la flota.

### El kilometraje no retrocede

Un kilometraje menor al del último trabajo completado de esa unidad es rechazado:
o es un error de digitación, o es un intento de ocultar algo.

### Una fecha futura no es un trabajo hecho

Un mantenimiento Completado no puede tener fecha futura. Si estaba programado para
más adelante y se terminó antes, el sistema fija la fecha real en hoy.

### El plan se calcula solo por tiempo

El aviso de "pronto toca mantenimiento" se calcula como:

```
próxima fecha = fecha del último trabajo aprobado + meses de frecuencia
```

**Por qué no por kilometraje:** el sistema solo conoce el kilometraje en el momento
de cada mantenimiento; no sabe cuánto ha rodado la unidad desde entonces. Avisar
por kilómetros exigiría que el socio reportara su odómetro periódicamente.

### Estados del plan

| Estado | Condición |
|---|---|
| **Al día** | Faltan más días que la ventana de anticipación |
| **Por vencer** | Quedan días dentro de la ventana |
| **Vencido** | La fecha ya pasó |
| **Sin registro** | Nunca se registró ese tipo de trabajo |

El resumen de una unidad toma el más urgente, en este orden:
**Vencido → Sin registro → Por vencer → Al día**.

"Sin registro" pesa más que "Por vencer" porque una unidad que nunca ha pasado por
ese trabajo es más preocupante que una a la que le faltan días.

### Solo cuentan los trabajos aprobados

Un registro pendiente de revisión no mueve el estado. Si contara, el socio podría
"ponerse al día" subiendo cualquier archivo.

### Configurar la frecuencia cambia los avisos de inmediato

El plan no se almacena: se calcula al momento. Si el admin baja el cambio de aceite
de 6 a 3 meses, las unidades con 4 meses pasan a aparecer vencidas al instante.

---

## 6. Revisiones (RTV)

### Cada revisión aprobada dice hasta cuándo vale

Una RTV aprobada **exige su fecha de caducidad**, que viene impresa en el
documento. Sin esa fecha el sistema no podría avisar antes de que expire, que es
justamente lo que el proyecto promete.

Estados de vigencia: **Vigente**, **Por vencer** (dentro de 30 días) y **Vencida**.

El socio ve el aviso en su portal, por unidad: *"Revisión técnica (RTV): vence en
20 días"* o *"vencida hace 12 días"*.

**Solo las aprobadas tienen vigencia.** Una revisión rechazada o pendiente no
habilita al vehículo, caduque o no, así que no reporta estado.

### Vigencia de un año en el dashboard

El dashboard considera "al día" a una unidad con revisión **aprobada** dentro de
los últimos 12 meses.

> Este plazo es un supuesto que quedó de antes de registrar la fecha de caducidad
> real. Ahora que cada revisión trae la suya, el dashboard debería usarla en vez
> del plazo fijo. Es una incoherencia pendiente de resolver.

### Una revisión aprobada o rechazada ya ocurrió

No puede tener fecha futura. Una revisión **Pendiente** sí, porque puede estar
agendada.

---

## 7. Documentos y archivos

### Bucket privado con enlaces temporales

Ningún archivo tiene URL pública permanente. Cada consulta genera un enlace firmado
válido 5 minutos.

**Por qué:** los expedientes contienen cédulas escaneadas con fotografía. Una URL
permanente filtrada expondría esos datos indefinidamente.

### Límites de tamaño y tipo

| Tipo de archivo | Formatos | Máximo |
|---|---|---|
| Expedientes, comprobantes, respaldos | PDF, JPG, PNG | 5 MB |
| Libros contables | Solo PDF | 10 MB |

El tipo se valida por el **contenido real**, no por la extensión del nombre.

---

## 8. Portal del socio

### El socio solo edita su contacto

Puede cambiar teléfono, correo y dirección. **No** puede cambiar su nombre, su
cédula ni su estado de afiliación: eso lo administra la cooperativa.

**Por qué:** el nombre y la cédula deben coincidir con los documentos oficiales, y
el estado de afiliación es una decisión de la compañía.

### Las notas internas nunca se muestran

El campo `observaciones` guarda lo que el staff escribe sobre un socio, incluidos
los motivos de baja. El portal jamás lo devuelve.

### Doble condición para entrar

El socio necesita que su **cuenta** esté activa y que su **afiliación** esté
`Activo`. Cualquiera de las dos en falso le cierra el portal.

### Todo lo que envía pasa por revisión

Tanto los comprobantes de pago como los registros de mantenimiento nacen
Pendientes. El staff aprueba o rechaza con motivo.

**Por qué:** el socio es parte interesada en aparecer al día. La verificación
humana es el control de la cooperativa.

---

## 9. Auditoría

### Todo queda registrado

Ocho entidades registran automáticamente cada creación, edición y eliminación, con
los valores antes y después, el usuario, la fecha, la **IP** y el **dispositivo**.

### Las decisiones con peso exigen justificación escrita

| Acción | Se exige |
|---|---|
| Dar de baja a un socio | Motivo, guardado con fecha en sus observaciones |
| Rechazar un comprobante | Motivo, visible para el socio |
| Rechazar un mantenimiento | Motivo, visible para el socio |

**Por qué:** el log técnico dice *qué* cambió; el motivo dice *por qué*. Ante un
reclamo meses después, la cooperativa necesita las dos cosas.

---

## 10. Supuestos revisables

Decisiones tomadas con criterio razonable, pero que la cooperativa puede querer
cambiar:

| Supuesto | Valor actual | Dónde se cambia |
|---|---|---|
| Vigencia de la RTV (dashboard) | 12 meses | `DashboardController` |
| Aviso antes de vencer la RTV | 30 días | `Revision::DIAS_AVISO_VENCIMIENTO` |
| "Unidad descuidada" | 6 meses sin trabajos | `DashboardController` |
| Frecuencias de mantenimiento | 3 a 12 meses según el tipo | Pantalla de Configuración |
| Vencimiento de sesión | 12 horas | `SANCTUM_EXPIRATION_MINUTES` |
| Inactividad antes del aviso | 18 minutos + 2 de cuenta regresiva | `SessionIdleWatcher.jsx` |
| Vigencia de los enlaces de archivos | 5 minutos | `ArchivoPrivado::MINUTOS_DE_VIGENCIA` |
| Longitud mínima de contraseña | 8 con letras y números | `AppServiceProvider` |

> **Incoherencia conocida:** el dashboard usa un umbral fijo de 6 meses para
> "Sin Taller", mientras que el portal del socio usa las frecuencias configurables
> por tipo. Convendría que el dashboard pase a contar unidades con algún
> mantenimiento vencido según el plan, para que ambos hablen del mismo criterio.
