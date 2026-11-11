/* instancia-de-familia.test.mjs — a instância de família por uma chamada reproduz a roda do carrinho de mão: os passos em mm do estado do
 * rascunho (`montarRoda`) e a malha da receita (`gerarPassos`), e põe a instância na pose com as portas que a família publica. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { portasPublicadas } from '../../src/autoria/descrever-partes.js';
import { neutroCanonico } from '../../procedural/nucleo/entrada.js';
import { sha256Hex } from '../../procedural/nucleo/sha256.js';
import { chamar, criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import roda, { MATERIAIS, TABELA, gerarPassos, montarRoda } from '../../procedural/pecas/carrinho-de-mao/partes/roda/receita.js';
import { TABELA as CHASSI } from '../../procedural/pecas/carrinho-de-mao/partes/chassi/receita.js';
import { instanciaDeFamilia } from './instancia-de-familia.mjs';

const registro = criarRegistroDeFamilias();
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const executar = (PASSOS, extra = {}) => executarReceita({ PASSOS, PARAMS: {}, TOPO: {}, MATERIAIS, ALIASES: [], ...extra }, { registroOperacoes: registro.registroOperacoes });

/* Os parâmetros da roda do carrinho, como a receita os deriva da TABELA: o trecho que substitui as 25 linhas copiadas. */
const parametrosDaRoda = (T = TABELA) => {
  const D = T.diametroDoPneu;
  return {
    diametroPneu: D, larguraPneu: T.banda / D, diametroAro: T.diametroDoAro / D, larguraAro: T.larguraDoAro / T.banda, paredeDoAro: T.paredeDoAro / D,
    banda: 0, tipo: 0, espessuraDisco: T.disco / D, larguraCubo: T.larguraDoCubo / D, diametroCubo: T.diametroDoCubo / D,
    diametroFuroCentral: 2 * T.raioDoFuroDoCubo / D, furosDeFixacao: T.furos, diametroCirculoFuros: T.circuloDosFuros / D, diametroFuro: T.diametroDoFuro / D,
    desvio: 0, ombroRedondo: T.ombroRedondo, ombroDoPneu: T.ombro / ((D - T.diametroDoAro) / 2), ladosDoPneu: T.ladosDoPneu,
  };
};

describe('instanciaDeFamilia reproduz a roda do carrinho de mão', () => {
  it('em mm, com a base, as cores, a posição no eixo do chassi e o liso, sai igual aos passos que `montarRoda` põe no estado do rascunho', () => {
    const estado = { passos: [['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }]], topo: {}, origem: 40 };
    montarRoda(estado);
    const r = instanciaDeFamilia({
      familia: 'roda-pneu', parametros: parametrosDaRoda(), base: 40, unidade: 'mm', portas: false,
      materiais: MATERIAIS, liso: { angulo: TABELA.anguloDoLiso }, pose: { posicao: [0, CHASSI.eixo.y, CHASSI.eixo.z] },
    });
    expect([['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }], ...r.passos]).toEqual(estado.passos);
    expect(r.origem).toBe(estado.origem);
    expect(r.partes.map((p) => p.nome)).toEqual(['pneu', 'aro', 'cubo', 'disco']);
    expect(r.portas).toEqual([]);
  });

  it('em metro e sem pose, os passos dão a mesma malha que a receita gera hoje, e as portas da família saem como ela as publica', () => {
    const r = instanciaDeFamilia({ familia: 'roda-pneu', parametros: parametrosDaRoda(), liso: { angulo: TABELA.anguloDoLiso } });
    const daReceita = executar(roda.PASSOS).neutro;
    const minha = executar(r.passos).neutro;
    expect(hash(minha)).toBe(hash(daReceita));
    expect(r.portas).toEqual(['assento-do-pneu', 'eixo', 'furos-de-fixacao']);
    const proprias = portasPublicadas(minha).map((p) => p.id);
    expect(proprias).toEqual(expect.arrayContaining(r.portas));
    /* os passos da receita são os mesmos mais a porta do furo do cubo, que é da receita */
    expect(gerarPassos().length).toBe(r.passos.length + 1);
  });

  it('o perfil mais o que o chamador sobrescreve vale o mesmo que a chamada direta da família', () => {
    const r = instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao', parametros: { diametroPneu: 340 } });
    const direta = executar([...registro.registroComposicoes ? [] : [], ...instanciaDeFamilia({ familia: registro.obter('roda-pneu'), parametros: { perfil: 'carrinho-de-mao', diametroPneu: 340 } }).passos]).neutro;
    expect(hash(executar(r.passos).neutro)).toBe(hash(direta));
    const padrao = instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao' });
    expect(hash(executar(padrao.passos).neutro)).not.toBe(hash(executar(r.passos).neutro));
    /* a família continua recusando o que o contrato recusa */
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao', parametros: { diametroPneu: 5 } })).toThrow(/diametroPneu/);
    expect(chamar(registro.obter('roda-pneu'), 'instancia', { perfil: 'carrinho-de-mao' }).composicao).toBeTruthy();
  });
});

describe('a pose e as portas', () => {
  const porta = (neutro, id) => portasPublicadas(neutro).find((p) => p.id === id).interface;
  const caixaDaParte = (neutro, nome) => {
    const ids = new Set();
    for (const face of neutro.F.values()) if (face.parte === nome) for (const v of face.vs) ids.add(v);
    const vs = [...ids].map((v) => neutro.V.get(v));
    return [0, 1, 2].map((i) => [Math.min(...vs.map((v) => v[i])), Math.max(...vs.map((v) => v[i]))]);
  };

  it('a posição e o giro levam as portas da família junto, e cada porta fica sobre a face da parte que o núcleo pôs na mesma pose', () => {
    const pose = { posicao: [0.3, 0.17, -0.5], giro: [{ eixo: 'z', graus: 90 }, { eixo: 'y', graus: 180 }] };
    const sem = executar(instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao' }).passos).neutro;
    const comR = instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao', pose });
    const com = executar(comR.passos).neutro;
    const a = porta(sem, 'assento-do-pneu');
    const b = porta(com, 'assento-do-pneu');
    /* sem pose o assento é a face de dentro do pneu, em x = -0,0425; o giro de z 90 leva o x para o y, e o de y 180 inverte x e z */
    expect(a.centro[0]).toBeCloseTo(-0.0425, 9);
    const caixa = caixaDaParte(com, 'pneu');
    expect(b.centro[1]).toBeCloseTo(caixa[1][0], 6);
    expect(b.centro[0]).toBeCloseTo(0.3, 9);
    expect(b.centro[2]).toBeCloseTo(-0.5, 9);
    expect(b.eixo.map((c) => Math.round(c * 1e9) / 1e9 + 0)).toEqual([0, -1, 0]);
    /* o pneu inteiro andou: o centro da caixa é a posição */
    expect((caixa[0][0] + caixa[0][1]) / 2).toBeCloseTo(0.3, 6);
    expect((caixa[1][0] + caixa[1][1]) / 2).toBeCloseTo(0.17, 6);
    /* a porta do eixo no cubo e os furos de fixação, que a família publica como padrão circular, saem como centros dos furos na pose */
    const furos = porta(com, 'furos-de-fixacao');
    expect(furos.centros).toHaveLength(4);
    const dentro = caixaDaParte(com, 'cubo');
    for (const c of furos.centros) {
      expect(Math.hypot(c[0] - furos.centro[0], c[1] - furos.centro[1], c[2] - furos.centro[2])).toBeCloseTo(0.0187, 9);
      /* cada centro está no plano da face do cubo, a mesma coordenada y da porta, e dentro da caixa do cubo nos outros eixos */
      expect(c[1]).toBeCloseTo(furos.centro[1], 9);
      expect(c[0]).toBeGreaterThan(dentro[0][0]);
      expect(c[0]).toBeLessThan(dentro[0][1]);
    }
    expect(comR.passos.filter(([op]) => op === 'rotaciona')).toHaveLength(8);
    expect(comR.passos.filter(([op]) => op === 'transladar')).toHaveLength(4);
    expect(comR.passos.map(([op]) => op).join(' ')).toMatch(/(rotaciona rotaciona transladar )+$/);
  });

  it('quatro rodas num carro: nomes pelo mapa e pela função, ids encadeados, portas com prefixo, tudo executa', () => {
    const passos = [];
    let base = 0;
    const nomes = [];
    for (const [ponta, z] of [['Dianteira', 1.2], ['Traseira', -1.2]]) {
      for (const [lado, s] of [['Dir', 1], ['Esq', -1]]) {
        const r = instanciaDeFamilia({
          familia: 'roda-pneu', perfil: 'carro', base, nomes: (n) => `${n}${ponta}${lado}`, portaPrefixo: `${ponta}-${lado}`.toLowerCase(),
          pose: { posicao: [s * 0.8, 0.364, z], giro: s < 0 ? { eixo: 'y', graus: 180 } : undefined },
        });
        base = r.origem;
        passos.push(...r.passos);
        nomes.push(...r.partes.map((p) => p.nome));
      }
    }
    expect(new Set(nomes).size).toBe(16);
    expect(nomes).toContain('pneuDianteiraDir');
    const { neutro } = executar(passos, { MATERIAIS: { borracha: { cor: '#111' }, aco: { cor: '#999' } } });
    const portas = portasPublicadas(neutro).map((p) => p.id);
    expect(portas).toHaveLength(12);
    expect(portas).toContain('traseira-esq-eixo');
    expect(new Set(neutro.F.values().map?.((f) => f.parte) ?? [...neutro.F.values()].map((f) => f.parte)).size).toBeGreaterThanOrEqual(16);
  });

  it('o prefixo e o mapa de nomes das partes; a emissão das partes pode ficar com o chamador', () => {
    const prefixo = instanciaDeFamilia({ familia: 'roda-pneu', nomes: 'rodaDir' });
    expect(prefixo.partes.map((p) => p.nome)).toEqual(['rodaDirPneu', 'rodaDirAro', 'rodaDirCubo', 'rodaDirDisco']);
    const mapa = instanciaDeFamilia({ familia: 'roda-pneu', nomes: { pneu: 'pneuTras' }, emitirPartes: false });
    expect(mapa.partes.map((p) => [p.nome, p.nomeNaFamilia])[0]).toEqual(['pneuTras', 'pneu']);
    expect(mapa.passos.some(([op]) => op === 'parte')).toBe(false);
    expect(mapa.partes[0].sel).toEqual({ origem: { op: 'lathe', id: 1 } });
  });
});

describe('as recusas dizem o que está errado', () => {
  it('nome, unidade, porta em mm, operação sem medida conhecida e pose', () => {
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', nomes: { rodinha: 'x' } })).toThrow(/cita 'rodinha'.*as partes dela são pneu, aro, cubo, disco/);
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', unidade: 'cm' })).toThrow(/unidade 'cm'/);
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', unidade: 'mm', portas: true })).toThrow(/portas são em metro/);
    expect(() => instanciaDeFamilia({ familia: 'dobradica', unidade: 'mm' })).toThrow(/a operação 'chapaDobrada' .* não tem as medidas em milímetro/);
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', pose: { giro: { eixo: 'w', graus: 1 } } })).toThrow(/giro/);
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', pose: { posicao: [1, 2] } })).toThrow(/pose\.posicao/);
    expect(() => instanciaDeFamilia({ familia: 'roda-pneu', materiais: { borracha: '#111' } })).toThrow(/cor do material 'aco'/);
    expect(() => instanciaDeFamilia({ familia: 'nao-existe' })).toThrow(/família registrada/);
  });
});
