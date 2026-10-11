/* cilindro-hidraulico.test.js — a família `cilindro-hidraulico` medida contra contas feitas à mão: a camisa de casca nativa
   com a parede pedida, o êmbolo que para no fundo e na cabeça, os quatro olhais, as quatro portas, as sete recusas e a
   montagem v5 em que a articulação prismática tem o curso declarado conferido pela `conferirArticulacao`.

   As contas partem do ponto padrão (êmbolo 63, haste 36, curso 300, parede 6, recolhido 470). A origem é o centro do pino
   traseiro; a camisa começa a 0,75 do êmbolo dele (a face do fundo), o êmbolo tem um quarto, a cabeça três décimos do
   êmbolo, o anel do olhal tem raio de 0,55 do êmbolo e o corpo da haste acaba a 0,85 do êmbolo do pino dianteiro, onde o
   colar do terminal começa. */
import { describe, expect, it } from 'vitest';
import { analisarTopologia } from '../../../modulos/topologia/src/analisar.js';
import { ErroArticulacao } from '../../extensoes/articulacao/declaracao.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { lerMontagemPersistida } from '../../../src/autoria/ler-montagem-persistida.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { execucaoDe } from '../../../src/autoria/varrer-parametros.js';
import { conferirMontagemDaFamilia, resolverMontagemDaFamilia } from '../../../tools/mecanifica/montagem-da-familia.mjs';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';
import { lerFamilia } from '../../../src/autoria/familia.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { ErroChamadaDeFamilia, FAMILIAS, chamar, criarRegistroDeFamilias } from '../index.js';
import { CILINDRO_HIDRAULICO } from './index.js';
import { comprimentoRecolhidoMinimo, geometriaDoCilindro } from './geometria.js';

const registro = criarRegistroDeFamilias({ familias: [CILINDRO_HIDRAULICO] });
const receita = (parametros) => ({
  get CHAMADAS_COMPOSICOES() { return [chamar(CILINDRO_HIDRAULICO, 'conjunto', parametros)]; },
  PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {},
});
const rodar = (parametros = {}) => executarReceita(receita(parametros), registro).neutro;
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));

/* a caixa de uma parte, em milímetro, e o raio mínimo e máximo dos vértices dela em torno do eixo x */
function medidasDaParte(neutro, parte) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let rMin = Infinity;
  let rMax = 0;
  const vertices = new Set();
  for (const face of neutro.F.values()) if (face.parte === parte) face.vs.forEach((v) => vertices.add(v));
  for (const v of vertices) {
    const p = neutro.V.get(v).map((n) => n * 1000);
    for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
    const r = Math.hypot(p[1], p[2]);
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
  }
  return { lo, hi, rMin, rMax };
}

const COS = Math.cos(Math.PI / 32);
const FUNDO = 0.75 * 63; // 47,25 mm: a face do fundo da camisa
const FRENTE = FUNDO + 6 + 0.25 * 63 + 300 + 0.3 * 63; // 387,9 mm
const COLAR = 470 - 0.85 * 63; // 416,45 mm: a face do colar do terminal

describe('o contrato da família', () => {
  it('é válido, está no registro do produto e declara as quatro portas e as sete restrições', () => {
    const contrato = lerFamilia(CILINDRO_HIDRAULICO.contrato);
    expect(contrato.id).toBe('cilindro-hidraulico');
    expect(contrato.nivel).toBe('objeto');
    expect(FAMILIAS).toContain(CILINDRO_HIDRAULICO);
    expect(Object.keys(contrato.parametros)).toEqual(['comprimentoRecolhido', 'curso', 'embolo', 'fixacaoDianteira', 'fixacaoTraseira', 'haste', 'parede']);
    expect(contrato.portas.map(({ id, tipo, papel }) => `${id}:${tipo}:${papel}`)).toEqual([
      'eixo-da-haste:trilho:deslizador', 'guia-da-haste:trilho:guia', 'olhal-dianteiro:anel:recebe', 'olhal-traseiro:anel:recebe',
    ]);
    expect(contrato.restricoes).toHaveLength(7);
  });

  it('a conta do menor comprimento recolhido é a da restrição, no limite exato', () => {
    for (const parametros of [{}, { embolo: 100, haste: 56, curso: 600, parede: 8 }, { embolo: 200, haste: 110, curso: 1000, parede: 20 }]) {
      const { embolo = 63, curso = 300, parede = 6 } = parametros;
      const minimo = comprimentoRecolhidoMinimo({ embolo, curso, parede });
      expect(minimo).toBeCloseTo(curso + 2.25 * embolo + parede, 9);
      expect(() => chamar(CILINDRO_HIDRAULICO, 'c', { ...parametros, comprimentoRecolhido: minimo })).not.toThrow();
      expect(() => chamar(CILINDRO_HIDRAULICO, 'c', { ...parametros, comprimentoRecolhido: minimo - 0.001 })).toThrow(/curso-cabe-no-comprimento/);
    }
  });
});

describe('a chamada recusa o impossível, dizendo a restrição e o motivo', () => {
  const recusar = (parametros) => {
    try { chamar(CILINDRO_HIDRAULICO, 'c', parametros); } catch (erro) { return erro; }
    throw new Error('a chamada devia ser recusada');
  };

  it.each([
    ['haste maior que o êmbolo', { haste: 70 }, 'haste-abaixo-do-embolo', /mais grossa que o êmbolo/],
    ['haste grossa demais', { haste: 50 }, 'haste-grossa-demais', /0,75 do êmbolo/],
    ['haste fina demais', { haste: 24 }, 'haste-fina-demais', /ISO 6020-2/],
    ['camisa fina demais para 16 MPa', { parede: 4 }, 'parede-fina-demais', /Barlow/],
    ['camisa grossa demais, que vira bloco', { parede: 25 }, 'parede-grossa-demais', /vira bloco/],
    ['curso maior que o comprimento permite', { curso: 360 }, 'curso-cabe-no-comprimento', /comprimento recolhido/],
    ['comprimento recolhido que deixa a haste exposta demais', { comprimentoRecolhido: 560 }, 'comprimento-longo-demais', /quatro êmbolos/],
  ])('%s', (_, parametros, restricao, motivo) => {
    const erro = recusar(parametros);
    expect(erro).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(erro.restricao).toBe(restricao);
    expect(erro.motivo).toMatch(motivo);
    expect(() => rodar(parametros)).toThrow(restricao);
  });

  it('o extremo da faixa e a fixação fora de 0 e 1 também são recusados', () => {
    expect(recusar({ embolo: 20 }).message).toMatch(/parametros\.embolo/);
    expect(recusar({ fixacaoTraseira: 2 }).message).toMatch(/parametros\.fixacaoTraseira/);
    expect(recusar({ fixacaoDianteira: 0.5 }).message).toMatch(/inteiro/);
  });
});

describe('o conjunto recolhido do ponto padrão', () => {
  const neutro = rodar();
  const camisa = geometriaDoCilindro({
    embolo: 63, haste: 36, curso: 300, parede: 6, comprimentoRecolhido: 470, fixacaoTraseira: 0, fixacaoDianteira: 0,
  });

  it('executa sem órfão, com as oito partes e as quatro portas, e dá a mesma geometria em duas chamadas', () => {
    expect(neutro.orfaos).toEqual([]);
    const partes = new Set([...neutro.F.values()].map((f) => f.parte));
    expect([...partes].sort()).toEqual(['cabeca', 'embolo', 'haste', 'olhal-dianteiro', 'olhal-traseiro', 'pescoco-traseiro', 'terminal', 'tubo']);
    expect([...neutro.portas.keys()].sort()).toEqual(['eixo-da-haste', 'guia-da-haste', 'olhal-dianteiro', 'olhal-traseiro']);
    expect(hash(rodar())).toBe(hash(neutro));
  });

  it('a camisa é um tubo de furo 63 e parede 6, fechado atrás no fundo e aberto na frente', () => {
    const tubo = medidasDaParte(neutro, 'tubo');
    expect(tubo.lo[0]).toBeCloseTo(FUNDO, 3);
    expect(tubo.hi[0]).toBeCloseTo(FRENTE, 3);
    /* o furo tem a apótema de 31,5 mm e a face externa a de 37,5 mm: os raios dos vértices são esses sobre o cosseno */
    expect(tubo.rMin).toBeCloseTo(31.5 / COS, 3);
    expect(tubo.rMax).toBeCloseTo(37.5 / COS, 3);
    expect(37.5 / COS * COS - 31.5 / COS * COS).toBeCloseTo(6, 9);
    /* a casca mediu a parede: 6 mm onde a pedida é 6 mm */
    expect(camisa.camisa.raioExterno * COS - camisa.camisa.raioDoFuro * COS).toBeCloseTo(6, 9);
  });

  it('o êmbolo recolhido toca o fundo e a cabeça fica a um curso dele; a haste aparece 28,55 mm na frente', () => {
    const tubo = medidasDaParte(neutro, 'tubo');
    const embolo = medidasDaParte(neutro, 'embolo');
    const cabeca = medidasDaParte(neutro, 'cabeca');
    const haste = medidasDaParte(neutro, 'haste');
    /* o fundo interno está em FUNDO + 6; o êmbolo começa nele e tem 15,75 mm */
    expect(embolo.lo[0]).toBeCloseTo(FUNDO + 6, 3);
    expect(embolo.hi[0]).toBeCloseTo(FUNDO + 6 + 15.75, 3);
    expect(embolo.rMax).toBeCloseTo(31.1, 3);
    expect(cabeca.lo[0]).toBeCloseTo(FRENTE - 18.9, 3);
    expect(cabeca.lo[0] - embolo.hi[0]).toBeCloseTo(300, 3);
    expect(camisa.folgaDoEmbolo).toBeCloseTo(300, 9);
    /* a haste entra 0,2 mm no êmbolo e termina 0,2 mm dentro do colar do terminal, que começa a 0,85 êmbolo do pino dianteiro */
    expect(haste.lo[0]).toBeCloseTo(embolo.hi[0] - 0.2, 3);
    expect(haste.hi[0]).toBeCloseTo(COLAR + 0.2, 3);
    expect(haste.rMax).toBeCloseTo(18, 3);
    expect(COLAR - tubo.hi[0]).toBeCloseTo(28.55, 3);
    expect(camisa.hasteExposta).toBeCloseTo(28.55, 9);
    /* a cabeça fecha o furo em volta da haste com 0,4 mm de folga radial */
    expect(cabeca.rMin).toBeCloseTo(18.4, 3);
  });

  it('os olhais: o traseiro em x = 0, o dianteiro em x = 470, pinos em z, anéis inteiros de raio 0,55 do êmbolo e 15,75 mm de meia largura', () => {
    const traseiro = medidasDaParte(neutro, 'olhal-traseiro');
    const dianteiro = medidasDaParte(neutro, 'olhal-dianteiro');
    const raio = 0.55 * 63;
    for (const [olhal, centro] of [[traseiro, 0], [dianteiro, 470]]) {
      expect(olhal.lo[2]).toBeCloseTo(-15.75, 3);
      expect(olhal.hi[2]).toBeCloseTo(15.75, 3);
      /* o anel é inteiro, sem corte: a caixa dele é a do círculo de raio 34,65 mm */
      expect(olhal.lo[0]).toBeCloseTo(centro - raio, 3);
      expect(olhal.hi[0]).toBeCloseTo(centro + raio, 3);
      expect(olhal.lo[1]).toBeCloseTo(-raio, 3);
      expect(olhal.hi[1]).toBeCloseTo(raio, 3);
    }
  });

  it('as portas conferem com a malha, com o papel e a forma do contrato', () => {
    expect(conferirPortasNaForma(neutro)).toEqual([]);
    const porta = (nome) => neutro.portas.get(nome).interface;
    expect(porta('olhal-traseiro')).toMatchObject({ forma: 'anel', papel: 'recebe', eixo: [0, 0, 1] });
    expect(porta('olhal-traseiro').raioInterno).toBeCloseTo(0.01575, 9);
    expect(porta('olhal-traseiro').raioExterno).toBeCloseTo(0.03465, 9);
    expect(porta('olhal-dianteiro').centro[0]).toBeCloseTo(0.47, 9);
    expect(porta('guia-da-haste')).toMatchObject({ forma: 'trilho', papel: 'guia', eixo: [1, 0, 0] });
    expect(porta('guia-da-haste').curso).toBeCloseTo(0.3, 9);
    expect(porta('guia-da-haste').centro[0]).toBeCloseTo(FRENTE / 1000, 9);
    expect(porta('eixo-da-haste')).toMatchObject({ forma: 'trilho', papel: 'deslizador' });
    expect(porta('eixo-da-haste').perfil.largura).toBeCloseTo(0.036, 9);
  });

  it('a malha fecha, nos quatro tipos de fixação, e as portas conferem em todos', () => {
    for (const fixacaoTraseira of [0, 1]) for (const fixacaoDianteira of [0, 1]) {
      const n = rodar({ fixacaoTraseira, fixacaoDianteira });
      expect(n.orfaos).toEqual([]);
      const abertos = analisarTopologia({ vertices: n.V, faces: n.F }).achados.filter((a) => ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'].includes(a.codigo));
      expect(abertos, `fixações ${fixacaoTraseira}${fixacaoDianteira}`).toEqual([]);
      expect(conferirPortasNaForma(n)).toEqual([]);
      const partes = new Set([...n.F.values()].map((f) => f.parte));
      expect(partes.has('rotula-traseira')).toBe(fixacaoTraseira === 1);
      expect(partes.has('rotula-dianteira')).toBe(fixacaoDianteira === 1);
    }
  });

  it('a rótula é uma bucha esférica mais larga que o olhal, que sai dos dois lados do anel e fecha o furo do pino', () => {
    const n = rodar({ fixacaoTraseira: 1 });
    const olhal = medidasDaParte(n, 'olhal-traseiro');
    const rotula = medidasDaParte(n, 'rotula-traseira');
    /* 0,76 êmbolo de largura contra meio êmbolo do olhal: 8,19 mm saem de cada lado */
    expect(rotula.hi[2] - rotula.lo[2]).toBeCloseTo(0.76 * 63, 3);
    expect(rotula.hi[2] - olhal.hi[2]).toBeCloseTo(8.19, 3);
    expect(olhal.lo[2] - rotula.lo[2]).toBeCloseTo(8.19, 3);
    /* o raio em torno do pino (eixo z): o furo do pino por dentro e, no equador, a esfera de meio êmbolo (31,5 mm) */
    const emTornoDoPino = [...n.F.values()].filter((f) => f.parte === 'rotula-traseira').flatMap((f) => f.vs).map((v) => Math.hypot(n.V.get(v)[0], n.V.get(v)[1]) * 1000);
    expect(Math.min(...emTornoDoPino)).toBeCloseTo(15.75, 3);
    expect(Math.max(...emTornoDoPino)).toBeCloseTo(31.5, 1);
    /* o furo do olhal é o alojamento, 1,2 do pino (18,9 mm), e a esfera passa dele: a bucha prende no anel */
    expect(Math.max(...emTornoDoPino)).toBeGreaterThan(18.9);
    /* a fixação 1 se vê: o olhal liso não tem a parte e é mais estreito que a bucha */
    expect(new Set([...rodar().F.values()].map((f) => f.parte)).has('rotula-traseira')).toBe(false);
  });
});

describe('cada olhal sai de um pescoço unido à peça, e não só encostado nela', () => {
  /* o raio máximo, em torno do eixo x, dos vértices de uma parte num plano x, em mm */
  const raioEm = (neutro, parte, x, folga = 0.01) => {
    let raio = 0;
    for (const face of neutro.F.values()) if (face.parte === parte) for (const v of face.vs) {
      const p = neutro.V.get(v).map((c) => c * 1000);
      if (Math.abs(p[0] - x) <= folga) raio = Math.max(raio, Math.hypot(p[1], p[2]));
    }
    return raio;
  };

  it.each([
    ['mínimo', { embolo: 32, haste: 18, curso: 50, parede: 3, comprimentoRecolhido: 135 }],
    ['padrão', {}],
    ['médio', { embolo: 80, haste: 45, curso: 500, parede: 8, comprimentoRecolhido: 700 }],
    ['máximo', { embolo: 200, haste: 140, curso: 1500, parede: 25, comprimentoRecolhido: 2300 }],
  ])('ponto %s: o pescoço entra na camisa e no anel, e o terminal na haste e no anel', (_, parametros) => {
    const { embolo, haste, parede, comprimentoRecolhido } = { embolo: 63, haste: 36, parede: 6, comprimentoRecolhido: 470, ...parametros };
    for (const fixacao of [0, 1]) {
      const n = rodar({ ...parametros, fixacaoTraseira: fixacao, fixacaoDianteira: fixacao });
      const tubo = medidasDaParte(n, 'tubo');
      const pescoco = medidasDaParte(n, 'pescoco-traseiro');
      const terminal = medidasDaParte(n, 'terminal');
      const olhalT = medidasDaParte(n, 'olhal-traseiro');
      const olhalD = medidasDaParte(n, 'olhal-dianteiro');
      const hasteMedida = medidasDaParte(n, 'haste');
      const raioDoOlhal = 0.55 * embolo;
      const alojamento = fixacao === 1 ? 0.3 * embolo : 0.25 * embolo;
      /* pescoço traseiro: vai de 0,4 êmbolo do pino até 0,2 mm dentro do fundo, que tem a parede de espessura */
      expect(pescoco.lo[0]).toBeCloseTo(0.4 * embolo, 3);
      expect(pescoco.hi[0]).toBeCloseTo(tubo.lo[0] + 0.2, 3);
      expect(pescoco.hi[0]).toBeLessThan(tubo.lo[0] + parede);
      /* a ponta menor do pescoço começa dentro da massa do anel (fora do furo, dentro do raio externo) e dentro da largura dele */
      const pontaMenor = Math.hypot(0.4 * embolo, 0.225 * embolo);
      expect(pontaMenor).toBeGreaterThan(alojamento);
      expect(pontaMenor).toBeLessThan(raioDoOlhal);
      expect(olhalT.hi[2]).toBeGreaterThan(0.225 * embolo);
      expect(raioEm(n, 'pescoco-traseiro', 0.4 * embolo)).toBeCloseTo(0.225 * embolo, 0);
      /* a base cabe no fundo: raio maior que o furo da camisa e menor que a face externa */
      const base = raioEm(n, 'pescoco-traseiro', tubo.lo[0] + 0.2);
      expect(base).toBeGreaterThan(embolo / 2);
      expect(base).toBeLessThan((embolo / 2 + parede) / COS);
      /* terminal: o colar começa onde o corpo da haste termina menos 0,2 mm, e a ponta menor fica a 0,4 êmbolo do pino dianteiro */
      expect(terminal.lo[0]).toBeCloseTo(comprimentoRecolhido - 0.85 * embolo, 3);
      expect(hasteMedida.hi[0]).toBeCloseTo(terminal.lo[0] + 0.2, 3);
      expect(terminal.hi[0]).toBeCloseTo(comprimentoRecolhido - 0.4 * embolo, 3);
      expect(terminal.rMax).toBeCloseTo(Math.max(0.65 * haste, 0.3 * embolo), 3);
      expect(terminal.rMax).toBeGreaterThan(haste / 2);
      /* o anel dos dois olhais tem parede de ao menos 0,25 êmbolo em volta do furo, liso ou com alojamento */
      expect(raioDoOlhal - alojamento).toBeGreaterThanOrEqual(0.25 * embolo - 1e-9);
      expect(olhalD.hi[0] - olhalD.lo[0]).toBeCloseTo(2 * raioDoOlhal, 3);
    }
  });

  it('o pescoço e o terminal atravessam o anel: vértices deles ficam entre o furo e o raio externo, entre as faces do anel', () => {
    const n = rodar({ fixacaoTraseira: 1, fixacaoDianteira: 1 });
    for (const [parte, centro] of [['pescoco-traseiro', 0], ['terminal', 470]]) {
      const dentro = [...new Set([...n.F.values()].filter((f) => f.parte === parte).flatMap((f) => f.vs))]
        .map((v) => n.V.get(v).map((c) => c * 1000))
        .filter((p) => {
          const r = Math.hypot(p[0] - centro, p[1]);
          return r > 18.9 && r < 34.65 && Math.abs(p[2]) < 15.75;
        });
      expect(dentro.length, `${parte} dentro do anel`).toBeGreaterThan(8);
    }
  });
});

describe('a parede da camisa fica na espessura pedida em toda a faixa da família', () => {
  it.each([
    ['mínimo', { embolo: 32, haste: 18, curso: 50, parede: 3, comprimentoRecolhido: 135 }],
    ['médio', { embolo: 80, haste: 45, curso: 500, parede: 8, comprimentoRecolhido: 700 }],
    ['máximo', { embolo: 200, haste: 140, curso: 1500, parede: 25, comprimentoRecolhido: 2300 }],
  ])('ponto %s: o furo e a face externa distam a parede pedida', (_, parametros) => {
    const n = rodar(parametros);
    const tubo = medidasDaParte(n, 'tubo');
    const furo = (parametros.embolo / 2) / COS;
    const externo = (parametros.embolo / 2 + parametros.parede) / COS;
    expect(tubo.rMin).toBeCloseTo(furo, 2);
    expect(tubo.rMax).toBeCloseTo(externo, 2);
  });
});

describe('a montagem v5 gerada pela família', () => {
  const pequeno = { embolo: 32, haste: 18, curso: 50, parede: 3, comprimentoRecolhido: 135 };
  const execucao = execucaoDe({ registroComposicoes: registro.registroComposicoes, registroOperacoes: registro.registroOperacoes });
  const pecaDaReceita = (montada, ref) => {
    const { neutro: bruto } = executarReceita(montada.receitas[ref], execucao);
    const neutro = neutroCanonico(bruto);
    return { formato: FORMATO, versao: VERSAO, peca: ref, meta: { nome: ref }, materiais: {}, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
  };
  const resolverPeloResolvedor = (montada) => resolverMontagemPersistida(montada.montagem, { carregarPeca: async (ref) => pecaDaReceita(montada, ref) });

  it('é uma montagem v5 que o leitor aceita, com a camisa e a haste como peças distintas, sem mudar o formato', async () => {
    const m = CILINDRO_HIDRAULICO.montar({});
    expect(Object.keys(m).sort()).toEqual(['articulacoes', 'cursoMaximo', 'montagem', 'parametros', 'receitas']);
    const lida = lerMontagemPersistida(m.montagem);
    expect(lida.versao).toBe(5);
    expect(lida.instancias.map(({ id, alvo }) => `${id}:${alvo.ref}`)).toEqual(['camisa:cilindro-hidraulico.camisa', 'haste:cilindro-hidraulico.haste']);
    expect(m.montagem.posicoes).toHaveLength(1);
    expect(m.montagem.instancias.every((i) => i.pose === undefined)).toBe(true);
    expect(Object.keys(m.receitas)).toEqual(['cilindro-hidraulico.camisa', 'cilindro-hidraulico.haste']);
    expect(m.cursoMaximo).toBe(300);
    const resolvida = await resolverPeloResolvedor(m);
    expect(resolvida.instancias.map((i) => i.caminho)).toEqual([['camisa'], ['haste']]);
    /* as duas peças nascem no mesmo referencial: a posição da haste, derivada da porta, é a identidade */
    for (const i of resolvida.instancias) expect(i.poseMundo.deslocamento.map((n) => Math.abs(n))).toEqual([0, 0, 0]);
    const [camisa, haste] = resolvida.instancias.map((i) => [...i.definicao.neutro.portas.keys()].sort());
    expect(camisa).toEqual(['guia-da-haste', 'olhal-traseiro']);
    expect(haste).toEqual(['eixo-da-haste', 'olhal-dianteiro']);
  });

  it('a junção da aprovação, sem o resolvedor, dá a mesma pose e a mesma montagem que o resolvedor real', async () => {
    const m = CILINDRO_HIDRAULICO.montar(pequeno);
    const real = await resolverPeloResolvedor(m);
    const { problemas, resolvida } = resolverMontagemDaFamilia(CILINDRO_HIDRAULICO, pequeno, execucao);
    expect(problemas).toEqual([]);
    expect(resolvida.instancias.map((i) => [i.id, i.caminho, i.poseMundo])).toEqual(real.instancias.map((i) => [i.id, i.caminho, i.poseMundo]));
    for (const [i, outra] of resolvida.instancias.entries()) expect(neutroCanonico(outra.definicao.neutro)).toEqual(neutroCanonico(real.instancias[i].definicao.neutro));
  });

  it('é determinística e as peças somadas dão a geometria do conjunto', () => {
    const a = CILINDRO_HIDRAULICO.montar({});
    const b = CILINDRO_HIDRAULICO.montar({});
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const pecas = Object.keys(a.receitas).map((ref) => pecaDaReceita(a, ref));
    expect(pecas.map(({ V, F }) => sha256Hex(JSON.stringify({ V, F })))).toEqual(Object.keys(b.receitas).map((ref) => { const { V, F } = pecaDaReceita(b, ref); return sha256Hex(JSON.stringify({ V, F })); }));
    expect(pecas.reduce((soma, peca) => soma + peca.F.length, 0)).toBe(rodar().F.size);
  });

  it('recusa os parâmetros fora da faixa antes de gerar peça', () => {
    expect(() => CILINDRO_HIDRAULICO.montar({ haste: 80 })).toThrow(ErroChamadaDeFamilia);
    expect(() => CILINDRO_HIDRAULICO.montar({ curso: 400 })).toThrow(/curso-cabe-no-comprimento/);
  });

  it('declara o curso da família e o confere livre de colisão, só encostando nas pontas', () => {
    const m = CILINDRO_HIDRAULICO.montar(pequeno);
    expect(m.articulacoes).toHaveLength(1);
    expect(m.articulacoes[0]).toMatchObject({ id: 'haste-na-camisa', tipo: 'prismatica', unidade: 'mm', curso: { minimo: 0, maximo: 50 }, passos: 8 });
    const { resolvida } = resolverMontagemDaFamilia(CILINDRO_HIDRAULICO, pequeno, execucao);
    const r = conferirArticulacao(resolvida, { ...m.articulacoes[0], passos: 4 });
    expect(r.ok).toBe(true);
    expect(r.colisoes).toEqual([]);
    expect(r.posicoes.map((p) => p.valor)).toEqual([0, 12.5, 25, 37.5, 50]);
    expect(r.eixo.direcao).toEqual([1, 0, 0]);
    expect(r.moveis).toEqual([['haste']]);
    expect(r.fixos).toEqual([['camisa']]);
    /* o êmbolo encosta no fundo e na cabeça nas duas pontas do curso, e só nelas */
    expect(r.pares).toHaveLength(1);
    expect(r.pares[0]).toMatchObject({ estadoMaisGrave: 'encostam', colisoes: 0 });
  }, 120_000);

  it('a conferência da aprovação dá o curso do resolvedor real, com a impressão da montagem', async () => {
    const m = CILINDRO_HIDRAULICO.montar(pequeno);
    const real = conferirArticulacao(await resolverPeloResolvedor(m), m.articulacoes[0]);
    const daAprovacao = conferirMontagemDaFamilia(CILINDRO_HIDRAULICO, pequeno, execucao);
    expect(daAprovacao.problemas).toEqual([]);
    expect(daAprovacao.resumo.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(daAprovacao.resumo.articulacoes).toEqual([expect.objectContaining({ id: 'haste-na-camisa', curso: real.curso, passos: real.passos, posicoes: real.posicoes.length, colisoes: 0, conferido: true })]);
  }, 120_000);

  it('a haste que passa do fundo ou da cabeça penetra a camisa pela medida do excesso (a conta de penetração é um piso, e só vale rasa)', () => {
    const [declarada] = CILINDRO_HIDRAULICO.montar(pequeno).articulacoes;
    const { resolvida } = resolverMontagemDaFamilia(CILINDRO_HIDRAULICO, pequeno, execucao);
    const atrasDoFundo = conferirArticulacao(resolvida, { ...declarada, curso: { minimo: -2, maximo: -1 }, passos: 1 });
    expect(atrasDoFundo.ok).toBe(false);
    expect(atrasDoFundo.colisoes.map((c) => [c.posicao.valor, Number((c.penetracao * 1000).toFixed(1))])).toEqual([[-2, 2], [-1, 1]]);
    const alemDaCabeca = conferirArticulacao(resolvida, { ...declarada, curso: { minimo: 51, maximo: 52 }, passos: 1 });
    expect(alemDaCabeca.ok).toBe(false);
    expect(alemDaCabeca.colisoes.map((c) => [c.posicao.valor, Number((c.penetracao * 1000).toFixed(1))])).toEqual([[51, 1], [52, 2]]);
    expect(alemDaCabeca.recusa[0]).toMatch(/posição 0 de 1 \(51 mm\) \["haste"\] penetra 1 mm \["camisa"\]/);
  }, 120_000);

  it('o curso declarado maior que o do trilho da guia é recusado antes de medir', () => {
    const [declarada] = CILINDRO_HIDRAULICO.montar(pequeno).articulacoes;
    const { resolvida } = resolverMontagemDaFamilia(CILINDRO_HIDRAULICO, pequeno, execucao);
    const demais = { ...declarada, curso: { minimo: 0, maximo: 60 }, passos: 2 };
    expect(() => conferirArticulacao(resolvida, demais)).toThrow(ErroArticulacao);
    expect(() => conferirArticulacao(resolvida, demais)).toThrow(/passa do curso do trilho 'guia-da-haste' \(50 mm\)/);
  });
});
