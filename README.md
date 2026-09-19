# Licitia

Prototipo funcional para gestionar concursos de proveedores.

## Inicio local

1. Copia `.env.ejemplo` a `.env.local`.
2. Mantén `VITE_DEMO_MODE=true` para explorar la interfaz sin credenciales.
3. Instala dependencias y ejecuta:

```bash
pnpm install
pnpm dev
```

El modo demo usa datos locales en memoria del navegador. Para conectar Supabase, completa `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y desactiva `VITE_DEMO_MODE`.

## Supabase

La migración inicial está en `supabase/migrations/20260919000100_initial_schema.sql` y el endurecimiento en `supabase/migrations/20260919000200_harden_function_search_paths.sql`. Ya fueron aplicadas al proyecto Supabase configurado en `.env`.

La migración también crea los buckets privados `contest-documents` y `proposal-documents`, con políticas RLS para separar el acceso del gestor y del proveedor. Las funciones `/api/documents/upload-url`, `/api/documents/validate-pdf` y `/api/documents/download-url` preparan la carga directa, rechazan PDFs sin capa de texto y generan URLs firmadas temporales.

## Vercel

Las funciones de servidor están en `api/`. Los secretos (`SUPABASE_SECRET_KEY`, `OLLAMA_API_KEY`, `CRON_SECRET`) solo deben configurarse en Vercel.

El envío de correo está configurado como `EMAIL_PROVIDER=mock`: las invitaciones se registran en Supabase sin enviar correo externo. `/api/calendar/authorize`, `/api/calendar/callback` y `/api/calendar/events` implementan OAuth y sincronización con el calendario personal de cada gestor.

Para Google Calendar registra en Google Cloud la URL `https://<tu-proyecto>.vercel.app/api/calendar/callback` como redirect URI autorizada y configura el mismo valor en `GOOGLE_REDIRECT_URI`.
