/* A exportação das formas resolvidas: dado puro (JSON ida e volta igual), determinístico, completo em relação ao que o
   desenho mostra, e coerente com a geometria que o próprio módulo resolve. Roda sobre as fixtures do módulo (moto,
   casa, mancal e as outras) e sobre os esboços do banco de provas (cadeira, guarda-roupa, cadeira de rodas, carrinho
   de mão e o carrinho com casca). */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ErroDeEsboco, resolverOpcao, validarEsboco } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { FORMATO_DAS_FORMAS, formasResolvidas } from '../src/formas-resolvidas.js';

const pasta = new URL('./fixtures/', import.meta.url);
const raiz = new URL('../../../', import.meta.url);
const lerJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const doModulo = readdirSync(fileURLToPath(pasta)).filter((n) => n.endsWith('.esboco.json')).sort().map((n) => [n, lerJson(new URL(n, pasta))]);
const banco = [
  'rodada-2026-10-08/cadeira/cadeira-jantar',
  'rodada-2026-10-08/guarda-roupa/guarda-roupa',
  'rodada-2026-10-08/cadeira-de-rodas/cadeira-de-rodas',
  'rodada-2026-10-08/carrinho-de-mao/carrinho-de-mao',
  'carrinho-refeito-2026-10-08/carrinho-casca',
  'carrinho-refeito-2026-10-08/chassi-e-cacamba',
].map((n) => [`${n.split('/').pop()}.esboco.json`, lerJson(new URL(`docs/modelar/banco-de-provas/${n}.esboco.json`, raiz))]);
const fixtures = [...doModulo, ...banco];

const EIXOS = ['x', 'y', 'z'];
const caixa = (id, extra = {}) => ({ id, tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 0, 0], ...extra });
const mundo = (g, p) => [0, 1, 2].map((i) => g.centro[i] + g.matriz[i][0] * p[0] + g.matriz[i][1] * p[1] + g.matriz[i][2] * p[2]);
const caixaDosPontos = (pts) => ({ min: [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i]))) });
const perto = (a, b, tol = 1e-6) => { expect(a).toHaveLength(b.length); a.forEach((x, i) => expect(Math.abs(x - b[i])).toBeLessThanOrEqual(tol)); };
/* o ponto local [u, v, w] de um sólido em seções, no referencial x, y, z local */
const localDe = (g, u, v, w) => { const p = [0, 0, 0]; p[EIXOS.indexOf(g.eixosDoPerfil[0])] = u; p[EIXOS.indexOf(g.eixosDoPerfil[1])] = v; p[EIXOS.indexOf(g.eixo)] = w; return p; };

describe('formas resolvidas: as fixtures do módulo e do banco de provas', () => {
  it('cobre as fixtures esperadas', () => {
    const nomes = fixtures.map(([n]) => n);
    for (const n of ['moto.esboco.json', 'casa.esboco.json', 'mancal-eixo.esboco.json', 'cadeira-jantar.esboco.json', 'guarda-roupa.esboco.json', 'carrinho-casca.esboco.json']) expect(nomes).toContain(n);
  });

  for (const [nome, bruto] of fixtures) {
    describe(nome, () => {
      bruto.opcoes.forEach((_, i) => {
        const numero = i + 1;

        it(`opção ${numero}: todas as formas do desenho aparecem, na ordem da resolução, com a geometria do módulo`, () => {
          const e = formasResolvidas(bruto, numero);
          const expandido = expandirEsboco(bruto);
          const resolvidas = resolverOpcao(expandido.opcoes[i], `opção ${numero}`, expandido.pontos);
          expect(e.formato).toBe(FORMATO_DAS_FORMAS);
          expect(e.opcao.numero).toBe(numero);
          expect(e.formas.map((f) => f.id)).toEqual(resolvidas.map((r) => r.id));
          expect(new Set(e.formas.map((f) => f.id)).size).toBe(e.formas.length);
          /* tudo o que o desenho mostra (as formas visíveis da opção) está na exportação */
          const desenhadas = validarEsboco(bruto).opcoes[i].formas.map((r) => r.id);
          expect(desenhadas.length).toBeGreaterThan(0);
          const ids = new Set(e.formas.map((f) => f.id));
          for (const id of desenhadas) expect(ids.has(id), `a forma "${id}" desenhada falta na exportação`).toBe(true);
          expect(e.formas.filter((f) => !f.oculto).length).toBe(desenhadas.length);
          e.formas.forEach((f, k) => {
            expect(f.tipo).toBe(resolvidas[k].forma.tipo);
            expect(f.geometria.centro).toEqual(resolvidas[k].centro.map((x) => x + 0));
            expect(f.geometria.caixa).toEqual({ min: resolvidas[k].min.map((x) => x + 0), max: resolvidas[k].max.map((x) => x + 0) });
            expect(f.geometria.matriz).toHaveLength(3);
            for (const linha of f.geometria.matriz) expect(linha).toHaveLength(3);
            expect(Object.keys(f.geometria.ancoras)).toContain('centro');
          });
        });

        it(`opção ${numero}: é JSON puro, não altera a entrada e sai igual a cada chamada`, () => {
          const antes = JSON.stringify(bruto);
          const a = formasResolvidas(bruto, numero);
          const b = formasResolvidas(JSON.parse(antes), numero);
          const texto = JSON.stringify(a);
          expect(JSON.parse(texto)).toEqual(a);
          expect(JSON.stringify(JSON.parse(texto))).toBe(texto);
          expect(JSON.stringify(b)).toBe(texto);
          expect(JSON.stringify(bruto)).toBe(antes);
        });

        it(`opção ${numero}: a geometria exportada refaz a caixa de mundo que o módulo resolve`, () => {
          for (const f of formasResolvidas(bruto, numero).formas) {
            const g = f.geometria;
            let pts = null;
            if (f.tipo === 'caixa') {
              const medida = { x: g.largura, y: g.altura, z: g.profundidade };
              pts = [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => mundo(g, [a * medida.x / 2, b * medida.y / 2, c * medida.z / 2]))));
            } else if (f.tipo === 'extrusao') {
              pts = [-1, 1].flatMap((s) => g.perfil.map(([u, v]) => mundo(g, localDe(g, u, v, s * g.comprimento / 2))));
            } else if (f.tipo === 'loft') {
              pts = g.secoes.flatMap((sc) => sc.perfil.map((q) => mundo(g, localDe(g, q[0], q[1], q.length > 2 ? q[2] : sc.w))));
            } else if (f.tipo === 'tubo') {
              const folga = f.geometria.diametro / 2 + 1e-6;
              const c = g.caixa;
              for (const p of g.caminho) p.forEach((x, k) => { expect(x).toBeGreaterThanOrEqual(c.min[k] - folga); expect(x).toBeLessThanOrEqual(c.max[k] + folga); });
              perto(g.caminho[0], g.ancoras.inicio);
              perto(g.caminho[g.caminho.length - 1], g.ancoras.fim);
            }
            if (pts) {
              const c = caixaDosPontos(pts);
              perto(c.min, g.caixa.min);
              perto(c.max, g.caixa.max);
            }
          }
        });
      });
    });
  }
});

describe('formas resolvidas: o que cada forma traz', () => {
  it('cada tipo exporta as medidas próprias em números', () => {
    const e = formasResolvidas({
      opcoes: [{
        formas: [
          { id: 'cil', tipo: 'cilindro', diametro: 20, comprimento: 50, eixo: 'x', centro: [0, 0, 0], achatado: { lado: '+y', profundidade: 3 } },
          { id: 'ane', tipo: 'anel', diametroExterno: 40, diametroInterno: 30, espessura: 8, eixo: 'z', centro: [100, 0, 0] },
          caixa('cx', { centro: [200, 0, 0], raio: 2, furo: { diametro: 4, centro: [1, 2] } }),
          { id: 'con', tipo: 'cone', diametro: 30, diametroTopo: 10, comprimento: 40, centro: [300, 0, 0] },
          { id: 'esf', tipo: 'esfera', diametro: 25, centro: [400, 0, 0] },
          { id: 'ext', tipo: 'extrusao', perfil: [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]], comprimento: 6, eixo: 'y', centro: [500, 0, 0] },
          { id: 'rev', tipo: 'revolucao', eixo: 'y', centro: [600, 0, 0], perfil: [{ raio: 0, altura: 0, nome: 'bico' }, [10, 5], { raio: 6, altura: 30 }] },
        ],
      }],
    });
    const por = Object.fromEntries(e.formas.map((f) => [f.id, f.geometria]));
    expect(por.cil).toMatchObject({ eixo: 'x', diametro: 20, comprimento: 50, achatado: { lado: '+y', profundidade: 3 } });
    expect(por.ane).toMatchObject({ eixo: 'z', diametroExterno: 40, diametroInterno: 30, espessura: 8 });
    expect(por.cx).toMatchObject({ largura: 10, altura: 10, profundidade: 10, raio: 2, furos: [{ diametro: 4, centro: [1, 2] }] });
    expect(por.con).toMatchObject({ diametro: 30, diametroTopo: 10, comprimento: 40 });
    expect(por.esf).toMatchObject({ diametro: 25 });
    expect(por.ext).toMatchObject({ eixo: 'y', eixosDoPerfil: ['x', 'z'], comprimento: 6, convexo: false });
    expect(por.ext.perfil).toHaveLength(6);
    expect(por.rev.comprimento).toBe(30);
    expect(por.rev.perfil.map((q) => q.raio)).toEqual([0, 10, 6]);
    expect(por.rev.perfil[0].nome).toBe('bico');
    expect(por.rev.perfil[2].altura - por.rev.perfil[0].altura).toBe(30);
    expect(por.rev.ancoras).toHaveProperty('bico');
  });

  it('a rotação sai como matriz de mundo e a caixa é a da forma girada', () => {
    const [f] = formasResolvidas({ opcoes: [{ formas: [caixa('c', { largura: 20, altura: 10, profundidade: 6, rotacao: [0, 90, 0] })] }] }).formas;
    expect(f.geometria.matriz).toEqual([[0, 0, 1], [0, 1, 0], [-1, 0, 0]]);
    perto(f.geometria.caixa.min, [-3, -5, -10]);
    perto(f.geometria.caixa.max, [3, 5, 10]);
  });

  it('o tubo traz o caminho resolvido em mundo, e a cópia espelhada o caminho refletido', () => {
    const e = formasResolvidas({
      pontos: { a: [10, 0, 0] },
      opcoes: [{ formas: [
        { id: 'tubo', tipo: 'tubo', diametro: 8, raioCurva: 6, caminho: ['a', [10, 50, 0], { nome: 'joelho', ponto: [10, 50, 40] }, [10, 80, 40]] },
        { id: 'tuboE', espelha: { forma: 'tubo', eixo: 'x', pos: 0 } },
      ] }],
    });
    const [t, te] = e.formas;
    expect(t.geometria).toMatchObject({ diametro: 8, raioCurva: 6 });
    expect(t.geometria.caminho).toEqual([[10, 0, 0], [10, 50, 0], [10, 50, 40], [10, 80, 40]]);
    expect(t.geometria.ancoras.joelho).toEqual([10, 50, 40]);
    expect(te.geometria.caminho).toEqual([[-10, 0, 0], [-10, 50, 0], [-10, 50, 40], [-10, 80, 40]]);
    expect(te.origem).toEqual({ espelho: { forma: 'tubo', eixo: 'x', pos: 0 } });
    expect(e.pontos).toEqual({ a: [10, 0, 0] });
  });

  it('a faixa envolve traz a linha de centro, a largura e a espessura', () => {
    const [f] = formasResolvidas({ opcoes: [{ formas: [{ id: 'correia', tipo: 'envolve', largura: 12, espessura: 3, circulos: [{ centro: [0, 0, 0], raio: 20, eixo: 'z' }, { centro: [100, 0, 0], raio: 20, eixo: 'z' }] }] }] }).formas;
    expect(f.geometria).toMatchObject({ largura: 12, espessura: 3, fechado: true });
    expect(f.geometria.trilha.fechado).toBe(true);
    expect(f.geometria.trilha.pontos.length).toBeGreaterThan(4);
    const c = f.geometria.caixa;
    for (const p of f.geometria.trilha.pontos) p.forEach((x, k) => { expect(x).toBeGreaterThanOrEqual(c.min[k] - 1e-6); expect(x).toBeLessThanOrEqual(c.max[k] + 1e-6); });
  });

  it('o loft traz as seções, o nome, a inclinação e a casca', () => {
    const retangulo = (pos, w, h, extra = {}) => ({ pos, forma: 'retangulo', tamanho: [w, h], ...extra });
    const [f] = formasResolvidas({ opcoes: [{ formas: [{
      id: 'bacia', tipo: 'loft', eixo: 'y', centro: [0, 0, 0], casca: { espessura: 2, aberta: 'fim' },
      secoes: [retangulo(0, 40, 30, { nome: 'fundo', inclinacao: [5, 0] }), retangulo(30, 60, 40), retangulo(50, 70, 50, { nome: 'boca' })],
    }] }] }).formas;
    const g = f.geometria;
    expect(g.eixo).toBe('y');
    expect(g.eixosDoPerfil).toEqual(['x', 'z']);
    expect(g.secoes).toHaveLength(3);
    expect(g.secoes.map((sc) => sc.nome)).toEqual(['fundo', undefined, 'boca']);
    expect(g.secoes[0].inclinacao).toEqual([5, 0]);
    expect(g.secoes[0].n).toHaveLength(3);
    expect(g.secoes[1]).not.toHaveProperty('inclinacao');
    expect(g.casca).toMatchObject({ espessura: 2, aberta: 'fim' });
    expect(Number.isFinite(g.casca.fundoAte)).toBe(true);
    expect(g.casca.cavidade.length).toBeGreaterThan(1);
    expect(g.ancoras).toHaveProperty('boca');
  });

  it('a haste entre dois pontos e as cópias dela saem marcadas, com as pontas como âncoras', () => {
    const e = formasResolvidas({ opcoes: [{ formas: [
      { id: 'haste', tipo: 'cilindro', diametro: 6, de: [0, 0, 0], para: [0, 30, 40] },
      { id: 'hasteE', espelha: { forma: 'haste', eixo: 'x', pos: 20 } },
      caixa('solta'),
    ] }] });
    const [h, he, s] = e.formas;
    expect(h.geometria.haste).toBe(true);
    expect(he.geometria.haste).toBe(true);
    expect(s.geometria).not.toHaveProperty('haste');
    expect(h.geometria.comprimento).toBeCloseTo(50, 9);
    perto(h.geometria.ancoras.inicio, [0, 0, 0]);
    perto(h.geometria.ancoras.fim, [0, 30, 40]);
    perto(he.geometria.ancoras.inicio, [40, 0, 0]);
  });

  it('unidade, parte do plano, componente, espelho e arranjo de cada forma', () => {
    const e = formasResolvidas({
      parametros: { passo: 30 },
      unidades: { chassi: { cor: 'cinza', funcao: 'segura tudo' } },
      simetrico: { eixo: 'x', pos: 0 },
      plano: { pecas: [{ nome: 'rodas', formas: ['roda*'] }, { nome: 'estrutura', formas: ['barra', 'garfoE'] }, { nome: 'só da B', formas: ['solta'], opcoes: ['B'] }] },
      opcoes: [{
        titulo: 'A',
        formas: [
          caixa('barra', { unidade: 'chassi', centro: [0, 0, 0] }),
          caixa('rodaD', { lado: 'D', centro: [50, 0, 0] }),
          caixa('rodaE', { lado: 'E', centro: [-50, 0, 0] }),
          { usa: 'garfo', id: 'garfoE', de: [-100, 100, 300], para: [-100, 400, 380], unidade: 'frente' },
          caixa('pino', { centro: [0, 100, 0] }),
          { arranja: { forma: 'pino', modo: 'linear', total: 3, passo: [0, 'passo', 0] } },
          caixa('solta', { centro: [0, 300, 0] }),
        ],
      }, { titulo: 'B', formas: [caixa('solta', { centro: [0, 300, 0] })] }],
    });
    const f = Object.fromEntries(e.formas.map((x) => [x.id, x]));
    expect(f.barra).toMatchObject({ unidade: 'chassi', parte: 'estrutura', origem: null });
    expect(f.rodaD.parte).toBe('rodas');
    expect(f.rodaE.parte).toBe('rodas');
    expect(f.rodaD.origem).toBeNull();
    expect(f.pino).toMatchObject({ unidade: null, parte: null });
    expect(f.pino1.origem).toEqual({ arranjo: { fonte: 'pino', modo: 'linear', indice: 1, total: 3, passo: [0, 30, 0] } });
    expect(f.pino2.geometria.centro).toEqual([0, 160, 0]);
    expect(f['garfoE.perna'].origem.componente).toMatchObject({ instancia: 'garfoE', usa: 'garfo' });
    expect(f['garfoE.perna'].parte).toBe('estrutura');
    expect(f['garfoE.perna'].unidade).toBe('frente');
    expect(e.formas.filter((x) => x.origem?.componente).length).toBeGreaterThan(1);
    expect(f.solta.parte).toBeNull();
    expect(e.parametros).toEqual({ passo: 30 });
    /* a partir do espelho implícito de `lado`, a cópia herda a unidade e a parte da fonte */
    expect(f.rodaE.origem).toBeNull();
    const b = formasResolvidas({ plano: { pecas: [{ nome: 'só da B', formas: ['solta'], opcoes: ['B'] }] }, opcoes: [{ titulo: 'A', formas: [caixa('solta')] }, { titulo: 'B', formas: [caixa('solta')] }] }, 'B');
    expect(b.opcao).toEqual({ numero: 2, titulo: 'B' });
    expect(b.formas[0].parte).toBe('só da B');
    expect(formasResolvidas({ plano: { pecas: [{ nome: 'só da B', formas: ['solta'], opcoes: ['B'] }] }, opcoes: [{ titulo: 'A', formas: [caixa('solta')] }, { titulo: 'B', formas: [caixa('solta')] }] }, 1).formas[0].parte).toBeNull();
  });

  it('o espelho implícito de `lado` e a instância espelhada levam a origem de espelho', () => {
    const e = formasResolvidas({
      simetrico: { eixo: 'x', pos: 0 },
      opcoes: [{ formas: [caixa('rodaD', { lado: 'D', centro: [50, 0, 0], unidade: 'rodas' })] }],
    });
    expect(e.formas.map((f) => f.id)).toEqual(['rodaD', 'rodaE']);
    expect(e.formas[1].origem).toEqual({ espelho: { forma: 'rodaD', eixo: 'x', pos: 0 } });
    expect(e.formas[1].unidade).toBe('rodas');
    expect(e.formas[1].geometria.centro).toEqual([-50, 0, 0]);
  });

  it('o loft e a revolução `suave` saem com as seções declaradas e com as estações da curva, e o dado continua puro', () => {
    const e = formasResolvidas({
      opcoes: [{
        formas: [
          { id: 'barriga', tipo: 'loft', eixo: 'z', suave: true, secoes: [{ pos: 0, forma: 'elipse', tamanho: [200, 160], nome: 'bico' }, { pos: 300, forma: 'elipse', tamanho: [520, 420] }, { pos: 700, forma: 'elipse', tamanho: [800, 600] }, { pos: 1200, forma: 'elipse', tamanho: [500, 400] }] },
          { id: 'bojo', tipo: 'revolucao', eixo: 'z', suave: true, lados: 48, perfil: [[0, 0], [60, 54], [100, 104], [125, 154], [150, 204], [190, 400]] },
          { id: 'reto', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'elipse', tamanho: [200, 160] }, { pos: 300, forma: 'elipse', tamanho: [520, 420] }] },
        ],
      }],
    });
    const [loft, revolucao, reto] = e.formas.map((f) => f.geometria);
    expect(loft.suave).toBe(true);
    expect(loft.secoes).toHaveLength(4);
    expect(loft.secoes[0].nome).toBe('bico');
    expect(loft.estacoes.length).toBeGreaterThan(loft.secoes.length);
    expect(loft.estacoes.map((s) => s.w)).toEqual([...loft.estacoes.map((s) => s.w)].sort((a, b) => a - b));
    for (const s of loft.secoes) expect(loft.estacoes.some((t) => Math.abs(t.w - s.w) < 1e-6), `a seção declarada em ${s.w} é uma estação`).toBe(true);
    expect(revolucao.perfil).toHaveLength(6);
    expect(revolucao.estacoes.length).toBeGreaterThan(revolucao.perfil.length);
    expect(revolucao.estacoes[0]).toEqual({ raio: expect.any(Number), altura: expect.any(Number) });
    expect(reto.estacoes).toBeUndefined();
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
  });

  it('as formas ocultas saem com `oculto: true`', () => {
    const e = formasResolvidas({ opcoes: [{ formas: [caixa('a'), caixa('b', { oculto: true, centro: [20, 0, 0] })] }] });
    expect(e.formas.map((f) => f.oculto)).toEqual([false, true]);
  });
});

describe('formas resolvidas: erros', () => {
  it('recusa opção inexistente e esboço sem opções, com ErroDeEsboco', () => {
    const e = { opcoes: [{ titulo: 'A', formas: [caixa('a')] }] };
    expect(() => formasResolvidas(e, 2)).toThrow(ErroDeEsboco);
    expect(() => formasResolvidas(e, 'Z')).toThrow(/"Z" não existe/);
    expect(() => formasResolvidas(e, 0)).toThrow(ErroDeEsboco);
    expect(() => formasResolvidas({}, 1)).toThrow(ErroDeEsboco);
  });

  it('o formato versionado está descrito no README do módulo', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    expect(readme.includes(FORMATO_DAS_FORMAS)).toBe(true);
  });
});
