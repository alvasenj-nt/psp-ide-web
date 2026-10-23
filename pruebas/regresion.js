// Regresión del laboratorio: abre cada práctica publicada en Chrome sin
// interfaz y comprueba, para cada ejercicio, que el esqueleto compila, que el
// programa principal termina (y muestra su resultado, si el manifiesto lo
// define) y que "Copiar código" genera la entrega con el informe del entorno.
// Comprueba además que la raíz sin parámetro carga la práctica por defecto.
//
// Uso: node pruebas/regresion.js [id...]   (por defecto, todas las prácticas)
// Requisitos: puppeteer-core y Google Chrome (variable CHROME si no está en
// la ruta habitual). Lo ejecuta GitHub Actions en cada push.
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO = 8765;
const PREFIJO = '/psp-ide-web/';
const BASE = 'http://localhost:' + PUERTO + PREFIJO;
const CHROME = process.env.CHROME || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const POR_DEFECTO = 'psp-ut2-tienda-ropa';

const practicas = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(RAIZ, 'practicas')).filter((d) => fs.existsSync(path.join(RAIZ, 'practicas', d, 'practica.json')));

// Servidor estático con peticiones Range, que CheerpJ necesita para los .jar
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.java': 'text/plain; charset=utf-8',
  '.jar': 'application/java-archive' };
function servidor() {
  return http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(PREFIJO) || url.includes('..')) { res.writeHead(404); return res.end(); }
    url = url.slice(PREFIJO.length - 1);
    if (url.endsWith('/')) url += 'index.html';
    const fichero = path.join(RAIZ, url);
    fs.stat(fichero, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
      const tipo = TIPOS[path.extname(fichero)] || 'application/octet-stream';
      const rango = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
      if (rango) {
        const ini = rango[1] === '' ? st.size - Number(rango[2]) : Number(rango[1]);
        const fin = rango[2] === '' || rango[1] === '' ? st.size - 1 : Math.min(Number(rango[2]), st.size - 1);
        res.writeHead(206, { 'Content-Type': tipo, 'Content-Range': `bytes ${ini}-${fin}/${st.size}`,
          'Content-Length': fin - ini + 1, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(fichero, { start: ini, end: fin }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(fichero).pipe(res);
      }
    });
  }).listen(PUERTO);
}

const fallos = [];
const comprobar = (id, prueba, ok, detalle) => {
  console.log((ok ? '  ok    ' : '  FALLO ') + prueba + (detalle ? ' | ' + detalle : ''));
  if (!ok) fallos.push(id + ': ' + prueba + (detalle ? ' (' + detalle + ')' : ''));
};

async function abrir(navegador, url) {
  const p = await navegador.newPage();
  p.on('pageerror', (e) => console.log('  error de la página: ' + e.message));
  await p.goto(url);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) { /* sin almacenamiento */ } });
  await p.reload();
  await p.waitForFunction(() => /^(Entorno listo|No se pudo|Esta práctica)/.test(document.getElementById('estado').textContent),
    { timeout: 240000 });
  return p;
}

// desde: primer ejercicio que se prueba. Si un programa principal no termina,
// la JVM queda bloqueada: se sigue con el resto en una página nueva.
async function probarPractica(navegador, id, desde = 0) {
  console.log('\n=== ' + id + (desde ? ' (desde el ejercicio ' + (desde + 1) + ')' : '') + ' ===');
  const manifiesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'practicas', id, 'practica.json'), 'utf8'));
  const p = await abrir(navegador, BASE + '?p=' + id);
  const estado = await p.$eval('#estado', (e) => e.textContent);
  comprobar(id, 'carga', estado.startsWith('Entorno listo'), estado);
  if (!estado.startsWith('Entorno listo')) { await p.close(); return; }

  for (const [i, ej] of manifiesto.ejercicios.entries()) {
    if (i < desde) continue;
    const principal = ej.paquete + '/' + ej.principal + '.java';
    await p.click(`.archivo[data-archivo="${principal}"]`);
    await p.click('#btn-ejecutar');
    let termina = true;
    try {
      await p.waitForFunction(() => !document.getElementById('btn-ejecutar').disabled, { timeout: 180000, polling: 250 });
    } catch (e) {
      termina = false;
    }
    const errores = await p.$$eval('#lista-problemas td.tipo-error', (tds) => tds.map((t) => t.textContent));
    comprobar(id, ej.paquete + ': el esqueleto compila', errores.length === 0, errores.slice(0, 2).join(' / '));
    const titulo = await p.$eval('#consola-titulo', (e) => e.textContent);
    comprobar(id, ej.paquete + ': ' + ej.principal + ' termina', termina && titulo.startsWith('<terminated>'), titulo);
    if (!termina) {
      await p.close();
      if (i + 1 < manifiesto.ejercicios.length) await probarPractica(navegador, id, i + 1);
      return;
    }
    const salida = await p.$eval('#consola-visible', (e) => e.textContent);
    if (manifiesto.resultado) {
      comprobar(id, ej.paquete + ': muestra el resultado', new RegExp(manifiesto.resultado.patron).test(salida),
        salida.trim().split('\n').pop());
    }
    await p.click('#btn-copiar-codigo');
    await new Promise((r) => setTimeout(r, 300));
    const copiado = await p.evaluate(() => navigator.clipboard.readText());
    comprobar(id, ej.paquete + ': Copiar código genera el informe',
      /\/\* Informe del entorno \(no borrar\): .*ultima_ejecucion=/.test(copiado)
        && copiado.includes('package ' + ej.paquete + ';'),
      (copiado.match(/ultima_ejecucion=([^*]*)/) || ['', 'sin informe'])[1].trim());
  }
  await p.close();
}

(async () => {
  const srv = servidor();
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 600000,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
  await navegador.defaultBrowserContext().overridePermissions('http://localhost:' + PUERTO,
    ['clipboard-read', 'clipboard-write']);
  try {
    console.log('=== raíz sin parámetro ===');
    const p = await abrir(navegador, BASE);
    const subtitulo = await p.$eval('.subtitulo', (e) => e.textContent);
    const manifiesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'practicas', POR_DEFECTO, 'practica.json'), 'utf8'));
    comprobar('raíz', 'carga ' + POR_DEFECTO, subtitulo === manifiesto.titulo, subtitulo);
    await p.close();
    // Cuestionario importado antes de publicar su práctica
    const q = await abrir(navegador, BASE + '?p=zz-practica-no-publicada');
    const aviso = await q.$eval('#estado', (e) => e.textContent);
    comprobar('raíz', 'avisa de una práctica sin publicar', aviso.includes('todavía no está disponible'), aviso);
    await q.close();
    for (const id of practicas) await probarPractica(navegador, id);
  } finally {
    await navegador.close();
    srv.close();
  }
  console.log('\n' + (fallos.length ? fallos.length + ' fallos:\n- ' + fallos.join('\n- ') : 'Regresión superada: '
    + practicas.length + ' práctica(s).'));
  process.exit(fallos.length ? 1 : 0);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
