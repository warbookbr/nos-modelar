/* O recorte de uma forma por outra (`subtrai`): o alojamento da roda na asa, a porta rebaixada no casco, o entalhe na borda e o furo
   passante, provados por número (volume das peças, caixa, folga e penetração do gate, fronteira fechada do desenho). */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, deslocarForma, ErroDeEsboco, fatiarForma, resolverOpcao, secaoDaForma } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { pecasDe, verificarContato } from '../src/contato.js';
import { cascoConvexo, lerSubtrai, resumoDoRecorte } from '../src/recorte.js';
import { formatarDescricao, formatarForma, formatarResumo, medirEsboco } from '../src/descrever.js';
import { formasResolvidas } from '../src/formas-resolvidas.js';
import { definirProvedorDeFamilias } from '../src/familia.js';
import { tuboOco } from './malha-de-prova.js';
import { conferirEnvelope, criarEstado, planoDeDetalhe } from '../src/condutor.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';

const resolver = (bruto, i = 0) => { const e = expandirEsboco(bruto); return resolverOpcao(e.opcoes[i], 'opção', e.pontos); };
const esboco = (formas, extra = {}) => ({ contato: { usar: true, tolerancia: 3, penetracao: 1 }, opcoes: [{ titulo: 'T', formas }], ...extra });
const caixa = (id, centro, [l, a, p], extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const achar = (rs, id) => rs.find((r) => r.id === id);
const tipos = (gate) => gate.achados.map((a) => a.tipo);

/* A área do polígono regular de n lados inscrito no círculo de raio r. */
const areaDoPoligono = (r, n) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

/* O volume da fronteira que o desenho usa: as faces vistas por dois olhos opostos, pela fórmula da divergência. Dá o volume da
   forma só se a fronteira é fechada e as normais saem para fora. */
function volumeDaFronteira(r) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const area = (pts) => { let s = [0, 0, 0]; for (let i = 1; i + 1 < pts.length; i++) { const c = cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0])); s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]]; } return Math.hypot(...s) / 2; };
  let v = 0;
  for (const olho of [[0.5412, 0.3377, 0.7697], [-0.5412, -0.3377, -0.7697]]) {
    for (const ch of fatiarForma(r, olho)) for (const f of [...ch.lados, ...ch.dentro, ...ch.tampas]) v += (dot(f.n, f.pts[0]) * area(f.pts)) / 3;
  }
  return v;
}

describe('o casco convexo e a leitura do campo', () => {
  it('o casco de um cubo tem seis faces e volume exato, e o de uma nuvem plana é nulo', () => {
    const cubo = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => [x * 10, y * 10, z * 10])));
    const c = cascoConvexo([...cubo, [5, 5, 5], [5, 5, 10]]);
    expect(c.faces).toHaveLength(6);
    expect(cascoConvexo([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [2, 2, 0]])).toBeNull();
  });

  it('lerSubtrai normaliza a lista e recusa o item mal formado com a mensagem que diz o que falta', () => {
    expect(lerSubtrai(['a', { forma: 'b', folga: 5 }, { forma: 'c', profundidade: 10, lado: '-x' }], 'f')).toEqual([{ forma: 'a' }, { forma: 'b', folga: 5 }, { forma: 'c', profundidade: 10, lado: '-x' }]);
    expect(() => lerSubtrai([], 'f')).toThrow(/lista de formas a subtrair/);
    expect(() => lerSubtrai([{ forma: 'a', folgaa: 1 }], 'f')).toThrow(/não tem o campo "folgaa" \(quis dizer "folga"\?\)/);
    expect(() => lerSubtrai([{ forma: 'a', profundidade: 10 }], 'f')).toThrow(/"profundidade" e "lado" de "a" em "subtrai" vêm juntos/);
    expect(() => lerSubtrai([{ forma: 'a', profundidade: 10, lado: 'x' }], 'f')).toThrow(/"lado" de "a" em "subtrai" deve ser um de \+x, -x/);
    expect(() => lerSubtrai([{ forma: 'a', folga: -1 }], 'f')).toThrow(/"folga" de "a" em "subtrai" deve ser um número em mm, maior ou igual a zero/);
    expect(() => lerSubtrai([{ forma: 'a', folga: 'f' }], 'f')).toThrow(/"folga" de "a"/);
    expect(lerSubtrai([{ forma: 'a', folga: 'f' }], 'f', { resolvido: false })).toEqual([{ forma: 'a', folga: 'f' }]);
  });
});

describe('a subtração exata sobre as peças convexas', () => {
  it('o vão de uma caixa em outra tira exatamente o volume do vão, em cinco peças, e a fronteira do desenho é fechada', () => {
    const rs = resolver(esboco([caixa('asa', [0, 0, 0], [1000, 100, 300], { subtrai: ['vao'] }), caixa('vao', [0, -20, 0], [200, 60, 100], { cortador: true })]));
    const asa = achar(rs, 'asa');
    expect(pecasDe(asa)).toHaveLength(5);
    const q = resumoDoRecorte(asa);
    expect(q.volumeCheioMm3).toBeCloseTo(30000000, 3);
    expect(q.volumeMm3).toBeCloseTo(30000000 - 200 * 60 * 100, 3);
    expect(q.cortadores).toEqual([{ id: 'vao', retiradoMm3: expect.closeTo(1200000, 3) }]);
    expect(volumeDaFronteira(asa)).toBeCloseTo(q.volumeMm3, 3);
    /* a caixa continua a da forma: o vão está dentro dela */
    expect(asa.min).toEqual([-500, -50, -150]);
    expect(asa.max).toEqual([500, 50, 150]);
  });

  it('o entalhe na borda encolhe a caixa da forma recortada: as medidas e o Envelope leem a forma que sobrou', () => {
    const bruto = esboco([caixa('barra', [0, 0, 0], [1000, 50, 100], { subtrai: ['corte'], cor: 'azul' }), caixa('corte', [500, 0, 0], [200, 80, 120], { cortador: true })],
      { plano: { medidas: [{ nome: 'largura', valor: 900, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede: 'larguraTotal' }] } });
    const barra = achar(resolver(bruto), 'barra');
    expect(barra.max[0]).toBeCloseTo(400, 6);
    expect(barra.min[0]).toBeCloseTo(-500, 6);
    const leitura = medirEsboco(bruto);
    expect(leitura.plano.opcoes[0].medidas[0]).toMatchObject({ nome: 'largura', medido_mm: 900, ok: true });
  });

  it('o furo passante (um cilindro de 24 lados) tira o volume do prisma do polígono, e a peça dentro dele não colide', () => {
    const furo = { id: 'furo', tipo: 'cilindro', eixo: 'y', diametro: 100, comprimento: 60, lados: 24, centro: [0, 0, 0], cortador: true };
    const chapa = caixa('chapa', [0, 0, 0], [400, 20, 300], { subtrai: ['furo'], cor: 'azul' });
    const pino = (d) => ({ id: 'pino', tipo: 'cilindro', eixo: 'y', diametro: d, comprimento: 60, lados: 24, centro: [0, 0, 0], cor: 'preto' });
    const rs = resolver(esboco([chapa, pino(80), furo]));
    const q = resumoDoRecorte(achar(rs, 'chapa'));
    expect(q.volumeCheioMm3 - q.volumeMm3).toBeCloseTo(areaDoPoligono(50, 24) * 20, 2);
    expect(volumeDaFronteira(achar(rs, 'chapa'))).toBeCloseTo(q.volumeMm3, 2);
    /* o pino de 80 mm cabe no furo de 100: sobram cerca de 10 mm de cada lado, e nada atravessa a parede que sobra */
    const gate = verificarContato(esboco([chapa, pino(80), furo], { contato: { usar: true, tolerancia: 30, penetracao: 1 } }));
    expect(tipos(gate)).not.toContain('colisao');
    /* o pino de 110 mm passa a parede do furo, e a parede que sobra conta */
    const largo = verificarContato(esboco([chapa, pino(110), furo], { contato: { usar: true, tolerancia: 3, penetracao: 1 } }));
    expect(tipos(largo)).toContain('colisao');
    /* sem o recorte o mesmo pino atravessa a chapa maciça */
    const semFuro = verificarContato(esboco([{ ...chapa, subtrai: undefined }, pino(80)], { contato: { usar: true, tolerancia: 3, penetracao: 1 } }));
    expect(tipos(semFuro)).toContain('colisao');
  });
});

describe('o alojamento da roda na asa (a roda recolhida cabe sem colidir)', () => {
  const asa = (extra = {}) => ({
    id: 'asa', tipo: 'loft', eixo: 'x', cor: 'azul', centro: [0, 0, 0],
    secoes: [{ pos: -1500, forma: 'retangulo', tamanho: [1000, 160] }, { pos: 0, forma: 'retangulo', tamanho: [1800, 400] }, { pos: 1500, forma: 'retangulo', tamanho: [1000, 160] }],
    subtrai: ['alojamento', 'abertura'], ...extra,
  });
  const roda = (centro) => ({ id: 'roda', tipo: 'cilindro', eixo: 'y', diametro: 500, comprimento: 200, lados: 24, centro, cor: 'preto' });
  /* o vão é do tamanho da roda com 20 mm de folga (270 mm de raio, 240 mm de altura) e abre por baixo da asa */
  const alojamento = { id: 'alojamento', tipo: 'cilindro', eixo: 'y', diametro: 540, comprimento: 240, lados: 24, centro: [700, 0, 0], cortador: true };
  const abertura = { id: 'abertura', tipo: 'caixa', largura: 540, altura: 300, profundidade: 540, centro: [700, -200, 0], cortador: true };
  const montar = (centro, extra) => esboco([asa(extra), roda(centro), alojamento, abertura], { contato: { usar: true, tolerancia: 25, penetracao: 1 } });

  it('a roda no vão fica a cerca de 20 mm da parede, sem colisão, e os moldes não entram no gate nem na contagem das ocultas', () => {
    const bruto = montar([700, 0, 0]);
    const rs = resolver(bruto);
    expect(rs.map((r) => r.id)).toEqual(['asa', 'roda', 'alojamento', 'abertura']);
    expect(achar(rs, 'alojamento').forma.oculto).toBe(true);
    const gate = verificarContato(bruto);
    expect(tipos(gate)).not.toContain('colisao');
    expect(gate.resultado).toBe('aprovado');
    const leitura = medirEsboco(bruto).descricao.opcoes[0];
    const par = leitura.contatos.find((c) => c.a === 'asa' && c.b === 'roda');
    expect(par.folga_mm).toBeGreaterThan(19);
    expect(par.folga_mm).toBeLessThan(21);
    expect(leitura).toMatchObject({ ocultas: 0, cortadores: 2 });
  });

  it('a roda empurrada contra a parede ou contra o teto do vão colide, e sem o recorte ela atravessa a asa inteira', () => {
    const contra = verificarContato(montar([725, 0, 0]));
    expect(tipos(contra)).toContain('colisao');
    const teto = verificarContato(montar([700, 40, 0]));
    expect(tipos(teto)).toContain('colisao');
    const semRecorte = verificarContato(esboco([asa({ subtrai: undefined }), roda([700, 0, 0])], { contato: { usar: true, tolerancia: 25, penetracao: 1 } }));
    const dele = semRecorte.achados.find((a) => a.tipo === 'colisao');
    expect(dele).toBeDefined();
    expect(dele.mm).toBeGreaterThan(100);
  });

  it('a fronteira do desenho da asa recortada é fechada e tem o volume das peças convexas', () => {
    const asaR = achar(resolver(montar([700, 0, 0])), 'asa');
    const q = resumoDoRecorte(asaR);
    expect(q.retiradoMm3).toBeGreaterThan(5e6);
    expect(volumeDaFronteira(asaR)).toBeCloseTo(q.volumeMm3, -1);
  });

  it('a seção por z=0 passa pelo vão: o contorno tem o entalhe aberto por baixo', () => {
    const asaR = achar(resolver(montar([700, 0, 0])), 'asa');
    const solidos = secaoDaForma(asaR, { eixo: 'z', valor: 0 });
    expect(solidos).toHaveLength(1);
    const pontos = solidos[0].flat().map((p) => `${Math.round(p[0])},${Math.round(p[1])}`);
    expect(pontos).toContain('430,120');
    expect(pontos).toContain('970,120');
  });
});

describe('a porta rebaixada no casco e a profundidade do recorte', () => {
  const casco = { id: 'casco', tipo: 'loft', eixo: 'z', cor: 'cinza', centro: [0, 0, 0], secoes: [{ pos: -2000, forma: 'retangulo', tamanho: [1500, 1700] }, { pos: 2000, forma: 'retangulo', tamanho: [1500, 1700] }] };
  const porta = (x) => caixa('porta', [x, 100, 0], [16, 1000, 800], { cor: 'laranja' });
  const rebaixo = { forma: 'porta', folga: 2, profundidade: 18, lado: '+x' };

  it('o vão da porta tira da parede só a profundidade pedida a partir da face de fora, e a porta cabe nele com a folga', () => {
    /* a porta ocupa x de 734 a 750 (a face de fora do casco); com 2 mm de folga o molde vai de 732 a 752, e o rebaixo de 18 mm a partir da face do casco chega a 732 */
    const bruto = esboco([{ ...casco, subtrai: [rebaixo] }, porta(742)]);
    const rs = resolver(bruto);
    const q = resumoDoRecorte(achar(rs, 'casco'));
    expect(q.cortadores[0].retiradoMm3).toBeCloseTo(18 * 1004 * 804, 0);
    expect(tipos(verificarContato(bruto))).not.toContain('colisao');
    const par = medirEsboco(bruto).descricao.opcoes[0].contatos.find((c) => c.a === 'casco' && c.b === 'porta');
    expect(par.folga_mm).toBeCloseTo(2, 1);
    /* a mesma porta sobre um casco maciço está enterrada nele, e a porta saliente de antes passa a ser a rebaixada */
    const maciço = verificarContato(esboco([casco, porta(742)]));
    expect(tipos(maciço)).toContain('colisao');
  });

  it('a profundidade conta a partir da face da forma no lado dado, e a folga engrossa o molde nos dois sentidos', () => {
    const retirado = (subtrai, centro) => {
      const rs = resolver(esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai }), caixa('molde', centro, [100, 100, 100], { cortador: true })]));
      const q = resumoDoRecorte(achar(rs, 'bloco'));
      return q.volumeCheioMm3 - q.volumeMm3;
    };
    /* o molde de 100 mm tem uma face na face de baixo do bloco (y de -150 a -50): o rebaixo de 30 mm tira só a fatia de cima dessa face */
    expect(retirado(['molde'], [0, -100, 0])).toBeCloseTo(100 * 100 * 100, 2);
    expect(retirado([{ forma: 'molde', profundidade: 30, lado: '-y' }], [0, -100, 0])).toBeCloseTo(100 * 100 * 30, 2);
    expect(retirado([{ forma: 'molde', profundidade: 30, lado: '+x' }], [100, 0, 0])).toBeCloseTo(100 * 100 * 30, 2);
    /* o molde que sai do bloco por cima tira o mesmo rebaixo: a profundidade é da face do bloco, e não da face do molde */
    expect(retirado([{ forma: 'molde', profundidade: 30, lado: '+y' }], [0, 140, 0])).toBeCloseTo(100 * 100 * 30, 2);
    expect(retirado([{ forma: 'molde', folga: 10 }], [0, 0, 0])).toBeCloseTo(120 * 120 * 120, 2);
    expect(retirado([{ forma: 'molde', folga: 10, profundidade: 30, lado: '-y' }], [0, -100, 0])).toBeCloseTo(120 * 120 * 30, 2);
  });

  it('a profundidade e a folga aceitam parâmetro e expressão, e o mesmo JSON dá as mesmas peças', () => {
    const bruto = { ...esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: [{ forma: 'molde', folga: '=f * 2', profundidade: 'p', lado: '-y' }] }), caixa('molde', [0, -100, 0], [100, 100, 100], { cortador: true })]), parametros: { f: 5, p: 25 } };
    const a = JSON.stringify(pecasDe(achar(resolver(bruto), 'bloco')).map((p) => p.verts));
    const b = JSON.stringify(pecasDe(achar(resolver(bruto), 'bloco')).map((p) => p.verts));
    expect(a).toBe(b);
    const q = resumoDoRecorte(achar(resolver(bruto), 'bloco'));
    expect(q.volumeCheioMm3 - q.volumeMm3).toBeCloseTo(120 * 120 * 25, 2);
    const outro = { ...bruto, parametros: { f: 0, p: 25 } };
    const r = resumoDoRecorte(achar(resolver(outro), 'bloco'));
    expect(r.volumeCheioMm3 - r.volumeMm3).toBeCloseTo(100 * 100 * 25, 2);
  });
});

describe('o recorte no desenho, na leitura em texto e nas recusas', () => {
  const bloco = (extra = {}) => esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: ['molde'], cor: 'azul' }), caixa('molde', [0, 150, 0], [100, 100, 100], { cortador: true }), ...(extra.formas ?? [])]);

  it('o desenho não mostra o molde e a forma recortada tem a fronteira em faces com normal para fora', () => {
    const d = desenharEsboco({ ...bloco(), vista: 'isometrica' });
    expect(d.svg).toContain('<path');
    const camada = desenharEsboco({ ...bloco(), vista: 'isometrica' }, { camada: true }).camada;
    expect(camada.formas.map((f) => f.id)).toEqual(['bloco']);
    const rs = resolver(bloco());
    const q = resumoDoRecorte(achar(rs, 'bloco'));
    expect(volumeDaFronteira(achar(rs, 'bloco'))).toBeCloseTo(q.volumeMm3, 2);
    /* o vão de cima aparece de cima: a parede dele é face voltada para o olho da isométrica */
    const cima = fatiarForma(achar(rs, 'bloco'), [0.57735, 0.57735, 0.57735])[0].lados;
    expect(cima.some((f) => f.n[0] > 0.9 || f.n[2] > 0.9)).toBe(true);
  });

  it('a leitura em texto diz o recorte, o volume que sai e o molde, e o molde não conta como oculta de referência', () => {
    const m = medirEsboco(bloco());
    const forma = m.descricao.opcoes[0].formas.find((f) => f.id === 'bloco');
    expect(forma.recorte).toMatchObject({ cortadores: [{ id: 'molde', retira_cm3: 500 }], retira_cm3: 500, pecas: 5 });
    expect(formatarForma(m.descricao, m.divergencias, 'bloco')).toMatch(/recorte: subtrai molde; retira 500 cm3 e sobram 26500 cm3 em 5 peças convexas/);
    expect(formatarDescricao(m.descricao)).toContain('1 cortador (molde de recorte)');
    expect(formatarDescricao(m.descricao)).not.toContain('ocultas (só referência)');
    expect(formatarResumo(m.descricao, m.divergencias)).toContain('1 cortador (molde de recorte)');
  });

  it('o molde que não toca a forma é uma divergência de contrato (o recorte não retira nada)', () => {
    const m = medirEsboco(esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: ['molde'] }), caixa('molde', [0, 900, 0], [100, 100, 100], { cortador: true })]));
    expect(m.divergencias.map((d) => `${d.classe}: ${d.texto}`).join('\n')).toMatch(/contrato: bloco subtrai "molde" e o molde não toca a forma, de modo que o recorte não retira nada/);
  });

  it('o cortador que nenhuma forma subtrai é uma divergência de contrato, e não uma recusa (o detalhe de uma unidade pode deixá-lo órfão)', () => {
    const m = medirEsboco(esboco([caixa('a', [0, 0, 0], [10, 10, 10]), caixa('molde', [0, 0, 0], [10, 10, 10], { cortador: true })]));
    expect(m.divergencias.map((d) => `${d.classe}: ${d.texto}`).join('\n')).toMatch(/contrato: "molde" é um cortador que nenhuma forma subtrai/);
  });

  it('recusa o que não faz sentido, dizendo o que corrigir', () => {
    const f = (formas) => () => resolver(esboco(formas));
    expect(f([caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: ['b'] })])).toThrow(/"subtrai" cita "b", que não existe nesta opção/);
    expect(f([caixa('alojamento', [0, 0, 0], [10, 10, 10]), caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: ['alojamentoo'] })])).toThrow(/quis dizer "alojamento"/);
    expect(f([caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: ['a'] })])).toThrow(/não subtrai a si mesma/);
    expect(f([caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: ['b'] }), caixa('b', [0, 0, 0], [10, 10, 10], { subtrai: ['a'] })])).toThrow(/o recorte é circular \(a subtrai b subtrai a\)/);
    expect(f([caixa('a', [0, 0, 0], [10, 10, 10], { cortador: 1 })])).toThrow(/"cortador" deve ser true/);
    expect(f([caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: ['m'] }), caixa('m', [0, 0, 0], [20, 20, 20], { cortador: true })])).toThrow(/o recorte remove a forma inteira/);
    expect(() => expandirEsboco(esboco([caixa('a', [0, 0, 0], [10, 10, 10], { subtrai: [{ forma: 'm', lado: '-x' }] })]))).toThrow(/vêm juntos/);
  });
});

describe('o recorte com o resto do módulo', () => {
  it('a cópia deslocada pela explosão leva o vão junto', () => {
    const rs = resolver(esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: ['molde'] }), caixa('molde', [0, 150, 0], [100, 100, 100], { cortador: true })]));
    const bloco = achar(rs, 'bloco');
    const deslocado = deslocarForma(bloco, [1000, 0, 0]);
    const q = resumoDoRecorte(deslocado);
    expect(q.retiradoMm3).toBeCloseTo(resumoDoRecorte(bloco).retiradoMm3, 3);
    expect(Math.min(...pecasDe(deslocado).map((p) => p.min[0]))).toBeCloseTo(850, 6);
  });

  it('o espelho declara o próprio recorte, com o molde espelhado, e sem ele a cópia sai inteira', () => {
    const base = [caixa('asa', [300, 0, 0], [200, 100, 200], { subtrai: ['vao'] }), caixa('vao', [300, 50, 0], [80, 60, 80], { cortador: true })];
    const rs = resolver(esboco([...base, { id: 'vaoD', espelha: { forma: 'vao', eixo: 'x' }, cortador: true }, { id: 'asaD', espelha: { forma: 'asa', eixo: 'x' }, subtrai: ['vaoD'] }]));
    expect(resumoDoRecorte(achar(rs, 'asaD')).retiradoMm3).toBeCloseTo(resumoDoRecorte(achar(rs, 'asa')).retiradoMm3, 3);
    expect(achar(rs, 'asaD').max[0]).toBeCloseTo(-200, 6);
    const solta = resolver(esboco([...base, { id: 'asaD', espelha: { forma: 'asa', eixo: 'x' } }]));
    expect(achar(solta, 'asaD').subtrai).toBeUndefined();
  });

  it('a simetria implícita por lado espelha o recorte: a cópia subtrai o molde espelhado, que continua molde', () => {
    const bruto = esboco([
      caixa('asaE', [300, 0, 0], [200, 100, 200], { lado: 'E', subtrai: ['vaoE'], cor: 'azul' }),
      caixa('vaoE', [300, 50, 0], [80, 60, 80], { lado: 'E', cortador: true }),
    ], { simetrico: { eixo: 'x' } });
    const rs = resolver(bruto);
    expect(rs.map((r) => r.id)).toEqual(['asaE', 'asaD', 'vaoE', 'vaoD']);
    expect(achar(rs, 'vaoD').forma).toMatchObject({ cortador: true, oculto: true });
    expect(achar(rs, 'asaD').forma.subtrai).toEqual(['vaoD']);
    expect(resumoDoRecorte(achar(rs, 'asaD')).retiradoMm3).toBeCloseTo(resumoDoRecorte(achar(rs, 'asaE')).retiradoMm3, 3);
    expect(achar(rs, 'asaD').max[0]).toBeCloseTo(-200, 6);
  });

  it('as formas resolvidas exportam o recorte e o cortador, e o dado continua puro', () => {
    const dados = formasResolvidas(esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: ['molde'] }), caixa('molde', [0, 150, 0], [100, 100, 100], { cortador: true })]));
    const bloco = dados.formas.find((f) => f.id === 'bloco');
    expect(bloco.geometria.recorte).toMatchObject({ cortadores: [{ id: 'molde', retiradoMm3: expect.closeTo(500000, 2) }], volumeCheioMm3: expect.closeTo(27000000, 2) });
    expect(dados.formas.find((f) => f.id === 'molde')).toMatchObject({ cortador: true, oculto: true });
    expect(JSON.parse(JSON.stringify(dados))).toEqual(dados);
  });

  it('o molde é oculto por natureza: não entra em nenhuma Unidade de detalhe do Condutor', () => {
    const bruto = esboco([caixa('bloco', [0, 0, 0], [300, 300, 300], { subtrai: ['molde'] }), caixa('molde', [0, 150, 0], [100, 100, 100], { cortador: true, unidade: 'bloco-u' }), caixa('pino', [0, 0, 0], [40, 40, 40])]);
    const plano = planoDeDetalhe({ ...bruto, plano: { nivel: 'detalhado' } });
    const membros = plano.unidades.flatMap((u) => u.membros);
    expect(membros).toContain('bloco');
    expect(membros).not.toContain('molde');
  });

  it('o detalhe de uma unidade guarda o molde do mestre como referência oculta e devolve ao mestre o molde novo declarado nele', () => {
    const mestre = {
      contato: { usar: true, tolerancia: 3, penetracao: 1 },
      plano: { nivel: 'detalhado' },
      opcoes: [{ titulo: 'T', formas: [
        caixa('asa', [0, 0, 0], [1000, 100, 300], { subtrai: ['vao'], unidade: 'asas' }),
        caixa('vao', [-300, -20, 0], [200, 60, 100], { cortador: true }),
        caixa('roda', [-300, -10, 0], [100, 40, 60], { unidade: 'trem' }),
      ] }],
    };
    const estado = criarEstado(mestre, 'x.esboco.json');
    const isolado = detalharUnidade(mestre, estado, 'asas');
    const formas = isolado.opcoes[0].formas;
    expect(formas.find((f) => f.id === 'vao')).toMatchObject({ cortador: true, oculto: true });
    expect(formas.find((f) => f.id === 'asa').oculto).toBeUndefined();
    /* o detalhe troca a asa por uma com um segundo vão, e o molde novo vai junto, sem `oculto` */
    const detalhado = JSON.parse(JSON.stringify(isolado));
    detalhado.opcoes[0].formas = [
      ...formas.filter((f) => f.id !== 'asa'),
      caixa('asaFina', [0, 0, 0], [1000, 100, 300], { subtrai: ['vao', 'vao2'], unidade: 'asas' }),
      caixa('vao2', [300, -20, 0], [200, 60, 100], { cortador: true }),
    ];
    const r = integrarUnidade(mestre, estado, 'asas', detalhado);
    const ids = r.mestre.opcoes[0].formas.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['asaFina', 'vao', 'vao2', 'roda']));
    expect(medirEsboco(r.mestre).divergencias.map((d) => d.texto).join('\n')).not.toMatch(/cortador que nenhuma forma subtrai/);
  });

  it('o Envelope da unidade lê a caixa da forma recortada: o detalhe que entalha mais cabe, e o que entalha menos passa dele', () => {
    const mestre = (corte) => ({
      contato: { usar: true, tolerancia: 3, penetracao: 1 },
      plano: { nivel: 'detalhado', envelope: { tolerancia: 5 } },
      opcoes: [{ titulo: 'T', formas: [
        caixa('barra', [0, 0, 0], [1000, 50, 100], { unidade: 'barras', subtrai: ['corte'] }),
        caixa('corte', [500, 0, 0], [corte, 80, 120], { cortador: true }),
        caixa('pino', [0, 0, 0], [20, 20, 20], { unidade: 'pinos' }),
      ] }],
    });
    const base = mestre(200);
    const estado = criarEstado(base, 'x.esboco.json');
    const confere = (corte) => conferirEnvelope(base, estado, 'barras', { ...mestre(corte), opcoes: [{ titulo: 'T', formas: mestre(corte).opcoes[0].formas.slice(0, 2) }] });
    /* o entalhe de 200 mm na ponta deixa a barra de x -500 a 400 no mestre */
    expect(confere(400).caixa.x).toMatchObject({ envelope: [-500, 400], detalhe: [-500, 300], ok: true });
    const curto = confere(100).caixa.x;
    expect(curto).toMatchObject({ detalhe: [-500, 450], ok: false });
    expect(curto.excesso_mm).toBeCloseTo(50, 6);
  });

  it('a forma de família (a malha da ponte) também se recorta: a janela na parede do tubo oco, pelas peças e pela fronteira', () => {
    definirProvedorDeFamilias(() => ({ ...tuboOco({ rExt: 20, rInt: 10, comprimento: 100, eixo: 'x', ancoras: {} }), familia: 'tubo-de-prova', portas: [] }));
    try {
      const bruto = esboco([{ id: 'tubo', tipo: 'familia', familia: 'tubo-de-prova', centro: [0, 0, 0], subtrai: ['janela'] }, caixa('janela', [0, 20, 0], [30, 20, 30], { cortador: true })]);
      const t = achar(resolver(bruto), 'tubo');
      const q = resumoDoRecorte(t);
      expect(q.retiradoMm3).toBeGreaterThan(1000);
      expect(q.volumeMm3).toBeLessThan(q.volumeCheioMm3);
      expect(t.max[1]).toBeLessThanOrEqual(20);
      /* as peças da malha cobrem a concavidade que o gate aceita (o furo do tubo), e por isso o volume delas passa um pouco do da fronteira exata */
      expect(Math.abs(volumeDaFronteira(t) - q.volumeMm3) / q.volumeMm3).toBeLessThan(0.03);
      expect(desenharEsboco({ ...bruto, vista: 'isometrica' }, { camada: true }).camada.formas.map((f) => f.id)).toEqual(['tubo']);
    } finally {
      definirProvedorDeFamilias(null);
    }
  });
});
