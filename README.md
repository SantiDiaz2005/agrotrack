# AgroTrack - Actividad Obligatoria 1 (MVP)

**Alumno:** [Diaz Giannone Santiago] - Legajo: [46126622]

## Resumen
Servidor HTTP creado con Node.js puro (sin Express) que:
- Sirve archivos estáticos desde `public/`
- Procesa formulario de login (POST /auth/recuperar)
- Procesa formulario de contacto (POST /contacto/cargar) y guarda en `data/consultas.txt`
- Muestra listado de consultas (GET /contacto/listar)
- Maneja 404 y errores 500 con respuestas HTML claras

## Estructura

---

### 🔧 Descripción técnica

- El servidor se ejecuta con **Node.js puro**, utilizando los módulos `http`, `fs`, `url` y `path`.
- Todos los archivos se leen y escriben de forma **asíncrona** (`fs.readFile` y `fs.appendFile`).
- El **MIME Type** se determina según la extensión (`.html`, `.css`, `.js`, `.png`, etc.) para enviar la cabecera correcta.
- Las rutas inexistentes devuelven un **HTML de error 404** con un mensaje y un link para volver al inicio.
- Si ocurre un error de lectura/escritura, el servidor responde con **Error 500**.
- El puerto por defecto es **8888** (puede configurarse con `PORT` en la terminal).

---

### 🌐 Rutas implementadas

| Método | Ruta | Descripción |
|:--|:--|:--|
| GET | `/` | Página principal |
| GET | `/productos.html` | Información de productos |
| GET | `/login` | Formulario de login |
| POST | `/auth/recuperar` | Procesa datos de login |
| GET | `/contacto` | Formulario de contacto |
| POST | `/contacto/cargar` | Guarda mensaje en archivo |
| GET | `/contacto/listar` | Muestra consultas guardadas |
| * | cualquier otra | Error 404 personalizado |
