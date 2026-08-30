# Configuración de Supabase

## 1. Crear y migrar el proyecto

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta, en orden, los archivos de `migrations/`.
3. Copia `.env.example` como `.env.local` y completa la URL y la clave pública
   `anon`. Nunca uses `service_role` en el frontend.
4. En Auth configura la URL del sitio y las URLs de redirección:
   - local: `http://localhost:3000/semillero-robotica-prueba/login`
   - producción: `https://<usuario>.github.io/semillero-robotica-prueba/login`

El frontend también funciona sin estas variables en modo local, pero en ese
modo no hay autenticación real, sincronización entre dispositivos ni panel de
evaluación.

## 2. Crear el primer administrador y evaluadores

Crea las cuentas desde **Authentication → Users**. Para habilitar el primer
administrador ejecuta en SQL Editor, sustituyendo el correo:

```sql
update public.profiles
set role = 'admin'
where email = 'administrador@unisabana.edu.co';
```

Después puedes cambiar roles desde `/admin`. También puedes promover un
evaluador directamente con SQL:

```sql
update public.profiles
set role = 'evaluator'
where email = 'evaluador@unisabana.edu.co';
```

Los formularios públicos nunca pueden asignar roles elevados.

## 3. Banco común de evaluación

No hay que asignar candidatos. Todos los evaluadores ven el banco completo en
`/evaluador`, eligen qué perfil revisar y sólo pueden calificar recorridos que
ya fueron enviados. Las respuestas del aspirante siempre son de sólo lectura.
El administrador gestiona roles y supervisa estados desde `/admin`.

## 4. GitHub Pages

Crea estos secretos del repositorio en **Settings → Secrets and variables →
Actions**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

El workflow existente los incluye durante `next build`. La clave `anon` es
pública por diseño; la seguridad reside en las políticas RLS. No agregues una
clave privilegiada a GitHub Pages.

## 5. Comprobaciones antes del piloto

- Registrar dos candidatos y confirmar que ninguno puede leer al otro.
- Confirmar que dos evaluadores puedan elegir cualquier recorrido enviado.
- Confirmar que un evaluador no pueda calificar un recorrido en curso.
- Cambiar un rol desde `/admin` y verificar que quede registrado en auditoría.
- Enviar un recorrido y confirmar que el candidato ya no puede modificarlo.
- Subir y descargar una evidencia con URL privada.
- Exportar la base de datos regularmente: Supabase Free no incluye backups
  automáticos.
