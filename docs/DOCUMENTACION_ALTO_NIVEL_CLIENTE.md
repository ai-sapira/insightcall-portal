### Manual de referencia para Nogal — InsightCall

Versión: 1.1 · Fecha: 2025-11-12

### 0. Cómo leer este documento
- Está organizado por “qué es”, “cómo funciona” y “quién hace qué”.
- Incluye referencias al repositorio para profundizar cuando sea necesario.

### 1. Resumen ejecutivo
- **Qué es**: Plataforma para gestionar llamadas y convertirlas en insights y acciones (resúmenes, motivos, tickets) utilizando el middleware Segurneo Voice.
- **Para quién**: Equipos de negocio y operaciones del cliente; soporte de TI.
- **Beneficio**: Centraliza información de llamadas y acelera la resolución y seguimiento de gestiones.

### 2. Alcance y propiedad
- **Cliente**: Portal web (UI), backend, base de datos y los datos operativos; configuración funcional.
- **Nuestro equipo**: Middleware de Segurneo Voice (recepción de audio, transcripción, análisis y orquestación de tickets) y su operación.
- **Hosting**: Opcionalmente gestionado por nuestro equipo. La propiedad del software y los datos es del cliente.

### 3. Arquitectura y componentes
- **Portal Web (Frontend)**: React + Vite + Tailwind. Vistas: listado de llamadas, detalle, tickets, paneles.
- **API / Backend (Node.js/TypeScript)**: Endpoints para consulta/persistencia; recibe webhooks desde Segurneo Voice y delega creación de tickets a Segurneo Voice.
- **Base de datos (SQL gestionada)**: Llamadas, transcripciones y tickets (migraciones versionadas).
- **Middleware Segurneo Voice (propiedad nuestra)**: Punto central del pipeline de voz: recibe audio y genera la transcripción (incluyendo `tool_results` de búsqueda/identificación). Expone endpoints para ejecutar acciones en NOGAL (crear cliente, crear ticket, crear rellamada) y envía el webhook con la transcripción y metadatos al backend del cliente. El análisis semántico y la decisión de qué acción ejecutar se realizan en esta plataforma.

Diagrama lógico simplificado:

```
Usuarios → Portal Web → API/Backend → Base de Datos
                        ↑           ↘ Exportaciones/Reportes
                        │
  Llamadas/Audio → Segurneo Voice → (Webhook: transcripción + análisis) → API/Backend → Portal
                        ↑
                 Integraciones externas (p. ej., gateway de llamadas)
```

### 4. Organización del repositorio (mapa útil)
- `src/`: Portal web (React). Páginas, componentes y hooks de datos.
- `server/`: Backend (Node/TS). Servicios de análisis, ejecución de acciones y endpoints.
- `shared/`: Tipos compartidos entre frontend/backend.
- `docs/`: Documentación funcional y técnica.
- `scripts/`: Utilidades de prueba/operación (p. ej., reprocesos).

### 5. Módulos funcionales del portal
- **Llamadas**: listado, filtros por estado/fecha/agente/motivo.
- **Detalle**: resumen automático, transcripción (si aplica), etiquetas y datos relevantes.
- **Tickets**: creación, enlace y seguimiento con el sistema del cliente cuando aplique.
- **Paneles/KPIs**: volúmenes, motivos y tendencias.
- **Exportación**: reportes para análisis externo.

### 6. Flujos clave (E2E)
6.1 Recepción de llamadas (transcripción y audio)

```
Origen de llamada → Segurneo Voice
Segurneo Voice —(POST /api/v1/calls/new/webhook)→ Backend Nogal
Backend → Base de Datos → Portal (UI)
```

6.2 Creación de tickets (delegada en Segurneo Voice)

```
Usuario en Portal → Backend (POST /api/v1/crear-ticket)
Backend —(POST https://segurneo-voice.onrender.com/api/crear-ticket)→ Segurneo Voice → Nogal (crea ticket)
Segurneo Voice → Respuesta (JsonId/Fecha/Hora) → Backend → Portal
```

6.3 Flujo de análisis de llamadas (detalle)

1) Captura y transcripción (Segurneo Voice)
- Recibe el audio y metadatos de la llamada (call_id, conversation_id, agent_id, timestamps).
- Genera la transcripción completa en múltiples turnos (agent/user).
- Agrega resultados de herramientas (“tool_results”) con información del cliente/pólizas.

2) Análisis semántico (Decision Engine en la plataforma)
- La plataforma consume la transcripción y los `tool_results` que envía Segurneo y ejecuta un único análisis por conversación.
- Identifica el tipo de cliente (existente/lead/nuevo), detecta si es rellamada (buscando incidencias previas), determina `Tipo de incidencia` y `Motivo de gestión`, e infiere `ramo` cuando aplica.
- Extrae y normaliza datos clave (p. ej., `codigo_cliente`, `numeroPoliza`, `IBAN`, `email`, `teléfono`, `dirección`) y genera la narrativa (`processingRecommendation`) y las `ticketNotes` listas para el ticket.

3) Entrega al portal (webhook)
- Envía webhook con transcripción, resumen y referencias de audio a `POST /api/v1/calls/new/webhook`.
- El backend persiste la llamada, metadatos y deja lista la visualización en el portal.

4) Decisión y ejecución (crear cliente / ticket / rellamada)
- Cuando el usuario confirma o el Decision Engine así lo determina:
  - **Crear cliente** (si `shouldCreateClient = true`): la plataforma llama a `POST /api/crear-cliente` en Segurneo con `IdCliente`, datos básicos e `IdLlamada`.
  - **Crear ticket** (si `shouldCreateTickets = true`): la plataforma llama a `POST /api/crear-ticket` en Segurneo con `IdCliente`, `IdLlamada`, `TipoIncidencia`, `MotivoIncidencia`, `NumeroPoliza`/`Ramo` si aplica y `Notas`.
  - **Crear rellamada** (si `shouldCreateFollowUp = true`): la plataforma llama a `POST /api/crear-rellamada` en Segurneo con `IdCliente`, `IdTicket` relacionado, `IdLlamada` y `Notas`.
- Segurneo Voice materializa la acción en Nogal y responde con los identificadores generados (`IdTicket`, `JsonId`, etc.). El backend actualiza `calls` y `tickets`.

5) Persistencia y visualización
- Se actualizan estados y se muestra el ticket enlazado en el portal.

6) Reintentos y errores
- Si la creación en Segurneo Voice/Nogal falla, el backend devuelve error y puede reintentarse.

Ejemplo mínimo de webhook de Segurneo Voice (recibido por el backend)

```json
{
  "call_id": "NG3205784",
  "conversation_id": "conv_abc123",
  "agent_id": "virtual-agent",
  "start_time": "2025-09-10T10:20:30Z",
  "end_time": "2025-09-10T10:27:10Z",
  "duration_seconds": 400,
  "status": "completed",
  "call_successful": true,
  "transcript_summary": "El cliente solicita duplicado de tarjeta ...",
  "audio_download_url": "https://files.segurneo.com/NG3205784.mp3",
  "audio_file_size": 1234567,
  "transcripts": [
    {
      "sequence": 12,
      "speaker": "agent",
      "message": "Entiendo, ¿me confirma su DNI?",
      "segment_start_time": 120.5,
      "segment_end_time": 123.2,
      "tool_results": [
        {
          "type": "tool_result",
          "tool_name": "identificar_cliente",
          "is_error": false,
          "request_id": "req-01",
          "result_value": "{\"status\":\"success\",\"data\":{\"clientes\":[{\"codigo_cliente\":\"701795F00\",\"nombre_cliente\":\"JAVIER GARCIA\"}],\"detalle_polizas\":[{\"poliza\":\"3022300060797\",\"ramo\":\"Coche\"}]}}",
          "tool_latency_secs": 0.42,
          "tool_has_been_called": true
        }
      ]
    }
  ]
}
```

Ejemplo mínimo de creación de ticket (portal → backend → Segurneo Voice)

```json
{
  "IdCliente": "701795F00",
  "IdLlamada": "conv_abc123",
  "TipoIncidencia": "Solicitud duplicado póliza",
  "MotivoIncidencia": "Duplicado Tarjeta",
  "NumeroPoliza": "3022300060797",
  "Notas": "Cliente solicita duplicado de tarjeta de decesos para envío postal",
  "FicheroLlamada": "https://files.segurneo.com/NG3205784.mp3"
}
```

Campos generados por Segurneo Voice al crear el ticket:
- `IdTicket`, `JsonId` (4 dígitos), `Fecha` (DD/MM/YYYY), `Hora` (HH:MM:SS).

Estados típicos de una llamada: Pendiente → Procesada → Sincronizada → Archivada.  
Con error: Pendiente → Error → Reproceso → Procesada.

### 7. Interfaces con Segurneo Voice (para Nogal)
- **Webhook principal de llamadas**
  - Método/URL: `POST /api/v1/calls/new/webhook`
  - Autenticación aceptada:
    - `X-API-Key: <SEGURNEO_VOICE_API_KEY>` (recomendado)
    - o `Authorization: Bearer <SEGURNEO_VOICE_API_KEY>` (alternativa soportada)
  - Contenido esperado (extracto):
    - `call_id`, `conversation_id`, `agent_id`
    - `start_time`, `end_time`, `duration_seconds`, `status`, `termination_reason`
    - `transcript_summary`, `transcripts[]` (incluye `tool_calls` y `tool_results`)
    - `audio_download_url` y `audio_file_size` cuando haya audio disponible
  - Efecto: el backend valida la API Key, persiste la llamada, transcripción y metadatos para su visualización. `conversation_id` es único (idempotencia ante reintentos).

- **Creación de ticket (proxy a Segurneo Voice)**
  - Método/URL: `POST /api/v1/crear-ticket`
  - Llamada saliente: `POST https://segurneo-voice.onrender.com/api/crear-ticket`
  - Cabeceras salientes: `Content-Type: application/json`, `User-Agent: Nogal-InsightCall-Portal/1.0` (opcionalmente `X-API-Key` según despliegue del Gateway)
  - Campos requeridos: `IdCliente`, `IdLlamada`, `TipoIncidencia`, `MotivoIncidencia`, `Notas`
  - Campos opcionales: `NumeroPoliza`, `FicheroLlamada`
  - Campos generados por Segurneo Voice: `IdTicket`, `JsonId`, `Fecha`, `Hora`
  - Efecto: el backend reenvía el payload a Segurneo Voice, que crea el ticket en Nogal y retorna los identificadores.
  - Actualizaciones de estado: la creación es síncrona (respuesta inmediata). En esta versión no se reciben webhooks de cambios de estado posteriores del ticket; si se requiere sincronización de estados futuros, se habilitará en una fase posterior.

#### 7.1 Conexión y seguridad de la integración
- Variables de entorno:
  - `SEGURNEO_VOICE_API_KEY` (clave compartida para validar webhooks y firmar llamadas salientes)
  - `SEGURNEO_VOICE_API_BASE_URL` (URL base del Gateway; en guías legadas puede figurar como `SEGURNEO_VOICE_BASE_URL`)
- Idempotencia: índice único en `calls.conversation_id` (evita duplicados si hay reintentos del webhook).
- Observabilidad: logs con prefijos `[WEBHOOK]`, `[NEW PROCESSOR]`, `[NOGAL]`, `[EXECUTOR]` incluyendo `conversation_id` y tiempos de proceso.
### 8. Flujo técnico (referencias operativas)
- Ingesta webhook/entrada → normalización de transcripts.
- Análisis semántico (Decision Engine en la plataforma) sobre la transcripción y `tool_results` recibidos.
- Ejecución de decisiones: la plataforma llama a Segurneo Voice para crear cliente/ticket/rellamada; actualiza registros; muestra notas.
- Persistencia y retorno al portal para visualización.
- Reintentos controlados ante fallos transitorios.

Nota: la transcripción y los `tool_results` los aporta Segurneo Voice. El análisis semántico (Decision Engine) se ejecuta en esta plataforma y decide la acción (crear cliente/ticket/rellamada), que luego se materializa llamando a los endpoints de Segurneo Voice hacia Nogal.

#### 8.1 Correlación e idempotencia
- Clave natural: `conversation_id` (procede de ElevenLabs vía Segurneo) → `calls.conversation_id` (único).
- Ticketing: cada creación exitosa añade el `ticket_id` a `calls.ticket_ids[]` y guarda `nogal_ticket_id` en `tickets.metadata`.
- Reintentos: si Segurneo devuelve error/timeout (15s), el backend retorna error normalizado; se puede reintentar desde UI.

### 9. Integraciones (visión de Nogal)
- **Segurneo Voice (propiedad nuestra)**: origen de transcripción y `tool_results` (p. ej., identificación de cliente/póliza) y motor de ejecución de cliente/ticket/rellamada hacia Nogal. Opera como “hub” entre audio y acciones.
- **Gateway/centralita de llamadas**: origen del audio que Segurneo Voice procesa.
- **Portal y BD de Nogal**: destino de persistencia, consulta y visualización para usuarios de negocio.

### 10. Datos y políticas
- **Modelo lógico**: entidades principales “Llamada”, “Transcripción”, “Análisis”, “Ticket” y “Usuario/Accesos” (si aplica).
- **Trazabilidad**: cada análisis/ticket mantiene relación con su conversación y momento temporal.
- **Retención**: definida con el cliente (audio y transcripciones). Se recomiendan políticas de eliminación programada.
- **Backups**: copias periódicas y pruebas de restauración acordadas en operación.
- **Datos sensibles**: tratamiento de PII conforme a normativa del cliente y vigente.

#### 10.1 Mapeo de campos clave (resumen)
- `call_id` (Segurneo) → `calls.segurneo_call_id`
- `conversation_id` (EL/Segurneo) → `calls.conversation_id` (único)
- `transcripts[]` (incluye `tool_calls`/`tool_results`) → `calls.transcripts` (JSONB)
- `audio_download_url`, `audio_file_size`, `ficheroLlamada` → columnas `calls.audio_*`
- `ticket_id` devuelto por Segurneo/Nogal → `calls.ticket_ids[]` y `tickets.metadata.nogal_ticket_id`

### 10.2 Reglas de decisión (resumen operativo)
- **Identificación de cliente (prioridad)**:
  1) Existe en `tool_results.identificar_cliente` → usar `codigo_cliente`
  2) Si no existe pero hay `leadId` → crear cliente desde lead
  3) En otro caso → crear cliente nuevo con datos extraídos
- **Clasificación de incidencia (ejemplos)**:
  - Retención cliente: mención de renovación/importe/baja de póliza vigente
  - Modificación de póliza: cambio de cuenta, fecha de efecto, forma de pago, coberturas, nº de asegurados…
  - Solicitud de duplicado de póliza: p. ej., “duplicado de tarjeta” (prevalece sobre “correo postal”)
  - Llamada de gestión comercial: consultas resueltas o reenvío a humanos cuando proceda
- **Rellamadas**:
  - Si el cliente menciona explícitamente una incidencia previa (código NG…) o aparece en `tool_results.incidencias` → `followUp`
  - Se crea `rellamada` con `IdTicket` relacionado y notas de contexto
- **Notas y narrativa**:
  - Se prioriza `ticketNotes` generada por el análisis; si no llega, se compone automáticamente con datos extraídos y `processingRecommendation`

### 11. Seguridad y acceso
- **Autenticación y roles**: acceso autenticado; segmentación por rol configurable si el cliente lo requiere.
- **Gestión de secretos**: variables en entorno seguro; rotación periódica (p. ej., `SEGURNEO_VOICE_API_KEY`, `SEGURNEO_VOICE_BASE_URL`).
- **Auditoría**: logs de eventos críticos de acceso y procesamiento.
- **Mínimo privilegio**: separar permisos de lectura/escritura según funciones.

### 12. Operación y hosting
- **Si gestionamos el hosting**: despliegues, monitoreo básico, parches, backups y continuidad operativa.
- **Variables clave**: `SEGURNEO_VOICE_API_KEY`, `SEGURNEO_VOICE_BASE_URL` (conectividad con Segurneo Voice) y credenciales de BD.
- **Scripts útiles**: reprocesos de llamadas atascadas y validación de entorno (ver `server/scripts/` y `server/process-pending.sh`).
- **Logs**: accesibles desde la plataforma de hosting (según proveedor acordado).

#### 12.1 Timeouts y manejo de errores
- Webhook: respuesta `201` con `processing_time_ms`; en error `500` con `conversation_id` para diagnóstico.
- Crear ticket: timeout saliente de 15s; validación explícita de `success` en respuesta. Errores estandarizados (`HTTP <código>`, `Timeout`, `Sin respuesta`).

### 13. Runbooks esenciales (incidentes frecuentes)
- **Llamadas atascadas**:
  - Revisar cola y estados en el portal; verificar logs del backend.
  - Ejecutar reproceso (si se habilitó script) y validar resolución.
- **Claves caducadas**:
  - Fallos en recepción/creación de tickets suelen indicar credenciales inválidas.
  - Rotar la clave en el almacén de secretos y reintentar.
- **Incidencias de Segurneo Voice**:
  - Si el servicio sufre degradación, activar medidas de contención (reintentos, colas) y comunicar al contacto de soporte.

### 14. Limitaciones y supuestos
- Calidad/latencia dependen de proveedores integrados (audio, transcripción y análisis en Segurneo Voice).
- Capacidad ajustada al volumen objetivo (concurrentes y diarias).
- La latencia total incluye ingesta, transcripción, análisis y sincronización de tickets.
- Arquitectura modular: el portal se mantiene desacoplado; Segurneo Voice puede evolucionar sin reescribir el portal.

### 15. Mapa de pantallas (resumen operativo)
- **Llamadas**: exploración, filtros, selección de una llamada.
- **Detalle de llamada**: transcripción, resumen, datos clave y acciones disponibles.
- **Tickets**: listado y estado de tickets asociados; creación desde una llamada.
- **Paneles**: métricas agregadas (volúmenes, motivos, tendencias).

### 16. RACI (responsabilidades resumidas)
- **Nogal (cliente)**: propiedad del portal, backend y base de datos; operación funcional; acceso y roles; reporting.
- **Nuestro equipo**: operación de Segurneo Voice (transcripción, análisis, creación de tickets); salud del middleware; soporte de integración.

### 17. Glosario
- **Webhook**: notificación HTTP de Segurneo Voice al backend del portal con datos de llamada.
- **Transcripción**: texto generado a partir de audio de la llamada.
- **Análisis**: clasificación y extracción de datos realizada por Segurneo Voice.
- **Ticket**: registro de gestión creado en Nogal a través de Segurneo Voice.

### 18. Anexos y referencias
- Documentación complementaria (para profundizar bajo demanda) disponible en `docs/`.
- El análisis detallado y ejemplos operativos se encuentran en documentos específicos del repositorio.

### 19. Accesos y login (Autenticación)
- **Proveedor**: Supabase Auth (email/contraseña + enlaces mágicos de verificación/invitación).
- **Componentes**:
  - Frontend: `src/lib/supabase.ts` crea el cliente con PKCE, `persistSession=true`, `autoRefreshToken=true`, `detectSessionInUrl=true` (gestiona tokens en el navegador).
  - Hook: `src/hooks/useAuth.ts` centraliza `getSession/getUser`, `signIn/signUp/signOut`, `onAuthStateChange`, y controla navegación (`/login`, `/verify-email`).
  - UI: `src/components/auth/*` (formularios de login/registro, `ProtectedRoute` para rutas privadas, `AcceptInvite` y `VerifyEmail`).
  - Backend (gestión de usuarios): `server/src/api/v1/users/*` usa Supabase Admin (`SUPABASE_SERVICE_ROLE_KEY`) para invitar y eliminar usuarios; protege los endpoints con middleware que valida el JWT de Supabase (`Authorization: Bearer <access_token>`).
  - Webhook de Segurneo (`POST /api/v1/calls/new/webhook`) usa `X-API-Key`/`Bearer` propio de Segurneo (no es sesión de usuario).

19.1 Variables de entorno relevantes
- Frontend (Netlify):
  - `VITE_SUPOUTPUT_BASE_URL` (URL del proyecto Supabase)
  - `VITE_SUPABASE_ANON_KEY` (clave pública “anon”)
- Backend (Render):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (cliente admin para gestión de usuarios)
  - `SEGURNEO_VOICE_API_KEY`, `SEGURNEO_VOICE_API_BASE_URL` (webhooks/acciones con Segurneo)
  - `NOGAL_API_KEY` (API key para rutas `/api/v1/nogal/*` si se activa su middleware)

19.2 Flujo de inicio de sesión (email/contraseña)
1) El usuario introduce email y contraseña en `LoginForm` → `useAuth.signIn()` llama `supabase.auth.signInWithPassword`.
2) Si es correcto, `supabase-js` crea `session` (access_token + refresh_token) y la persiste en `localStorage` (por `persistSession=true`).
3) `useAuth` se suscribe a `supabase.auth.onAuthChange` y actualiza `user/session`.
4) `ProtectedRoute` redirige a `/login` si no hay `user`. Si `requireEmailVerification` y `email_confirmed_at` es `null`, redirige a `/verify-email`.

19.3 Registro e invitación
- **Registro abierto**: `SignupForm` → `supabase.auth.signUp({ email, password, emailRedirectTo: /verify-email })`. Supabase envía email de verificación; hasta confirmar, `email_confirmed_at` es `null`.
- **Invitación** (Backoffice):
  - `POST /api/v1/users/invite` (servidor) llama `supabaseAdmin.auth.admin.inviteUserByEmail`. El email incluye un enlace de invitación.
  - `AcceptInvitePage` procesa el `access_token`/`token_hash` recibido, crea la sesión y fuerza `updateUser({ password })` para establecer la contraseña inicial.

19.4 Verificación de email y recuperación de contraseña
- **Verificación**: el enlace de Supabase redirige a `/verify-email`; al confirmarse, `useAuth` detecta `email_confirmed_at` y navega a `/`.
- **Reset de contraseña**: `authService.resetPasswordForEmail` envía enlace con `redirectTo /reset-password` (si se habilita la pantalla), donde el usuario define nueva contraseña vía `supabase.auth.updateUser`.

19.5 Persistencia, refresco y cierre de sesión
- **Persistencia**: `supabase-js` guarda `session` en `localStorage` y renueva el token automáticamente (`autoRefreshToken=true`).
- **Cierre**: `authService.signOut()` revoca la sesión y limpia el estado local; la UI redirige a `/login`.

19.6 Protección de rutas y APIs
- **Rutas UI**: `ProtectedRoute` protege todas las vistas de negocio (`/`, `/calls`, `/tickets`, etc.).
- **API de gestión de usuarios**: `/api/v1/users/*` exige `Authorization: Bearer <Supabase access_token>` (middleware `server/src/api/v1/users/users.middleware.ts` valida el JWT con Supabase).
- **Webhooks/Integraciones**: `/api/v1/calls/new/webhook` valida `X-API-Key`/`Bearer` específico de Segurneo (no depende de la sesión de usuario).
- **Otros endpoints internos** (p. ej., `/api/v1/calls`): el acceso está pensado desde la UI autenticada; pueden endurecerse con middleware JWT si el cliente requiere blindaje adicional a nivel de backend o WAF.

19.7 Roles y permisos
- La UI contempla bandera `is_super_admin` (metadatos del usuario en Supabase) para funciones de administración (e.g., `UserManagement`).
- La asignación de roles/permisos se gestiona vía Supabase Admin (no hay lógica de RBAC compleja en backend en esta versión). Si se requiere RLS/roles de negocio, se define en una fase posterior.

19.8 Trazabilidad y auditoría
- **Frontend**: logs de `onAuthStateChange` y redirecciones de `ProtectedRoute`.
- **Backend**: middleware de usuarios registra validaciones de token; los webhooks registran `X-Request` y `conversation_id`. Se recomienda activar logs de acceso a nivel de infraestructura y configurar rotación segura de claves.

