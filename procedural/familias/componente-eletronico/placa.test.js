/* placa.test.js — a placa declarada da família `componente-eletronico` (fatia 3 do plano da família), sem a placa de prova, que
   tem arquivo próprio (`placa-de-prova.test.js`).

   Confere, pela malha gerada, que os terminais que `terminais.js` declara são os pedaços de terminal que cada encapsulamento
   gera, no mesmo lugar e com a mesma seção, e que a altura do assento é a do ponto mais baixo do componente; que a orientação
   publicada reconstrói a pose nas duas faces; e as recusas da declaração. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { analisarTopologia } from '../../nucleo/topologia.js';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { COMPONENTE_ELETRONICO, comMateriais } from './index.js';
import { eixoEAngulo, placaDeclarada } from './placa.js';
import { alturaDoAssento, terminaisDoComponente } from './terminais.js';
import { MATERIAIS } from './placa-de-prova.js';

const registro = criarRegistroDeFamilias();
const CONTRATO = COMPONENTE_ELETRONICO.contrato;
const TERMINAIS = new Set(['terminal', 'pino']);

const completos = (brutos) => {
  const doPerfil = brutos.perfil ? CONTRATO.perfis[brutos.perfil].parametros : {};
  return Object.fromEntries(Object.entries(CONTRATO.parametros).map(([n, { padrao }]) => [n, brutos[n] ?? doPerfil[n] ?? padrao]));
};
function sozinho(brutos, materiais = null) {
  let chamada = chamar(COMPONENTE_ELETRONICO, 'peca', brutos);
  if (materiais) chamada = comMateriais(chamada, materiais);
  const usados = Object.entries(chamada.argumentos).filter(([n]) => n.startsWith('material')).map(([, v]) => v);
  const nomes = new Set([...usados, ...Object.keys(MATERIAIS), 'corpo', 'metal', 'marca', 'placa-filha', 'faixa-1', 'faixa-2', 'faixa-3', 'faixa-4', 'faixa-5']);
  const receita = { CHAMADAS_COMPOSICOES: [chamada], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: Object.fromEntries([...nomes].map((n) => [n, { cor: '#808080' }])) };
  return executarReceita(receita, registro).neutro;
}
/* os pedaços desconexos das faces que passam no filtro, cada um com os ids de vértice dele */
function pedacos(neutro, filtro) {
  const pai = new Map();
  const achar = (v) => { while (pai.get(v) !== v) { pai.set(v, pai.get(pai.get(v))); v = pai.get(v); } return v; };
  for (const f of neutro.F.values()) {
    if (!filtro(f)) continue;
    for (const v of f.vs) if (!pai.has(v)) pai.set(v, v);
    for (const v of f.vs.slice(1)) pai.set(achar(v), achar(f.vs[0]));
  }
  const grupos = new Map();
  for (const v of pai.keys()) grupos.set(achar(v), [...(grupos.get(achar(v)) ?? []), v]);
  return [...grupos.values()].map((vs) => vs.map((v) => neutro.V.get(v).map((c) => c * 1000)));
}
/* a pegada de um pedaço de terminal: a caixa em xz dos vértices abaixo da face da placa, no que a atravessa (a ponta chanfrada
   do pino fica dentro dessa caixa), e a dos vértices do pé, no que deita nela */
function pegada(pontos) {
  const yMin = Math.min(...pontos.map((p) => p[1]));
  const baixo = pontos.filter((p) => (yMin < -0.05 ? p[1] < -0.01 : p[1] <= yMin + 1e-3));
  const min = [0, 2].map((k) => Math.min(...baixo.map((p) => p[k])));
  const max = [0, 2].map((k) => Math.max(...baixo.map((p) => p[k])));
  return { yMin, x: (min[0] + max[0]) / 2, z: (min[1] + max[1]) / 2, largura: max[0] - min[0], profundidade: max[1] - min[1] };
}
const CASOS = [
  ...Object.keys(CONTRATO.perfis).map((perfil) => ({ perfil })),
  { perfil: 'dip-8', pinosPorLadoDoDIP: 20 },
  { perfil: 'barra-1x8', fileirasDaBarra: 2, viasDaBarra: 40 },
  { perfil: 'barra-1x8', viasDaBarra: 1 },
  { perfil: 'soic-8', pinosPorLadoDoSOIC: 8 },
  { perfil: 'resistor-1-4w', passoDoResistor: 25.4, diametroDoFio: 0.8 },
  { perfil: 'eletrolitico-6-3x11', diametroDoCapacitor: 18, passoDoCapacitor: 7.5, diametroDoFio: 1 },
  { perfil: 'to-220', espessuraDaAba: 1.15, afastamentoDoTO220: 0 },
  { perfil: 'ceramico-disco-5', passoDoDisco: 2.5, afastamentoDoDisco: 1 },
  { perfil: 'led-5', afastamentoDoLED: 3 },
  { perfil: 'to-92', afastamentoDoTO92: 1.5 },
  { perfil: 'modulo-driver-de-passo', pinosPorFileiraDoModulo: 20, fileiraDoModulo: 22.86 },
];
const nomeDo = (caso) => Object.entries(caso).map(([k, v]) => (k === 'perfil' ? v : `${k}=${v}`)).join(' ');

describe('os terminais declarados', () => {
  for (const caso of CASOS) {
    it(`${nomeDo(caso)}: cada terminal declarado é um pedaço de terminal da malha, no mesmo lugar e com a mesma seção`, () => {
      const q = completos(caso);
      const neutro = sozinho(caso);
      const medidos = pedacos(neutro, (f) => TERMINAIS.has(f.parte)).map(pegada).filter((p) => p.yMin < 0.05);
      const declarados = terminaisDoComponente(q);
      expect(medidos).toHaveLength(declarados.length);
      expect(new Set(declarados.map((t) => t.id)).size).toBe(declarados.length);
      for (const t of declarados) {
        const achado = medidos.filter((m) => Math.hypot(m.x - t.x, m.z - t.z) < 0.01);
        expect(achado, `terminal ${t.id} em [${t.x}, ${t.z}]`).toHaveLength(1);
        const [m] = achado;
        expect(m.yMin).toBeCloseTo(t.atravessa ? -q.pernaAbaixoDaPlaca : 0, 4);
        if (t.secao.forma === 'redondo') {
          expect(m.largura).toBeLessThanOrEqual(t.secao.diametro + 1e-6);
          expect(m.largura).toBeGreaterThan(t.secao.diametro * 0.9);
        } else {
          expect(m.largura).toBeCloseTo(t.secao.largura, 4);
          expect(m.profundidade).toBeCloseTo(t.secao.profundidade, 4);
        }
      }
    });
  }
  it('a altura do assento é a do ponto mais baixo do componente fora dos terminais que atravessam a placa', () => {
    for (const caso of CASOS) {
      const neutro = sozinho(caso);
      const corpo = pedacos(neutro, () => true).filter((pontos) => Math.min(...pontos.map((p) => p[1])) > -0.05);
      const medida = Math.min(...corpo.flat().map((p) => p[1]));
      expect(Math.abs(medida - alturaDoAssento(completos(caso))), nomeDo(caso)).toBeLessThan(1e-4);
    }
  });
});

/* a pose de um componente pela orientação publicada (eixo e ângulo, Rodrigues) e pela posição */
function rodrigues({ eixo: [x, y, z], angulo }) {
  const t = (angulo * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}

describe('a orientação publicada', () => {
  it('de cima é o giro em +y; de baixo é meia volta em torno de [cos(g/2), 0, -sen(g/2)]', () => {
    for (const giro of [0, 30, 90, 135, 180, 270, -45]) {
      const declaracao = (lado) => ({ contorno: { retangulo: { largura: 40, profundidade: 40 } }, pecas: [{ id: 'r1', perfil: 'resistor-1-4w', posicao: [0, 0], giro, lado }] });
      const cima = placaDeclarada(declaracao('cima')).pecas[1].orientacao;
      const baixo = placaDeclarada(declaracao('baixo')).pecas[1].orientacao;
      const g = ((giro % 360) + 360) % 360;
      if (g === 0) expect(cima).toEqual({ eixo: [0, 1, 0], angulo: 0 });
      else if (g <= 180) expect(cima).toEqual({ eixo: [0, 1, 0], angulo: g });
      else expect(cima).toEqual({ eixo: [0, -1, 0], angulo: 360 - g });
      expect(baixo.angulo).toBeCloseTo(180, 6);
      const esperado = [Math.cos((giro * Math.PI) / 360), 0, -Math.sin((giro * Math.PI) / 360)];
      const sinal = Math.sign(esperado.find((v) => Math.abs(v) > 1e-9) * baixo.eixo.find((v) => Math.abs(v) > 1e-9));
      baixo.eixo.forEach((v, k) => expect(v * sinal).toBeCloseTo(esperado[k], 9));
    }
  });
  it('eixoEAngulo de uma rotação qualquer volta a ela por Rodrigues', () => {
    const m = rodrigues({ eixo: [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)], angulo: 120 });
    const r = rodrigues(eixoEAngulo(m));
    m.forEach((linha, i) => linha.forEach((v, j) => expect(r[i][j]).toBeCloseTo(v, 9)));
  });
});

describe('as recusas da declaração', () => {
  const base = () => ({ contorno: { retangulo: { largura: 40, profundidade: 30 } }, pecas: [{ id: 'r1', perfil: 'resistor-1-4w', posicao: [0, 0] }] });
  const com = (mudar) => { const d = base(); mudar(d); return () => placaDeclarada(d); };
  it.each([
    ['id que não é designador', (d) => { d.pecas[0].id = 'R-1'; }, /pecas\[0\]\.id/],
    ['id repetido', (d) => { d.pecas.push({ id: 'r1', perfil: 'led-5', posicao: [10, 10] }); }, /pecas\[1\]\.id/],
    ['id igual ao da placa', (d) => { d.pecas[0].id = 'placa'; }, /pecas\[0\]\.id/],
    ['tipo desconhecido', (d) => { d.pecas[0] = { id: 'r1', tipo: 'qfp', posicao: [0, 0] }; }, /pecas\[0\]\.tipo/],
    ['tipo que não é o do perfil', (d) => { d.pecas[0].tipo = 'dip'; }, /o encapsulamento do perfil 'resistor-1-4w'/],
    ['sem tipo nem perfil', (d) => { d.pecas[0] = { id: 'r1', posicao: [0, 0] }; }, /pecas\[0\]\.tipo/],
    ['lado desconhecido', (d) => { d.pecas[0].lado = 'meio'; }, /pecas\[0\]\.lado/],
    ['giro que não é número', (d) => { d.pecas[0].giro = '90'; }, /pecas\[0\]\.giro/],
    ['posição em três números', (d) => { d.pecas[0].posicao = [0, 0, 0]; }, /pecas\[0\]\.posicao/],
    ['encapsulamento entre os parâmetros', (d) => { d.pecas[0].parametros = { encapsulamento: 4 }; }, /parametros\.encapsulamento/],
    ['parâmetro fora da faixa', (d) => { d.pecas[0].parametros = { passoDoResistor: 99 }; }, /passoDoResistor/],
    ['terminal fora do contorno', (d) => { d.pecas[0].posicao = [16, 0]; }, /a ilha do terminal 2 de r1 fique dentro do contorno/],
    ['ilhas encostadas', (d) => { d.pecas.push({ id: 'r2', perfil: 'resistor-1-4w', posicao: [0, 1] }); }, /a 0\.15 mm ou mais/],
    ['furo de fixação na ilha', (d) => { d.furos = [{ centro: [5.08, 0], diametro: 3 }]; }, /furo de fixação 0/],
    ['encosta em peça que não existe', (d) => { d.pecas[0].encostaEm = [{ peca: 'u9', motivo: 'teste' }]; }, /encostaEm\[0\]\.peca/],
    ['espessura menor que o cobre', (d) => { d.espessura = 0.1; }, /placa\.espessura/],
    ['contorno de dois pontos', (d) => { d.contorno = [[0, 0], [1, 1]]; }, /placa\.contorno/],
    ['pose sem posição', (d) => { d.pose = { rotacoes: [] }; }, /placa\.pose\.posicao/],
    ['pose com eixo desconhecido', (d) => { d.pose = { rotacoes: [{ eixo: 'w', graus: 90 }], posicao: [0, 0, 0] }; }, /placa\.pose\.rotacoes\[0\]/],
    ['pose com graus em texto', (d) => { d.pose = { rotacoes: [{ eixo: 'x', graus: '90' }], posicao: [0, 0, 0] }; }, /placa\.pose\.rotacoes\[0\]/],
  ])('%s', (_, mudar, mensagem) => {
    expect(com(mudar)).toThrow(mensagem);
  });
  it('a declaração mínima passa e a peça de baixo assenta em y = -espessura', () => {
    const { pecas } = placaDeclarada({ ...base(), pecas: [{ id: 'u1', perfil: 'soic-8', posicao: [0, 0], lado: 'baixo' }] });
    expect(pecas[1].posicao).toEqual([0, -1.6, 0]);
    expect(pecas[1].terminais.every((t) => !t.atravessa && t.naPlaca[1] === -1.6)).toBe(true);
  });
});

/* a pose na peça hospedeira: a malha da placa posta é a da placa sem pose, vértice a vértice, levada pelas rotações e pela
   translação declaradas; e o que se publica passa ao referencial da peça, com o da placa em naPlaca */
describe('a pose da placa na peça hospedeira', () => {
  const declaracao = (pose) => ({
    contorno: { retangulo: { largura: 40, profundidade: 30, cantos: 2 } },
    furos: [{ centro: [16, 11], diametro: 3.2 }],
    pecas: [
      { id: 'r1', perfil: 'resistor-1-4w', posicao: [-4, -6], giro: 30 },
      { id: 'u1', perfil: 'soic-8', posicao: [8, 6], lado: 'baixo', giro: 90 },
      { id: 'c1', perfil: 'eletrolitico-6-3x11', posicao: [-10, 8] },
    ],
    ...(pose ? { pose } : {}),
  });
  const POSE = { rotacoes: [{ eixo: 'z', graus: 90 }, { eixo: 'y', graus: -30 }], posicao: [-110, 115, 7] };
  const giro = (eixo, graus) => {
    const t = (graus * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    return { x: [[1, 0, 0], [0, c, -s], [0, s, c]], y: [[c, 0, s], [0, 1, 0], [-s, 0, c]], z: [[c, -s, 0], [s, c, 0], [0, 0, 1]] }[eixo];
  };
  const aplicar = (m, p) => m.map(([a, b, c]) => a * p[0] + b * p[1] + c * p[2]);
  /* a pose esperada sai da declaração: cada rotação na ordem, depois a translação */
  const posar = (p) => POSE.rotacoes.reduce((q, r) => aplicar(giro(r.eixo, r.graus), q), p).map((v, k) => v + POSE.posicao[k]);
  const malha = (d) => {
    const gerada = placaDeclarada(d);
    const nomes = new Set([...gerada.materiais, 'corpo', 'metal', 'marca', 'placa-filha', 'faixa-1', 'faixa-2', 'faixa-3', 'faixa-4', 'faixa-5']);
    const receita = { PASSOS: gerada.passos, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: Object.fromEntries([...nomes].map((n) => [n, { cor: '#808080' }])) };
    return { gerada, neutro: executarReceita(receita, registro).neutro };
  };

  it('a malha posta é a malha sem pose levada pela pose, parte por parte, vértice a vértice', () => {
    const sem = malha(declaracao());
    const com = malha(declaracao(POSE));
    expect(com.neutro.orfaos ?? []).toEqual([]);
    let pior = 0;
    for (const parte of ['placa', 'r1', 'u1', 'c1']) {
      const vertices = (n) => [...new Set([...n.F.values()].filter((f) => f.parte === parte).flatMap((f) => f.vs))].sort((a, b) => a - b).map((v) => n.V.get(v).map((c) => c * 1000));
      const antes = vertices(sem.neutro), depois = vertices(com.neutro);
      expect(depois.length, parte).toBe(antes.length);
      expect(antes.length, parte).toBeGreaterThan(0);
      antes.forEach((p, k) => { pior = Math.max(pior, ...posar(p).map((v, j) => Math.abs(v - depois[k][j]))); });
    }
    expect(pior).toBeLessThan(1e-6);
  });

  it('publica a posição e a orientação no referencial da peça, e as da placa em naPlaca', () => {
    const sem = placaDeclarada(declaracao()).pecas;
    const { pecas, pose } = placaDeclarada(declaracao(POSE));
    /* a matriz da pose montada da declaração, coluna por coluna, e a orientação publicada da pose volta a ela */
    const colunas = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => POSE.rotacoes.reduce((q, r) => aplicar(giro(r.eixo, r.graus), q), e));
    const matrizDaPose = [0, 1, 2].map((i) => colunas.map((c) => c[i]));
    rodrigues(pose.orientacao).forEach((linha, i) => linha.forEach((v, j) => expect(v).toBeCloseTo(matrizDaPose[i][j], 9)));
    expect(pose.posicao).toEqual(POSE.posicao);
    expect(pecas[0].posicao).toEqual(POSE.posicao);
    for (const [k, p] of pecas.entries()) {
      expect(p.naPlaca).toEqual({ posicao: sem[k].posicao, orientacao: sem[k].orientacao });
      posar(sem[k].posicao).forEach((v, j) => expect(p.posicao[j]).toBeCloseTo(v, 9));
      /* a orientação publicada é a da pose composta com a da peça na placa */
      const esperada = rodrigues(sem[k].orientacao).map((linha, i) => linha.map((_, j) => matrizDaPose[i].reduce((soma, v, n) => soma + v * rodrigues(sem[k].orientacao)[n][j], 0)));
      const publicada = rodrigues(p.orientacao);
      esperada.forEach((linha, i) => linha.forEach((v, j) => expect(publicada[i][j]).toBeCloseTo(v, 9)));
      /* os terminais seguem no plano da placa */
      expect(p.terminais ?? []).toEqual(sem[k].terminais ?? []);
    }
  });

  it('sem pose a saída não muda, e partesDoPlano promete a placa e cada componente', () => {
    const gerada = placaDeclarada(declaracao());
    expect(gerada.pose).toBeUndefined();
    expect(gerada.pecas.every((p) => p.naPlaca === undefined)).toBe(true);
    expect(gerada.partesDoPlano.map((p) => p.nome)).toEqual(['placa', 'r1', 'u1', 'c1']);
    for (const p of gerada.partesDoPlano) expect(p.forma.length).toBeLessThanOrEqual(240);
  });
});

/* a placa em faixas: com mais furos numa camada do que a extrusão triangula em tempo razoável, a camada sai em faixas que
   somam o contorno, cada furo inteiro numa faixa só, e a malha continua fechada */
describe('a placa com muitos furos sai em faixas', () => {
  const declaracao = {
    contorno: { retangulo: { largura: 120, profundidade: 60, cantos: 3 } },
    furos: [{ centro: [-55, -25], diametro: 3.2 }, { centro: [55, 25], diametro: 3.2 }],
    pecas: [
      { id: 'j1', perfil: 'barra-1x8', parametros: { viasDaBarra: 40, fileirasDaBarra: 2 }, posicao: [0, -15] },
      { id: 'u1', perfil: 'dip-40', posicao: [0, 12] },
    ],
  };
  const area = (p) => Math.abs(p.reduce((s, [x, z], k) => { const [x1, z1] = p[(k + 1) % p.length]; return s + x * z1 - x1 * z; }, 0)) / 2;
  it('cada camada soma a área do contorno, com cada furo numa faixa só', () => {
    const gerada = placaDeclarada(declaracao);
    const camadas = [1, 2, 3].map((k) => gerada.passos.filter(([op, a]) => op === 'extrusao' && (a.origemId === k || (a.origemId >= 100 && a.origemId < 1000 && (a.origemId - 100) % 3 === k - 1))));
    const contorno = area(gerada.pecas[0].contorno) * 1e-6;
    const furosNaPlaca = gerada.furos.length;
    for (const faixas of camadas) {
      expect(faixas.length).toBeGreaterThan(1);
      expect(faixas.reduce((s, [, a]) => s + area(a.perfil), 0)).toBeCloseTo(contorno, 12);
    }
    expect(camadas[0].reduce((s, [, a]) => s + a.furos.length, 0)).toBe(furosNaPlaca);
  });
  it('a malha em faixas é fechada e sem passo sem efeito', () => {
    const gerada = placaDeclarada(declaracao);
    const nomes = new Set([...gerada.materiais, 'corpo', 'metal', 'marca', 'placa-filha', 'faixa-1', 'faixa-2', 'faixa-3', 'faixa-4', 'faixa-5']);
    const { neutro } = executarReceita({ PASSOS: gerada.passos, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: Object.fromEntries([...nomes].map((n) => [n, { cor: '#808080' }])) }, registro);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a) => ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'].includes(a.codigo))).toEqual([]);
  });
});
