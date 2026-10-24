/* Entreno escalada — calentamiento de clase y sesión de resistencia por libre.
   El contenido llega de data/entreno.json; lo que marca cada persona vive en su móvil (localStorage). */
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoy = () => ymd(new Date());
const fechaCorta = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); };
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const MAX_REF = 600; // 10 min por serie como máximo

/* ---------- Estado guardado ---------- */
const CLAVE = 'entreno.v1';
const estadoInicial = () => ({
  v: 1,
  hechos: {},        // {calentar: {d: '2026-10-22', ids: ['campus', ...]}, libre: {...}}
  modo: 'cuerda',    // último ejercicio del calentamiento
  ref: 0,            // tiempo de referencia en segundos
  registro: [],      // {d, test, ref, series}
});
let S = cargar();
function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (s && s.v === 1) return { ...estadoInicial(), ...s };
  } catch (e) { /* estado nuevo */ }
  return estadoInicial();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
  catch (e) { toast('No se ha podido guardar en este móvil.'); }
}

/* ---------- Aviso flotante ---------- */
let toastT;
function toast(texto, accion) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(texto)}</span>` + (accion ? `<button type="button">${esc(accion.texto)}</button>` : '');
  if (accion) $('button', t).onclick = () => { t.hidden = true; accion.fn(); };
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, accion ? 12000 : 3500);
}

/* ---------- Sonido, vibración y pantalla encendida ---------- */
let ac;
function audioListo() {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { /* sin audio */ }
}
function pitido(n = 3) {
  audioListo();
  try {
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.3);
    }
  } catch (e) { /* sin audio */ }
  try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) { /* sin vibración */ }
}
document.addEventListener('pointerdown', audioListo, { once: true });

let bloqueo = null, enMarcha = 0;
async function pantallaEncendida(si) {
  enMarcha = Math.max(0, enMarcha + (si ? 1 : -1));
  try {
    if (enMarcha > 0 && !bloqueo) bloqueo = await navigator.wakeLock.request('screen');
    if (enMarcha === 0 && bloqueo) { await bloqueo.release(); bloqueo = null; }
  } catch (e) { /* no disponible */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && enMarcha > 0) { bloqueo = null; enMarcha--; pantallaEncendida(true); }
});

/* ---------- Datos ---------- */
let C = null;
async function cargarDatos() {
  const ctl = 'AbortController' in window ? new AbortController() : null;
  const t = setTimeout(() => ctl && ctl.abort(), 10000);
  let r;
  try { r = await fetch('data/entreno.json', { cache: 'no-cache', signal: ctl ? ctl.signal : undefined }); }
  finally { clearTimeout(t); }
  if (!r.ok) throw new Error('sin datos');
  C = await r.json();
}

/* ---------- Piezas de cada paso ---------- */
function htmlSecuencia(id) {
  const s = FIGURAS[id];
  if (!s) return '';
  const fases = s.fases.map((f, i) => `<figure class="fase">${dibujarFase(f)}<figcaption><b>${i + 1}</b><span>${esc(f.pie)}</span></figcaption></figure>`).join('');
  return `<div class="secuencia"><div class="secuencia-cab"><span>${esc(s.vista)}</span><span>${s.fases.length} fases →</span></div><div class="fases">${fases}</div></div>`;
}
function htmlFotos(fotos) {
  const f = fotos.map((x, i) => `<figure class="fase"><img src="${esc(x.src)}" alt="${esc(x.pie)}" loading="lazy"><figcaption><b>${i + 1}</b><span>${esc(x.pie)}</span></figcaption></figure>`).join('');
  return `<div class="secuencia"><div class="fases">${f}</div></div>`;
}
function htmlVideos(videos) {
  return `<div class="videos">${videos.map((v) => `<a class="enlace-video" href="https://www.youtube.com/watch?v=${esc(v.yt)}" target="_blank" rel="noopener">▶ Vídeo: ${esc(v.titulo)} <span class="nota">(${esc(v.nota)})</span></a>`).join('')}</div>`;
}
function htmlCuentaAtras(seg, fase = 'Descanso') {
  return `<div class="crono" data-cuenta="${seg}"><span class="fase">${esc(fase)}</span><span class="reloj">${mmss(seg)}</span><span class="botones"><button class="btn" type="button">Iniciar</button></span></div>`;
}

function htmlPaso(grupo, p, i) {
  let h = `<h2>${esc(p.titulo)}</h2>`;
  if (p.modo) {
    h += `<div class="segmento" role="group" aria-label="Tipo de clase">${Object.keys(p.modo).map((m) => `<button type="button" data-modo="${m}" aria-pressed="${S.modo === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>`;
    h += `<p class="texto-modo">${md(p.modo[S.modo] || Object.values(p.modo)[0])}</p>`;
  }
  if (p.texto) h += `<p>${md(p.texto)}</p>`;
  if (p.lista) h += `<ul>${p.lista.map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
  if (p.claves) h += `<div class="claves">${p.claves.map((x) => `<span class="clave">${esc(x)}</span>`).join('')}</div>`;
  if (p.aviso) h += `<p class="aviso">${md(p.aviso)}</p>`;
  if (p.nota) h += `<p class="nota">${md(p.nota)}</p>`;
  if (p.fotos) h += htmlFotos(p.fotos);
  if (p.secuencias) h += p.secuencias.map(htmlSecuencia).join('');
  if (p.videos) h += htmlVideos(p.videos);
  if (p.widget === 'test') h += htmlTest();
  if (p.widget === 'series') h += htmlSeries();
  if (p.descanso) h += htmlCuentaAtras(p.descanso);
  if (p.descanso2) h += htmlCuentaAtras(p.descanso2, 'Entre vías');
  if (p.ir) h += `<button class="btn sec" type="button" data-ir="${esc(p.ir)}" style="align-self:flex-start">Ver calentamiento</button>`;
  return `<li class="paso" data-id="${esc(p.id)}"><button class="check" type="button" aria-label="Marcar «${esc(p.titulo)}»">${i + 1}</button><div class="cuerpo">${h}</div></li>`;
}

function htmlTest() {
  return `<div class="crono escalar" id="test"><span class="fase">Test</span><span class="reloj">0:00</span><span class="botones"><button class="btn" type="button">Empezar</button></span></div>
  <p class="ref">Tiempo de referencia (test − 30 s): <b id="ref-out">—</b></p>
  <p class="manual">Ejemplo: 6:00 en el test = 5:30 de referencia. O escríbelo:
    <input type="number" id="ref-min" inputmode="numeric" min="0" max="10" placeholder="min" aria-label="Minutos"> :
    <input type="number" id="ref-seg" inputmode="numeric" min="0" max="59" placeholder="s" aria-label="Segundos"></p>`;
}
function htmlSeries() {
  return `<div class="crono escalar" id="series"><span class="fase" id="s-fase">Serie 1 · escalar</span><span class="reloj" id="s-reloj">—</span>
    <span class="botones"><button class="btn" type="button" id="s-btn">Iniciar</button><button class="btn sec" type="button" id="s-mas" hidden>+2 min</button><button class="btn sec" type="button" id="s-fin" hidden>Terminar</button></span></div>
  <p class="nota" id="s-pista"></p>`;
}

/* ---------- Secciones ---------- */
function seccionPasos(grupo, datos, chips, intro) {
  return `<section data-seccion="${grupo}" hidden>
    <div class="resumen">
      <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      ${intro ? `<p class="intro">${md(intro)}</p>` : ''}
      <div class="progreso"><span class="cuenta"></span><div class="barra"><i></i></div></div>
    </div>
    <ol class="pasos">${datos.pasos.map((p, i) => htmlPaso(grupo, p, i)).join('')}</ol>
    <button class="reiniciar" type="button">Desmarcar todo</button>
  </section>`;
}
function seccionPautas() {
  return `<section data-seccion="pautas" hidden>${C.pautas.map((p) => `<div class="pauta"><h2>${esc(p.titulo)}</h2><p>${md(p.texto)}</p></div>`).join('')}
    <p class="version">Versión del entreno: ${esc(C.version)}</p></section>`;
}
function seccionRegistro() {
  return `<section data-seccion="registro" hidden><div class="card"><h2>Tu tiempo de referencia</h2><div class="grafico" id="grafico"></div></div>
    <div class="card"><h2>Sesiones por libre</h2><div id="tabla"></div></div>
    <p class="nota">Se guarda solo en este móvil. Cada test y cada bloque de series se apunta aquí solo.</p></section>`;
}

/* ---------- Pasos marcados (se desmarcan solos al día siguiente) ---------- */
function hechos(grupo) {
  const h = S.hechos[grupo];
  return h && h.d === hoy() ? h.ids : [];
}
function pintarHechos(grupo) {
  const sec = $(`[data-seccion="${grupo}"]`), ids = hechos(grupo), pasos = $$('.paso', sec);
  pasos.forEach((li, i) => {
    const h = ids.includes(li.dataset.id);
    li.classList.toggle('hecho', h);
    $('.check', li).textContent = h ? '✓' : i + 1;
  });
  const n = pasos.filter((li) => ids.includes(li.dataset.id)).length;
  $('.cuenta', sec).textContent = `${n}/${pasos.length}`;
  $('.barra i', sec).style.width = (n / pasos.length * 100) + '%';
}
function activarPasos(grupo) {
  const sec = $(`[data-seccion="${grupo}"]`);
  $$('.check', sec).forEach((b) => b.onclick = () => {
    const id = b.closest('.paso').dataset.id;
    let ids = hechos(grupo).slice();
    ids = ids.includes(id) ? ids.filter((x) => x !== id) : ids.concat(id);
    S.hechos[grupo] = { d: hoy(), ids }; guardar(); pintarHechos(grupo);
  });
  $('.reiniciar', sec).onclick = () => { S.hechos[grupo] = { d: hoy(), ids: [] }; guardar(); pintarHechos(grupo); };
  pintarHechos(grupo);
}

/* ---------- Cuentas atrás sencillas ---------- */
function activarCuentas() {
  $$('[data-cuenta]').forEach((t) => {
    const total = +t.dataset.cuenta, reloj = $('.reloj', t), btn = $('.btn', t);
    let fin = 0, iv = null;
    const parar = () => { clearInterval(iv); iv = null; pantallaEncendida(false); };
    btn.onclick = () => {
      audioListo();
      if (iv) { parar(); reloj.textContent = mmss(total); btn.textContent = 'Iniciar'; t.classList.remove('fin'); return; }
      t.classList.remove('fin'); fin = Date.now() + total * 1000; btn.textContent = 'Parar'; pantallaEncendida(true);
      iv = setInterval(() => {
        const r = (fin - Date.now()) / 1000; reloj.textContent = mmss(r);
        if (r <= 0) { parar(); t.classList.add('fin'); reloj.textContent = '¡Ya!'; btn.textContent = 'Otra vez'; pitido(); }
      }, 250);
    };
  });
}

/* ---------- Registro de sesiones ---------- */
function apuntar(cambios) {
  const d = hoy();
  let e = S.registro.find((x) => x.d === d);
  if (!e) { e = { d, test: null, ref: S.ref, series: 0 }; S.registro.push(e); }
  Object.assign(e, cambios);
  S.registro.sort((a, b) => a.d.localeCompare(b.d));
  guardar(); pintarRegistro();
}
function pintarRegistro() {
  const filas = S.registro.slice().reverse();
  $('#tabla').innerHTML = filas.length
    ? `<table class="tabla"><thead><tr><th>Día</th><th>Test</th><th>Referencia</th><th>Series</th><th></th></tr></thead><tbody>${filas.map((e) => `<tr><td>${fechaCorta(e.d)}</td><td>${e.test ? mmss(e.test) : '—'}</td><td>${e.ref ? mmss(e.ref) : '—'}</td><td>${e.series || '—'}</td><td class="borrar"><button type="button" data-borrar="${e.d}">Borrar</button></td></tr>`).join('')}</tbody></table>`
    : '<p class="vacio">Aún no hay sesiones. Haz el test en «Por libre» y aparecerá aquí.</p>';
  $$('[data-borrar]').forEach((b) => b.onclick = () => {
    if (b.dataset.confirmar) { S.registro = S.registro.filter((e) => e.d !== b.dataset.borrar); guardar(); pintarRegistro(); return; }
    b.dataset.confirmar = '1'; b.textContent = '¿Seguro?';
  });
  // Gráfico del tiempo de referencia, en minutos, de 0 a 10.
  const pts = S.registro.filter((e) => e.ref);
  const g = $('#grafico');
  if (pts.length < 2) { g.innerHTML = `<p class="vacio">${pts.length ? 'Con dos sesiones verás aquí cómo sube tu tiempo.' : 'Aquí verás cómo sube tu tiempo de referencia, hasta el máximo de 10 min.'}</p>`; return; }
  const W = 320, H = 150, x0 = 28, x1 = W - 10, y0 = H - 22, y1 = 10;
  const X = (i) => x0 + (x1 - x0) * (i / (pts.length - 1));
  const Y = (s) => y0 - (y0 - y1) * (s / MAX_REF);
  const linea = pts.map((e, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(e.ref).toFixed(1)}`).join(' ');
  const grid = [0, 2, 4, 6, 8, 10].map((m) => `<line x1="${x0}" x2="${x1}" y1="${Y(m * 60)}" y2="${Y(m * 60)}" stroke="var(--line)" stroke-width="${m === 10 ? 1.2 : .6}"${m === 10 ? ' stroke-dasharray="3 3"' : ''}/><text x="${x0 - 6}" y="${Y(m * 60) + 4}" text-anchor="end">${m}</text>`).join('');
  const ult = pts[pts.length - 1];
  g.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del tiempo de referencia">${grid}
    <path d="${linea} L${X(pts.length - 1)} ${y0} L${x0} ${y0} Z" fill="var(--accent-soft)"/>
    <path d="${linea}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${pts.map((e, i) => `<circle cx="${X(i)}" cy="${Y(e.ref)}" r="${i === pts.length - 1 ? 4 : 2.5}" fill="var(--accent)"/>`).join('')}
    <text x="${x0}" y="${H - 5}">${fechaCorta(pts[0].d)}</text><text x="${x1}" y="${H - 5}" text-anchor="end">${fechaCorta(ult.d)} · ${mmss(ult.ref)}</text></svg>
    <p class="nota">Minutos. La línea discontinua es el máximo de 10 min por serie.</p>`;
}

/* ---------- Test y series ---------- */
function activarTestYSeries() {
  const refOut = $('#ref-out'), rm = $('#ref-min'), rs = $('#ref-seg');
  const pintarRef = () => {
    refOut.textContent = S.ref ? mmss(S.ref) : '—';
    if (document.activeElement !== rm && document.activeElement !== rs) { rm.value = S.ref ? Math.floor(S.ref / 60) : ''; rs.value = S.ref ? S.ref % 60 : ''; }
  };
  const fijarRef = (s) => { S.ref = Math.max(0, Math.min(MAX_REF, Math.round(s))); guardar(); pintarRef(); reiniciarSeries(); };
  [rm, rs].forEach((i) => i.onchange = () => { fijarRef((+rm.value || 0) * 60 + (+rs.value || 0)); if (S.ref) apuntar({ ref: S.ref }); });

  // Test: cronómetro
  const t = $('#test'), tr = $('.reloj', t), tb = $('.btn', t);
  let inicio = 0, ivT = null;
  tb.onclick = () => {
    audioListo();
    if (!ivT) {
      inicio = Date.now(); tr.textContent = '0:00'; tb.textContent = 'Me bajo'; pantallaEncendida(true);
      ivT = setInterval(() => { tr.textContent = mmss((Date.now() - inicio) / 1000 - 0.999); }, 250);
      return;
    }
    clearInterval(ivT); ivT = null; pantallaEncendida(false);
    const seg = Math.round((Date.now() - inicio) / 1000);
    tr.textContent = mmss(seg - 0.999); tb.textContent = 'Repetir';
    if (seg <= 30) { toast('Menos de 30 s: no se guarda como test.'); return; }
    fijarRef(seg - 30);
    apuntar({ test: seg, ref: S.ref });
    toast(`Referencia: ${mmss(S.ref)}. Guardado en Registro.`);
  };

  // Series: escalar → descansar → escalar… (2 a 3)
  const sf = $('#s-fase'), sr = $('#s-reloj'), sb = $('#s-btn'), smas = $('#s-mas'), sfin = $('#s-fin'), sp = $('#s-pista'), caja = $('#series');
  let serie = 1, fase = 'escalar', resta = 0, fin = 0, iv = null;
  const enCurso = () => iv !== null;
  function etiqueta() {
    sf.textContent = fase === 'escalar' ? `Serie ${serie} · escalar` : fase === 'descanso' ? `Descanso tras la serie ${serie}` : 'Series terminadas';
    caja.className = 'crono ' + (fase === 'escalar' ? 'escalar' : fase === 'descanso' ? 'descanso' : 'fin');
    smas.hidden = fase !== 'descanso';
    sfin.hidden = !(fase === 'descanso' && serie >= 2);
  }
  function reiniciarSeries() {
    if (enCurso()) { clearInterval(iv); iv = null; pantallaEncendida(false); }
    serie = 1; fase = 'escalar'; resta = S.ref; etiqueta();
    sr.textContent = S.ref ? mmss(S.ref) : '—'; sb.textContent = 'Iniciar'; sb.disabled = !S.ref;
    sp.textContent = S.ref ? `Escala ${mmss(S.ref)} y descansa ${mmss(S.ref)}. Entre 2 y 3 series.` : 'Haz primero el test o escribe tu tiempo.';
  }
  function arrancar() { fin = Date.now() + resta * 1000; sb.textContent = 'Pausa'; clearInterval(iv); iv = setInterval(tic, 250); tic(); }
  function terminar() {
    if (enCurso()) { clearInterval(iv); iv = null; pantallaEncendida(false); }
    fase = 'fin'; etiqueta(); sr.textContent = '✓'; sb.textContent = 'Empezar de nuevo'; sb.disabled = false;
    apuntar({ series: serie, ref: S.ref });
    toast(`${serie} series hechas. Guardado en Registro.`);
  }
  function tic() {
    resta = (fin - Date.now()) / 1000; sr.textContent = mmss(resta);
    if (resta > 0) return;
    pitido();
    if (fase === 'escalar') { if (serie >= 3) { terminar(); return; } fase = 'descanso'; }
    else { serie++; fase = 'escalar'; }
    resta = S.ref; etiqueta(); arrancar();
  }
  sb.onclick = () => {
    audioListo();
    if (fase === 'fin') { reiniciarSeries(); return; }
    if (enCurso()) { clearInterval(iv); iv = null; resta = (fin - Date.now()) / 1000; sb.textContent = 'Seguir'; pantallaEncendida(false); return; }
    pantallaEncendida(true); arrancar();
  };
  smas.onclick = () => {
    if (fase !== 'descanso') return;
    if (enCurso()) fin += 120000; else resta += 120;
    sr.textContent = mmss(enCurso() ? (fin - Date.now()) / 1000 : resta);
  };
  sfin.onclick = terminar;

  pintarRef(); reiniciarSeries();
}

/* ---------- Navegación ---------- */
const SECCIONES = { calentar: 'Calentamiento', libre: 'Sesión por libre', registro: 'Registro', pautas: 'Pautas' };
function ir() {
  let id = (location.hash.match(/^#\/(\w+)/) || [])[1];
  if (!SECCIONES[id]) id = 'calentar';
  $$('[data-seccion]').forEach((s) => { s.hidden = s.dataset.seccion !== id; });
  $$('#tabs a').forEach((a) => { if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#titulo').textContent = SECCIONES[id];
  if (id === 'calentar' || id === 'libre') { pintarHechos(id); }
  window.scrollTo(0, 0);
}

/* ---------- Arranque ---------- */
function fallo(texto, e) {
  window.__entrenoListo = true;
  $('#main').innerHTML = `<p class="cargando">${esc(texto)}</p>`
    + (e ? `<p class="nota">Detalle: ${esc(e && (e.message || e))}</p>` : '')
    + '<p><button class="btn" type="button" id="reintentar">Reiniciar app</button></p>';
  $('#reintentar').onclick = () => window.__reiniciarApp();
}
async function iniciar() {
  try { await cargarDatos(); }
  catch (e) { fallo('No se ha podido cargar el entreno. Comprueba la conexión y pulsa «Reiniciar app».', e); return; }
  try { pintarApp(); window.__entrenoListo = true; }
  catch (e) { fallo('Algo ha fallado al abrir el entreno.', e); }
}
function pintarApp() {
  const cal = C.calentamiento, lib = C.libre;
  $('#main').innerHTML =
    seccionPasos('calentar', cal, ['📍 ' + cal.lugar, '⏱ ' + cal.duracion], cal.intro) +
    seccionPasos('libre', lib, ['🎯 Resistencia'], lib.objetivo) +
    seccionRegistro() + seccionPautas();

  activarPasos('calentar'); activarPasos('libre');
  activarCuentas(); activarTestYSeries(); pintarRegistro();

  $$('[data-modo]').forEach((b) => b.onclick = () => {
    S.modo = b.dataset.modo; guardar();
    $$('[data-modo]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.modo === S.modo));
    const p = cal.pasos.find((x) => x.modo);
    $('.texto-modo').innerHTML = md(p.modo[S.modo]);
  });
  $$('[data-ir]').forEach((b) => b.onclick = () => { location.hash = '#/' + b.dataset.ir; });

  window.addEventListener('hashchange', ir);
  ir();
}
iniciar().catch((e) => fallo('Algo ha fallado al abrir el entreno.', e));

/* ---------- Funciona sin conexión ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo && nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Hay una versión nueva', { texto: 'Actualizar', fn: () => nuevo.postMessage('activar') });
        }
      });
    });
  }).catch(() => {});
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; location.reload(); } });
}
