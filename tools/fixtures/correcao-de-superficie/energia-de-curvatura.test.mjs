/* energia-de-curvatura.test.mjs — as provas do protótipo da etapa A do degrau 3 (fatia 5 do plano das ferramentas de correção de
 * superfície), `energia-de-curvatura.mjs`: o estêncil do anel 3×3 contra o oráculo da superfície limite, a energia nula na quadrática, a
 * calibração da onda, e o efeito medido sobre a crista de curvatura das curvas exatas, sem mudar o núcleo. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { limitesDaGaiola, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { definicaoAnalitica } from './chapas.mjs';
import { ajustarComEnergia, energiaDaGaiola, estenceisDoAnel, provaDaRede, provaDasAnaliticas, provaDasEmendas, termosDaEnergia, topologiaRegular } from './energia-de-curvatura.mjs';

/* a grade plana de nx por nz vértices de passo h, com a altura y = f(x, z) */
const grade = (nx, nz, h, f) => {
  const vertices = []; const faces = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) vertices.push([i * h, f(i * h, j * h), j * h]);
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i; faces.push([a, a + nx, a + nx + 1, a + 1]); }
  return { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
};

describe('a energia de variação de curvatura (protótipo fora do núcleo)', () => {
  it('o estêncil do anel 3×3 dá as derivadas segundas do oráculo no vértice regular, a 1e-12', () => {
    const g = gaiolaPorRede(definicaoAnalitica('toro'));
    const r = gaiolaDoPasso(g.passo, { vec: (p) => g.pontos[p], num: Number });
    const gaiola = { ...r.gaiola, borda: 'suave' }; const P = gaiola.vertices;
    const T = topologiaRegular(gaiola); const sup = superficieLimite(gaiola);
    const aplicar = (linha) => { const s = [0, 0, 0]; for (const [j, w] of linha) for (let x = 0; x < 3; x++) s[x] += w * P[j][x]; return s; };
    let conferidos = 0, pior = 0;
    gaiola.faces.forEach((f, fi) => {
      if (!T.regular(f[0])) return;
      /* no canto 0 da face, u vai para f[1] e v para f[3], o seguinte de f[1] na volta do vértice */
      const k = T.vizinhos(f[0]).indexOf(f[1]);
      const anel = T.anel(f[0], k);
      expect(anel[2][1]).toBe(f[1]); expect(anel[1][2]).toBe(f[3]); expect(anel[2][2]).toBe(f[2]);
      const e = estenceisDoAnel(anel); const a = sup.avaliar(fi, 0, 0);
      for (const [linha, d] of [[e.uu, a.duu], [e.uv, a.duv], [e.vv, a.dvv]]) { const s = aplicar(linha); for (let x = 0; x < 3; x++) pior = Math.max(pior, Math.abs(s[x] - d[x])); }
      conferidos++;
    });
    expect(conferidos).toBe(gaiola.faces.filter((f) => T.regular(f[0])).length);
    expect(conferidos).toBeGreaterThan(280);
    expect(pior).toBeLessThan(1e-12);
  });

  it('a energia é nula na quadrática em grade uniforme, positiva na cúbica, e só tem termo entre vértices regulares', () => {
    const quadratica = grade(9, 8, 0.03, (x, z) => 0.7 * x * x - 1.3 * x * z + 0.4 * z * z + 0.2 * x - 0.1);
    /* os comprimentos são os da gaiola declarada, congelados: com a grade plana declarada (comprimentos iguais), toda quadrática no
       parâmetro tem energia nula. Com os comprimentos tirados da própria quadrática inclinada eles deixam de ser iguais, e a energia
       dela sai pequena e não nula (o limite do parâmetro por comprimento de aresta, que fica para a etapa B) */
    const termos = termosDaEnergia(grade(9, 8, 0.03, () => 0), 0.12);
    /* as arestas entre os 7 por 6 vértices de dentro: 6 × 6 numa direção e 7 × 5 na outra */
    expect(termos).toHaveLength(6 * 6 + 7 * 5);
    const cubica = energiaDaGaiola(termos, grade(9, 8, 0.03, (x) => 5 * x * x * x).vertices);
    expect(cubica).toBeGreaterThan(1e-6);
    expect(energiaDaGaiola(termos, quadratica.vertices)).toBeLessThan(1e-20 * cubica);
    const naPropria = energiaDaGaiola(termosDaEnergia(quadratica, 0.12), quadratica.vertices);
    expect(naPropria).toBeGreaterThan(0); expect(naPropria).toBeLessThan(0.01 * cubica);
    /* o vinco e o canto tiram o termo dos vértices que tocam */
    const comVinco = { ...quadratica, vincos: [[3 * 9 + 3, 3 * 9 + 4, 2]], cantos: [5 * 9 + 6] };
    const T = topologiaRegular(comVinco);
    expect(T.regular(3 * 9 + 3)).toBe(false); expect(T.regular(3 * 9 + 4)).toBe(false); expect(T.regular(5 * 9 + 6)).toBe(false);
    expect(T.regular(2 * 9 + 2)).toBe(true); expect(T.regular(0)).toBe(false); expect(T.regular(4)).toBe(false);
  });

  it('a calibração: a senoide de comprimento `onda` cotada com peso 1 sai com perto de metade da amplitude', () => {
    const razao = (arestasPorOnda) => {
      const h = 0.025; const onda = arestasPorOnda * h; const nx = 6 * arestasPorOnda + 1; const nz = 9;
      const g = grade(nx, nz, h, (x) => 0.001 * Math.sin((2 * Math.PI * x) / onda));
      const medidas = g.vertices.map((_, indice) => ({ indice, peso: 1 }));
      const { vertices } = ajustarComEnergia(g, medidas, { onda });
      const L = limitesDaGaiola({ ...g, vertices });
      let num = 0, den = 0;
      /* as duas ondas do meio, na fileira do meio */
      for (let i = 2 * arestasPorOnda; i <= 4 * arestasPorOnda; i++) { const k = 4 * nx + i; num += L[k][1] * g.vertices[k][1]; den += g.vertices[k][1] ** 2; }
      return num / den;
    };
    const quatro = razao(4), oito = razao(8);
    expect(quatro).toBeGreaterThan(0.4); expect(quatro).toBeLessThan(0.5);
    expect(oito).toBeGreaterThan(0.47); expect(oito).toBeLessThan(0.53);
  });

  it('no paraboloide, a crista de curvatura das curvas de dentro cai de mais de 1 1/m para menos de 0,05, com as cotas exatas no lugar', () => {
    const [p] = provaDasAnaliticas({}, ['paraboloide']);
    for (const c of p.hoje.cristaPontual) expect(c.maxima, c.nome).toBeGreaterThan(1);
    for (const c of p.prototipo.cristaPontual) { expect(c.vertices, c.nome).toBeGreaterThanOrEqual(8); expect(c.maxima, c.nome).toBeLessThan(0.05); }
    /* a chapa inteira é a ponta das curvas exatas, igual nas duas; longe da borda o protótipo segue a cota do miolo, que está a 0,2 mm */
    expect(p.prototipo.a100Mm).toBeLessThan(0.25);
  });

  it('na emenda-g1 a crista some sem a superfície se afastar da desenhada mais que hoje', () => {
    const [e] = provaDasEmendas({}, ['emenda-g1']);
    expect(e.hoje.cristaPontual.maxima).toBeGreaterThan(0.3);
    expect(e.prototipo.cristaPontual.maxima).toBeLessThan(0.05);
    expect(e.prototipo.distanciaJuntoMm).toBeLessThanOrEqual(e.hoje.distanciaJuntoMm);
    expect(e.prototipo.distanciaMm).toBeLessThanOrEqual(e.hoje.distanciaMm);
    expect(e.prototipo.salto).toBeLessThan(1e-12);
  });
});

/* A ETAPA B: a energia no núcleo, pela opção `alisarSuperficie` da `gaiolaPorRede` (o passo sai com `regularizacao`). A coluna `nucleo` das
 * provas é a rede com a opção ligada, montada pelo passo `subdivisao`; `hoje` é a mesma rede sem a opção. O gate é o da decisão da pessoa
 * de 2026-11-18: a crista por ponto abaixo de 0,05 1/m fora dos cruzamentos e a distância a mais de 100 mm da borda nunca pior que hoje.
 * As `CONHECIDAS` de `analiticas.test.mjs` são do gate antigo e não mudam. */
const CRISTA_MAXIMA = 0.05;

describe('a opção alisarSuperficie no núcleo (etapa B)', () => {
  it('nas analíticas, a distância a 100 mm da borda não piora e a crista do paraboloide e da calota fica abaixo de 0,05 1/m', () => {
    const provas = provaDasAnaliticas();
    expect(provas.map((p) => p.superficie)).toEqual(['paraboloide', 'calota', 'toro']);
    for (const p of provas) {
      expect(p.nucleo.a100Mm, `${p.superficie} a 100 mm da borda`).toBeLessThanOrEqual(p.hoje.a100Mm);
      expect(p.nucleo.distanciaMm, `${p.superficie} na chapa inteira`).toBeLessThanOrEqual(p.hoje.distanciaMm);
      for (const c of p.nucleo.cristaPontual) expect(c.vertices, `${p.superficie} ${c.nome}`).toBeGreaterThanOrEqual(8);
    }
    for (const p of provas.filter((x) => x.superficie !== 'toro')) for (const c of p.nucleo.cristaPontual) expect(c.maxima, `${p.superficie} ${c.nome}`).toBeLessThan(CRISTA_MAXIMA);
    /* CONHECIDA: no toro com 8 trechos de ponto-chave por curva a crista NÃO cabe em 0,05 (0,155 na h1 e 0,126 na v1, nos vértices
       vizinhos do cruzamento, e até 0,10 nos outros da v1). A causa está fora do ajuste: entre os pontos-chave a curva declarada fica a
       0,021 mm do toro, é cota exata, e a superfície passa por ela (com 16 trechos, o teste seguinte, a crista cabe). A catraca cobra que
       não piore, e falha quando passar a caber, para a marca sair. */
    const toro = provas.find((x) => x.superficie === 'toro').nucleo.cristaPontual;
    const conhecida = { h1: 0.1545, v1: 0.1264 };
    for (const c of toro) {
      expect(c.maxima, `toro ${c.nome} passou a caber em 0,05: tire a marca`).toBeGreaterThanOrEqual(CRISTA_MAXIMA);
      expect(c.maxima, `toro ${c.nome} piorou`).toBeLessThanOrEqual(conhecida[c.nome] * 1.02 + 0.001);
    }
  });

  it('no toro com as curvas na superfície (um ponto-chave por ponto da gaiola), a crista fica abaixo de 0,05 também no cruzamento', () => {
    const [p] = provaDasAnaliticas({ definicao: { pontos: 16 } }, ['toro']);
    for (const c of p.hoje.cristaPontual) expect(c.maxima, c.nome).toBeGreaterThan(1);
    for (const c of p.nucleo.cristaPontual) {
      expect(c.vertices, c.nome).toBeGreaterThanOrEqual(8);
      expect(c.maxima, c.nome).toBeLessThan(CRISTA_MAXIMA);
      expect(c.noCruzamento, c.nome).toBeLessThan(CRISTA_MAXIMA);
    }
    expect(p.nucleo.a100Mm).toBeLessThanOrEqual(p.hoje.a100Mm);
    expect(p.nucleo.distanciaMm).toBeLessThanOrEqual(p.hoje.distanciaMm);
  });

  it('nas analíticas assimétricas (o cruzamento fora do centro), a 100 mm da borda: o paraboloide e o toro não pioram, e a calota é CONHECIDA', () => {
    /* CONHECIDA, e é o que impede o uso da opção em receita: no retalho grande de dupla curvatura o preenchimento sem alisar fica a mais
       de 1 mm da calota, e a cota de peso 0,003 segura essa forma longa (o peso p vale no comprimento onda/p^(1/6), umas dez arestas, e
       o retalho tem doze ou mais). Com 1e-4 as três passam aqui, e com 3e-5 ou 3e-4 uma delas volta a piorar: não há peso que feche.
       A catraca cobra que a calota não piore além do medido, e falha quando ela passar a caber, para a marca sair. */
    const conhecidas = { '0.25,0.25': 1.1188, '0.3,0.5': 0.3727 };
    for (const meio of [[0.25, 0.25], [0.3, 0.5]]) {
      const provas = Object.fromEntries(provaDasAnaliticas({ definicao: { meio } }).map((p) => [p.superficie, p]));
      for (const nome of ['paraboloide', 'toro']) expect(provas[nome].nucleo.a100Mm, `${nome} com o meio em ${meio}`).toBeLessThanOrEqual(provas[nome].hoje.a100Mm);
      const { hoje, nucleo } = provas.calota;
      expect(nucleo.a100Mm, `a calota com o meio em ${meio} passou a caber: tire a marca`).toBeGreaterThan(hoje.a100Mm);
      expect(nucleo.a100Mm, `a calota com o meio em ${meio} piorou`).toBeLessThanOrEqual(conhecidas[String(meio)] * 1.02 + 0.001);
    }
  });

  it('nas chapas emendadas, a rampa e a crista caem e a superfície não se afasta da desenhada mais que hoje', () => {
    const provas = Object.fromEntries(provaDasEmendas().map((e) => [e.chapa, e]));
    /* os tetos são a medida de 2026-11-19 com 2% de folga. A etapa A dava, com o miolo de peso 1 sobre o preenchimento alisado, a rampa
       0,056, 4,2 e 9,0 e a crista 0,002, 0,061 e 0,004: a emenda-dupla e a emenda-g1 ficam com a rampa um pouco acima da etapa A (4,56 e
       9,99) e a emenda-dupla com a crista em 0,066, e todas muito abaixo de hoje (6,6, 41,2 e 25,7; 0,20, 1,19 e 0,40) */
    const tetos = { 'emenda-g2': { inclinacao: 0.05, crista: 0.0014 }, 'emenda-dupla': { inclinacao: 4.56, crista: 0.0659 }, 'emenda-g1': { inclinacao: 9.985, crista: 0.0031 } };
    for (const [nome, teto] of Object.entries(tetos)) {
      const { hoje, nucleo } = provas[nome];
      expect(nucleo.inclinacao, `${nome} rampa`).toBeLessThanOrEqual(teto.inclinacao * 1.02);
      expect(nucleo.inclinacao, `${nome} rampa contra hoje`).toBeLessThan(0.4 * hoje.inclinacao);
      expect(nucleo.cristaPontual.maxima, `${nome} crista`).toBeLessThanOrEqual(teto.crista * 1.02 + 0.0005);
      expect(nucleo.distanciaJuntoMm, `${nome} junto da emenda`).toBeLessThanOrEqual(hoje.distanciaJuntoMm);
      expect(nucleo.distanciaMm, `${nome} na chapa`).toBeLessThanOrEqual(hoje.distanciaMm);
      expect(nucleo.salto, `${nome} salto`).toBeLessThan(1e-12);
    }
    /* a chapa de duas curvaturas fica mais perto da desenhada que hoje e que a etapa A (1,11 e 1,19 mm), porque o miolo deixa de passar
       pelo alisamento pela normal */
    expect(provas['emenda-g1'].nucleo.distanciaMm).toBeLessThan(0.55);
    expect(provas['emenda-g1'].nucleo.cristaPontual.maxima).toBeLessThan(CRISTA_MAXIMA);
    expect(provas['emenda-g2'].nucleo.cristaPontual.maxima).toBeLessThan(CRISTA_MAXIMA);
  });

  it('na rede-sem-ruido, as viradas, a energia de variação e a distância ao painel não pioram contra a etapa A', () => {
    const { hoje, nucleo } = provaDaRede();
    /* os números do protótipo da etapa A (miolo de peso 1): as viradas por metro, a energia de variação e a distância ao painel */
    const etapaA = { viradasPorM: { miolo: 5.511, curva: 11.765, singular: 8.133, borda: 4.031 }, energia: { miolo: 830.754, curva: 324.435 }, distanciaMm: 3.5496 };
    for (const [classe, v] of Object.entries(etapaA.viradasPorM)) expect(nucleo.viradasPorM[classe], `viradas ${classe}`).toBeLessThanOrEqual(v);
    for (const [classe, v] of Object.entries(etapaA.energia)) expect(nucleo.energia[classe], `energia ${classe}`).toBeLessThanOrEqual(v);
    expect(nucleo.distanciaMm).toBeLessThanOrEqual(etapaA.distanciaMm);
    expect(nucleo.distanciaMm).toBeLessThan(0.5 * hoje.distanciaMm);
  });

  it('a rede sem a opção é a de sempre, e a opção recusa liso e continuidade juntos', () => {
    const base = definicaoAnalitica('paraboloide');
    const sem = gaiolaPorRede(base);
    expect(Object.hasOwn(sem.passo, 'regularizacao')).toBe(false);
    expect(sem.passo.medidas.filter((m) => typeof m === 'object').every((m) => m.peso === 1)).toBe(true);
    expect(gaiolaPorRede({ ...base, alisarSuperficie: false }).passo).toEqual(sem.passo);
    const com = gaiolaPorRede({ ...base, alisarSuperficie: true });
    expect(com.passo.regularizacao).toEqual({ tipo: 'variacaoDeCurvatura' });
    expect(com.alisamento).toBe(null);
    /* o miolo fica como o preenchimento o pôs (o da rede com liso: false), com a cota de peso 0,003 */
    const cotasDoMiolo = com.passo.medidas.filter((m) => typeof m === 'object');
    expect(cotasDoMiolo.length).toBe(sem.passo.medidas.filter((m) => typeof m === 'object').length);
    expect(cotasDoMiolo.every((m) => m.peso === 0.003)).toBe(true);
    expect(com.pontos).toEqual(gaiolaPorRede({ ...base, liso: false }).pontos);
    expect(gaiolaPorRede({ ...base, alisarSuperficie: { onda: 200 } }).passo.regularizacao).toEqual({ tipo: 'variacaoDeCurvatura', onda: 0.2 });
    expect(gaiolaPorRede({ ...base, alisarSuperficie: true, liso: false }).passo).toEqual(com.passo);
    const comPeso = gaiolaPorRede({ ...base, alisarSuperficie: true, interior: 0.5 });
    expect(comPeso.passo.medidas.filter((m) => typeof m === 'object').every((m) => m.peso === 0.5)).toBe(true);
    /* sem a cota do miolo a energia tem liberdade que as curvas não tiram: a combinação é recusada */
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: true, interior: false })).toThrow(/alisarSuperficie e interior: false foram declarados juntos.*o padrão com alisarSuperficie é 0,003/);
    /* a onda fora de 2 a 64 passos da gaiola (o passo desta rede é 23,1 mm) é recusada com o valor, a faixa e o passo */
    for (const onda of [0.2, 40, 2000, 20000]) expect(() => gaiolaPorRede({ ...base, alisarSuperficie: { onda } }), `onda ${onda}`).toThrow(/alisarSuperficie\.onda é [\d,]+ mm, fora da faixa de 46,\d+ a 14\d\d,?\d* mm: de 2 a 64 passos da gaiola, cujo passo \(a mediana das arestas\) é 23,\d+ mm/);
    expect(gaiolaPorRede({ ...base, alisarSuperficie: { onda: 50 } }).passo.regularizacao.onda).toBe(0.05);
    expect(gaiolaPorRede({ ...base, alisarSuperficie: { onda: 1400 } }).passo.regularizacao.onda).toBe(1.4);
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: true, liso: true })).toThrow(/alisarSuperficie e liso: true foram declarados juntos/);
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: true, liso: { iteracoes: 3 } })).toThrow(/alisarSuperficie e liso/);
    expect(() => gaiolaPorRede({ ...definicaoAnalitica('paraboloide', { continuidade: 'G1' }), alisarSuperficie: true })).toThrow(/alisarSuperficie e a continuidade 'G1' da curva 'h1'/);
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: { onda: 0 } })).toThrow(/alisarSuperficie\.onda é 0/);
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: { peso: 1 } })).toThrow(/alisarSuperficie/);
    expect(() => gaiolaPorRede({ ...base, alisarSuperficie: 'sim' })).toThrow(/alisarSuperficie é "sim"/);
  });
});
