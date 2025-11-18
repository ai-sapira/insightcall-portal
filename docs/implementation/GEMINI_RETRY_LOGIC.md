# Manejo de Errores 503 y Retry Logic para Gemini API

## Problema

Cuando Gemini API está sobrecargado, devuelve errores `503 Service Unavailable` con el mensaje "The model is overloaded. Please try again later." Esto causa fallos en el análisis de llamadas.

## Solución Implementada

Se ha implementado un sistema robusto de reintentos con las siguientes características:

### 1. **Retry Logic con Exponential Backoff**

- **Máximo de reintentos**: 5 intentos por modelo
- **Delay inicial**: 1 segundo
- **Delay máximo**: 30 segundos
- **Backoff exponencial**: Cada reintento espera el doble del tiempo anterior (1s → 2s → 4s → 8s → 16s → 30s max)
- **Jitter**: Se añade variación aleatoria (±20%) para evitar el "thundering herd problem"

### 2. **Detección de Errores Retryables**

El sistema detecta automáticamente errores temporales que pueden resolverse con reintentos:

- **Códigos HTTP**: 429 (Rate Limit), 500 (Server Error), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
- **Patrones en mensajes de error**:
  - "503", "service unavailable", "overloaded"
  - "rate limit", "429", "too many requests"
  - "temporarily unavailable", "try again later"
  - "server error", "502", "504", "gateway timeout", "bad gateway"

### 3. **Fallback a Modelos Alternativos**

Si el modelo principal (`gemini-2.5-flash`) falla después de todos los reintentos, el sistema intenta automáticamente con modelos alternativos rápidos:

1. `gemini-2.0-flash-exp` (modelo experimental rápido)
2. `gemini-1.5-flash` (muy rápido y estable)

**Prioridad**: Velocidad y confiabilidad para uso en producción.

**Nota**: El sistema detecta automáticamente si un modelo:
- No existe (404) → lo omite inmediatamente
- No tiene cuota disponible (429 con `limit: 0`) → lo omite inmediatamente
- Está sobrecargado (503) → reintenta con delays apropiados

### 4. **Logging Mejorado**

El sistema registra:
- Cada intento de reintento con el modelo y delay utilizado
- Errores detallados con código de estado y mensaje
- Éxito después de reintentos o cambio de modelo
- Fallo final si todos los intentos se agotan

## Configuración

### Variables de Entorno

No se requieren variables adicionales. El sistema usa la configuración existente:

```bash
GEMINI_API_KEY=tu_api_key
```

### Ajustes Opcionales

Los valores por defecto pueden modificarse en `server/src/lib/gemini.ts`:

```typescript
const MAX_RETRIES = 5;                    // Número máximo de reintentos
const INITIAL_RETRY_DELAY = 1000;         // Delay inicial en ms
const MAX_RETRY_DELAY = 30000;            // Delay máximo en ms
const FALLBACK_MODELS = [                 // Modelos alternativos
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];
```

### Uso Personalizado

Si necesitas personalizar el comportamiento en un caso específico:

```typescript
import { generateStructuredResponse } from '@/lib/gemini';

// Con opciones personalizadas
const result = await generateStructuredResponse<MyType>(
  prompt,
  context,
  validator,
  {
    maxRetries: 3,              // Menos reintentos
    useFallbackModels: false    // Sin fallback a otros modelos
  }
);
```

## Flujo de Ejecución

```
1. Intento inicial con gemini-2.5-flash
   ↓ (si falla con error retryable)
2. Retry 1 después de ~1s
   ↓ (si falla)
3. Retry 2 después de ~2s
   ↓ (si falla)
4. Retry 3 después de ~4s
   ↓ (si falla)
5. Retry 4 después de ~8s
   ↓ (si falla)
6. Retry 5 después de ~16s
   ↓ (si falla)
7. Cambiar a gemini-2.0-flash-exp (repetir reintentos)
   ↓ (si falla)
8. Cambiar a gemini-1.5-flash (repetir reintentos)
   ↓ (si falla)
9. Cambiar a gemini-1.5-pro (repetir reintentos)
   ↓ (si falla)
10. Lanzar error final
```

## Ejemplo de Logs

```
[Gemini] Error on attempt 1/6 (model: gemini-2.5-flash): {
  message: "Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [503 Service Unavailable] The model is overloaded.",
  status: 503,
  isRetryable: true
}
[Gemini] Retry attempt 1/5 for model gemini-2.5-flash after 1023ms delay
[Gemini] Success with retry 1 gemini-2.5-flash
```

## Mejoras Adicionales

### **Uso de Retry Delay de la API**

Cuando Gemini API devuelve un error 429 (rate limit), incluye información sobre cuándo reintentar:
```
Please retry in 41.88s
```

El sistema ahora:
- **Extrae automáticamente** el delay sugerido por la API
- **Usa ese delay** en lugar del backoff exponencial cuando está disponible
- **Respeta los límites** de la API para evitar reintentos innecesarios

### **Detección de Quota Excedida Permanente**

El sistema distingue entre:
- **Rate limit temporal** (429 con delay sugerido) → Reintenta después del delay
- **Quota excedida permanente** (429 con `limit: 0`) → Omite el modelo inmediatamente

### **Manejo de Modelos No Disponibles**

Si un modelo fallback:
- Devuelve 404 (no existe) → Se omite inmediatamente
- No tiene cuota disponible → Se omite inmediatamente
- Está sobrecargado (503) → Se reintenta normalmente

## Beneficios

1. **Resiliencia**: El sistema puede manejar sobrecargas temporales de Gemini sin fallar
2. **Automatización**: No requiere intervención manual cuando hay errores temporales
3. **Flexibilidad**: Fallback automático a modelos alternativos si el principal está sobrecargado
4. **Observabilidad**: Logs detallados para debugging y monitoreo
5. **Eficiencia**: Jitter evita que múltiples requests se reintenten simultáneamente
6. **Inteligencia**: Usa los delays sugeridos por la API cuando están disponibles
7. **Optimización**: Omite modelos que claramente no funcionarán (404, quota 0)

## Consideraciones

- **Tiempo total máximo**: En el peor caso (todos los reintentos en todos los modelos), el proceso puede tardar varios minutos
- **Costos**: Los reintentos y fallbacks pueden aumentar ligeramente el uso de la API
- **Rate Limits**: El sistema respeta los rate limits de Gemini (código 429) y espera antes de reintentar

## Monitoreo

Para monitorear la efectividad del sistema, revisa los logs del servidor buscando:

- `[Gemini] Retry attempt` - Indica que se están haciendo reintentos
- `[Gemini] Success with retry` - Indica éxito después de reintentos
- `[Gemini] Success with fallback model` - Indica que se usó un modelo alternativo
- `[Gemini] All retry attempts exhausted` - Indica fallo completo (requiere atención)

## Troubleshooting

### Si los errores 503 persisten después de los reintentos:

1. Verifica que `GEMINI_API_KEY` sea válida
2. Revisa los límites de tu cuenta de Google Cloud
3. Considera aumentar `MAX_RETRIES` temporalmente
4. Verifica si hay problemas conocidos en el estado de Gemini API

### Si el sistema tarda demasiado:

1. Reduce `MAX_RETRIES` si la latencia es crítica
2. Desactiva `useFallbackModels` si solo quieres usar el modelo principal
3. Ajusta `MAX_RETRY_DELAY` para reducir el tiempo máximo de espera

