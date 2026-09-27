# 01 · Manual de usuario

Guía práctica del sistema, escrita para quien lo va a usar todos los días.
No hace falta saber nada de programación para seguirla.

---

## Índice

1. [Entrar al sistema](#1-entrar-al-sistema)
2. [Panel administrativo](#2-panel-administrativo)
   - [Dashboard](#21-dashboard)
   - [Socios](#22-socios)
   - [Expedientes](#23-expedientes)
   - [Actas](#24-actas)
   - [Vehículos](#25-vehículos)
   - [Mantenimiento](#26-mantenimiento)
   - [Revisiones](#27-revisiones)
   - [Aportaciones](#28-aportaciones)
   - [Libros contables](#29-libros-contables)
   - [Usuarios](#210-usuarios-solo-admin)
   - [Configuración](#211-configuración-solo-admin)
   - [Auditoría](#212-auditoría-solo-admin)
3. [Portal del socio](#3-portal-del-socio)
4. [Preguntas frecuentes](#4-preguntas-frecuentes)

---

## 1. Entrar al sistema

Todos los usuarios entran por la misma pantalla de inicio de sesión, con su correo
y su contraseña. El sistema reconoce el rol automáticamente:

- El **personal de la cooperativa** llega al panel administrativo.
- Un **socio** llega directo a su portal.

### Opciones de la pantalla de ingreso

- **Recordarme**: guarda tu correo en ese navegador para no volver a escribirlo.
  Nunca guarda la contraseña.
- Si te equivocas de contraseña varias veces, el sistema bloquea los intentos
  durante un minuto. Es una protección contra quien intente adivinar tu clave.

### Cierre de sesión por inactividad

Si dejas el sistema abierto sin tocarlo, a los **18 minutos** aparece un aviso
("¿Sigues ahí?") con una cuenta regresiva de **2 minutos**.

- Si mueves el mouse, escribes o tocas la pantalla, la sesión continúa.
- Si no haces nada, el sistema cierra la sesión y te devuelve al inicio.

Esto protege la información si dejas la computadora sola en la oficina.

> **Nota:** además, tu sesión caduca sola a las 12 horas. Es normal que te pida
> la contraseña de nuevo al día siguiente.

### Modo oscuro

El botón amarillo con el ícono de luna o sol, arriba a la derecha, cambia toda la
apariencia del panel entre claro y oscuro. Tu elección queda guardada en ese
navegador.

---

## 2. Panel administrativo

El menú lateral amarillo agrupa las pantallas por área. Las secciones
**Usuarios**, **Configuración** y **Auditoría** solo las ve el administrador.

### 2.1 Dashboard

Es la pantalla de inicio. Muestra cuatro indicadores:

| Indicador | Qué significa |
|---|---|
| **Socios** | Cuántos socios están activos (no cuenta los inactivos ni los dados de baja) |
| **Flota Total** | Cuántos vehículos hay registrados |
| **En Taller** | Trabajos de mantenimiento programados o en proceso |
| **Sin Taller** | Unidades que llevan más de 6 meses sin ningún mantenimiento. Aparece en rojo si hay alguna |

Debajo verás:

- **Estatus Legal (RTV)**: qué porcentaje de la flota tiene la revisión técnica
  vigente, según la fecha de vencimiento de cada certificado. Es el mismo
  criterio que ve el socio en su portal.
- **Últimos Movimientos en Taller**: los cinco trabajos más recientes.

### 2.2 Socios

Aquí se administran los accionistas de la compañía.

#### Registrar un socio

Pulsa **Agregar Socio** y completa el formulario. Todos estos datos son obligatorios:

| Campo | Regla |
|---|---|
| Nombre completo | Solo letras y espacios, entre 3 y 80 caracteres. No acepta números |
| Cédula | 10 dígitos. El sistema verifica que sea una cédula ecuatoriana real |
| Teléfono | 10 dígitos, empezando en 0 |
| Correo | Debe tener formato válido |
| Estado de afiliación | Activo o Inactivo |

La dirección y las observaciones son opcionales.

> **Nota:** el sistema valida la cédula con su dígito verificador. Si te dice que
> no es válida, revisa que los 10 dígitos estén bien escritos: no es un error
> del sistema, es que ese número no corresponde a una cédula real.

#### Dar de baja a un socio

Hay dos formas, y **ambas exigen escribir un motivo**:

1. **Cambiar su estado a Inactivo**: deja de contar como socio operativo.
2. **Eliminarlo** (ícono de basurero): lo saca del listado.

En los dos casos ocurre lo mismo:

- El motivo se guarda en las observaciones del socio con la fecha.
- Si el socio tenía cuenta en el portal, **esa cuenta se desactiva y sus sesiones
  se cierran de inmediato**. Ya no puede entrar.
- La auditoría registra quién lo hizo, cuándo y desde qué equipo.

> **Importante:** eliminar un socio **no borra su información**. Todo su historial
> (aportaciones, vehículos, documentos) se conserva.

#### Reactivar un socio eliminado

El botón **Ver eliminados** muestra los socios dados de baja. Desde ahí puedes
reactivarlos con todo su historial intacto.

Dos cosas a tener en cuenta:

- Si otro socio tomó esa cédula mientras tanto, el sistema no deja reactivarlo
  hasta resolver el conflicto.
- Al reactivar al socio, **su cuenta del portal sigue desactivada**. Si quieres
  que vuelva a entrar, debes activarla aparte (ver abajo).

#### Crear la cuenta del portal para un socio

*Solo el administrador.*

El ícono de llave junto a cada socio abre el formulario para crearle su acceso.
Necesitas un correo y una contraseña (mínimo 8 caracteres, con letras y números).
Con eso el socio ya puede entrar a su portal.

Los íconos de persona permiten activar o desactivar esa cuenta cuando haga falta.

> **Nota:** esta pantalla y la de **Usuarios** son distintas. Aquí se crean cuentas
> para **socios**; en Usuarios se crean cuentas para el **personal interno**
> (admin y operador). Un socio nunca puede entrar al panel administrativo.

### 2.3 Expedientes

El archivo digital de documentos de cada socio: cédulas, resoluciones de
habilitación, matrículas, cartas de cesión, certificados del SRI.

La pantalla tiene dos columnas que se desplazan por separado:

- **Izquierda**: busca y selecciona al socio.
- **Derecha**: sus documentos, con opción de subir o eliminar.

Se aceptan archivos **PDF, JPG y PNG de hasta 5 MB**.

#### Qué documento es cada archivo

Al subir un documento hay que indicar **qué es**: cédula, resolución de
habilitación, matrícula, carta de cesión, certificado del SRI, etc. No es un
trámite burocrático: es lo que permite al sistema saber qué le falta a cada
expediente y qué está por caducar.

Si el documento caduca (cédula, habilitación, matrícula, licencia, seguro), el
formulario pide además su **fecha de vencimiento**. Opcionalmente puedes registrar
el número de documento y la fecha de emisión.

#### Control de completitud

Junto a cada socio de la lista aparece un contador como **2/3**: cuántos de los
tres documentos obligatorios tiene.

| Documento obligatorio | Por qué |
|---|---|
| Cédula de identidad | Identifica al socio |
| Resolución de habilitación | Autoriza la unidad a operar |
| Matrícula del vehículo | Acredita el vehículo |

- **Verde (3/3)**: expediente completo y al día.
- **Rojo**: falta algún documento obligatorio, o alguno está vencido.

Al abrir el expediente de un socio incompleto, una franja roja dice exactamente
qué falta: *"Faltan: Resolución de habilitación, Matrícula del vehículo."*

#### Vencimientos

Cada documento que caduca muestra su estado:

| Etiqueta | Significado |
|---|---|
| **Vigente** (verde) | Le queda más de un mes |
| **Vence en N d** (ámbar) | Caduca dentro de los próximos 30 días |
| **Venció hace N d** (rojo) | Ya caducó |

Si el expediente está completo pero algo está por vencer, aparece una franja ámbar
avisándolo. Un documento obligatorio **vencido** deja el expediente como incompleto,
aunque el archivo esté subido: existe, pero ya no sirve.

Para ver un documento, pulsa sobre él: se abre en una pestaña nueva mediante un
enlace temporal que **caduca a los 5 minutos**. Ese enlace no se puede compartir
con alguien de fuera, porque deja de funcionar.

### 2.4 Actas

Genera el **cuadro maestro** de la flota: una tabla con cada unidad, su placa, su
socio, el estado de pago y la fecha de su última revisión aprobada.

El botón de imprimir prepara el documento con el encabezado oficial de la
compañía, listo para firmar o archivar.

### 2.5 Vehículos

El parque automotor de la cooperativa.

| Campo | Regla |
|---|---|
| Socio asignado | Debe ser un socio activo |
| N° de unidad | Formato `012-01`. No se puede repetir entre unidades activas |
| Placa | Formato `MBC-4650`. No se puede repetir entre unidades activas |
| Marca | Texto libre, hasta 50 caracteres |
| Tipo de vehículo | Lista fija: Sedán, Hatchback, SUV, Station Wagon, Furgoneta, Pickup, Van |
| Tipo de combustible | Lista fija: Gasolina, Diesel, GLP, Eléctrico, Híbrido |
| Año de fabricación | Entre 1980 y el año próximo |

El color se fija automáticamente en **Amarillo**, por ser taxis.

> **Nota:** el tipo de vehículo usa la misma clasificación que la resolución de
> habilitación del GAD de Montecristi, para que los datos del sistema coincidan
> con los documentos oficiales.

### 2.6 Mantenimiento

Registra los trabajos hechos a cada unidad. La compañía **no maneja el dinero**
de estos trabajos: cada socio paga los suyos. Lo que el sistema controla es
**qué se hizo y cuándo**, para verificar que la flota esté operativa.

#### Registrar un trabajo (Nuevo Ingreso)

Elige la unidad, el tipo de trabajo, si fue **preventivo o correctivo**, la fecha
y el estado inicial:

- **Programado**: se hará más adelante.
- **En Proceso**: está en el taller.
- **Completado**: ya se hizo.

Para marcarlo como **Completado** se exige: kilometraje, detalle técnico del
trabajo, descripción y el **respaldo** (factura, orden de taller o una foto).

Reglas que el sistema hace cumplir:

- Todo trabajo debe indicar si fue **Preventivo** (planificado, por plazo o
  kilometraje) o **Correctivo** (para reparar una falla). De esa distinción sale
  el historial de fallas de la unidad.
- Un trabajo completado no puede tener fecha futura.
- El kilometraje no puede ser menor al del último trabajo de esa unidad.
- Un trabajo ya completado no se puede modificar ni eliminar.
- El estado solo avanza: de Programado a En Proceso a Completado, nunca al revés.

#### Aprobar lo que envían los socios

Cuando un socio registra un mantenimiento desde su portal, aparece arriba una
**franja ámbar** con los registros pendientes. De cada uno puedes:

- **Ver respaldo**: abrir el archivo que subió.
- **Aprobar**: recién ahí la unidad cuenta como atendida.
- **Rechazar**: exige escribir un motivo, que el socio verá en su portal para
  poder corregir y volver a enviarlo.

En la tabla, los registros sin aprobar aparecen marcados como **En revisión** aunque
digan "Completado". Mientras no se aprueben, la unidad sigue apareciendo como
pendiente en el portal del socio.

### 2.7 Revisiones

Bitácora de revisiones técnicas vehiculares (RTV) y trámites con la ANT/GAD.

Cada revisión tiene una unidad, una fecha, un tipo y un estado: **Aprobada**,
**Rechazada** o **Pendiente**.

Cuando la revisión se marca **Aprobada**, el sistema exige además **hasta cuándo
vale**: la fecha de vencimiento que trae el certificado. Con ella el socio ve en
su portal cuántos días le quedan, por cada unidad. Esa fecha debe ser posterior a
la de la revisión.

Una revisión Aprobada o Rechazada no puede tener fecha futura (ya ocurrió). Una
Pendiente sí, porque puede estar agendada.

> El Dashboard cuenta como "al día" a la unidad cuya revisión aprobada **sigue
> vigente** según esa fecha de vencimiento. Para las revisiones antiguas que se
> cargaron sin fecha se sigue suponiendo un año desde la revisión.

### 2.8 Aportaciones

Los pagos mensuales de los socios.

#### Registrar un pago manualmente

Cuando el socio paga en la oficina, se registra aquí: socio, mes, año, monto,
fecha y método de pago. Estos pagos quedan **aprobados directamente**.

Reglas:

- El monto debe ser mayor a cero.
- La fecha de pago no puede ser futura.
- Un socio no puede tener dos aportaciones para el mismo mes y año, salvo que la
  anterior haya sido rechazada.

#### Revisar comprobantes de los socios

Cuando un socio sube su comprobante desde el portal, llega en estado
**Pendiente**. Usa el filtro de estado para verlos y decidir:

- **Aprobar**: recién entonces el socio figura como "Al día" en ese mes.
- **Rechazar**: exige un motivo (por ejemplo, "el monto no coincide"). El socio lo
  ve y puede subir otro.

### 2.9 Libros contables

Archivo digital de balances y reportes fiscales. Se sube un **PDF de hasta 10 MB**
con su título, el mes/año al que corresponde y una descripción opcional.

### 2.10 Usuarios *(solo admin)*

Las cuentas del personal interno: **admin** y **operador**.

Reglas de protección:

- No puedes eliminar tu propia cuenta mientras la estás usando.
- Siempre debe quedar al menos un administrador. El sistema no te deja quedarte
  sin ninguno.
- La contraseña exige mínimo 8 caracteres, con letras y números.
- **Al cambiar la contraseña o el rol de un usuario, sus otras sesiones se cierran
  automáticamente.** Tu propia sesión se conserva si te editas a ti mismo.

> Desde esta pantalla no se ven ni se gestionan las cuentas de los socios: esas
> viven en la pantalla de Socios.

### 2.11 Configuración *(solo admin)*

Dos secciones:

**Notificaciones emergentes.** Activa o desactiva los mensajes breves de
confirmación que aparecen al guardar algo.

**Frecuencia de mantenimientos.** Aquí se define, para cada tipo de trabajo:

- **Cada cuántos meses** le toca a una unidad.
- **Con cuántos días de anticipación** avisarle al socio.

Valores con los que arranca el sistema:

| Trabajo | Cada | Aviso |
|---|---|---|
| Cambio de Aceite | 3 meses | 15 días antes |
| Frenos | 6 meses | 15 días antes |
| Suspensión | 12 meses | 30 días antes |
| Llantas | 12 meses | 30 días antes |
| Sistema Eléctrico | 12 meses | 30 días antes |

**Lo que cambies aquí cambia de inmediato el aviso que ve cada socio en su
portal.** Si reduces el cambio de aceite de 6 a 3 meses, las unidades que llevaban
4 meses pasan a aparecer como vencidas.

### 2.12 Auditoría *(solo admin)*

El registro de todo lo que ocurre en el sistema. Por cada acción se guarda:

- Qué módulo y qué tipo de acción (creó, editó, eliminó).
- Sobre qué registro.
- Qué usuario la hizo y desde qué **dirección IP** y **dispositivo/navegador**.
- La fecha y hora exactas.

La lista muestra un resumen de cada evento. El botón **Ver detalle** despliega
exactamente qué campos cambiaron, con el valor anterior y el nuevo.

Se puede filtrar por módulo y por tipo de evento.

---

## 3. Portal del socio

El socio entra con su correo y contraseña y ve únicamente su propia información.
El portal está pensado para usarse **desde el celular**.

### La franja de aviso

Si alguna de sus unidades necesita mantenimiento, aparece una franja de color en
la parte superior, **visible en cualquier pantalla del portal**:

- **Ámbar**: hay algo por vencer o sin registrar.
- **Roja**: hay algo vencido.

La franja nombra la unidad concreta: *"Tu unidad 012-01 (MBC-4650) necesita
mantenimiento"*. Si son varias, las lista todas. La pestaña "Mis Unidades" muestra
además un contador con cuántas están en alerta.

### 3.1 Mi Perfil

Muestra su nombre, cédula y estado de afiliación —que **solo la cooperativa puede
cambiar**— y sus vehículos.

El socio sí puede actualizar su **teléfono, correo y dirección**. El teléfono y el
correo son obligatorios y se validan igual que en el panel administrativo.

> Por seguridad, el portal nunca le muestra al socio las observaciones internas
> que el staff escribe sobre él.

### 3.2 Mis Unidades

Una tarjeta por cada unidad, con su número, placa, marca y tipo. Un distintivo de
color resume su situación:

| Estado | Significado |
|---|---|
| **Al día** (verde) | Todos los mantenimientos dentro de plazo |
| **Por vencer** (ámbar) | Alguno entra en la ventana de aviso |
| **Sin registro** (ámbar) | Algún trabajo nunca se ha registrado |
| **Vencido** (rojo) | Algún trabajo pasó su fecha |

Si la unidad tiene una revisión técnica aprobada, la tarjeta muestra arriba un
aviso propio: *"Revisión técnica (RTV): vence en 20 días"*, *"vencida hace 12
días"* o *"vigente"*, con el mismo código de colores. Es independiente del plan
de mantenimiento: una unidad puede estar al día con el taller y tener la RTV
vencida.

Dentro de cada tarjeta se detalla cada tipo de trabajo con su plazo en lenguaje
claro: *"Vencido hace 32 días"*, *"Faltan 4 días"*, *"Nunca se ha registrado este
trabajo"*, junto con la fecha del último y la del próximo.

#### Registrar un mantenimiento

Con el botón **Registrar** el socio informa un trabajo ya realizado:

- Tipo de trabajo, si fue **preventivo o correctivo**, fecha (no futura, ni de
  hace más de un año), kilometraje, descripción y el **respaldo**: factura, orden
  de taller o una foto.

El registro queda **Pendiente** hasta que el staff lo apruebe. Mientras tanto se
muestra como "En revisión" y la unidad sigue contando como pendiente.

Si se lo rechazan, el socio ve el motivo en rojo dentro de la tarjeta y puede
volver a enviarlo corregido.

### 3.3 Mis Aportaciones

Tres tarjetas de resumen: si está **Al día o En mora** este mes, cuántos
comprobantes tiene **pendientes** de revisión y cuántos ha subido en total.

Debajo, el historial completo con el periodo, el monto y el estado de cada uno.
Si alguno fue rechazado, muestra el motivo.

#### Subir el comprobante del mes

El botón **Subir Comprobante** pide el mes, el año, el monto y el archivo
(PDF, JPG o PNG, **máximo 5 MB**).

Desde el celular, al tocar el selector de archivo el teléfono ofrece **tomar una
foto nueva o elegir una de la galería**.

El comprobante queda **Pendiente** hasta que el administrador lo confirme. Solo
entonces el socio figura como "Al día" en ese mes.

No se puede subir dos veces el mismo mes, salvo que el anterior haya sido
rechazado.

---

## 4. Preguntas frecuentes

**Subí un comprobante pero sigo apareciendo "En mora". ¿Por qué?**
Porque todavía está pendiente de revisión. Solo cuenta cuando el administrador lo
aprueba.

**Eliminé un socio por error. ¿Se perdió todo?**
No. Entra a Socios, pulsa **Ver eliminados** y reactívalo: conserva todo su
historial. Recuerda reactivar también su cuenta del portal si la tenía.

**Un socio dice que no puede entrar a su portal.**
Revisa tres cosas: que su cuenta esté activa (ícono de persona en Socios), que su
estado de afiliación sea **Activo**, y que no esté eliminado. Cualquiera de las
tres le bloquea el acceso.

**El sistema no me deja guardar una cédula.**
El sistema verifica el dígito verificador de la cédula ecuatoriana. Si la rechaza,
el número no corresponde a una cédula real: revísalo con el documento a la vista.

**¿Por qué no puedo corregir un mantenimiento completado?**
Es a propósito: un trabajo cerrado es un registro histórico con su respaldo
adjunto. Permitir editarlo abriría la puerta a alterar el historial de la flota.

**Cambié la frecuencia de mantenimiento y ahora muchas unidades salen vencidas.**
Es el comportamiento esperado: el sistema recalcula con la nueva frecuencia sobre
la fecha del último trabajo de cada unidad.

**¿Los enlaces de los documentos se pueden compartir?**
No. Caducan a los 5 minutos y luego dejan de funcionar, incluso para quien tenga
el enlace.
