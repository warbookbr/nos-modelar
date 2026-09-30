/* Formas curvas: extrusão de perfil côncavo, loft por seções e revolução por perfil, em desenho (ordem das faces medida
   por lançamento de raios), âncoras, gate de contato por partes convexas, espelho, arranjo, parâmetros, projeção,
   leitura em texto e ajuste, e a moto de prova com tanque, banco, carenagem e farol curvos. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ancorasDe, desenharEsboco, ErroDeEsboco, fatiarForma, resolverOpcao, VISTAS } from '../src/index.js';
import { decomporConvexo, medirPar, pecasDe, verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { ajustarEsboco } from '../src/ajustar.js';
import { medirProjecaoDaOpcao } from '../src/projecao.js';
import { expandirEsboco } from '../src/expandir.js';

const pasta = new URL('./fixtures/', import.meta.url);
const fixture = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));
const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const medir = (formas, a, b) => { const r = resolver(formas); return medirPar(pecasDe(r[a]), pecasDe(r[b])); };
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);
const recusa = (formas, trecho) => {
  expect(() => resolverOpcao({ formas })).toThrow(ErroDeEsboco);
  expect(() => resolverOpcao({ formas })).toThrow(trecho);
};
const area = (poli) => Math.abs(poli.reduce((acc, q, i) => acc + q[0] * poli[(i + 1) % poli.length][1] - poli[(i + 1) % poli.length][0] * q[1], 0)) / 2;

/* U de 100 x 100 com vão de 40 x 70: área 7200 mm2, contra 10000 do casco convexo. */
const PERFIL_U = [[0, 0], [100, 0], [100, 100], [70, 100], [70, 30], [30, 30], [30, 100], [0, 100]];
const U = (extra = {}) => ({ id: 'u', tipo: 'extrusao', perfil: PERFIL_U, comprimento: 40, eixo: 'z', centro: [0, 0, 0], ...extra });

/* Ordem de desenho medida: sorteia pontos da tela, lança o raio contra as faces planas e confere que, entre as faces
   que cobrem o ponto, a última a ser pintada (fatia, depois face) é a mais próxima do observador. Devolve os erros e o
   total de pontos em que duas ou mais faces se cobrem com profundidades distintas. */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const n = Math.hypot(...v); return v.map((c) => c / n); };
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const noPoligono = (p, poli) => {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i]; const [xj, yj] = poli[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};
function medirOrdem(r, olho, amostras = 4000, invertida = false) {
  const S = unit(cruz(olho, Math.abs(olho[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const T = cruz(olho, S);
  const planos = [];
  fatiarForma(r, olho).forEach((ch, ci) => {
    [...ch.dentro, ...ch.lados].forEach((f, k) => planos.push({ f, ordem: ci * 1e6 + k }));
    ch.tampas.forEach((f, k) => planos.push({ f, ordem: ci * 1e6 + 5e5 + k }));
  });
  const dados = planos.map(({ f, ordem }) => {
    const [a, b, c] = f.pts;
    const n = unit(cruz([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
    return { q: f.pts.map((p) => [dot(p, S), dot(p, T)]), n, p0: a, ordem };
  });
  const todos = dados.flatMap((d) => d.q);
  const lo = [Math.min(...todos.map((p) => p[0])), Math.min(...todos.map((p) => p[1]))];
  const hi = [Math.max(...todos.map((p) => p[0])), Math.max(...todos.map((p) => p[1]))];
  let semente = 12345;
  const sorteio = () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; };
  let erros = 0; let total = 0;
  for (let k = 0; k < amostras; k++) {
    const pt = [lo[0] + sorteio() * (hi[0] - lo[0]), lo[1] + sorteio() * (hi[1] - lo[1])];
    const cobrem = [];
    for (const d of dados) {
      if (!noPoligono(pt, d.q)) continue;
      const den = dot(d.n, olho);
      if (Math.abs(den) < 1e-9) continue;
      cobrem.push({ lam: (dot(d.n, d.p0) - pt[0] * dot(d.n, S) - pt[1] * dot(d.n, T)) / den, ordem: d.ordem });
    }
    if (cobrem.length < 2) continue;
    cobrem.sort((a, b) => b.lam - a.lam);
    if (cobrem[0].lam - cobrem[1].lam < 1e-6) continue;
    total++;
    if (cobrem.reduce((m, c) => ((invertida ? c.ordem < m.ordem : c.ordem > m.ordem) ? c : m)) !== cobrem[0]) erros++;
  }
  return { erros, total };
}
const ordemNasVistas = (forma) => Object.values(VISTAS).map((v) => medirOrdem(resolver([forma])[forma.id], unit(v.olho)));

describe('extrusão de perfil côncavo', () => {
  it('aceita o perfil côncavo, centra na caixa do perfil e tem as âncoras da extrusão', () => {
    const { u } = resolver([U({ centro: [10, 60, 5] })]);
    expect(extensao(u)).toEqual([100, 100, 40]);
    perto(u.min, [-40, 10, -15]);
    const a = ancorasDe(u);
    perto(a.inicio, [10, 60, -15]);
    perto(a.fim, [10, 60, 25]);
    expect(Object.keys(a)).toEqual(['centro', 'inicio', 'fim', '+x', '-x', '+y', '-y', '+z', '-z']);
  });

  it('aceita o perfil escrito nos dois sentidos, e o convexo continua igual', () => {
    const a = resolver([U()]).u;
    const b = resolver([U({ perfil: [...PERFIL_U].reverse() })]).u;
    expect(b.min).toEqual(a.min);
    expect(pecasDe(b)).toHaveLength(pecasDe(a).length);
    const cunha = resolver([{ id: 'c', tipo: 'extrusao', perfil: [[0, 0], [100, 0], [0, 100]], comprimento: 20, eixo: 'z' }]).c;
    expect(cunha.prisma.naoConvexo).toBeUndefined();
    expect(pecasDe(cunha)).toHaveLength(1);
  });

  it('recusa o perfil que se cruza, que repete ponto ou que tem área nula', () => {
    recusa([U({ perfil: [[0, 0], [100, 100], [100, 0], [0, 100]] })], /polígono simples/);
    recusa([U({ perfil: [[0, 0], [100, 0], [100, 0], [100, 100]] })], /polígono simples/);
    recusa([U({ perfil: [[0, 0], [50, 0], [100, 0]] })], /polígono simples/);
    recusa([U({ perfil: [[0, 0], [100, 0]] })], /extrusao precisa de "perfil"/);
  });

  it('a decomposição em partes convexas cobre exatamente a área do perfil, sem sobrepor', () => {
    const partes = decomporConvexo(PERFIL_U);
    expect(partes.length).toBeGreaterThanOrEqual(3);
    expect(partes.reduce((s, p) => s + area(p), 0)).toBeCloseTo(7200, 6);
    for (const p of partes) expect(area(p)).toBeGreaterThan(1);
    /* um W (dois entalhes) e uma estrela de sete pontas também fecham a conta */
    const w = [[0, 0], [120, 0], [120, 80], [90, 30], [60, 80], [30, 30], [0, 80]];
    expect(decomporConvexo(w).reduce((s, p) => s + area(p), 0)).toBeCloseTo(area(w), 6);
    const estrela = Array.from({ length: 14 }, (_, i) => { const r = i % 2 ? 40 : 100; const a = (Math.PI * i) / 7; return [r * Math.cos(a), r * Math.sin(a)]; });
    expect(decomporConvexo(estrela).reduce((s, p) => s + area(p), 0)).toBeCloseTo(area(estrela), 6);
  });

  it('o gate mede o vão de verdade: um cubo dentro do vão tem folga, e um que entra nos braços penetra', () => {
    const livre = medir([U(), caixa('c', [0, 15, 0], 20, 20, 20)], 'u', 'c');
    expect(livre.folga).toBeCloseTo(10, 6);
    expect(livre.penetracao).toBe(0);
    const preso = medir([U(), caixa('c', [0, 15, 0], 60, 20, 20)], 'u', 'c');
    expect(preso.folga).toBe(0);
    expect(preso.penetracao).toBeCloseTo(10, 6);
  });

  it('a silhueta na vista do perfil é a área do perfil, e não a do casco convexo', () => {
    const r = resolverOpcao({ formas: [U()] });
    const m = medirProjecaoDaOpcao(r, 'frontal');
    expect(m.areas.u / 7200).toBeGreaterThan(0.95);
    expect(m.areas.u / 7200).toBeLessThan(1.05);
  });

  it('o desenho ordena as faces do fundo para a frente em todas as vistas, com o sólido girado', () => {
    for (const rotacao of [undefined, [35, 25, 0], [-20, 60, 15]]) {
      const medidas = ordemNasVistas(U({ eixo: 'y', rotacao }));
      expect(medidas.reduce((s, m) => s + m.total, 0)).toBeGreaterThan(20);
      for (const m of medidas) expect(m.erros).toBe(0);
    }
  });

  it('a medida da ordem enxerga o erro: com a ordem invertida todos os pontos falham', () => {
    const r = resolver([U({ eixo: 'y', rotacao: [35, 25, 0] })]).u;
    const olho = unit(VISTAS.frontal.olho);
    const certa = medirOrdem(r, olho);
    const errada = medirOrdem(r, olho, 4000, true);
    expect(certa.total).toBeGreaterThan(50);
    expect(certa.erros).toBe(0);
    expect(errada.erros).toBe(errada.total);
  });

  it('espelha, arranja e ajusta como qualquer forma', () => {
    const e = { opcoes: [{ titulo: 'T', formas: [U(), { id: 'v', espelha: { forma: 'u', eixo: 'x', pos: 200 } }, { arranja: { forma: 'u', modo: 'linear', total: 3, passo: [0, 0, 100], nomes: ['u2', 'u3'] } }] }] };
    const r = resolver(e.opcoes[0].formas);
    perto(r.v.centro, [400, 0, 0]);
    expect(pecasDe(r.v)).toHaveLength(pecasDe(r.u).length);
    perto(r.u3.centro, [0, 0, 200]);
    const preso = { opcoes: [{ titulo: 'T', formas: [U(), caixa('c', [30, 30, 0], 20, 20, 20)] }], contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 500 } };
    expect(verificarContato(preso).resultado).toBe('reprovado');
    const ajuste = ajustarEsboco(preso);
    expect(ajuste.aprovado).toBe(true);
    expect(verificarContato(ajuste.esboco).resultado).toBe('aprovado');
  });
});

describe('loft por seções', () => {
  const tronco = (extra = {}) => ({ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [100, 60] }, { pos: 100, tamanho: [40, 20] }], centro: [0, 0, 0], ...extra });
  const cintura = (extra = {}) => ({ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [200, 100] }, { pos: 100, tamanho: [60, 100] }, { pos: 200, tamanho: [200, 100] }], centro: [0, 0, 0], ...extra });

  it('dois retângulos dão um tronco: caixa da maior seção, comprimento pela posição e centro na caixa', () => {
    const { l } = resolver([tronco({ centro: [5, 30, -20] })]);
    expect(extensao(l)).toEqual([100, 60, 100]);
    perto(l.min, [-45, 0, -70]);
    expect(l.prisma.secoes).toHaveLength(2);
    expect(l.prisma.secoes[0].perfil).toHaveLength(4);
    expect(pecasDe(l)).toHaveLength(1);
  });

  it('a seção pode ser deslocada no plano, e as âncoras inicio, fim e nomeadas seguem os centros das seções', () => {
    const f = { id: 'l', tipo: 'loft', eixo: 'z', centro: [0, 100, 0], secoes: [{ pos: 0, tamanho: [100, 60], centro: [0, -20], nome: 'tras' }, { pos: 100, tamanho: [80, 50], nome: 'meio' }, { pos: 300, tamanho: [40, 30], centro: [0, 30], nome: 'nariz' }] };
    const { l } = resolver([f]);
    /* a caixa vai de y -50 a 45 (a seção de trás e a do nariz esticam a altura), então o centro da caixa é o de y -2,5 */
    expect(l.max[1] - l.min[1]).toBeCloseTo(95, 6);
    const a = ancorasDe(l);
    perto(a.centro, [0, 100, 0]);
    perto(a.inicio, [0, 100 - 20 + 2.5, -150]);
    perto(a.tras, a.inicio);
    perto(a.meio, [0, 102.5, -50]);
    perto(a.fim, [0, 100 + 30 + 2.5, 150]);
    perto(a.nariz, a.fim);
    expect(Object.keys(a)).toEqual(['centro', 'inicio', 'fim', 'tras', 'meio', 'nariz', '+x', '-x', '+y', '-y', '+z', '-z']);
  });

  it('uma âncora nomeada é referência de posição e o espelho leva as âncoras junto', () => {
    const f = { id: 'l', tipo: 'loft', eixo: 'z', centro: [100, 0, 0], secoes: [{ pos: 0, tamanho: [40, 40], nome: 'tras' }, { pos: 100, tamanho: [20, 20], nome: 'bico' }] };
    const r = resolver([f, caixa('c', 'l.bico', 10, 10, 10), { id: 'm', espelha: { forma: 'l', eixo: 'x' } }, caixa('d', 'm.bico', 10, 10, 10)]);
    perto(r.c.centro, [100, 0, 50]);
    perto(r.d.centro, [-100, 0, 50]);
    recusa([f, caixa('c', 'l.nariz', 10, 10, 10)], /não tem a âncora "nariz" \(válidas: centro, inicio, fim, tras, bico, /);
  });

  it('a seção nula fecha a ponta num ponto e o desenho mostra a tampa só na outra ponta', () => {
    const ponta = { id: 'l', tipo: 'loft', eixo: 'y', secoes: [{ pos: 0, tamanho: [80, 80] }, { pos: 60, tamanho: [0, 0] }] };
    const r = resolver([ponta]).l;
    expect(extensao(r)).toEqual([80, 60, 80]);
    expect(pecasDe(r)).toHaveLength(1);
    const svg = desenharEsboco({ vista: 'isometrica', opcoes: [{ titulo: 'T', formas: [ponta] }] }).svg;
    expect(svg).toContain('<path');
    recusa([{ ...ponta, secoes: [{ pos: 0, tamanho: [10, 10] }, { pos: 30, tamanho: [0, 0] }, { pos: 60, tamanho: [20, 20] }] }], /só vale na primeira e na última seção/);
  });

  it('mistura elipse e retângulo por amostragem radial, com 48 pontos em todas as seções', () => {
    const f = { id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'elipse', tamanho: [100, 60] }, { pos: 100, forma: 'retangulo', tamanho: [80, 40] }] };
    const { l } = resolver([f]);
    expect(l.prisma.secoes.map((sc) => sc.perfil.length)).toEqual([48, 48]);
    /* as extremidades dos eixos da elipse e do retângulo caem em ângulos amostrados */
    const xs = l.prisma.secoes[1].perfil.map((q) => q[0]);
    expect(Math.max(...xs)).toBeCloseTo(40, 6);
    const ys = l.prisma.secoes[1].perfil.map((q) => q[1]);
    expect(Math.max(...ys)).toBeCloseTo(20, 6);
  });

  it('aceita polígono convexo por seção, com o mesmo sentido, e o retângulo arredondado', () => {
    const tri = (k) => [[-30 * k, -20 * k], [30 * k, -20 * k], [0, 30 * k]];
    const { l } = resolver([{ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'poligono', perfil: tri(1) }, { pos: 50, forma: 'poligono', perfil: tri(0.5) }] }]);
    expect(l.prisma.secoes[0].perfil).toHaveLength(3);
    const horario = resolver([{ id: 'h', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'poligono', perfil: [...tri(1)].reverse() }, { pos: 50, forma: 'poligono', perfil: [...tri(0.5)].reverse() }] }]).h;
    expect(pecasDe(horario)).toHaveLength(1);
    const arredondado = resolver([{ id: 'a', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: [100, 60], raio: 20 }, { pos: 50, tamanho: [60, 40], raio: 10 }] }]).a;
    expect(arredondado.prisma.secoes[0].perfil).toHaveLength(36);
  });

  it('recusa com o campo e o valor válido: posição fora de ordem, tamanho ausente, forma, campo e nome inválidos', () => {
    recusa([tronco({ secoes: [{ pos: 0, tamanho: [10, 10] }] })], /loft precisa de "secoes"/);
    recusa([tronco({ secoes: [{ pos: 50, tamanho: [10, 10] }, { pos: 20, tamanho: [10, 10] }] })], /secoes\[1\]: "pos" 20 não passa da seção anterior \(50\)/);
    recusa([tronco({ secoes: [{ pos: 0 }, { pos: 20, tamanho: [10, 10] }] })], /secoes\[0\]: falta "tamanho"/);
    recusa([tronco({ secoes: [{ tamanho: [10, 10] }, { pos: 20, tamanho: [10, 10] }] })], /secoes\[0\]: falta "pos"/);
    recusa([tronco({ secoes: [{ pos: 0, forma: 'estrela', tamanho: [10, 10] }, { pos: 20, tamanho: [10, 10] }] })], /"forma" deve ser um de retangulo, elipse, poligono/);
    recusa([tronco({ secoes: [{ pos: 0, tamanho: [10, 10], largura: 3 }, { pos: 20, tamanho: [10, 10] }] })], /a seção não tem o campo "largura"/);
    recusa([tronco({ secoes: [{ pos: 0, tamanho: [10, 0] }, { pos: 20, tamanho: [10, 10] }] })], /tem uma medida nula/);
    recusa([tronco({ secoes: [{ pos: 0, tamanho: [10, 10], nome: 'inicio' }, { pos: 20, tamanho: [10, 10] }] })], /o nome "inicio" já é uma âncora da forma/);
    recusa([tronco({ secoes: [{ pos: 0, tamanho: [10, 10], nome: 'a' }, { pos: 20, tamanho: [10, 10], nome: 'a' }] })], /o nome "a" está repetido/);
    recusa([tronco({ secoes: [{ pos: 0, forma: 'poligono', perfil: [[0, 0], [10, 0], [10, 10], [5, 3], [0, 10]] }, { pos: 20, tamanho: [10, 10] }] })], /precisa ser um polígono convexo/);
    recusa([tronco({ comprimento: 100 })], /retire "comprimento"/);
    recusa([tronco({ de: [0, 0, 0], para: [0, 0, 100] })], /"de"\/"para" valem só em cilindro, caixa e cone/);
    recusa([{ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, forma: 'poligono', perfil: [[0, 0], [10, 0], [0, 10]] }, { pos: 20, forma: 'poligono', perfil: [[0, 0], [0, 10], [10, 0]] }] }], /sentidos opostos/);
  });

  it('o gate mede a cintura por faixa: um cubo ao lado da cintura tem a folga exata, e o casco convexo o engoliria', () => {
    const { folga, penetracao } = medir([cintura(), caixa('c', [60, 0, 0], 20, 20, 20)], 'l', 'c');
    /* distância do canto (50, 90) à reta que vai de (30, 100) a (100, 0), no plano x z */
    const esperada = Math.abs((50 - 30) * 100 + (90 - 100) * 70) / Math.hypot(100, 70);
    expect(folga).toBeCloseTo(esperada, 5);
    expect(penetracao).toBe(0);
    expect(pecasDe(resolver([cintura()]).l)).toHaveLength(2);
    /* dentro do casco de todas as seções (200 de largura) mas fora do sólido, e um cubo que entra na cintura de fato */
    const entra = medir([cintura(), caixa('c', [40, 0, 0], 40, 20, 20)], 'l', 'c');
    expect(entra.folga).toBe(0);
    expect(entra.penetracao).toBeGreaterThan(5);
  });

  it('a caixa do loft e as âncoras não mudam com a rotação da forma', () => {
    const { l } = resolver([tronco({ rotacao: [0, 90, 0] })]);
    expect(extensao(l).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 60, 100]);
    perto(ancorasDe(l).fim, [50, 0, 0]);
  });

  it('o desenho ordena as faces do fundo para a frente em todas as vistas, na cintura girada', () => {
    for (const rotacao of [[20, 30, 10], [-40, 100, 0]]) {
      const medidas = ordemNasVistas(cintura({ rotacao }));
      for (const m of medidas) expect(m.erros).toBe(0);
    }
  });

  it('parâmetros e expressões valem em pos, tamanho, centro, raio e perfil de cada seção', () => {
    const e = { parametros: { c: 200, h: 100 }, opcoes: [{ titulo: 'T', formas: [{ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: ['c', 'h'], raio: '=h/4' }, { pos: '=c/2', tamanho: ['=c/2', 'h'], centro: [0, '=h/10'], raio: 10 }, { pos: 'c', forma: 'poligono', perfil: [[-10, -10], ['h', -10], [0, '=h/2']] }] }] }] };
    expect(() => descreverEsboco(e)).not.toThrow();
    const r = descreverEsboco(e).opcoes[0].formas[0];
    expect(r.extensao[2]).toBe(200);
    const ruim = { opcoes: [{ titulo: 'T', formas: [{ id: 'l', tipo: 'loft', eixo: 'z', secoes: [{ pos: 0, tamanho: ['nada', 10] }, { pos: 10, tamanho: [10, 10] }] }] }] };
    expect(() => descreverEsboco(ruim)).toThrow(/usa o parâmetro "nada", que não existe/);
  });

  it('a leitura em texto descreve o loft', () => {
    const texto = formatarDescricao(descreverEsboco({ opcoes: [{ titulo: 'T', formas: [tronco()] }] }));
    expect(texto).toContain('forma l: loft');
    expect(texto).toContain('loft de 2 seções');
  });
});

describe('revolução por perfil', () => {
  const PARAFUSO = [[0, 0], [50, 0], [50, 20], [20, 20], [20, 100], [0, 100]];
  const rev = (extra = {}) => ({ id: 'r', tipo: 'revolucao', eixo: 'y', perfil: PARAFUSO, centro: [0, 0, 0], ...extra });

  it('um perfil reto é um cilindro: caixa do diâmetro, altura do perfil e âncoras nas pontas do eixo', () => {
    const { r } = resolver([{ id: 'r', tipo: 'revolucao', eixo: 'y', perfil: [[50, 10], [50, 110]], centro: [0, 60, 0] }]);
    expect(extensao(r).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 100, 100]);
    perto(r.min, [-50, 10, -50]);
    const a = ancorasDe(r);
    perto(a.inicio, [0, 10, 0]);
    perto(a.fim, [0, 110, 0]);
    expect(pecasDe(r)).toHaveLength(1);
  });

  it('o degrau (dois pontos na mesma altura) não vira peça, e as faixas com volume viram uma peça cada', () => {
    const { r } = resolver([rev()]);
    expect(extensao(r).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 100, 100]);
    expect(pecasDe(r)).toHaveLength(2);
    expect(r.prisma.secoes).toHaveLength(6);
  });

  it('o gate mede o corpo de verdade: a folga ao lado do eixo fino é a do raio fino, e sobre o flange é a do flange', () => {
    /* o perfil ocupa y de -50 a 50: o flange de raio 50 vai de -50 a -30 e o eixo de raio 20 de -30 a 50; o vértice do
       polígono de 48 lados cai em +x, então a distância ao eixo é exata */
    const lado = medir([rev(), caixa('c', [40, 30, 0], 20, 20, 20)], 'r', 'c');
    expect(lado.folga).toBeCloseTo(10, 6);
    expect(lado.penetracao).toBe(0);
    const sobre = medir([rev(), caixa('c', [35, -25, 0], 20, 10, 20)], 'r', 'c');
    expect(sobre.folga).toBeCloseTo(0, 6);
    expect(sobre.penetracao).toBe(0);
    const dentro = medir([rev(), caixa('c', [30, -35, 0], 20, 10, 20)], 'r', 'c');
    expect(dentro.penetracao).toBeGreaterThan(5);
  });

  it('pontos nomeados do perfil viram âncoras sobre o eixo, e o eixo x usa z e y no plano do perfil', () => {
    const f = { id: 'r', tipo: 'revolucao', eixo: 'x', centro: [0, 0, 0], perfil: [[10, 0], { raio: 40, altura: 60, nome: 'bojo' }, [10, 120]] };
    const { r } = resolver([f]);
    perto(ancorasDe(r).bojo, [0, 0, 0]);
    perto(ancorasDe(r).inicio, [-60, 0, 0]);
    expect(extensao(r).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([120, 80, 80]);
    const c = resolver([f, caixa('c', 'r.bojo', 10, 10, 10)]).c;
    perto(c.centro, [0, 0, 0]);
  });

  it('recusa altura que volta, raio negativo, raio zero no meio, ponto repetido, lados fora da faixa e comprimento declarado', () => {
    recusa([rev({ perfil: [[10, 0], [10, 50], [10, 20]] })], /a altura 20 volta atrás \(anterior 50\)/);
    recusa([rev({ perfil: [[10, 0], [-5, 20]] })], /o raio -5 é negativo/);
    recusa([rev({ perfil: [[10, 0], [0, 20], [10, 40]] })], /raio zero só vale no primeiro e no último ponto/);
    recusa([rev({ perfil: [[10, 0], [10, 0], [10, 40]] })], /repete o ponto anterior/);
    recusa([rev({ perfil: [[0, 0], [0, 40]] })], /raio zero em todos os pontos/);
    recusa([rev({ perfil: [[10, 0]] })], /revolucao precisa de "perfil"/);
    recusa([rev({ lados: 3 })], /"lados" deve ser um inteiro de 6 a 128/);
    recusa([rev({ comprimento: 100 })], /retire "comprimento"/);
    recusa([rev({ perfil: [[10, 0], { raio: 10, altura: 5, cor: 'x' }] })], /revolucao precisa de "perfil"/);
    recusa([rev({ perfil: [[10, 0, 3], [10, 5]] })], /revolucao precisa de "perfil"/);
  });

  it('o desenho ordena as faces do fundo para a frente num vaso girado, em todas as vistas', () => {
    const vaso = { id: 'v', tipo: 'revolucao', eixo: 'y', perfil: [[0, 0], [50, 0], [50, 10], [20, 60], [50, 110], [0, 120]], rotacao: [50, 20, 0] };
    const medidas = ordemNasVistas(vaso);
    expect(medidas.reduce((s, m) => s + m.total, 0)).toBeGreaterThan(100);
    for (const m of medidas) expect(m.erros).toBe(0);
  });

  it('o arranjo radial copia a revolução como qualquer forma e o gate mede cada cópia', () => {
    const f = { id: 'p', tipo: 'revolucao', eixo: 'y', perfil: [[6, 0], [6, 40]], centro: [50, 20, 0] };
    const r = resolver([f, { arranja: { forma: 'p', modo: 'radial', total: 4, eixo: 'y', centro: [0, 0, 0], graus: 360 } }]);
    perto(r.p2.centro, [-50, 20, 0]);
    expect(pecasDe(r.p2)).toHaveLength(1);
    const entre = medir([f, { arranja: { forma: 'p', modo: 'radial', total: 4, eixo: 'y', centro: [0, 0, 0], graus: 360 } }], 'p', 'p1').folga;
    expect(entre).toBeGreaterThan(50 * Math.SQRT2 - 12.5);
    expect(entre).toBeLessThan(50 * Math.SQRT2 - 11.5);
  });
});

describe('a moto de prova com formas curvas', () => {
  const moto = fixture('moto-curvas.esboco.json');
  const anterior = fixture('moto-componentes.esboco.json');

  it('tanque e carenagem são loft, banco é extrusão côncava e farol é revolução, e nenhum centro é calculado à mão', () => {
    const tipo = (id) => moto.formas.find((f) => f.id === id).tipo;
    expect([tipo('tanque'), tipo('banco'), tipo('carenagem'), tipo('farol')]).toEqual(['loft', 'extrusao', 'loft', 'revolucao']);
    for (const f of moto.formas) {
      if (!Array.isArray(f.centro)) continue;
      for (const c of f.centro) expect(c === 0 || typeof c === 'string').toBe(true);
    }
    expect(JSON.stringify(moto)).not.toContain('"rotacao"');
  });

  it('o banco tem perfil côncavo de fato: a decomposição dá mais de uma parte e a área é a do perfil', () => {
    const banco = moto.formas.find((f) => f.id === 'banco');
    expect(ehConcavo(banco.perfil)).toBe(true);
    const partes = decomporConvexo(banco.perfil);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.reduce((s, p) => s + area(p), 0)).toBeCloseTo(area(banco.perfil), 6);
  });

  it('o gate aprova as duas opções e as únicas passagens são as do guidão pela coroa do garfo', () => {
    const g = verificarContato(moto);
    expect(g.resultado).toBe('aprovado');
    expect(g.achados).toEqual([]);
    expect(g.atravessamentos.map((t) => `${t.opcao}:${t.a}+${t.b}`).sort()).toEqual([
      'A. Naked:garfoD.coroa+guidao', 'A. Naked:garfoE.coroa+guidao', 'B. Café racer:garfoD.coroa+guidao', 'B. Café racer:garfoE.coroa+guidao',
    ]);
  });

  it('as formas curvas pousam por relação: o tanque toca a coluna, o banco toca o tanque e a roda, a carenagem toca a coluna e o farol toca a carenagem', () => {
    for (const opcao of ['A. Naked', 'B. Café racer']) {
      const e = { ...moto, opcoes: moto.opcoes.filter((o) => o.titulo === opcao) };
      const rs = Object.fromEntries(resolverOpcao({ ...expandirOpcao(e) }, opcao).map((r) => [r.id, r]));
      const folga = (a, b) => medirPar(pecasDe(rs[a]), pecasDe(rs[b])).folga;
      expect(folga('tanque', 'quadro.coluna')).toBeCloseTo(0, 6);
      expect(folga('tanque', 'quadro.viga')).toBeCloseTo(0, 6);
      expect(folga('banco', 'tanque')).toBeCloseTo(0, 6);
      expect(folga('banco', 'rodaTras.pneu')).toBeCloseTo(0, 6);
      expect(folga('carenagem', 'quadro.coluna')).toBeCloseTo(0, 6);
      expect(folga('farol', 'carenagem')).toBeCloseTo(0, 6);
      /* o farol se alinha ao centro da seção `nariz` da carenagem */
      const nariz = ancorasDe(rs.carenagem).nariz;
      expect(rs.farol.centro[0]).toBeCloseTo(nariz[0], 6);
      expect(rs.farol.centro[1]).toBeCloseTo(nariz[1], 6);
    }
  });

  it('a silhueta lateral do tanque é a de um sólido curvo: menos de 90% do retângulo que o envolve', () => {
    const e = expandirOpcao({ ...moto, opcoes: [moto.opcoes[0]] });
    const rs = resolverOpcao(e, 'A');
    const tanque = rs.find((r) => r.id === 'tanque');
    const banco = rs.find((r) => r.id === 'banco');
    const lateral = medirProjecaoDaOpcao([tanque], 'lateral').areas.tanque;
    expect(lateral / (extensao(tanque)[1] * extensao(tanque)[2])).toBeLessThan(0.9);
    const lateralBanco = medirProjecaoDaOpcao([banco], 'lateral').areas.banco;
    expect(lateralBanco / (extensao(banco)[1] * extensao(banco)[2])).toBeLessThan(0.9);
  });

  it('gera o desenho nas quatro vistas e a leitura em texto lista as formas novas', () => {
    for (const vista of Object.keys(VISTAS)) {
      const { svg } = desenharEsboco({ ...moto, vista });
      expect(svg.startsWith('<svg')).toBe(true);
    }
    const texto = formatarDescricao(descreverEsboco(moto));
    expect(texto).toContain('forma tanque: loft');
    expect(texto).toContain('forma banco: extrusao');
    expect(texto).toContain('forma farol: revolucao');
    expect(texto).toContain('loft de 6 seções');
  });

  it('o ajuste não muda nada quando o gate já aprova', () => {
    const ajuste = ajustarEsboco(moto);
    expect(ajuste.aprovado).toBe(true);
    expect(ajuste.rodadas).toHaveLength(0);
  });

  it('escreve os mesmos números à mão que a moto de componentes nas formas que não mudaram', () => {
    const igual = ['rodaTras', 'rodaFrente', 'motor', 'quadro', 'balancimE', 'garfoE', 'guidao'];
    for (const id of igual) expect(moto.formas.find((f) => f.id === id)).toEqual(anterior.formas.find((f) => f.id === id));
  });
});

/* auxiliares da moto de prova */
function expandirOpcao(e) {
  return expandirEsboco(e).opcoes[0];
}

function ehConcavo(perfil) {
  let sinal = 0;
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % perfil.length]; const c = perfil[(i + 2) % perfil.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    if (sinal === 0) sinal = Math.sign(z);
    else if (Math.sign(z) !== sinal) return true;
  }
  return false;
}
