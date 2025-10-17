// server.js
// AgroTrack - servidor HTTP puro (sin express)
// Requisitos AO1: servir estáticos, GET/POST, guardar consultas, listar, 404/500.

const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8888;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const CONSULTAS_FILE = path.join(DATA_DIR, 'consultas.txt');

// Tipos MIME
const mime = {
  html: 'text/html; charset=utf-8',
  css: 'text/css',
  js: 'application/javascript',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8'
};

function getMimeByPath(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  return mime[ext] || 'application/octet-stream';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatLocalDate(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------
// Manejo de errores
// ---------------------
function send500(res) {
  res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>500</title></head><body>
    <h1>Error interno del servidor</h1>
    <p>Hubo un error en el servidor. <a href="/">Volver al inicio</a></p>
  </body></html>`);
}

function send404(res, urlPath) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="es"><head><meta charset="UTF-8">
    <title>404 - Página no encontrada</title>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f8f8; color: #333; }
      h1 { color: #c00; }
      a { display: inline-block; margin-top: 15px; text-decoration: none; color: #007bff; }
      a:hover { text-decoration: underline; }
    </style>
  </head><body>
    <h1>Error 404</h1>
    <p>La página que intentás acceder no existe.</p>
    <p><strong>${escapeHtml(urlPath)}</strong></p>
    <a href="/">Volver al inicio</a>
  </body></html>`);
}

// ---------------------
// Servidor principal
// ---------------------
fsp.mkdir(DATA_DIR, { recursive: true }).catch(err => {
  console.error('No se pudo crear carpeta data:', err);
});

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(parsedUrl.pathname.trim());

    // ---------------------
    // Rutas principales
    // ---------------------

    // Index
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return serveStaticFile(path.join(PUBLIC_DIR, 'index.html'), res);
    }

    // Páginas estáticas simples
    if (req.method === 'GET' && pathname === '/productos.html') {
      return serveStaticFile(path.join(PUBLIC_DIR, 'productos.html'), res);
    }

    if (req.method === 'GET' && pathname === '/login') {
      return serveStaticFile(path.join(PUBLIC_DIR, 'login.html'), res);
    }

    if (req.method === 'GET' && pathname === '/contacto') {
      return serveStaticFile(path.join(PUBLIC_DIR, 'contacto.html'), res);
    }

    // ---------------------
    // POST /auth/recuperar
    // ---------------------
    if (req.method === 'POST' && pathname === '/auth/recuperar') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const params = new URLSearchParams(body);
          const usuario = params.get('usuario') || params.get('nombre') || '';
          const clave = params.get('clave') || '';

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Auth</title></head><body>
            <h1>Datos recibidos</h1>
            <p><strong>Usuario:</strong> ${escapeHtml(usuario)}</p>
            <p><strong>Clave:</strong> ${escapeHtml(clave)}</p>
            <p><a href="/login">Volver</a></p>
          </body></html>`);
        } catch (err) {
          console.error(err);
          send500(res);
        }
      });
      return;
    }

    // ---------------------
    // POST /contacto/cargar
    // ---------------------
    if (req.method === 'POST' && pathname === '/contacto/cargar') {
      let body = '';
      req.on('data', chunk => { body += chunk; });

      req.on('end', async () => {
        try {
          const params = new URLSearchParams(body);
          const nombre = params.get('nombre') || 'Sin nombre';
          const email = params.get('email') || 'Sin email';
          const mensaje = params.get('mensaje') || '';

          const separador = '-------------------------';
          const fecha = formatLocalDate(new Date());
          const texto = `${separador}${os.EOL}Fecha: ${fecha}${os.EOL}Nombre: ${nombre}${os.EOL}Email: ${email}${os.EOL}Mensaje: ${mensaje}${os.EOL}${separador}${os.EOL}${os.EOL}`;

          await fsp.appendFile(CONSULTAS_FILE, texto, { encoding: 'utf8' });

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

    // ---------------------
    // GET /contacto/listar
    // ---------------------
    if (req.method === 'GET' && pathname === '/contacto/listar') {
      try {
        const contenido = await fsp.readFile(CONSULTAS_FILE, 'utf8').catch(() => '');
        const htmlContent = contenido.trim()
          ? `<pre style="white-space: pre-wrap;">${escapeHtml(contenido)}</pre>`
          : '<p>Aún no hay consultas.</p>';

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Consultas</title></head><body>
          <h1>Consultas</h1>
          ${htmlContent}
          <p><a href="/">Volver</a></p>
        </body></html>`);
      } catch (err) {
        console.error('Error leyendo consultas:', err);
        send500(res);
      }
      return;
    }

    // ---------------------
    // Archivos estáticos
    // ---------------------
    const staticPath = path.join(PUBLIC_DIR, decodeURIComponent(pathname));
    if (!staticPath.startsWith(PUBLIC_DIR)) {
      return send404(res, pathname);
    }

    const stat = await tryStat(staticPath);
    if (stat && stat.isDirectory()) {
      return serveStaticFile(path.join(staticPath, 'index.html'), res);
    }

    if (await tryStat(staticPath)) {
      return serveStaticFile(staticPath, res);
    }

    return send404(res, pathname);

  } catch (err) {
    console.error('Error no capturado:', err);
    send500(res);
  }
});

// ---------------------
// Funciones auxiliares
// ---------------------
async function tryStat(fp) {
  try { return await fsp.stat(fp); }
  catch { return null; }
}

function serveStaticFile(filePath, res) {
  fsp.readFile(filePath)
    .then(content => {
      res.writeHead(200, { 'Content-Type': getMimeByPath(filePath) });
      res.end(content);
    })
    .catch(err => {
      if (err.code === 'ENOENT') send404(res, filePath);
      else send500(res);
    });
}

// ---------------------
// Iniciar servidor
// ---------------------
server.listen(PORT, () => {
  console.log(`Servidor AgroTrack iniciado en http://localhost:${PORT}/`);
});
