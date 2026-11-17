/* componente-eletronico.test.js — a família `componente-eletronico`: cada um dos cinco encapsulamentos gerado com os parâmetros
   dele no mínimo, no padrão e no máximo da faixa, com a malha fechada, sem passo sem efeito nem face sem parte, e as medidas
   principais de cada elemento (a caixa da parte, em mm) conferidas contra os parâmetros; a contagem de pinos pelo número de
   pedaços desconexos da parte; a escolha de material da receita e as peças de prova das duas pranchas. Os encapsulamentos da
   fatia 2 (o cerâmico de disco, o LED, o TO-92, o SOIC, o borne, o jack, o módulo de placa e o dissipador) seguem o mesmo
   roteiro, e o dissipador é conferido também contra o TO-220 que ele recebe. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { analisarTopologia } from '../../nucleo/topologia.js';
import { ErroChamadaDeFamilia, FAMILIAS, chamar, criarRegistroDeFamilias } from '../index.js';
import { COMPONENTE_ELETRONICO, comMateriais } from './index.js';
import { BORNE, comprimentoDoDip, comprimentoDoSoic, DIP, DISSIPADOR, ELETROLITICO, JACK, LED, MODULO, TO220 } from './geometria.js';
import prancha from './prancha.js';
import prancha2 from './prancha-2.js';

const registro = criarRegistroDeFamilias();
const CONTRATO = COMPONENTE_ELETRONICO.contrato;
const ABERTA = ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'];

function gerar(parametros, materiais = null) {
  let chamada = chamar(COMPONENTE_ELETRONICO, 'peca', parametros);
  if (materiais) chamada = comMateriais(chamada, materiais);
  const usados = Object.entries(chamada.argumentos).filter(([nome]) => nome.startsWith('material')).map(([, v]) => v);
  const nomes = new Set([...usados, 'corpo', 'metal', 'marca', 'placa-filha', 'faixa-1', 'faixa-2', 'faixa-3', 'faixa-4', 'faixa-5']);
  const receita = { CHAMADAS_COMPOSICOES: [chamada], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: Object.fromEntries([...nomes].map((n) => [n, { cor: '#808080' }])) };
  return { chamada, neutro: executarReceita(receita, registro).neutro };
}

const facesDa = (n, parte) => [...n.F.values()].filter((f) => f.parte === parte);
function caixa(n, parte) {
  const ps = facesDa(n, parte).flatMap((f) => f.vs.map((v) => n.V.get(v)));
  return { min: [0, 1, 2].map((k) => Math.min(...ps.map((p) => p[k])) * 1000), max: [0, 1, 2].map((k) => Math.max(...ps.map((p) => p[k])) * 1000) };
}
/* os pedaços desconexos de uma parte: um por sólido (os pinos são sólidos separados) */
function pedacos(n, parte) {
  const pai = new Map();
  const achar = (v) => { while (pai.get(v) !== v) { pai.set(v, pai.get(pai.get(v))); v = pai.get(v); } return v; };
  for (const f of facesDa(n, parte)) {
    for (const v of f.vs) if (!pai.has(v)) pai.set(v, v);
    for (const v of f.vs.slice(1)) pai.set(achar(v), achar(f.vs[0]));
  }
  return new Set([...pai.keys()].map(achar)).size;
}
function conferirMalha(neutro) {
  expect(neutro.orfaos ?? []).toEqual([]);
  expect(descreverPeca(neutro).facesSemParte).toEqual([]);
  expect(analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a) => ABERTA.includes(a.codigo))).toEqual([]);
}

/* os parâmetros de um encapsulamento no mínimo, no padrão ou no máximo da faixa, com os outros no padrão, ajustados para
   respeitar as restrições (o passo do resistor acompanha o comprimento, a fileira do DIP acompanha o corpo) */
const PARAMETROS_DE = {
  1: ['comprimentoDoResistor', 'diametroDoResistor', 'passoDoResistor', 'faixasDoResistor', 'diametroDoFio', 'pernaAbaixoDaPlaca'],
  2: ['diametroDoCapacitor', 'alturaDoCapacitor', 'passoDoCapacitor', 'diametroDoFio', 'pernaAbaixoDaPlaca'],
  3: ['larguraDoTO220', 'alturaDoCorpoTO220', 'espessuraDoTO220', 'alturaDaAba', 'espessuraDaAba', 'diametroDoFuroDaAba', 'afastamentoDoTO220', 'pernaAbaixoDaPlaca'],
  4: ['pinosPorLadoDoDIP', 'fileiraDoDIP', 'larguraDoCorpoDoDIP', 'alturaDoCorpoDoDIP', 'margemDoCorpoDoDIP', 'pernaAbaixoDaPlaca'],
  5: ['viasDaBarra', 'fileirasDaBarra', 'alturaDaBaseDaBarra', 'pinoAcimaDaBase', 'ladoDoPinoDaBarra', 'pernaAbaixoDaPlaca'],
  6: ['diametroDoDisco', 'espessuraDoDisco', 'passoDoDisco', 'afastamentoDoDisco', 'diametroDoFio', 'pernaAbaixoDaPlaca'],
  7: ['diametroDoLED', 'diametroDaBordaDoLED', 'alturaDoLED', 'afastamentoDoLED', 'pernaAbaixoDaPlaca'],
  8: ['larguraDoTO92', 'alturaDoTO92', 'espessuraDoTO92', 'afastamentoDoTO92', 'pernaAbaixoDaPlaca'],
  9: ['pinosPorLadoDoSOIC', 'larguraDoCorpoDoSOIC', 'larguraTotalDoSOIC', 'alturaDoSOIC', 'margemDoCorpoDoSOIC'],
  10: ['viasDoBorne', 'pernaAbaixoDaPlaca'],
  11: ['pernaAbaixoDaPlaca'],
  12: ['pinosPorFileiraDoModulo', 'fileiraDoModulo', 'alturaDoEspacadorDoModulo', 'comprimentoDoChipDoModulo', 'larguraDoChipDoModulo', 'alturaDoChipDoModulo', 'deslocamentoDoChipDoModulo', 'pernaAbaixoDaPlaca'],
  13: ['larguraDoDissipador', 'alturaDoDissipador', 'profundidadeDoDissipador', 'espessuraDaChapaDoDissipador', 'alturaDoFuroDoDissipador', 'espessuraDoTO220', 'pernaAbaixoDaPlaca'],
};
function ponto(encapsulamento, extremo) {
  const q = { encapsulamento };
  for (const nome of PARAMETROS_DE[encapsulamento]) q[nome] = CONTRATO.parametros[nome][extremo];
  if (encapsulamento === 4 && extremo === 'minimo') q.larguraDoCorpoDoDIP = 6.1;
  if (encapsulamento === 4 && extremo === 'maximo') q.larguraDoCorpoDoDIP = 14;
  return q;
}
const EXTREMOS = ['minimo', 'padrao', 'maximo'];
const perto = (a, b, tol = 0.02) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('o registro', () => {
  it('a família está no registro do produto com as dezoito composições', () => {
    expect(FAMILIAS).toContain(COMPONENTE_ELETRONICO);
    expect(registro.familias).toContain('componente-eletronico');
    expect(COMPONENTE_ELETRONICO.composicoes).toHaveLength(18);
  });
});

describe('resistor axial', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo, faixas e terminais dobrados nas medidas pedidas`, () => {
      const q = ponto(1, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.max[0] - corpo.min[0], q.comprimentoDoResistor);
      perto(corpo.max[1] - corpo.min[1], q.diametroDoResistor, 0.05);
      expect(pedacos(neutro, 'faixa')).toBe(q.faixasDoResistor);
      expect(caixa(neutro, 'faixa').min[1]).toBeGreaterThanOrEqual(-1e-6);
      const terminal = caixa(neutro, 'terminal');
      expect(pedacos(neutro, 'terminal')).toBe(2);
      perto(terminal.max[0], q.passoDoResistor / 2 + q.diametroDoFio / 2);
      perto(terminal.min[0], -(q.passoDoResistor / 2 + q.diametroDoFio / 2));
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('eletrolítico radial', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: lata, topo, faixa de polaridade do lado negativo e dois terminais`, () => {
      const q = ponto(2, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.max[1], q.alturaDoCapacitor);
      perto(corpo.max[0] - corpo.min[0], q.diametroDoCapacitor, 0.05);
      expect(caixa(neutro, 'topo').max[1]).toBeLessThan(q.alturaDoCapacitor);
      const marca = caixa(neutro, 'marca');
      expect(marca.max[0]).toBeLessThan(0);
      perto(marca.min[0], -(q.diametroDoCapacitor / 2 + ELETROLITICO.faixa.sobra), 0.05);
      expect(pedacos(neutro, 'terminal')).toBe(2);
      const terminal = caixa(neutro, 'terminal');
      perto(terminal.max[0], q.passoDoCapacitor / 2 + q.diametroDoFio / 2, 0.03);
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('TO-220', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo, aba furada atrás e três terminais no passo`, () => {
      const q = ponto(3, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const aba = caixa(neutro, 'aba');
      perto(aba.max[0] - aba.min[0], q.larguraDoTO220);
      perto(aba.max[1], q.afastamentoDoTO220 + q.alturaDoCorpoTO220 + q.alturaDaAba);
      perto(aba.max[2] - aba.min[2], q.espessuraDaAba);
      perto(aba.min[2], -q.espessuraDoTO220 / 2);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.min[1], q.afastamentoDoTO220);
      perto(corpo.max[1] - corpo.min[1], q.alturaDoCorpoTO220);
      perto(corpo.max[2], q.espessuraDoTO220 / 2);
      /* o furo: nenhum vértice da aba fica dentro do círculo dele */
      const yFuro = aba.max[1] - TO220.furoAbaixoDoTopo;
      const dentro = facesDa(neutro, 'aba').flatMap((f) => f.vs.map((v) => neutro.V.get(v))).filter((p) => Math.hypot(p[0] * 1000, p[1] * 1000 - yFuro) < q.diametroDoFuroDaAba / 2 - 0.2);
      expect(dentro).toEqual([]);
      expect(pedacos(neutro, 'terminal')).toBe(3);
      const terminal = caixa(neutro, 'terminal');
      perto(terminal.max[0], 2.54 + TO220.larguraDoOmbro / 2);
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('DIP', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo com entalhe e os pinos dos dois lados na fileira`, () => {
      const q = ponto(4, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.max[0] - corpo.min[0], comprimentoDoDip(q.pinosPorLadoDoDIP, q.margemDoCorpoDoDIP));
      perto(corpo.max[2] - corpo.min[2], q.larguraDoCorpoDoDIP);
      perto(corpo.max[1], DIP.assento + q.alturaDoCorpoDoDIP);
      /* o entalhe tira material da ponta -x no alto do corpo: há vértices do corpo dentro do raio dele, na ponta */
      expect(facesDa(neutro, 'corpo').some((f) => f.vs.some((v) => { const p = neutro.V.get(v); return Math.abs(p[0] * 1000 - corpo.min[0] - DIP.entalhe.raio) < 0.01 && Math.abs(p[2]) < 0.01; }))).toBe(true);
      expect(pedacos(neutro, 'pino')).toBe(2 * q.pinosPorLadoDoDIP);
      const pino = caixa(neutro, 'pino');
      perto(pino.max[2], q.fileiraDoDIP / 2 + DIP.espessuraDoPino / 2);
      perto(pino.max[0] - pino.min[0], (q.pinosPorLadoDoDIP - 1) * 2.54 + DIP.larguraDoOmbro);
      perto(pino.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('barra de pinos', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: base e pinos em fileiras no passo`, () => {
      const q = ponto(5, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const base = caixa(neutro, 'base');
      perto(base.max[0] - base.min[0], q.viasDaBarra * 2.54);
      perto(base.max[2] - base.min[2], q.fileirasDaBarra * 2.54);
      perto(base.max[1], q.alturaDaBaseDaBarra);
      expect(pedacos(neutro, 'pino')).toBe(q.viasDaBarra * q.fileirasDaBarra);
      const pino = caixa(neutro, 'pino');
      perto(pino.max[1], q.alturaDaBaseDaBarra + q.pinoAcimaDaBase);
      perto(pino.min[1], -q.pernaAbaixoDaPlaca);
      perto(pino.max[0] - pino.min[0], (q.viasDaBarra - 1) * 2.54 + q.ladoDoPinoDaBarra);
    });
  }
  it('uma via em duas fileiras (a variante sem cópia)', () => {
    const { neutro, chamada } = gerar({ encapsulamento: 5, viasDaBarra: 1, fileirasDaBarra: 2 });
    conferirMalha(neutro);
    expect(chamada.composicao).toBe('componente-eletronico.barra-de-pinos-2-fileiras-uma-via');
    expect(pedacos(neutro, 'pino')).toBe(2);
  });
});

const largura = (b, k) => b.max[k] - b.min[k];

describe('cerâmico de disco', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: disco em pé e dois terminais no passo`, () => {
      const q = ponto(6, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(largura(corpo, 0), q.diametroDoDisco, 0.03);
      perto(corpo.min[1], q.afastamentoDoDisco, 0.03);
      perto(corpo.max[1], q.afastamentoDoDisco + q.diametroDoDisco, 0.03);
      perto(largura(corpo, 2), q.espessuraDoDisco);
      expect(pedacos(neutro, 'terminal')).toBe(2);
      const terminal = caixa(neutro, 'terminal');
      perto(terminal.max[0], q.passoDoDisco / 2 + q.diametroDoFio / 2, 0.03);
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('LED', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: borda, domo e chanfro do catodo, dois terminais no passo`, () => {
      const q = ponto(7, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.min[1], q.afastamentoDoLED);
      perto(corpo.max[1], q.afastamentoDoLED + q.alturaDoLED, 0.03);
      perto(largura(corpo, 2), q.diametroDaBordaDoLED, 0.03);
      perto(corpo.max[0], q.diametroDaBordaDoLED / 2, 0.03);
      perto(corpo.min[0], -(q.diametroDoLED / 2 + LED.chanfro), 0.03);
      expect(pedacos(neutro, 'terminal')).toBe(2);
      const terminal = caixa(neutro, 'terminal');
      perto(terminal.max[0], 1.27 + LED.ladoDoTerminal / 2);
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('TO-92', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo em D com a face plana em +z e três terminais abrindo para o passo de 2,54`, () => {
      const q = ponto(8, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(largura(corpo, 0), q.larguraDoTO92, 0.03);
      perto(corpo.min[1], q.afastamentoDoTO92);
      perto(largura(corpo, 1), q.alturaDoTO92);
      perto(corpo.min[2], -q.larguraDoTO92 / 2, 0.03);
      perto(corpo.max[2], q.espessuraDoTO92 - q.larguraDoTO92 / 2);
      expect(pedacos(neutro, 'terminal')).toBe(3);
      const terminal = caixa(neutro, 'terminal');
      perto(terminal.max[0], 2.54 + 0.235, 0.03);
      perto(terminal.min[1], -q.pernaAbaixoDaPlaca);
      expect(terminal.max[1]).toBeLessThan(q.afastamentoDoTO92 + 1);
    });
  }
});

describe('SOIC', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo baixo e os pinos em asa de gaivota com o pé na placa`, () => {
      const q = ponto(9, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(largura(corpo, 0), comprimentoDoSoic(q.pinosPorLadoDoSOIC, q.margemDoCorpoDoSOIC));
      perto(largura(corpo, 2), q.larguraDoCorpoDoSOIC);
      perto(corpo.max[1], q.alturaDoSOIC);
      expect(pedacos(neutro, 'pino')).toBe(2 * q.pinosPorLadoDoSOIC);
      const pino = caixa(neutro, 'pino');
      perto(pino.max[2], q.larguraTotalDoSOIC / 2);
      perto(pino.min[1], 0);
      perto(largura(pino, 0), (q.pinosPorLadoDoSOIC - 1) * 1.27 + 0.42);
    });
  }
});

describe('borne de parafuso', () => {
  for (const vias of [2, 3]) {
    it(`de ${vias} vias: corpo no passo de 5,08, um parafuso e um pino por via`, () => {
      const { neutro, chamada } = gerar({ encapsulamento: 10, viasDoBorne: vias });
      conferirMalha(neutro);
      expect(chamada.composicao).toBe(`componente-eletronico.borne-de-parafuso-${vias}-vias`);
      const corpo = caixa(neutro, 'corpo');
      perto(largura(corpo, 0), vias * BORNE.passo);
      perto(corpo.max[1], BORNE.altura);
      perto(corpo.min[2], -BORNE.pinoATras);
      perto(largura(corpo, 2), BORNE.profundidade);
      expect(pedacos(neutro, 'parafuso')).toBe(vias);
      expect(caixa(neutro, 'parafuso').max[1]).toBeLessThan(BORNE.altura);
      expect(pedacos(neutro, 'terminal')).toBe(vias);
      perto(caixa(neutro, 'terminal').max[0], ((vias - 1) / 2) * BORNE.passo + BORNE.pino / 2);
    });
  }
});

describe('jack de alimentação', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: corpo com a boca, o pino central e três lâminas`, () => {
      const q = ponto(11, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(corpo.min[0], -JACK.frente);
      perto(largura(corpo, 0), JACK.comprimento);
      perto(largura(corpo, 1), JACK.altura);
      perto(largura(corpo, 2), JACK.largura);
      /* a boca: a face da frente tem vértices no círculo de 6,5 em volta do centro dela */
      const naBoca = facesDa(neutro, 'corpo').flatMap((f) => f.vs.map((v) => neutro.V.get(v)))
        .filter((p) => Math.abs(p[0] * 1000 + JACK.frente) < 0.01 && Math.abs(Math.hypot(p[1] * 1000 - JACK.alturaDaBoca, p[2] * 1000) - JACK.boca / 2) < 0.01);
      expect(naBoca.length).toBeGreaterThanOrEqual(8);
      expect(pedacos(neutro, 'pino')).toBe(1);
      expect(pedacos(neutro, 'terminal')).toBe(3);
      perto(caixa(neutro, 'terminal').min[1], -q.pernaAbaixoDaPlaca);
    });
  }
});

describe('módulo de placa', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: placa filha sobre as barras, duas fileiras de pinos e o componente de cima`, () => {
      const q = ponto(12, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const placa = caixa(neutro, 'placa-filha');
      perto(largura(placa, 0), q.pinosPorFileiraDoModulo * 2.54);
      perto(largura(placa, 2), q.fileiraDoModulo + 2.54);
      perto(placa.min[1], q.alturaDoEspacadorDoModulo);
      perto(placa.max[1], q.alturaDoEspacadorDoModulo + MODULO.espessuraDaPlaca);
      expect(pedacos(neutro, 'base')).toBe(2);
      expect(pedacos(neutro, 'pino')).toBe(2 * q.pinosPorFileiraDoModulo);
      perto(caixa(neutro, 'pino').max[2], q.fileiraDoModulo / 2 + MODULO.pino / 2);
      const chip = caixa(neutro, 'chip');
      perto((chip.min[0] + chip.max[0]) / 2, q.deslocamentoDoChipDoModulo);
      perto(chip.max[1], q.alturaDoEspacadorDoModulo + MODULO.espessuraDaPlaca + q.alturaDoChipDoModulo);
    });
  }
});

describe('dissipador do TO-220', () => {
  for (const extremo of EXTREMOS) {
    it(`no ${extremo}: canal com a chapa furada, as fendas nos flanges e as duas aletas de solda`, () => {
      const q = ponto(13, extremo);
      const { neutro } = gerar(q);
      conferirMalha(neutro);
      const corpo = caixa(neutro, 'corpo');
      perto(largura(corpo, 0), q.larguraDoDissipador);
      perto(largura(corpo, 1), q.alturaDoDissipador);
      perto(corpo.max[2], -q.espessuraDoTO220 / 2);
      perto(corpo.min[2], -q.espessuraDoTO220 / 2 - q.profundidadeDoDissipador);
      expect(pedacos(neutro, 'corpo')).toBe(3);
      /* o furo: nenhum vértice da chapa dentro do círculo dele; e as fendas: vértices do flange no fundo de cada uma */
      const ps = facesDa(neutro, 'corpo').flatMap((f) => f.vs.map((v) => neutro.V.get(v)).map((p) => p.map((c) => c * 1000)));
      expect(ps.filter((p) => Math.hypot(p[0], p[1] - q.alturaDoFuroDoDissipador) < DISSIPADOR.furo / 2 - 0.2)).toEqual([]);
      const zFenda = -q.espessuraDoTO220 / 2 - q.espessuraDaChapaDoDissipador + DISSIPADOR.sobreposicao - DISSIPADOR.fendas.preso;
      const fundos = new Set(ps.filter((p) => Math.abs(p[2] - zFenda) < 0.01).map((p) => p[1].toFixed(2)));
      expect(fundos.size).toBe(2 * DISSIPADOR.fendas.total);
      expect(pedacos(neutro, 'terminal')).toBe(2);
      perto(caixa(neutro, 'terminal').min[1], -q.pernaAbaixoDaPlaca);
    });
  }
  it('recebe o TO-220 do perfil dele: o furo da aba na altura do furo do dissipador e as costas da aba na face de montagem', () => {
    const to220 = gerar({ perfil: 'to-220-no-dissipador' }).neutro;
    const aba = caixa(to220, 'aba');
    const dissipador = caixa(gerar({ perfil: 'dissipador-to-220' }).neutro, 'corpo');
    perto(aba.max[1] - TO220.furoAbaixoDoTopo, CONTRATO.perfis['dissipador-to-220'].parametros.alturaDoFuroDoDissipador);
    perto(aba.min[2], dissipador.max[2]);
  });
});

describe('restrições e materiais', () => {
  it('recusa o passo do resistor que deixa a dobra dentro do corpo e o corpo do DIP mais largo que a fileira', () => {
    expect(() => chamar(COMPONENTE_ELETRONICO, 'r', { encapsulamento: 1, comprimentoDoResistor: 12, passoDoResistor: 10.16 })).toThrow(ErroChamadaDeFamilia);
    expect(() => chamar(COMPONENTE_ELETRONICO, 'd', { encapsulamento: 4, larguraDoCorpoDoDIP: 14 })).toThrow(/pino-do-dip-sai-do-corpo/);
  });

  it('a receita escolhe o material de cada elemento, e a escolha errada é recusada', () => {
    const { neutro } = gerar({ perfil: 'resistor-1-4w' }, { corpo: 'bege', terminal: 'estanho', faixas: ['marrom', 'preto', 'laranja', 'dourado'] });
    const materialDa = (parte) => new Set(facesDa(neutro, parte).map((f) => f.material));
    expect([...materialDa('corpo')]).toEqual(['bege']);
    expect([...materialDa('terminal')]).toEqual(['estanho']);
    expect([...materialDa('faixa')].sort()).toEqual(['dourado', 'laranja', 'marrom', 'preto']);
    const chamada = chamar(COMPONENTE_ELETRONICO, 'r', { perfil: 'resistor-1-4w' });
    expect(() => comMateriais(chamada, { aba: 'aco' })).toThrow(/escolha\.aba/);
    expect(() => comMateriais(chamada, { faixas: ['marrom'] })).toThrow(/lista com 4 nomes/);
  });

  it('os mesmos parâmetros dão a mesma malha', () => {
    const a = gerar({ perfil: 'dip-8' }).neutro;
    const b = gerar({ perfil: 'dip-8' }).neutro;
    expect(JSON.stringify([...b.V.entries()])).toBe(JSON.stringify([...a.V.entries()]));
  });
});

describe('a peça de prova da prancha', () => {
  it('gera os cinco componentes numa placa, sem passo sem efeito, com a malha fechada', () => {
    const { neutro } = executarReceita(prancha);
    conferirMalha(neutro);
    const partes = new Set([...neutro.F.values()].map((f) => f.parte));
    expect([...partes].sort()).toEqual(['aba', 'base', 'corpo', 'faixa', 'marca', 'pino', 'placa', 'terminal', 'topo']);
    expect(pedacos(neutro, 'corpo')).toBe(4);
  });

  it('a da fatia 2 gera os doze lugares, com o TO-220 e o dissipador juntos, sem passo sem efeito e com a malha fechada', () => {
    const { neutro } = executarReceita(prancha2);
    conferirMalha(neutro);
    const partes = new Set([...neutro.F.values()].map((f) => f.parte));
    expect([...partes].sort()).toEqual(['aba', 'base', 'chip', 'corpo', 'parafuso', 'pino', 'placa', 'placa-filha', 'terminal']);
  });
});
