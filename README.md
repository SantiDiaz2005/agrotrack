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
