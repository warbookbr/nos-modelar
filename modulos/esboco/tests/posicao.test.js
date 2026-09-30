/* Posicionar sem calcular coordenada: haste `de`/`para`, `encosta`, `alinha` e pontos nomeados. */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { desenharEsboco, ErroDeEsboco, resolverOpcao } from '../src/index.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { verificarContato } from '../src/contato.js';

const fixture = (nome) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${nome}.esboco.json`, import.meta.url)), 'utf8'));
const perto = (v, esperado, casas = 6) => v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas));
const caixa = (id, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, ...extra });
const resolver = (formas, pontos) => Object.fromEntries(resolverOpcao({ formas }, 'opção', pontos).map((r) => [r.id, r]));
const anguloX = (m) => (Math.atan2(m[2][1], m[1][1]) * 180) / Math.PI;

describe('haste entre dois pontos (de/para)', () => {
  const garfo = { id: 'g', tipo: 'cilindro', diametro: 46, de: [-90, 300, 700], para: [-90, 898, 421.5] };

  it('o garfo da moto sai com centro, comprimento e ângulo dos dois pontos', () => {
    const { g } = resolver([garfo]);
    perto(g.centro, [-90, 599, 560.75]);
    expect(g.prisma.comprimento).toBeCloseTo(Math.hypot(598, 278.5), 6);
    expect(anguloX(g.matriz)).toBeCloseTo(-24.97, 2);
  });

  it('aceita âncora, ponto nomeado e desloca (soma aos dois pontos)', () => {
    const formas = [
      { id: 'roda', tipo: 'anel', diametroExterno: 600, diametroInterno: 420, espessura: 110, eixo: 'x', centro: [0, 300, 700] },
      { ...garfo, de: 'roda.centro', para: 'cabecote', desloca: [-90, 0, 0] },
    ];
    const { g } = resolver(formas, { cabecote: [0, 898, 421.5] });
    perto(g.centro, [-90, 599, 560.75]);
    expect(g.prisma.comprimento).toBeCloseTo(Math.hypot(598, 278.5), 6);
    const semDesloca = resolver([formas[0], { ...formas[1], desloca: undefined }], { cabecote: [0, 898, 421.5] }).g;
    expect(g.prisma.comprimento).toBeCloseTo(semDesloca.prisma.comprimento, 9);
  });

  it('ponto nomeado da opção sobrepõe o da raiz e serve em centro', () => {
    const r = resolverOpcao({ pontos: { p: [1, 2, 3] }, formas: [caixa('a', { centro: 'p' })] }, 'opção', { p: [9, 9, 9] });
    perto(r[0].centro, [1, 2, 3]);
  });

  it('caixa: o eixo longo (altura) segue o vetor', () => {
    const { c } = resolver([{ id: 'c', tipo: 'caixa', largura: 10, profundidade: 10, de: [0, 0, 0], para: [100, 0, 0] }]);
    perto(c.centro, [50, 0, 0]);
    perto([c.max[0] - c.min[0], c.max[1] - c.min[1], c.max[2] - c.min[2]], [100, 10, 10]);
  });

  it('cilindro com eixo x segue o vetor e pontos opostos giram meia volta', () => {
    const { c } = resolver([{ id: 'c', tipo: 'cilindro', diametro: 10, eixo: 'x', de: [0, 0, 0], para: [-80, 0, 0] }]);
    perto([c.max[0] - c.min[0], c.max[1] - c.min[1]], [80, 10], 5);
  });

  it('recusa comprimento, altura, rotacao, centro e pontos iguais com mensagem', () => {
    expect(() => resolver([{ ...garfo, comprimento: 100 }])).toThrow(/"comprimento" não pode vir junto de "de"\/"para"/);
    expect(() => resolver([{ id: 'c', tipo: 'caixa', largura: 1, altura: 5, profundidade: 1, de: [0, 0, 0], para: [0, 9, 0] }])).toThrow(/"altura" não pode vir junto/);
    expect(() => resolver([{ ...garfo, rotacao: [10, 0, 0] }])).toThrow(/retire "rotacao"/);
    expect(() => resolver([{ ...garfo, centro: [0, 0, 0] }])).toThrow(/retire "centro"/);
    expect(() => resolver([{ ...garfo, para: garfo.de }])).toThrow(/mesmo ponto/);
    expect(() => resolver([{ ...garfo, para: undefined }])).toThrow(/vêm juntos/);
    expect(() => resolver([{ ...garfo, para: 'nada' }])).toThrow(/ponto nomeado \(pontos: nenhum\)/);
    expect(() => resolver([{ id: 'a', tipo: 'anel', diametroExterno: 9, diametroInterno: 1, espessura: 2, de: [0, 0, 0], para: [0, 1, 0] }])).toThrow(/só em cilindro, caixa e cone/);
  });
});

describe('encosta', () => {
  const ref = caixa('ref', { largura: 100, altura: 100, profundidade: 100, centro: [0, 0, 0] });
  const movel = (encosta, centro = [300, 300, 300]) => resolver([ref, caixa('m', { centro, encosta: { referencia: 'ref', ...encosta } })]).m;

  it('as seis direções cardinais, sem mudar as outras coordenadas', () => {
    perto(movel({ direcao: [0, -1, 0] }).centro, [300, 60, 300]);
    perto(movel({ direcao: [0, 1, 0] }).centro, [300, -60, 300]);
    perto(movel({ direcao: [-1, 0, 0] }).centro, [60, 300, 300]);
    perto(movel({ direcao: [1, 0, 0] }).centro, [-60, 300, 300]);
    perto(movel({ direcao: [0, 0, -1] }).centro, [300, 300, 60]);
    perto(movel({ direcao: [0, 0, 1] }).centro, [300, 300, -60]);
  });

  it('a direção também pode ser um lado ("-y", "+z")', () => {
    perto(movel({ direcao: '-y' }).centro, [300, 60, 300]);
    perto(movel({ direcao: '+z' }).centro, [300, 300, -60]);
  });

  it('folga afasta e a direção não precisa ser unitária', () => {
    perto(movel({ direcao: [0, -5, 0], folga: 5 }).centro, [300, 65, 300]);
    perto(movel({ direcao: [0, 1, 0], folga: -3 }).centro, [300, -57, 300]);
  });

  it('diagonal: os vértices extremos se tocam ao longo da direção', () => {
    perto(movel({ direcao: [1, 1, 0] }, [-200, -200, 0]).centro, [-60, -60, 0]);
    perto(movel({ direcao: [1, 1, 0], folga: Math.SQRT2 * 2 }, [-200, -200, 0]).centro, [-62, -62, 0]);
  });

  it('desloca soma depois; alinha antes; referência declarada depois e oculta servem', () => {
    const r = resolver([
      caixa('m', { encosta: { referencia: 'ref', direcao: [0, -1, 0] }, alinha: { com: 'ref', eixos: ['x', 'z'] }, desloca: [0, 0, 7] }),
      { ...ref, centro: [10, 0, 20], oculto: true },
    ]);
    perto(r.m.centro, [10, 60, 27]);
  });

  it('cilindro girado usa a extensão real; anel usa o aro externo', () => {
    const r = resolver([
      { id: 'a', tipo: 'anel', diametroExterno: 200, diametroInterno: 100, espessura: 20, eixo: 'x', centro: [0, 100, 0] },
      { id: 'p', tipo: 'cilindro', diametro: 20, comprimento: 40, eixo: 'x', centro: [0, 500, 0], encosta: { referencia: 'a', direcao: [0, -1, 0] } },
    ]);
    expect(r.p.centro[1]).toBeCloseTo(210, 1);
  });

  it('recusa referência inexistente, direção nula, campo desconhecido e a própria forma', () => {
    expect(() => resolver([caixa('m', { encosta: { referencia: 'z', direcao: [0, 1, 0] } })])).toThrow(/"encosta" aponta para "z".*ids: m/);
    expect(() => resolver([ref, caixa('m', { encosta: { referencia: 'ref', direcao: [0, 0, 0] } })])).toThrow(/direcao/);
    expect(() => resolver([ref, caixa('m', { encosta: { referencia: 'ref', direcao: [0, 1, 0], lado: 1 } })])).toThrow(/não tem o campo "lado"/);
    expect(() => resolver([caixa('m', { encosta: { referencia: 'm', direcao: [0, 1, 0] } })])).toThrow(/própria forma/);
  });
});

describe('alinha', () => {
  it('copia o centro só nos eixos listados, com forma ou âncora', () => {
    const r = resolver([
      caixa('motor', { largura: 40, altura: 60, profundidade: 80, centro: [5, 6, 7] }),
      caixa('a', { centro: [100, 100, 100], alinha: { com: 'motor', eixos: ['x', 'z'] } }),
      caixa('b', { centro: [100, 100, 100], alinha: { com: 'motor.-z', eixos: ['z'] } }),
    ]);
    perto(r.a.centro, [5, 100, 7]);
    perto(r.b.centro, [100, 100, -33]);
  });

  it('recusa eixo inválido e vazio', () => {
    expect(() => resolver([caixa('r'), caixa('a', { alinha: { com: 'r', eixos: ['w'] } })])).toThrow(/"alinha.eixos"/);
    expect(() => resolver([caixa('r'), caixa('a', { alinha: { com: 'r', eixos: [] } })])).toThrow(/"alinha.eixos"/);
  });
});

describe('ordem e ciclo', () => {
  it('cadeia declarada ao contrário resolve pela dependência', () => {
    const r = resolver([
      caixa('c', { encosta: { referencia: 'b', direcao: [0, -1, 0] }, alinha: { com: 'b', eixos: ['x', 'z'] } }),
      { id: 'b', tipo: 'caixa', largura: 20, profundidade: 20, de: [0, 0, 0], para: 'a.+y' },
      caixa('a', { centro: [0, 100, 0] }),
    ]);
    perto(r.b.centro, [0, 55, 0]);
    perto(r.c.centro, [0, 120, 0]);
  });

  it('ciclos por encosta, alinha e de/para são recusados', () => {
    expect(() => resolver([caixa('a', { encosta: { referencia: 'b', direcao: [0, 1, 0] } }), caixa('b', { alinha: { com: 'a', eixos: ['x'] } })])).toThrow(/referência circular/);
    expect(() => resolver([caixa('a', { alinha: { com: 'b.centro', eixos: ['x'] } }), caixa('b', { centro: 'a.centro' })])).toThrow(/referência circular/);
    expect(() => resolver([{ id: 'a', tipo: 'cilindro', diametro: 5, de: [0, 0, 0], para: 'b.centro' }, caixa('b', { encosta: { referencia: 'a', direcao: [1, 0, 0] } })])).toThrow(/referência circular/);
  });
});

describe('leitura em texto', () => {
  it('--descrever mostra a relação usada ao lado do centro', () => {
    const esboco = {
      pontos: { topo: [0, 100, 0] },
      opcoes: [{ titulo: 'T', formas: [
        caixa('ref', { centro: [0, 0, 0] }),
        { id: 'h', tipo: 'cilindro', diametro: 5, de: 'ref.centro', para: 'topo', desloca: [30, 0, 0] },
        caixa('m', { encosta: { referencia: 'ref', direcao: [0, -1, 0], folga: 2 }, alinha: { com: 'ref', eixos: ['x'] } }),
      ] }],
    };
    const texto = formatarDescricao(descreverEsboco(esboco));
    expect(texto).toMatch(/forma h: cilindro, centro \[30 50 0\].*relação: de ref\.centro para topo; desloca \[30 0 0\]/);
    expect(texto).toMatch(/forma m: caixa, centro \[0 22 0\].*relação: alinha com ref nos eixos x; encosta em ref na direção \[0 -1 0\] com folga 2 mm/);
  });
});

describe('gate de contato implícito', () => {
  const base = (folga) => ({
    contato: { usar: true },
    opcoes: [{ titulo: 'T', formas: [
      caixa('ref', { centro: [0, 0, 0] }),
      caixa('m', { centro: [0, 300, 0], encosta: { referencia: 'ref', direcao: [0, -1, 0], folga } }),
    ] }],
  });

  it('encosta declara o par encosta sem motivo; de/para não declara nada', () => {
    const c = verificarContato(base(0));
    expect(c.resultado).toBe('aprovado');
    const lateral = base(0);
    lateral.opcoes[0].formas[1].centro = [300, 300, 0];
    const r = verificarContato(lateral);
    expect(r.achados.find((a) => a.tipo === 'par-nao-encosta')?.pecas.slice().sort()).toEqual(['m', 'ref']);
    const haste = base(0);
    haste.opcoes[0].formas.push({ id: 'h', tipo: 'caixa', largura: 20, profundidade: 20, de: [500, 0, 0], para: [500, 0, 5] });
    expect(verificarContato(haste).achados.filter((a) => a.tipo === 'par-nao-encosta')).toEqual([]);
  });

  it('folga declarada acima da tolerância não gera par implícito', () => {
    const c = verificarContato(base(50));
    expect(c.achados.find((a) => a.tipo === 'par-nao-encosta')).toBeUndefined();
  });

  it('a declaração explícita do mesmo par prevalece', () => {
    const e = base(0);
    e.contato.pares = [{ a: 'm', b: 'ref', tipo: 'livre', motivo: 'só um conceito solto sobre a base' }];
    expect(verificarContato(e).silenciados).toHaveLength(1);
  });
});

describe('moto por relações', () => {
  it('bate com a moto original no garfo, no guidão e nas rodas, e passa no gate', () => {
    const nova = Object.fromEntries(resolverOpcao(fixture('moto-relacoes').opcoes[0], 'naked', fixture('moto-relacoes').pontos).map((r) => [r.id, r]));
    const velha = Object.fromEntries(resolverOpcao(fixture('moto').opcoes[0], 'naked').map((r) => [r.id, r]));
    for (const id of ['rodaTras', 'rodaFrente', 'motor']) perto(nova[id].centro, velha[id].centro);
    for (const id of ['garfoE', 'garfoD', 'guidao']) perto(nova[id].centro, velha[id].centro, -0.3);
    expect(verificarContato(fixture('moto-relacoes')).resultado).toBe('aprovado');
  });
});

describe('compatibilidade', () => {
  const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
  it('os fixtures sem campos novos geram o mesmo SVG e a mesma leitura de sempre', () => {
    const esperado = {
      casa: ['921913afe9f9', '4a9c63fa6db7'],
      'mancal-eixo': ['bb4a355c5ca6', 'c38f4eaa7932'],
      moto: ['ee5eaae2b028', 'f9a480d9c387'],
      'teste-cubo': ['fa488c1ade46', '06ab0744a45d'],
    };
    for (const [nome, [svg, texto]] of Object.entries(esperado)) {
      const j = fixture(nome);
      expect(sha(desenharEsboco(j).svg), nome).toBe(svg);
      /* a fatia 6 acrescentou a sugestão ao achado da moto; o resto da leitura é o de antes */
      expect(sha(formatarDescricao(descreverEsboco(j)).replace(/; sugestão: .*$/gm, '')), nome).toBe(texto);
    }
  });

  it('erros continuam sendo ErroDeEsboco', () => {
    expect(() => desenharEsboco({ opcoes: [{ formas: [{ ...caixa('a'), de: [0, 0, 0] }] }] })).toThrow(ErroDeEsboco);
  });
});
