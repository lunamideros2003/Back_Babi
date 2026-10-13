# Conectar BabyTrack con Supabase

El proyecto puede trabajar con dos bases de datos y no necesita cambios de
código para pasar de una a otra:

| Base | Cuándo | Configuración |
| --- | --- | --- |
| **SQLite** (archivo local) | desarrollo en tu computador | nada, ya funciona |
| **Supabase (Postgres)** | cuando lo publicas | variable `DATABASE_URL` |

El motor se decide al arrancar: si existe `DATABASE_URL` usa Postgres, si no
usa el archivo local.

## 1. Copiar la cadena de conexión

En Supabase ve a **Project Settings -> Database -> Connection string**.

Elige:

- **Method**: Session pooler
- **Format**: URI

Se veria algo asi:

```
postgresql://postgres.xxxxx:[CLAVE]@aws-0-region.pooler.supabase.com:5432/postgres
```

Copia el archivo `.env.example` como `.env` y pega la cadena completa:

```bash
cd Back_Babi
copy .env.example .env
```

Abre `.env` y descomenta la linea, reemplazando con tu cadena real:

```
DATABASE_URL=postgresql://postgres.xxxxx:TU_CLAVE@aws-0-region.pooler.supabase.com:5432/postgres
```

Tambien sube el secreto de sesiones:

```
JWT_SECRET=<una cadena larga y aleatoria>
```

Para generarla:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 2. Ejecutar la migracion

```bash
npm run db:migrate
```

Ese comando:

1. Crea las 10 tablas en Supabase
2. Carga las 40 semanas de contenido educativo
3. Verifica que todo quedo bien

Debes ver algo asi:

```
Driver: postgres
1/3 Creando tablas...
    Listo.
2/3 Cargando las 40 semanas...
    37 semanas en la base.
3/3 Verificando...
    Driver postgres, 37 semanas disponibles.

Migracion completada. Tu proyecto ya usa Supabase.
```

## 3. Comprobar

```bash
npm run dev
```

En la consola aparecera:

```
  BabyTrack IA - API
  Base:      Supabase / Postgres
```

Y en el navegador:

```
http://localhost:4001/api/health
```

```json
{
  "ok": true,
  "status": "up",
  "database": "sqlite",
  "weeks_loaded": 37
}
```

Nota: el campo `database` del reporte sigue diciendo `sqlite` porque describe el
esquema logico del proyecto, no el motor. El motor real se ve en `Base:` al
arrancar o con `npm run db:report`.

## Comandos utiles

```bash
npm run db:migrate            # crea tablas y carga las semanas
npm run db:report             # muestra tablas y cuantos registros hay
npm run db:migrate -- --report # ver el estado sin cambiar nada
npm run db:migrate -- --reset  # borra todo y lo vuelve a crear
```

## Volver a SQLite

Borra o comenta la linea `DATABASE_URL` en `.env` y reinicia. El archivo local
sigue intacto en `data/babytrack.sqlite`.

## Notas tecnicas

### Por que una capa de traduccion

El proyecto escribe un solo dialecto SQL: parametros con nombre (`:userId`) y
`datetime('now')`. SQLite lo entiende de forma nativa; Postgres necesita
parametros posicionales (`$1`) y `CURRENT_TIMESTAMP`.

`src/db/dialect.js` hace esa conversion automaticamente, asi que las mismas
consultas funcionan en los dos motores sin duplicar codigo.

### Por que las banderas son SMALLINT y no BOOLEAN

Las columnas como `is_completed` usan `SMALLINT` con `CHECK (col IN (0, 1))` en
vez de `BOOLEAN`. El codigo escribe `0` y `1` en sus consultas, y mantenerlo
identico en los dos motores evita conversiones que podrian fallar en
produccion.

### Las consultas ahora son asincronas

El driver de Postgres funciona por red, a diferencia de SQLite que es local.
Por eso `run`, `get` y `all` devuelven promesas y todo el repositorio es
`async`. En desarrollo la promesa se resuelve de inmediato, asi que no se nota
la diferencia de velocidad.

### Express 4 y handlers async

Express 4 no captura los errores de las funciones `async`. Por eso
`asyncRouter` envuelve cada ruta: un error dentro de un handler llega al
manejador de errores en vez de tumbar el proceso.

### Transactiones

SQLite abre y cierra la transaccion sobre la misma conexion. En Postgres se
reserva una conexion del pool durante la transaccion para que todas las
sentencias usen la misma.

## Problemas frecuentes

**"Password authentication failed"**
La clave tiene caracteres especiales que hay que codificar en la URL. Copia la
cadena desde el panel de Supabase en vez de escribirla a mano.

**"the connection string is invalid"**
Asegurate de usar el **pooler de sesion**, no el de transacciones, y de que la
cadena termine en `/postgres`.

**"certificate has expired" o error de TLS**
Supabase usa un certificado propio. El driver ya desactiva la verificacion
estricta para conexiones remotas, pero si cambia la URL avisa por consola.

**"too many connections"**
Tu plan permite pocas conexiones simultaneas. Si usaste el pooler de
transacciones en vez del de sesion, cambialo.

**La migracion se queda esperando**
Tu red o firewall puede estar bloqueando el puerto 5432 hacia fuera. Prueba
desde otra red o usa el pooler en la region mas cercana a ti.