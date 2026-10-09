/* Duas marcas que o desenho por pixel mostrava onde não há nada, medidas em pixels da camada das formas (o PNG do WebGL sem o
   SVG por cima, com fundo transparente).

   1. As curvas do tubo (`raioCurva`) são uma fila de cilindros retos com as pontas abertas, cada um girado alguns graus em
      relação ao anterior. Do lado de fora da curva as duas pontas se afastam em cunha, e pela cunha se via o fundo: riscos
      transparentes ao longo da curva. A medida é a fresta: pixel transparente com pixel opaco dos dois lados, a até 2 px, na
      horizontal ou na vertical (uma fresta fina entre dois pedaços do tubo, e não o fundo ao lado de uma borda). Antes da
      correção o tubo de teste tinha de 130 a 453 pixels assim, conforme a vista.
   2. O traço de uma forma aparecia através da face de outra forma que está à frente dele por poucos milímetros. Cada face
      era empurrada para trás (polygonOffset) em proporção à inclinação dela, para o traço de 2 px, que era plano na
      profundidade, não ser comido pela própria face; a inclinação multiplica o milímetro por pixel, e de longe o empurrão passa
      dos milímetros de uma chapa. A medida é a diferença de pixels entre desenhar a barra sob a chapa e não a desenhar: a barra
      está inteira atrás da chapa, então a diferença é zero (eram 1296 valores de canal diferentes com a vista na escala do
      quadro e 2916 com o dobro). O traço precisa continuar inteiro sobre a face inclinada a que pertence (a aresta da caixa,
      em todo o contorno), e o perfil que a camada entrega para a fita precisa bater com o plano da face. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { desenharEsboco, fatiarForma, resolverOpcao, VISTAS } from '../src/index.js';
import { AMOSTRAS_DO_PERFIL, inclinacaoDaFace } from '../src/camada.js';
import { renderizarCamada } from '../../../tools/mecanifica/esboco.mjs';

let navegador;
beforeAll(async () => { navegador = await (await import('playwright')).default.chromium.launch(); });
afterAll(async () => { await navegador?.close(); });

const esboco = (vista, formas) => ({ vista, geometria: true, ocultar: ['titulo', 'escala', 'nota', 'legendas'], opcoes: [{ titulo: 'T', formas }] });

/* a camada (ou parte das formas dela) como pixels RGBA, `fator` vezes maior que o quadro */
async function pixels(camada, fator = 1) {
  const url = await renderizarCamada(camada, fator, navegador);
  return PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
}
const alfa = (png, x, y) => (x < 0 || y < 0 || x >= png.width || y >= png.height ? 0 : png.data[(y * png.width + x) * 4 + 3]);

/* pixels transparentes com opaco (alfa >= 250) dos dois lados, a até `alcance` px, na horizontal ou na vertical */
function frestas(png, alcance = 2) {
  const opaco = (x, y) => alfa(png, x, y) >= 250;
  const lado = (x, y, dx, dy) => { for (let k = 1; k <= alcance; k++) if (opaco(x + dx * k, y + dy * k)) return true; return false; };
  const achados = [];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (alfa(png, x, y) >= 8) continue;
      if ((lado(x, y, -1, 0) && lado(x, y, 1, 0)) || (lado(x, y, 0, -1) && lado(x, y, 0, 1))) achados.push([x, y]);
    }
  }
  return achados;
}

describe('curva do tubo (raioCurva)', () => {
  /* dobra de 90 graus no plano yz, de 26 mm de diâmetro, raio de curva 90 */
  const tubo = (extra = {}) => ({ id: 'tubo', tipo: 'tubo', diametro: 26, raioCurva: 90, caminho: [[0, 200, 0], [0, 200, 300], [0, 0, 300]], cor: 'azul', ...extra });
  for (const vista of ['lateral', 'isometrica', 'frontal', 'superior']) {
    it(`não deixa fresta entre os trechos da curva na vista ${vista}`, async () => {
      const { camada } = desenharEsboco(esboco(vista, [tubo()]), { camada: true });
      expect(frestas(await pixels(camada, 2))).toHaveLength(0);
    });
  }
  it('uma curva em três dimensões (a dobra sai do plano) também fecha', async () => {
    const f = tubo({ caminho: [[0, 200, 0], [0, 200, 300], [150, 40, 380], [150, 40, 600]] });
    for (const vista of ['isometrica', 'lateral', 'superior']) {
      const { camada } = desenharEsboco(esboco(vista, [f]), { camada: true });
      expect(frestas(await pixels(camada, 2))).toHaveLength(0);
    }
  });
  it('o esquadro das juntas vale só no desenho: as faces do gate e das medidas não mudam, e o tubo sem curva sai igual', () => {
    const olho = [0.5, 0.5, 0.7];
    const faces = (f, opcoes) => JSON.stringify(fatiarForma(resolverOpcao({ formas: [f] })[0], olho, opcoes).map((ch) => [ch.lados, ch.dentro, ch.tampas]));
    const curvo = tubo();
    expect(faces(curvo, { semFatias: true })).not.toBe(faces(curvo, { semFatias: true, esquadrar: true }));
    const reto = tubo({ raioCurva: 0 });
    expect(faces(reto, { semFatias: true })).toBe(faces(reto, { semFatias: true, esquadrar: true }));
    const solto = { id: 'c', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'y', centro: [0, 0, 0] };
    expect(faces(solto, {})).toBe(faces(solto, { esquadrar: true }));
  });
  it('o tubo sem raioCurva (esfera na quina) e o tubo reto continuam sem fresta', async () => {
    const { camada } = desenharEsboco(esboco('isometrica', [tubo({ raioCurva: 0 })]), { camada: true });
    expect(frestas(await pixels(camada, 2))).toHaveLength(0);
  });
});

describe('traço de uma forma atrás da face de outra', () => {
  /* uma chapa grande de 4 mm e, 4 mm abaixo da face de cima dela, uma barra que a chapa cobre inteira nas vistas de cima */
  const chapa = { id: 'chapa', tipo: 'caixa', largura: 1200, altura: 4, profundidade: 1000, centro: [0, 2, 0], cor: 'azul' };
  const barra = { id: 'barra', tipo: 'caixa', largura: 480, altura: 14, profundidade: 60, centro: [0, -7, -170], cor: 'laranja' };
  for (const [vista, fator] of [['isometrica', 1], ['isometrica', 2], ['superior', 1]]) {
    it(`a barra sob a chapa não aparece na vista ${vista} (x${fator})`, async () => {
      const { camada } = desenharEsboco(esboco(vista, [chapa, barra]), { camada: true });
      const com = await pixels(camada, fator);
      const sem = await pixels({ ...camada, formas: camada.formas.filter((f) => f.id !== 'barra') }, fator);
      let diferentes = 0;
      for (let i = 0; i < com.data.length; i++) if (com.data[i] !== sem.data[i]) diferentes++;
      expect(diferentes).toBe(0);
    });
  }
  it('o contorno da caixa continua inteiro sobre as faces inclinadas dela, na isométrica e de longe', async () => {
    const caixa = { id: 'c', tipo: 'caixa', largura: 1400, altura: 600, profundidade: 900, centro: [0, 0, 0], cor: 'azul' };
    const r = desenharEsboco(esboco('isometrica', [caixa]), { camada: true });
    const { cx, cy } = r.geometria.paineis[0];
    const e = r.geometria.escala;
    const V = VISTAS.isometrica.p;
    const fator = 1;
    const png = await pixels(r.camada, fator);
    const escuro = (x, y) => { const i = (y * png.width + x) * 4; return png.data[i + 3] > 128 && png.data[i] + png.data[i + 1] + png.data[i + 2] < 150; };
    const perto = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (escuro(Math.round(x) + dx, Math.round(y) + dy)) return true; return false; };
    const [a, b, c] = [700, 300, 450];
    /* as arestas visíveis: as que têm ao menos uma das duas faces de frente para o olho */
    const olho = VISTAS.isometrica.olho;
    const de = (n) => n[0] * olho[0] + n[1] * olho[1] + n[2] * olho[2] > 1e-6;
    const sinais = [-1, 1];
    const arestas = [];
    for (const i of [0, 1, 2]) {
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      for (const sj of sinais) for (const sk of sinais) {
        const dim = [a, b, c];
        const ponto = (si) => { const q = [0, 0, 0]; q[i] = si * dim[i]; q[j] = sj * dim[j]; q[k] = sk * dim[k]; return q; };
        const nj = [0, 0, 0]; nj[j] = sj;
        const nk = [0, 0, 0]; nk[k] = sk;
        if (de(nj) || de(nk)) arestas.push([ponto(-1), ponto(1)]);
      }
    }
    let faltam = 0;
    let total = 0;
    for (const [p, q] of arestas) {
      for (let k = 1; k < 40; k++) {
        const t = k / 40;
        const m = [0, 1, 2].map((i) => p[i] + (q[i] - p[i]) * t);
        const s = V(m);
        total++;
        if (!perto((cx + s[0] * e) * fator, (cy + s[1] * e) * fator)) faltam++;
      }
    }
    expect(arestas.length).toBeGreaterThanOrEqual(6);
    expect(total).toBeGreaterThan(200);
    expect(faltam).toBeLessThanOrEqual(Math.round(total * 0.03));
  });
});

describe('o perfil que a camada entrega para a fita', () => {
  const caixa = { id: 'c', tipo: 'caixa', largura: 400, altura: 200, profundidade: 300, centro: [0, 100, 0], cor: 'azul' };
  const r = desenharEsboco(esboco('isometrica', [caixa]), { camada: true });
  const forma = r.camada.formas[0];

  it('a inclinação de cada face passa por todos os vértices dela', () => {
    for (const f of forma.faces) {
      const g = inclinacaoDaFace(f.c, 1e6);
      if (!g) continue;
      for (const q of f.c) expect(Math.abs(f.c[0][2] + g[0] * (q[0] - f.c[0][0]) + g[1] * (q[1] - f.c[0][1]) - q[2])).toBeLessThan(0.01);
    }
  });
  it('cada segmento leva uma amostra por coluna em cada extremo e a ponta afundada', () => {
    expect(r.camada.colunasDoTraco).toEqual([...AMOSTRAS_DO_PERFIL.filter((s) => s < 0), 0, ...AMOSTRAS_DO_PERFIL.filter((s) => s > 0)]);
    expect(forma.inclinacoes).toHaveLength(forma.tracos.length);
    forma.tracos.forEach((t, ti) => {
      expect(forma.inclinacoes[ti]).toHaveLength(t.length - 1);
      for (const [perfil, fundoA, fundoB] of forma.inclinacoes[ti]) {
        expect(perfil).toHaveLength(2 * AMOSTRAS_DO_PERFIL.length);
        expect(perfil.every(Number.isFinite)).toBe(true);
        expect(fundoA).toBeGreaterThanOrEqual(0);
        expect(fundoB).toBeGreaterThanOrEqual(0);
      }
    });
  });
  it('do lado de dentro da face de cima o perfil é o plano dela, e do lado de fora só afasta a fita', () => {
    /* na isométrica a face de cima é a única com inclinação só na vertical da tela */
    const topo = forma.faces.find((f) => { const g = inclinacaoDaFace(f.c, 1e6); return g && Math.abs(g[0]) < 1e-3 && Math.abs(g[1]) > 1; });
    expect(topo).toBeDefined();
    const g = inclinacaoDaFace(topo.c, 1e6);
    const cx = topo.c.reduce((a, q) => a + q[0], 0) / topo.c.length;
    const cy = topo.c.reduce((a, q) => a + q[1], 0) / topo.c.length;
    const aneis = forma.tracos.map((t, ti) => ({ t, ti })).filter(({ t }) => t.length === 5 && topo.c.every((q) => t.some((p) => p[0] === q[0] && p[1] === q[1])));
    expect(aneis).toHaveLength(1);
    const { t, ti } = aneis[0];
    for (let i = 0; i < 4; i++) {
      const dx = t[i + 1][0] - t[i][0]; const dy = t[i + 1][1] - t[i][1]; const n = Math.hypot(dx, dy);
      const px = -dy / n; const py = dx / n;
      const dentro = (cx - t[i][0]) * px + (cy - t[i][1]) * py > 0 ? 1 : -1;
      const [perfil] = forma.inclinacoes[ti][i];
      const doFim = perfil.length / 2;
      AMOSTRAS_DO_PERFIL.forEach((s, k) => {
        const plano = g[0] * s * px + g[1] * s * py;
        for (const amostra of [perfil[k], perfil[doFim + k]]) {
          if (s * dentro > 0) expect(Math.abs(amostra - plano)).toBeLessThan(0.01);
          else expect(amostra).toBeLessThanOrEqual(0.001);
        }
      });
    }
  });
});
