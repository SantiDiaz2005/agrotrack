// ============================
// SERVIDOR AGROTRACK - AO1
// ============================

const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

// Archivos de datos
const DATA_DIR = path.join(__dirname, 'data');
const CONSULTAS_FILE = path.join(DATA_DIR, 'consultas.txt');

// Función auxiliar para formato de fecha
function formatLocalDate(date) {
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

// Escapar caracteres peligrosos para HTML
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, match => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]
  ));
}

// Respuesta de error interno
function send500(res) {
  res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Error interno del servidor</h1>');
}

// ============================
// SERVIDOR PRINCIPAL
// ============================

const server = http.createServer(async (req, res) => {
  try {
    // --- Limpieza y normalización de la URL ---
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(parsedUrl.pathname.trim());

    console.log(req.method, pathname); // opcional: para depurar rutas

    // --- RUTA PRINCIPAL: Servir index.html ---
    if (req.method === 'GET' && pathname === '/') {
      const filePath = path.join(__dirname, 'public', 'index.html');
      const content = await fsp.readFile(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // --- CONTACTO: GET listar ---
    if (req.method === 'GET' && pathname === '/contacto/listar') {
      try {
        const contenido = await fsp.readFile(CONSULTAS_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(contenido);
      } catch {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('No hay consultas registradas todavía.');
      }
      return;
    }

    // --- CONTACTO: POST cargar ---
    if (req.method === 'POST' && pathname === '/contacto/cargar') {
      let body = '';
      req.on('data', chunk => { body += chunk; });

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body);
          const nombre = params.get('nombre') || 'Sin nombre';
          const email = params.get('email') || 'Sin email';
          const mensaje = params.get('mensaje') || '';

          // Construir texto a guardar
          const separador = '-------------------------';
          const fecha = formatLocalDate(new Date());
          const texto = `${separador}${os.EOL}Fecha: ${fecha}${os.EOL}Nombre: ${nombre}${os.EOL}Email: ${email}${os.EOL}Mensaje: ${mensaje}${os.EOL}${separador}${os.EOL}${os.EOL}`;

          // Guardar (asegurar carpeta data)
          await fsp.mkdir(DATA_DIR, { recursive: true });
          await fsp.appendFile(CONSULTAS_FILE, texto, { encoding: 'utf8' });

          // Responder con agradecimiento
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Gracias</title></head><body>
            <h1>Gracias por su consulta</h1>
            <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Mensaje:</strong> ${escapeHtml(mensaje)}</p>
            <p><a href="/">Volver al inicio</a> | <a href="/contacto/listar">Ver todas las consultas</a></p>
            </body></html>`);
        } catch (err) {
          console.error('Error al procesar contacto:', err);
          send500(res);
        }
      });
      return;
    }

    // --- Si no coincide con ninguna ruta ---
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Página no encontrada</h1>');

  } catch (err) {
    console.error('Error general del servidor:', err);
    send500(res);
  }
});

// ============================
// INICIAR SERVIDOR
// ============================
const PORT = 8888;
server.listen(PORT, () => {
  console.log(`Servidor AgroTrack iniciado en http://localhost:${PORT}/`);
});
