/* Secuencias ilustradas de los ejercicios (dibujo propio, funciona sin conexión).
   Cada secuencia tiene fases; cada fase dibuja una figura de palitos sobre un lienzo de 120 × 100.
   Figura: h cabeza, n cuello, c cadera; bi/bd brazo izq./dcho. [codo, mano]; pi/pd pierna izq./dcha. [rodilla, pie].
   «activo» marca en color las extremidades que se mueven en esa fase.
   Accesorios: suelo, pared, presa {x,y}, banda (entre las dos manos), campus, arco {d} (trayectoria). */
'use strict';
const FIGURAS = {
  'torsiones-sentado': {
    vista: 'De frente',
    fases: [
      { pie: 'Sentado, rodillas arriba, manos apoyadas detrás', acc: [{ t: 'suelo' }],
        fig: { h: [60, 44], n: [60, 53], c: [60, 80], bi: [[42, 62], [30, 90]], bd: [[78, 62], [90, 90]], pi: [[48, 64], [44, 90]], pd: [[72, 64], [76, 90]] } },
      { pie: 'Una rodilla al centro y la otra hacia fuera', acc: [{ t: 'suelo' }], activo: ['pi', 'pd'],
        fig: { h: [61, 44], n: [61, 53], c: [60, 80], bi: [[42, 62], [30, 90]], bd: [[78, 62], [90, 90]], pi: [[41, 83], [44, 90]], pd: [[52, 68], [76, 90]] } },
      { pie: 'Cambia al otro lado, sin prisa', acc: [{ t: 'suelo' }], activo: ['pi', 'pd'],
        fig: { h: [59, 44], n: [59, 53], c: [60, 80], bi: [[42, 62], [30, 90]], bd: [[78, 62], [90, 90]], pi: [[68, 68], [44, 90]], pd: [[79, 83], [76, 90]] } },
    ],
  },
  'perrito-meando': {
    vista: 'De lado',
    fases: [
      { pie: 'A cuatro patas: manos bajo hombros, rodillas bajo cadera', acc: [{ t: 'suelo' }],
        fig: { h: [90, 55], n: [82, 62], c: [46, 70], bi: [[82, 77], [82, 92]], bd: [[82, 77], [82, 92]], pi: [[46, 90], [26, 90]], pd: [[46, 90], [26, 90]] } },
      { pie: 'Levanta una pierna atrás con la rodilla doblada', acc: [{ t: 'suelo' }], activo: ['pd'],
        fig: { h: [90, 55], n: [82, 62], c: [46, 70], bi: [[82, 77], [82, 92]], bd: [[82, 77], [82, 92]], pi: [[46, 90], [26, 90]], pd: [[28, 62], [20, 80]] } },
      { pie: 'Lleva la rodilla en semicírculo hacia el codo y vuelve', acc: [{ t: 'suelo' }, { t: 'arco', d: 'M28 58 Q44 36 64 62' }], activo: ['pd'],
        fig: { h: [90, 55], n: [82, 62], c: [46, 70], bi: [[82, 77], [82, 92]], bd: [[82, 77], [82, 92]], pi: [[46, 90], [26, 90]], pd: [[66, 72], [50, 82]] } },
    ],
  },
  'rotacion-externa': {
    vista: 'De frente',
    fases: [
      { pie: 'Codos pegados al cuerpo a 90°, banda entre las manos', acc: [{ t: 'suelo' }, { t: 'banda' }],
        fig: { h: [60, 15], n: [60, 24], c: [60, 56], bi: [[53, 42], [57, 44]], bd: [[67, 42], [63, 44]], pi: [[55, 74], [54, 92]], pd: [[65, 74], [66, 92]] } },
      { pie: 'Abre las manos hacia fuera sin separar los codos del cuerpo', acc: [{ t: 'suelo' }, { t: 'banda' }], activo: ['bi', 'bd'],
        fig: { h: [60, 15], n: [60, 24], c: [60, 56], bi: [[53, 42], [38, 41]], bd: [[67, 42], [82, 41]], pi: [[55, 74], [54, 92]], pd: [[65, 74], [66, 92]] } },
      { pie: 'Vuelve despacio controlando la banda', acc: [{ t: 'suelo' }, { t: 'banda' }], activo: ['bi', 'bd'],
        fig: { h: [60, 15], n: [60, 24], c: [60, 56], bi: [[53, 42], [46, 44]], bd: [[67, 42], [74, 44]], pi: [[55, 74], [54, 92]], pd: [[65, 74], [66, 92]] } },
    ],
  },
  'campus': {
    vista: 'De lado',
    fases: [
      { pie: 'Dos manos en el primer listón, pies altos, cadera baja, brazos estirados', acc: [{ t: 'campus' }],
        fig: { h: [75, 46], n: [70, 54], c: [68, 80], bi: [[82, 59], [93, 64]], bd: [[82, 59], [93, 64]], pi: [[82, 70], [94, 86]], pd: [[82, 70], [94, 86]] } },
      { pie: 'Sube una mano listón a listón', acc: [{ t: 'campus' }], activo: ['bd'],
        fig: { h: [75, 46], n: [70, 54], c: [68, 80], bi: [[82, 59], [93, 64]], bd: [[82, 46], [93, 40]], pi: [[82, 70], [94, 86]], pd: [[82, 70], [94, 86]] } },
      { pie: 'Hasta el más lejano sin forzar. Baja igual y cambia de mano', acc: [{ t: 'campus' }], activo: ['bd'],
        fig: { h: [77, 38], n: [72, 46], c: [70, 72], bi: [[83, 55], [93, 64]], bd: [[83, 37], [93, 28]], pi: [[84, 66], [94, 86]], pd: [[84, 66], [94, 86]] } },
    ],
  },
  'recursos-tecnicos': {
    vista: 'De espaldas, en el muro',
    fases: [
      { pie: 'Bandera: la pierna libre va al lado para equilibrar', acc: [{ t: 'pared' }, { t: 'presa', x: 73, y: 10 }, { t: 'presa', x: 48, y: 26 }, { t: 'presa', x: 67, y: 91 }], activo: ['pi'],
        fig: { h: [60, 22], n: [60, 31], c: [62, 57], bi: [[52, 40], [48, 28]], bd: [[68, 21], [72, 12]], pi: [[46, 66], [28, 72]], pd: [[64, 74], [66, 89]] } },
      { pie: 'Rodilla: gira la rodilla hacia dentro y abajo para pegar la cadera', acc: [{ t: 'pared' }, { t: 'presa', x: 52, y: 12 }, { t: 'presa', x: 72, y: 20 }, { t: 'presa', x: 40, y: 70 }, { t: 'presa', x: 80, y: 72 }], activo: ['pi'],
        fig: { h: [61, 24], n: [61, 33], c: [60, 58], bi: [[54, 24], [52, 14]], bd: [[70, 30], [72, 22]], pi: [[50, 80], [41, 69]], pd: [[72, 64], [79, 70]] } },
      { pie: 'Talón: engancha el talón en una presa alta y tira con la pierna', acc: [{ t: 'pared' }, { t: 'presa', x: 50, y: 14 }, { t: 'presa', x: 66, y: 10 }, { t: 'presa', x: 88, y: 50 }, { t: 'presa', x: 54, y: 90 }], activo: ['pd'],
        fig: { h: [57, 26], n: [58, 35], c: [60, 60], bi: [[52, 26], [50, 16]], bd: [[64, 22], [66, 12]], pi: [[56, 75], [54, 88]], pd: [[72, 47], [86, 50]] } },
    ],
  },
};

function dibujarFase(f) {
  const L = (a, b, cls) => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  const g = f.fig, act = new Set(f.activo || []);
  const acc = (f.acc || []).map((a) => {
    if (a.t === 'suelo') return '<line class="suelo" x1="6" y1="93" x2="114" y2="93"/>';
    if (a.t === 'pared') return '<rect class="pared" x="4" y="2" width="112" height="96" rx="6"/>';
    if (a.t === 'presa') return `<circle class="presa" cx="${a.x}" cy="${a.y}" r="4"/>`;
    if (a.t === 'banda') return L(g.bi[1], g.bd[1], 'banda');
    if (a.t === 'arco') return `<path class="arco" d="${a.d}"/>`;
    if (a.t === 'campus') {
      let s = '<line class="tabla-campus" x1="97" y1="4" x2="97" y2="96"/>';
      for (let y = 16; y <= 76; y += 12) s += `<rect class="liston" x="91" y="${y}" width="6" height="3" rx="1"/>`;
      return s + '<rect class="liston" x="91" y="86" width="6" height="3" rx="1"/>';
    }
    return '';
  });
  const lado = (k, base) => {
    const [m, e] = g[k];
    const cls = act.has(k) ? 'miembro activo' : 'miembro';
    return L(base, m, cls) + L(m, e, cls);
  };
  // Primero las extremidades en reposo, después las activas para que queden encima.
  const orden = ['bi', 'bd', 'pi', 'pd'].sort((a, b) => act.has(a) - act.has(b));
  const miembros = orden.map((k) => lado(k, k[0] === 'b' ? g.n : g.c)).join('');
  return `<svg viewBox="0 0 120 100" role="img" aria-label="${f.pie.replace(/"/g, '')}">${acc.join('')}`
    + `${L(g.n, g.c, 'miembro tronco')}${miembros}<circle class="cabeza" cx="${g.h[0]}" cy="${g.h[1]}" r="6.5"/></svg>`;
}
