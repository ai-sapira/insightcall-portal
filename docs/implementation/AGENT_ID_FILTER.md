# 🔒 Configuración del Filtro por Agent ID de ElevenLabs

## Problema Identificado

El sistema estaba mostrando llamadas de **todos los agentes** configurados en ElevenLabs, no solo las del agente de Nogal. Esto causaba que se mostraran llamadas que no correspondían al cliente.

## Solución Implementada

Se ha agregado un **filtro automático** en todos los métodos que obtienen llamadas para mostrar **únicamente** las llamadas del agente específico configurado.

### Archivos Modificados

#### Frontend:
1. `src/services/voiceCallsRealDataService.ts`
   - ✅ `getRecentVoiceCalls()` - Filtro agregado
   - ✅ `getVoiceCallsPaginated()` - Filtro agregado
   - ✅ `getVoiceCallsStats()` - Filtro agregado

#### Backend:
2. `server/src/api/v1/newCalls.controller.ts`
   - ✅ `webhook()` - Validación y rechazo de llamadas de otros agentes
   - ✅ `getCalls()` - Filtro automático en listado

3. `server/src/api/v1/calls/services/call-data.service.ts`
   - ✅ `getCalls()` - Filtro automático en servicio de datos

4. `server/src/config/index.ts`
   - ✅ Configuración de `elevenlabsAgentId` agregada

## 🔧 Configuración Requerida

### Variables de Entorno

Debes agregar la siguiente variable de entorno en **AMBOS** frontend y backend:

**Frontend (.env):**
```bash
# 🔒 ID del agente de ElevenLabs para Nogal
VITE_ELEVENLABS_AGENT_ID=tu_agent_id_aqui
```

**Backend (.env en server/):**
```bash
# 🔒 ID del agente de ElevenLabs para Nogal
ELEVENLABS_AGENT_ID=tu_agent_id_aqui
```

### ¿Cómo obtener el Agent ID?

1. Ve a tu panel de ElevenLabs
2. Navega a la sección de **Conversational AI** o **Agents**
3. Selecciona el agente de Nogal (probablemente llamado "Carlos")
4. El Agent ID aparecerá en la URL o en los detalles del agente
5. Copia el ID completo

**Ejemplo de Agent ID:**
```
agent_a1b2c3d4e5f6g7h8
```

### Archivo .env completo (ejemplo)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# ElevenLabs Agent Filter
VITE_ELEVENLABS_AGENT_ID=agent_a1b2c3d4e5f6g7h8
```

## 🚀 Cómo Aplicar los Cambios

### 1. Actualizar el Código

Los cambios ya están aplicados en el código. Solo necesitas:

```bash
# En el directorio raíz del proyecto frontend
npm run build
```

### 2. Configurar las Variables de Entorno

#### Frontend

**Desarrollo Local:**
```bash
# Crear/editar .env en la raíz del proyecto frontend
echo "VITE_ELEVENLABS_AGENT_ID=tu_agent_id_aqui" >> .env
```

**Producción (Netlify):**
1. Ve a tu panel de Netlify
2. Selecciona tu sitio
3. Ve a **Site settings** → **Environment variables**
4. Agrega:
   - **Key:** `VITE_ELEVENLABS_AGENT_ID`
   - **Value:** El Agent ID de Nogal

#### Backend

**Desarrollo Local:**
```bash
# Crear/editar .env en el directorio server/
cd server
echo "ELEVENLABS_AGENT_ID=tu_agent_id_aqui" >> .env
```

**Producción (Render/Heroku/etc):**
1. Ve a tu panel de hosting del backend
2. Navega a **Environment Variables** o **Config Vars**
3. Agrega:
   - **Key:** `ELEVENLABS_AGENT_ID`
   - **Value:** El Agent ID de Nogal

### 3. Reiniciar los Servidores

**Frontend (Desarrollo):**
```bash
npm run dev
```

**Backend (Desarrollo):**
```bash
cd server
npm run dev
```

**Producción:**
- Reinicia el servicio backend para que cargue la nueva variable
- Frontend: Netlify detectará el cambio automáticamente o haz un trigger manual del deploy

## ✅ Verificación

Una vez configurado, verás en los logs:

**Frontend (Consola del navegador):**
```
🔒 [FILTER] Filtrando por agent_id: agent_a1b2c3d4e5f6g7h8
```

**Backend (Logs del servidor):**
```
✅ [WEBHOOK] Agent ID validado: agent_a1b2c3d4e5f6g7h8
🔒 [LIST] Filtrando por agent_id: agent_a1b2c3d4e5f6g7h8
```

Si **NO** está configurado, verás:

**Frontend:**
```
⚠️ [FILTER] No se ha configurado VITE_ELEVENLABS_AGENT_ID - Mostrando todas las llamadas
```

**Backend:**
```
⚠️ [WEBHOOK] ELEVENLABS_AGENT_ID no configurado - Procesando todas las llamadas
⚠️ [LIST] ELEVENLABS_AGENT_ID no configurado - Mostrando todas las llamadas
```

## 🎯 Resultado Final

- ✅ **Webhook rechaza** llamadas de otros agentes antes de procesarlas
- ✅ Solo se **almacenan** llamadas del agente de Nogal en la base de datos
- ✅ Solo se **muestran** llamadas del agente de Nogal en el frontend
- ✅ Las estadísticas solo **cuentan** llamadas de ese agente
- ✅ Los filtros y búsquedas operan solo sobre esas llamadas
- ✅ No se verán llamadas de otros agentes o proyectos de ElevenLabs

## 🔍 Troubleshooting

### Problema: Aún veo llamadas de otros agentes

**Causa:** La variable de entorno no está configurada o tiene un valor incorrecto.

**Solución:**
1. Verifica que el `.env` contenga `VITE_ELEVENLABS_AGENT_ID`
2. Verifica que el Agent ID sea correcto (cópialo directamente de ElevenLabs)
3. Reinicia el servidor de desarrollo: `npm run dev`
4. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### Problema: No veo ninguna llamada

**Causa:** El Agent ID configurado no tiene llamadas o es incorrecto.

**Solución:**
1. Verifica que el Agent ID sea del agente correcto
2. Revisa en la base de datos Supabase qué `agent_id` tienen las llamadas:
   ```sql
   SELECT DISTINCT agent_id FROM calls LIMIT 10;
   ```
3. Compara con el valor configurado en `.env`

## 📝 Notas Importantes

- ⚠️ **CRÍTICO**: Esta variable debe estar configurada en **producción** para evitar mostrar llamadas incorrectas
- 🔒 El filtro se aplica automáticamente en todos los métodos
- 📊 Las estadísticas solo incluirán llamadas del agente configurado
- 🔄 Si cambias de agente, simplemente actualiza la variable de entorno y reinicia

