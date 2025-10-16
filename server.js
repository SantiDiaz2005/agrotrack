// server.js
// AgroTrack - servidor HTTP puro (sin express)
// Requisitos AO1: servir estáticos, GET/POST, guardar consultas, listar, 404/500.

const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8888; // acepta env PORT, por defecto 8888
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const CONSULTAS_FILE = path.join(DATA_DIR, 'consultas.txt');

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

function send500(res) {
  res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>500</title></head><body>
    <h1>Error interno del servidor</h1>
    <p>Hubo un error en el servidor. <a href="/">Volver al inicio</a></p>
  </body></html>`);
}

function send404(res, urlPath) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>404 - Página no encontrada</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 50px;
        background-color: #f8f8f8;
        color: #333;
      }
      h1 {
        color: #c00;
      }
      a {
        display: inline-block;
        margin-top: 15px;
        text-decoration: none;
        color: #007bff;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <h1>Error 404</h1>
    <p>La página que intentás acceder no existe.</p>
    <p><strong>${escapeHtml(urlPath)}</strong></p>
    <a href="/">Volver al inicio</a>
  </body>
  </html>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatLocalDate(d = new Date()) {
  // formato: YYYY-MM-DD HH:MM
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Asegura que la carpeta data existe (asincrónico, pero lo hacemos al inicio)
fsp.mkdir(DATA_DIR, { recursive: true }).catch(err => {
  console.error('No se pudo crear data/:', err);
});

const server = http.createServer(async (req, res) => {
  try {
    const hostForUrl = `http://localhost:${PORT}`;
    const url = new URL(req.url, hostForUrl);
    const pathname = url.pathname;

    // RUTAS ESPECIALES:
    // 1) Login GET -> /login (sirve login.html)
    // 2) Login POST -> /auth/recuperar
    // 3) Contacto GET form -> /contacto
    // 4) Contacto POST -> /contacto/cargar
    // 5) Contacto listar -> /contacto/listar
    // Otherwise: static files under /public

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      // servir public/index.html
      const filePath = path.join(PUBLIC_DIR, 'index.html');
      return serveStaticFile(filePath, res, req);
    }

    if (req.method === 'GET' && pathname === '/productos.html') {
      const filePath = path.join(PUBLIC_DIR, 'productos.html');
      return serveStaticFile(filePath, res, req);
    }

    if (req.method === 'GET' && pathname === '/login') {
      const filePath = path.join(PUBLIC_DIR, 'login.html');
      return serveStaticFile(filePath, res, req);
    }

    if (req.method === 'POST' && pathname === '/auth/recuperar') {
      // Leer cuerpo y mostrar usuario/clave
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const params = new URLSearchParams(body);
          const usuario = params.get('nombre') || params.get('usuario') || '';
          const clave = params.get('clave') || '';
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Auth</title></head><body>
            <h1>Datos recibidos</h1>
            <p>Usuario: ${escapeHtml(usuario)}</p>
            <p>Clave: ${escapeHtml(clave)}</p>
            <p><a href="/login">Volver</a></p>
          </body></html>`);
        } catch (err) {
          console.error(err);
          send500(res);
        }
      });
      return;
    }

    // CONTACTO: GET form
    if (req.method === 'GET' && pathname === '/contacto') {
      const filePath = path.join(PUBLIC_DIR, 'contacto.html');
      return serveStaticFile(filePath, res, req);
    }

    // CONTACTO: POST cargar
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
            <p>Nombre: ${escapeHtml(nombre)}</p>
            <p>Email: ${escapeHtml(email)}</p>
            <p>Mensaje: ${escapeHtml(mensaje)}</p>
            <p><a href="/">Volver al inicio</a> | <a href="/contacto/listar">Ver todas las consultas</a></p>
            </body></html>`);
        } catch (err) {
          console.error('Error al procesar contacto:', err);
          send500(res);
        }
      });
      return;
    }

    // CONTACTO: listar
    if (req.method === 'GET' && pathname === '/contacto/listar') {
      try {
        // leer archivo (si no existe -> mostrar "Aún no hay consultas")
        let contenido = '';
        try {
          contenido = await fsp.readFile(CONSULTAS_FILE, 'utf8');
        } catch (err) {
          // si no existe, mostrar mensaje
          if (err.code === 'ENOENT') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Consultas</title></head><body>
              <h1>Consultas</h1>
              <p>Aún no hay consultas.</p>
              <p><a href="/">Volver</a></p>
            </body></html>`);
            return;
          } else {
            throw err;
          }
        }

        // Si existe pero vacío?
        if (!contenido || contenido.trim() === '') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Consultas</title></head><body>
            <h1>Consultas</h1>
            <p>Aún no hay consultas.</p>
            <p><a href="/">Volver</a></p>
          </body></html>`);
          return;
        }

        // Mostrar contenido dentro de <pre>
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        const safeContent = escapeHtml(contenido);
        res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Consultas</title></head><body>
          <h1>Consultas</h1>
          <pre style="white-space: pre-wrap;">${safeContent}</pre>
          <p><a href="/">Volver</a></p>
        </body></html>`);
      } catch (err) {
        console.error('Error leyendo consultas:', err);
        send500(res);
      }
      return;
    }
    else if (req.method === 'POST' && req.url === '/contacto/cargar') {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        const params = new URLSearchParams(body);
        const nombre = params.get('nombre');
        const email = params.get('email');
        const mensaje = params.get('mensaje');
        const fecha = new Date().toLocaleString();

        const nuevaConsulta = `Fecha: ${fecha}\nNombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}\n---------------------------\n`;

        try {
            await fsp.appendFile('./data/consultas.txt', nuevaConsulta);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Consulta guardada correctamente</h1><p>Los datos fueron almacenados en data/consultas.txt</p>');
        } catch (err) {
            send500(res);
        }
    });
}


    // Si llega acá: intentar servir recurso estático dentro de /public
    // Normalizamos y evitamos directory traversal
    const staticPath = path.join(PUBLIC_DIR, decodeURIComponent(pathname));
    if (!staticPath.startsWith(PUBLIC_DIR)) {
      // intento de accesso a fuera de public
      return send404(res, pathname);
    }

    let fileToServe = staticPath;
    // si path termina con / -> index.html
    const stat = await tryStat(fileToServe);
    if (stat && stat.isDirectory()) {
      fileToServe = path.join(fileToServe, 'index.html');
    }

    const finalStat = await tryStat(fileToServe);
    if (!finalStat) {
      return send404(res, pathname);
    }

    return serveStaticFile(fileToServe, res, req);

  } catch (err) {
    console.error('Error no capturado:', err);
    send500(res);
  }
});

async function tryStat(fp) {
  try {
    return await fsp.stat(fp);
  } catch (e) {
    return null;
  }
}

function serveStaticFile(filePath, res, req) {
  // lee y sirve archivo asíncronamente, setea MIME
  fsp.readFile(filePath)
    .then(content => {
      const tipo = getMimeByPath(filePath);
      res.writeHead(200, { 'Content-Type': tipo });
      res.end(content);
    })
    .catch(err => {
      console.error('Error sirviendo archivo:', filePath, err);
      if (err.code === 'ENOENT') send404(res, req.url);
      else send500(res);
    });
}

server.listen(PORT, () => {
  console.log(`Servidor AgroTrack iniciado en http://localhost:${PORT}/`);
});
