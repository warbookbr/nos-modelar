/* chapa-de-contorno.test.mjs — a chapa de contorno em cunha, medida pelas réguas de malha (face degenerada e face fina), com a ponta fechada, o chanfro, a quina e o raio de canto. */
import { describe, expect, it } from 'vitest';
import { chapaDeContorno } from './chapa-de-contorno.js';
import { medirPeca } from '../../tools/fixtures/costuras-e-furos/medir.mjs';
import { lascasDoNeutro } from '../../tools/modelar/lasca.mjs';

/* uma chapa em cunha: base reta, gume chanfrado até o fio e dorso de quina quebrada, que se encontram numa ponta */
const cunha = (extra = {}) => chapaDeContorno({
  nome: 'c', eixo: 'y', em: 10, espessura: 6, passo: 10, tampa: { de: 'base', ate: 'ponta' },
  trechos: [
    { nome: 'base', pontos: [[0, 40], [0, 0]], pontosNoTrecho: 3 },
    { nome: 'gume', pontos: [[0, 0], [100, 0]], grupo: 'fio', chanfro: { largura: 12, limite: { fracao: 0.4, contra: ['dorso'] } } },
    { nome: 'ponta', pontos: [[100, 0]] },
    { nome: 'dorso', pontos: [[100, 0], [60, 24], [0, 40]], quinaQuebrada: { largura: 1, altura: 1, limite: { fracao: 0.1, contra: ['gume'] } } },
  ],
  raioDoCanto: [{ em: [60, 24], raio: 30 }],
  ...extra,
});
const receitaDe = (g, niveis = 0) => ({
  PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis }], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]],
  PARAMS: {}, TOPO: { ...g.pontos }, MATERIAIS: {}, ALIASES: [],
});

describe('chapaDeContorno', () => {
  const g = cunha();
  const m = medirPeca(receitaDe(g));

  it('os laços ficam nas alturas das bordas: faces, quina quebrada e o fio no meio', () => {
    expect(g.chapa.niveis).toEqual([-3, -2, 0, 2, 3]);
  });

  it('a malha fecha, sem órfão, sem aresta solta, sem face degenerada e sem face fina', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(m.neutro)).toEqual([]);
  });

  it('a ponta em que o gume chanfrado e o dorso se encontram fecha num ponto, no fio', () => {
    const ponta = Object.entries(g.pontosMm).filter(([, p]) => Math.hypot(p[0] - 100, p[2]) < 1e-6);
    /* em cada laço a ponta é um ponto só (os trechos gume e dorso acabam e começam nele) */
    expect(ponta.length).toBeGreaterThanOrEqual(5);
    const ys = ponta.map(([, p]) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(7, 6);
    expect(Math.max(...ys)).toBeCloseTo(13, 6);
  });

  /* os pontos do trecho num laço, em mm, na ordem do eixo u */
  const doTrecho = (r, laco, trecho) => Object.entries(r.pontosMm).filter(([n]) => n.startsWith(`c_l${laco}_${trecho}`)).map(([, p]) => p).sort((p, q) => p[0] - q[0]);

  it('o chanfro recua o gume nas faces e o deixa afiado: a face de cima no recuo e o fio no meio', () => {
    const meio = doTrecho(g, 2, 'gume_'); const cima = doTrecho(g, 4, 'gume_'); const baixo = doTrecho(g, 0, 'gume_');
    expect(Math.max(...meio.map((p) => p[2]))).toBeCloseTo(0, 6);
    const i = Math.floor(cima.length / 2);
    expect(cima[i][2]).toBeGreaterThan(5);
    expect(cima[i][2]).toBeCloseTo(baixo[i][2], 6);
  });

  it('o canto de raio troca o vértice do dorso por um arco e é determinístico', () => {
    const sem = cunha({ raioDoCanto: [] });
    expect(JSON.stringify(cunha().pontos)).toBe(JSON.stringify(g.pontos));
    const arco = doTrecho(g, 2, 'dorso_');
    const reto = doTrecho(sem, 2, 'dorso_');
    /* o vértice [60, 24] some, e o arco o contorna por dentro a mais de 0,25 mm */
    expect(reto.some((p) => Math.hypot(p[0] - 60, p[2] - 24) < 1e-6)).toBe(true);
    expect(arco.some((p) => Math.hypot(p[0] - 60, p[2] - 24) < 1e-6)).toBe(false);
    const dentro = Math.min(...arco.map((p) => Math.hypot(p[0] - 60, p[2] - 24)));
    expect(dentro).toBeGreaterThan(0.25);
    expect(arco.length).toBeGreaterThan(reto.length);
  });

  it('o grupo do trecho vira grupo de faces do passo', () => {
    expect(g.passo.grupos.map((x) => x.nome)).toEqual(['fio']);
  });

  it('a espessura afina ao longo de u: na ponta fica com a espessura final', () => {
    const f = cunha({ afinar: { coordenada: 'u', de: 50, ate: 100, espessuraFinal: 1 } });
    const ys = Object.entries(f.pontosMm).filter(([, p]) => Math.abs(p[0] - 100) < 1e-6).map(([, p]) => p[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1, 6);
    const r = medirPeca(receitaDe(f));
    expect(r.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(r.neutro)).toEqual([]);
  });

  it('com subdivisão a chapa continua fechada', () => {
    const r = medirPeca(receitaDe(g, 1));
    expect(r.arestasSoltas).toBe(0);
    expect(r.facesDegeneradas).toBe(0);
  });

  it('recusa o que não fecha ou não cabe, dizendo o valor e o limite', () => {
    expect(() => cunha({ espessura: 0 })).toThrow(/espessura é número positivo/);
    expect(() => cunha({ raioDoCanto: [{ em: [60, 24], raio: 500 }] })).toThrow(/o raio que cabe é/);
    expect(() => cunha({ raioDoCanto: [{ em: [1, 1], raio: 5 }] })).toThrow(/não é vértice de trecho nenhum/);
    expect(() => cunha({ raioDoCanto: [{ em: [100, 0], raio: 5 }] })).toThrow(/dentro de um trecho/);
    expect(() => cunha({ tampa: { de: 'base', ate: 'nao' } })).toThrow(/tampa/);
    expect(() => chapaDeContorno({ nome: 'a', espessura: 4, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 10]] }, { nome: 'b', pontos: [[5, 10], [10, 10]] }, { nome: 'c', pontos: [[10, 10], [0, 0]] }] })).toThrow(/contorno tem de ser fechado/);
  });

  it('recusa o chanfro mais largo que a chapa, com o laço', () => {
    const largo = () => chapaDeContorno({
      nome: 'f', espessura: 4, passo: 5, tampa: { de: 'a', ate: 'c' },
      trechos: [{ nome: 'a', pontos: [[0, 0], [0, 6]] }, { nome: 'b', pontos: [[0, 6], [30, 6]], chanfro: { largura: 20 } }, { nome: 'c', pontos: [[30, 6], [30, 0]] }, { nome: 'd', pontos: [[30, 0], [0, 0]] }],
    });
    expect(largo).toThrow(/laço a/);
  });

  it('a face do chanfro é um plano: a meia altura entre o fio e a face o recuo é proporcional', () => {
    const perto = (laco) => doTrecho(g, laco, 'gume_').reduce((m, p) => (Math.abs(p[0] - 10) < Math.abs(m[0] - 10) ? p : m));
    expect(perto(3)[2]).toBeCloseTo((perto(4)[2] * 2) / 3, 6);
    expect(perto(4)[2]).toBeCloseTo(12, 6);
  });

  it('o arco do canto fica dentro do contorno: o ponto dele mais perto do vértice está a uma sagita do vértice, do lado da chapa', () => {
    const arco = doTrecho(g, 2, 'dorso_');
    const perto = arco.reduce((m, p) => (Math.hypot(p[0] - 60, p[2] - 24) < Math.hypot(m[0] - 60, m[2] - 24) ? p : m));
    const centro = [40, 20];
    expect(Math.hypot(perto[0] - centro[0], perto[2] - centro[1])).toBeLessThan(Math.hypot(60 - centro[0], 24 - centro[1]));
    const giro = Math.atan2(24, 40) - Math.atan2(16, 60);
    const sagita = 30 * (1 / Math.cos(giro / 2) - 1);
    expect(Math.hypot(perto[0] - 60, perto[2] - 24)).toBeGreaterThan(sagita * 0.8);
    expect(Math.hypot(perto[0] - 60, perto[2] - 24)).toBeLessThan(sagita * 1.2);
  });

  it('a esquadria de uma ponta aguda é limitada a 3 vezes a largura do chanfro', () => {
    const r = (30 * Math.PI) / 180;
    const p = [100 * Math.cos(r), 100 * Math.sin(r)];
    const meio = [(100 + p[0]) / 2, p[1] / 2];
    const cunha30 = chapaDeContorno({
      nome: 'c', espessura: 6, passo: 10, tampa: { de: 'f1', ate: 'v' },
      trechos: [{ nome: 'v', pontos: [[0, 0]] }, { nome: 'a', pontos: [[0, 0], [100, 0]], chanfro: { largura: 2 } }, { nome: 'f1', pontos: [[100, 0], meio] }, { nome: 'f2', pontos: [meio, p] }, { nome: 'b', pontos: [p, [0, 0]], chanfro: { largura: 2 } }],
    });
    const nafaceDeCima = Object.entries(cunha30.pontosMm).filter(([n]) => n.startsWith('c_l2_')).map(([, q]) => Math.hypot(q[0], q[2]));
    expect(Math.min(...nafaceDeCima)).toBeCloseTo(6, 3);
  });

  it('afinar leva a espessura aos pontos em metro, aos alvos e aos laços', () => {
    const f = cunha({ afinar: { coordenada: 'u', de: 50, ate: 100, espessuraFinal: 1 } });
    const ysM = Object.entries(f.pontos).filter(([n]) => Math.abs(f.pontosMm[n][0] - 100) < 1e-6).map(([, q]) => q[1]);
    expect((Math.max(...ysM) - Math.min(...ysM)) * 1000).toBeCloseTo(1, 6);
    const ysA = Object.entries(f.alvosMm).filter(([, q]) => Math.abs(q[0] - 100) < 1e-6).map(([, q]) => q[1]);
    expect(Math.max(...ysA) - Math.min(...ysA)).toBeCloseTo(1, 6);
    expect(f.lacos.every((l) => l.afinada.espessuraFinal === 1)).toBe(true);
    expect(cunha().lacos[0].afinada).toBeUndefined();
  });

  it('a altura da quina quebrada vem de `altura`, e o padrão é a largura', () => {
    const q = (extra) => chapaDeContorno({ nome: 'q', espessura: 6, passo: 20, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 40]], quinaQuebrada: { largura: 1, ...extra } }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] }).chapa.niveis;
    expect(q({})).toEqual([-3, -2, 2, 3]);
    expect(q({ altura: 0.5 })).toEqual([-3, -2.5, 2.5, 3]);
  });

  it('entrada e saída fazem a largura crescer de 0 e voltar a 0, com ponto na distância dita mesmo menor que o passo', () => {
    const e = chapaDeContorno({ nome: 'e', espessura: 6, passo: 3.5, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 60]] }, { nome: 'b', pontos: [[0, 60], [100, 60]], chanfro: { largura: 10, entrada: 3, saida: 7 } }, { nome: 'c', pontos: [[100, 60], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
    const topo = Object.entries(e.pontosMm).filter(([n]) => n.startsWith('e_l2_b')).map(([, q]) => q).sort((p, q) => p[0] - q[0]);
    const face = Object.entries(e.pontosMm).filter(([n]) => n.startsWith('e_l1_b')).map(([, q]) => q).sort((p, q) => p[0] - q[0]);
    const recuo = (x) => { const k = topo.findIndex((p) => Math.abs(p[0] - x) < 1e-6); expect(k, `ponto em x=${x}`).toBeGreaterThanOrEqual(0); return topo[k][2] - face[k][2]; };
    expect(recuo(0)).toBeCloseTo(0, 6);
    expect(recuo(3)).toBeCloseTo(-10, 6);
    expect(recuo(93)).toBeCloseTo(-10, 6);
    expect(recuo(96.5)).toBeCloseTo(-5, 6);
    expect(recuo(0)).toBeCloseTo(0, 6);
    expect(recuo(3)).toBeCloseTo(-10, 6);
    expect(recuo(93)).toBeCloseTo(-10, 6);
    const ultimo = topo.filter((p) => p[0] > 93).reduce((m, p) => (p[0] > m[0] ? p : m));
    expect(Math.abs(topo.indexOf(ultimo) >= 0 ? ultimo[2] - face[topo.indexOf(ultimo)][2] : 10)).toBeLessThan(9);
  });

  it('os vértices dados dentro de um trecho ficam onde estão, qualquer que seja o passo', () => {
    for (const passo of [5, 10, 20]) {
      const v = chapaDeContorno({ nome: 'v', espessura: 4, passo, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [47, 52], [100, 40]] }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
      expect(Object.values(v.pontosMm).some((p) => Math.abs(p[0] - 47) < 1e-6 && Math.abs(p[2] - 52) < 1e-6), `passo ${passo}`).toBe(true);
    }
  });

  it('o exemplo da ficha fecha em qualquer passo, e o chanfro que passa do primeiro ponto do vizinho junta os pontos dele', () => {
    for (const passo of [5, 8, 10, 12, 20]) {
      const ficha = chapaDeContorno({ nome: 'p', eixo: 'y', espessura: 6, tampa: { de: 'base', ate: 'topo' }, passo, trechos: [{ nome: 'base', pontos: [[0, 0], [0, 60]] }, { nome: 'esq', pontos: [[0, 60], [100, 60]], chanfro: { largura: 10 } }, { nome: 'topo', pontos: [[100, 60], [100, 0]] }, { nome: 'dir', pontos: [[100, 0], [0, 0]], quinaQuebrada: { largura: 1.5 } }] });
      const r = medirPeca(receitaDe(ficha));
      expect(r.arestasSoltas, `passo ${passo}`).toBe(0);
      expect(r.facesDegeneradas, `passo ${passo}`).toBe(0);
      expect(r.orfaos, `passo ${passo}`).toEqual([]);
    }
  });

  it('recusa o contorno que se toca ou volta sobre si, citando o trecho e o vértice', () => {
    const aleta = () => chapaDeContorno({ nome: 'a', espessura: 4, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [50, 40], [20, 40]] }, { nome: 'c', pontos: [[20, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
    expect(aleta).toThrow(/o contorno se toca ou se cruza: o trecho 'b' no vértice \[/);
    const gravata = () => chapaDeContorno({ nome: 'g', espessura: 4, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [100, 40]] }, { nome: 'b', pontos: [[100, 40], [100, 0]] }, { nome: 'c', pontos: [[100, 0], [0, 40]] }, { nome: 'd', pontos: [[0, 40], [0, 0]] }] });
    expect(gravata).toThrow(/o contorno se toca ou se cruza/);
  });

  it('o laço recuado que se cruza é recusado com os dois trechos e os vértices', () => {
    const r = (largura) => () => chapaDeContorno({ nome: 'l', espessura: 6, passo: 10, tampa: { de: 'f1', ate: 'v' }, trechos: [{ nome: 'v', pontos: [[0, 0]] }, { nome: 'a', pontos: [[0, 0], [100, 0]], chanfro: { largura } }, { nome: 'f1', pontos: [[100, 0], [93.3, 25]] }, { nome: 'f2', pontos: [[93.3, 25], [86.6, 50]] }, { nome: 'b', pontos: [[86.6, 50], [0, 0]], chanfro: { largura } }] });
    expect(r(6)).toThrow(/se cruza depois do recuo das bordas, entre o trecho '[ab]' no vértice \[[^\]]+\] e o trecho '[ab]' no vértice/);
  });

  it('recusa altura de borda que deixa menos que o limite de face fina entre laços, dizendo o campo', () => {
    const q = (chanfro, quina) => () => chapaDeContorno({ nome: 'q', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 40]], chanfro }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]], quinaQuebrada: quina }] });
    expect(q({ largura: 5, resta: 2e-6 })).toThrow(/trecho 'b', chanfro\.resta = 0,000002 mm/);
    expect(q({ largura: 5, resta: 2 }, { largura: 1, altura: 2.0000001 })).toThrow(/fica a 0,0000001 mm de o trecho '[bd]'/);
    expect(q({ largura: 5, resta: 2 }, { largura: 1, altura: 3 - 1e-7 })).toThrow(/quinaQuebrada\.altura/);
    expect(q({ largura: 5, resta: 2 }, { largura: 1, altura: 1.9 })).not.toThrow();
  });

  it('dois cantos vizinhos somam as tangentes: a recusa diz a medida e os raios que cabem', () => {
        const lados = () => chapaDeContorno({ nome: 'c', espessura: 4, passo: 5, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [30, 10], [50, 10], [80, 40]] }, { nome: 'c', pontos: [[80, 40], [80, 0]] }, { nome: 'd', pontos: [[80, 0], [0, 0]] }], raioDoCanto: [{ em: [30, 10], raio: 30 }, { em: [50, 10], raio: 30 }] });
    expect(lados).toThrow(/ficam a 20 mm um do outro e pedem .* = .* mm de tangente juntos; os raios que cabem/);
  });

  it('recuoEm mede a largura ao longo do eixo pedido: num segmento inclinado a perpendicular é a largura vezes o cosseno', () => {
    const inclinada = (recuoEm) => chapaDeContorno({ nome: 'i', espessura: 6, passo: 20, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 60]], chanfro: { largura: 10, recuoEm } }, { nome: 'c', pontos: [[100, 60], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
    const folga = (r) => {
      const meio = Object.entries(r.pontosMm).filter(([n]) => n.startsWith('i_l2_b')).map(([, q]) => q).filter((q) => q[0] > 10 && q[0] < 90);
      return meio.map((q) => q[2] - (40 + 0.2 * q[0]));
    };
    for (const f of folga(inclinada('v'))) expect(f).toBeCloseTo(-10, 6);
    for (const f of folga(inclinada('normal'))) expect(f).toBeCloseTo(-10 * Math.sqrt(1.04), 6);
    expect(() => inclinada('w')).toThrow(/recuoEm é 'normal'/);
  });

  it('recuoEm numa borda paralela ao eixo é recusado: a largura efetiva some, e o trecho, o eixo e o conserto vêm na mensagem', () => {
    const r = (recuoEm) => () => chapaDeContorno({ nome: 'r', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 40]] }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]], chanfro: { largura: 10, recuoEm } }] });
    expect(r('u')).toThrow(/trechos\[3\] \('d'\).*recuoEm 'u'.*paralelo ao eixo 'u'.*use recuoEm 'normal' ou o outro eixo/);
    expect(r('v')).not.toThrow();
    expect(r('normal')).not.toThrow();
  });

  /* o volume da malha, em mm³, pela soma dos tetraedros com sinal */
  const volume = (neutro) => {
    let v = 0;
    for (const f of neutro.F.values()) {
      const P = f.vs.map((i) => neutro.V.get(i));
      for (let k = 1; k + 1 < P.length; k++) {
        const [a, b, c] = [P[0], P[k], P[k + 1]];
        v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      }
    }
    return Math.abs(v) * 1e9;
  };

  it('o chanfro que passa do primeiro ponto do vizinho liso junta os pontos ultrapassados no vértice da interseção, e o volume fecha', () => {
    const caso = (largura, passoDoVizinho) => chapaDeContorno({ nome: 'c', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 40]] }, { nome: 'c', pontos: [[100, 40], [100, 20]] }, { nome: 'e', pontos: [[100, 20], [100, 0]], passo: passoDoVizinho }, { nome: 'd', pontos: [[100, 0], [0, 0]], chanfro: { largura } }] });
    const g = caso(15, 2);
    expect(volume(medirPeca(receitaDe(g)).neutro)).toBeCloseTo(19500, 0);
    const e = Object.entries(g.pontosMm).filter(([n]) => n.startsWith('c_l2_e_')).map(([, q]) => q).sort((p, q) => q[2] - p[2]);
    expect(e.length).toBe(10);
    e.forEach((q, i) => { expect(q[0]).toBeCloseTo(100, 6); expect(q[2]).toBeCloseTo(20 - 0.5 * i, 6); });
    expect(volume(medirPeca(receitaDe(caso(15, 5))).neutro)).toBeCloseTo(19500, 0);
    expect(volume(medirPeca(receitaDe(caso(9, 2))).neutro)).toBeCloseTo(21300, 0);
    expect(volume(medirPeca(receitaDe(caso(30, 2))).neutro)).toBeCloseTo(15000, 0);
    /* o vizinho inclinado a 120 graus, em que a junção precisa de mais de uma volta */
    const r = (120 * Math.PI) / 180; const q = [100 + 20 * Math.cos(r), 20 * Math.sin(r)];
    const inclinado = chapaDeContorno({ nome: 'c', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [100, 40]] }, { nome: 'c', pontos: [[100, 40], q] }, { nome: 'e', pontos: [q, [100, 0]], passo: 2 }, { nome: 'd', pontos: [[100, 0], [0, 0]], chanfro: { largura: 15 } }] });
    expect(volume(medirPeca(receitaDe(inclinado)).neutro)).toBeCloseTo(18429.9, 0);
  });

  it('recusa resta e altura fora da espessura, pontosNoTrecho curto, e chanfro com quina no mesmo trecho', () => {
    const t = (b, extra = {}) => () => chapaDeContorno({ nome: 'r', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: 'b', pontos: [[0, 40], [30, 45], [60, 40], [100, 40]], ...b }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]], passo: 40 }], ...extra });
    expect(t({ chanfro: { largura: 2, resta: 6 } })).toThrow(/a borda precisa ficar entre 0 e a espessura 6 mm/);
    expect(t({ quinaQuebrada: { largura: 1, altura: 7 } })).toThrow(/a borda precisa ficar entre 0 e a espessura 6 mm/);
    expect(t({ pontosNoTrecho: 3 })).toThrow(/pontosNoTrecho = 3 não cobre os 3 segmentos do trecho \(pede ao menos 4\)/);
    expect(t({ pontosNoTrecho: 4 })).not.toThrow();
    expect(t({ chanfro: { largura: 2 }, quinaQuebrada: { largura: 1 } })).toThrow(/tem chanfro e quinaQuebrada: escolha um por trecho/);
  });

  it('a entrada que cairia a menos de um décimo do passo de um vértice não ganha ponto novo', () => {
    const e = (vertice) => chapaDeContorno({ nome: 'e', espessura: 6, passo: 20, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 60]] }, { nome: 'b', pontos: [[0, 60], [vertice, 60], [100, 60]], chanfro: { largura: 10, entrada: 3 } }, { nome: 'c', pontos: [[100, 60], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
    const xs = (r) => Object.values(r.pontosMm).filter((p) => Math.abs(p[2] - 60) < 1e-9 && p[0] < 6).map((p) => p[0]);
    expect(xs(e(3.5)).some((x) => Math.abs(x - 3) < 1e-6)).toBe(false);
    expect(xs(e(8)).some((x) => Math.abs(x - 3) < 1e-6)).toBe(true);
  });

  it('o nome de trecho que termina em _número_ é reservado aos segmentos gerados, e o ponto repetido num trecho vale um só', () => {
    const t = (nomeB, pontosB) => () => chapaDeContorno({ nome: 'n', espessura: 6, passo: 10, tampa: { de: 'a', ate: 'c' }, trechos: [{ nome: 'a', pontos: [[0, 0], [0, 40]] }, { nome: nomeB, pontos: pontosB }, { nome: 'c', pontos: [[100, 40], [100, 0]] }, { nome: 'd', pontos: [[100, 0], [0, 0]] }] });
    expect(t('b_0_', [[0, 40], [100, 40]])).toThrow(/o nome 'b_0_' do trecho trechos\[1\] termina em _número_, que é reservado/);
    expect(t('b_12_', [[0, 40], [100, 40]])).toThrow(/reservado/);
    expect(t('b_0', [[0, 40], [100, 40]])).not.toThrow();
    const sem = t('b', [[0, 40], [50, 40], [100, 40]])();
    const com = t('b', [[0, 40], [50, 40], [50, 40], [100, 40]])();
    expect(JSON.stringify(com.pontosMm)).toBe(JSON.stringify(sem.pontosMm));
  });
});
