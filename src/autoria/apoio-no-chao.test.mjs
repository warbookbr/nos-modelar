/* O apoio no chão é medido sobre a malha resolvida: a instância declarada toca o
   plano do chão dentro da tolerância e nenhuma outra passa abaixo dele. Os
   cubos são sintéticos porque o que está sob prova é a régua e a leitura da
   declaração. A geometria do avião é conferida pelo comando das etapas. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { medirApoioNoChao, submontagensComDeclaracao } from './apoio-no-chao.js';
import { executarReceita } from './executar-receita.js';
import { ErroMontagemPersistida, lerMontagemPersistida } from './ler-montagem-persistida.js';

const cubo = (lado = 1) => executarReceita({
  meta: { nome: 'cubo' },
  PASSOS: [
    ['cubo', { origemId: 1, larg: lado, alt: lado, prof: lado, em: [0, 0, 0] }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['solido', { sel: { grupo: 'corpo' } }],
  ],
}).neutro;

const NEUTRO = cubo();
const naAltura = (altura, x = 0) => ({ rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [x, altura, 0] });
const peca = (id, pose, neutro = NEUTRO) => ({ caminho: [id], alvo: { tipo: 'peca', ref: id }, definicao: { neutro }, poseMundo: pose });

const CHAO = (apoiam, extra = {}) => ({
  plano: { normal: [0, 1, 0], altura: 0 }, toleranciaNumerica: 0.001, apoiam: apoiam.map((caminho) => ({ caminho })), ...extra,
});
const montagem = (instancias, apoioNoChao) => ({ instancias, ...(apoioNoChao ? { apoioNoChao } : {}) });

describe('a instância que se apoia no chão precisa tocá-lo', () => {
  it('o cubo de lado 1 com a base em 0 encosta no chão e passa', () => {
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(0))], CHAO([['roda']])));
    expect(r.apoios).toHaveLength(1);
    expect(r.apoios[0].estado).toBe('apoia');
    expect(r.apoios[0].altura).toBeCloseTo(0, 12);
    expect(r.apoios[0].ponto[1]).toBeCloseTo(0, 12);
    expect(r.aprovado).toBe(true);
  });

  /* O defeito que motivou a medida: a roda saiu 17 mm acima do chão. */
  it('17 mm acima do chão, com a tolerância de 1 mm, flutua e reprova', () => {
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(0.017))], CHAO([['roda']])));
    expect(r.apoios[0].estado).toBe('flutua');
    expect(r.apoios[0].altura).toBeCloseTo(0.017, 12);
    expect(r.aprovado).toBe(false);
  });

  it('abaixo do chão além da tolerância, a declarada afunda e reprova', () => {
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(-0.017))], CHAO([['roda']])));
    expect(r.apoios[0].estado).toBe('afunda');
    expect(r.aprovado).toBe(false);
  });

  it('dentro da tolerância, para cima ou para baixo, ainda apoia', () => {
    for (const desvio of [0.0009, -0.0009]) {
      expect(medirApoioNoChao(montagem([peca('roda', naAltura(desvio))], CHAO([['roda']]))).apoios[0].estado).toBe('apoia');
    }
    expect(medirApoioNoChao(montagem([peca('roda', naAltura(0.0011))], CHAO([['roda']]))).apoios[0].estado).toBe('flutua');
  });

  it('a opção toleranciaNumerica prevalece sobre a da declaração', () => {
    const instancias = [peca('roda', naAltura(0.017))];
    expect(medirApoioNoChao(montagem(instancias, CHAO([['roda']])), { toleranciaNumerica: 0.02 }).aprovado).toBe(true);
  });

  it('o plano tem normal e altura: o chão em y = 2 mede a partir de lá', () => {
    const chao = CHAO([['roda']], { plano: { normal: [0, 1, 0], altura: 2 } });
    expect(medirApoioNoChao(montagem([peca('roda', naAltura(2))], chao)).apoios[0].estado).toBe('apoia');
    expect(medirApoioNoChao(montagem([peca('roda', naAltura(0))], chao)).apoios[0].estado).toBe('afunda');
  });

  it('a normal pode ser outra: um chão em x medido ao longo de x', () => {
    const chao = CHAO([['roda']], { plano: { normal: [1, 0, 0], altura: 0 } });
    expect(medirApoioNoChao(montagem([peca('roda', naAltura(0, 0.5))], chao)).apoios[0].estado).toBe('apoia');
    expect(medirApoioNoChao(montagem([peca('roda', naAltura(0, 3))], chao)).apoios[0].estado).toBe('flutua');
  });

  it('um caminho de submontagem mede a peça mais baixa sob o prefixo', () => {
    const nivel = (id, h) => ({ ...peca(id, naAltura(h)), caminho: ['trem', id] });
    const sub = { caminho: ['trem'], alvo: { tipo: 'montagem', ref: 'trem' }, montagem: { instancias: [nivel('alta', 3), nivel('baixa', 0)] } };
    const r = medirApoioNoChao(montagem([sub], CHAO([['trem']])));
    expect(r.apoios[0].estado).toBe('apoia');
    expect(r.apoios[0].peca).toEqual(['trem', 'baixa']);
  });
});

/* Uma peça com duas rodas, como os trens principais: sem a parte, a roda que
   toca o chão esconde a que está no ar. */
describe('apoio por parte', () => {
  const duasRodas = (alturaD, alturaE) => executarReceita({
    meta: { nome: 'trens' },
    PASSOS: [
      ['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1, em: [2, alturaD, 0] }],
      ['parte', { nome: 'rodaD', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 1, alt: 1, prof: 1, em: [-2, alturaE, 0] }],
      ['parte', { nome: 'rodaE', sel: { origem: { op: 'cubo', id: 2 } } }],
      ['solido', { sel: { grupo: 'rodaD' } }],
      ['solido', { sel: { grupo: 'rodaE' } }],
    ],
  }).neutro;
  const trens = (alturaD, alturaE) => peca('trens', naAltura(0), duasRodas(alturaD, alturaE));
  const porParte = (...partes) => CHAO([], { apoiam: partes.map((parte) => ({ caminho: ['trens'], parte })) });

  it('sem a parte, a roda no chão esconde a roda no ar; com a parte, a que flutua reprova', () => {
    const noAr = trens(0, 0.017);
    expect(medirApoioNoChao(montagem([noAr], CHAO([['trens']]))).apoios[0].estado).toBe('apoia');
    const r = medirApoioNoChao(montagem([noAr], porParte('rodaD', 'rodaE')));
    expect(r.apoios.map((a) => [a.parte, a.estado])).toEqual([['rodaD', 'apoia'], ['rodaE', 'flutua']]);
    expect(r.apoios[1].altura).toBeCloseTo(0.017, 12);
    expect(r.aprovado).toBe(false);
  });

  it('as duas rodas no chão passam, e cada parte mede só as faces dela', () => {
    const r = medirApoioNoChao(montagem([trens(0, 0)], porParte('rodaD', 'rodaE')));
    expect(r.apoios.map((a) => a.estado)).toEqual(['apoia', 'apoia']);
    expect(r.apoios[0].ponto[0]).toBeGreaterThan(1);
    expect(r.apoios[1].ponto[0]).toBeLessThan(-1);
    expect(r.aprovado).toBe(true);
  });

  it('a parte não declarada de uma peça declarada por parte não pode passar abaixo do chão', () => {
    const r = medirApoioNoChao(montagem([trens(0, -0.5)], porParte('rodaD')));
    expect(r.apoios[0].estado).toBe('apoia');
    expect(r.abaixoDoChao.map((item) => item.caminho)).toEqual([['trens']]);
    expect(r.aprovado).toBe(false);
  });

  it('parte que nenhuma peça sob o caminho tem falha nomeando as partes disponíveis', () => {
    expect(() => medirApoioNoChao(montagem([trens(0, 0)], porParte('rodaX'))))
      .toThrow(/nenhuma peça sob \["trens"\] tem a parte 'rodaX'. Partes disponíveis: rodaD, rodaE/);
  });
});

describe('nenhuma outra instância passa abaixo do chão', () => {
  it('a peça que afunda sem ser de apoio reprova, e a mais funda vem primeiro', () => {
    const r = medirApoioNoChao(montagem([
      peca('roda', naAltura(0)), peca('rasa', naAltura(-0.1)), peca('funda', naAltura(-1)),
    ], CHAO([['roda']])));
    expect(r.abaixoDoChao.map((item) => item.caminho[0])).toEqual(['funda', 'rasa']);
    expect(r.abaixoDoChao[0].altura).toBeCloseTo(-1, 12);
    expect(r.aprovado).toBe(false);
  });

  it('a peça que não se apoia pode ficar no ar sem reprovar', () => {
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(0)), peca('asa', naAltura(5))], CHAO([['roda']])));
    expect(r.abaixoDoChao).toEqual([]);
    expect(r.aprovado).toBe(true);
  });

  it('dentro da tolerância abaixo do chão não é acusada', () => {
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(0)), peca('quase', naAltura(-0.0005))], CHAO([['roda']])));
    expect(r.abaixoDoChao).toEqual([]);
  });
});

describe('o que não se mede não passa', () => {
  it('instância sem malha reprova como inconclusiva, nunca como livre', () => {
    const semMalha = { caminho: ['oca'], alvo: { tipo: 'peca', ref: 'oca' }, definicao: { neutro: null }, poseMundo: naAltura(0) };
    const r = medirApoioNoChao(montagem([peca('roda', naAltura(0)), semMalha], CHAO([['roda']])));
    expect(r.inconclusivos).toEqual([{ caminho: ['oca'], diagnostico: 'geometria-resolvida-ausente' }]);
    expect(r.aprovado).toBe(false);
    const declarada = medirApoioNoChao(montagem([semMalha], CHAO([['oca']])));
    expect(declarada.apoios[0].estado).toBe('inconclusivo');
    expect(declarada.aprovado).toBe(false);
  });

  it('caminho declarado que a montagem não tem falha nomeando os caminhos disponíveis', () => {
    expect(() => medirApoioNoChao(montagem([peca('roda', naAltura(0))], CHAO([['roda-esquerda']]))))
      .toThrow(/não tem a peça \["roda-esquerda"\]. Caminhos disponíveis: \["roda"\]/);
  });

  it('montagem sem a declaração e opção desconhecida falham', () => {
    expect(() => medirApoioNoChao(montagem([peca('roda', naAltura(0))]))).toThrow(/não declara 'apoioNoChao'/);
    expect(() => medirApoioNoChao(montagem([peca('roda', naAltura(0))], CHAO([['roda']])), { foco: [] })).toThrow(/opção desconhecida 'foco'/);
  });

  it('a declaração de apoio numa submontagem não vale, e quem relata a encontra', () => {
    const interna = { ...peca('roda', naAltura(0)), caminho: ['trem', 'roda'] };
    const sub = { caminho: ['trem'], alvo: { tipo: 'montagem', ref: 'trem' }, montagem: { instancias: [interna], apoioNoChao: CHAO([['roda']]) } };
    expect(submontagensComDeclaracao(montagem([sub], CHAO([['trem']])))).toEqual([['trem']]);
    expect(submontagensComDeclaracao(montagem([sub]))).toEqual([['trem']]);
    expect(submontagensComDeclaracao(montagem([peca('roda', naAltura(0))], CHAO([['roda']])))).toEqual([]);
  });

  it('sem instância de apoio, só confere que nada passa abaixo do chão (montagem incompleta)', () => {
    const m = (altura) => montagem([peca('corpo', naAltura(altura))], CHAO([]));
    expect(medirApoioNoChao(m(3))).toMatchObject({ apoios: [], aprovado: true });
    expect(medirApoioNoChao(m(-3)).aprovado).toBe(false);
  });

  it('é determinística: duas medidas do mesmo estado são idênticas', () => {
    const m = montagem([peca('b', naAltura(0.2)), peca('a', naAltura(0)), peca('c', naAltura(-2))], CHAO([['a']]));
    expect(JSON.stringify(medirApoioNoChao(m))).toBe(JSON.stringify(medirApoioNoChao(m)));
  });
});

/* A declaração é formato salvo: o leitor é fail-closed, e a montagem sem o campo
   continua válida e igual. */
describe('a leitura de apoioNoChao na montagem v5', () => {
  const base = () => ({
    formato: 'mecanifica.montagem',
    versao: 5,
    id: 'carro',
    instancias: [{ id: 'roda', alvo: { tipo: 'peca', ref: 'roda' } }, { id: 'chassi', alvo: { tipo: 'peca', ref: 'chassi' } }],
    relacoes: [],
    etapas: ['chassi', 'roda'],
    vinculos: [],
    posicoes: [],
  });
  const comChao = (chao) => ({ ...base(), apoioNoChao: chao });
  const valido = () => ({ plano: { normal: [0, 1, 0], altura: 0 }, toleranciaNumerica: 0.001, apoiam: [{ caminho: ['roda'] }] });
  function recusa(dado, codigo, caminho) {
    let erro;
    try { lerMontagemPersistida(dado); } catch (capturado) { erro = capturado; }
    expect(erro).toBeInstanceOf(ErroMontagemPersistida);
    expect(erro.codigo).toBe(codigo);
    expect(erro.caminho).toBe(caminho);
  }

  it('a montagem sem o campo é lida sem ele, e com ele só acrescenta o campo', () => {
    const sem = lerMontagemPersistida(base());
    expect(Object.hasOwn(sem, 'apoioNoChao')).toBe(false);
    const com = lerMontagemPersistida(comChao(valido()));
    const { apoioNoChao, ...resto } = com;
    expect(resto).toEqual(sem);
    expect(apoioNoChao).toEqual(valido());
  });

  it('o avião e a fixture de três blocos, sem o campo, seguem lidos sem ele', () => {
    for (const arquivo of ['../../procedural/pecas/aviao/montagem.json', '../../tools/fixtures/tres-blocos-vinculados/montagens/tres-blocos.json']) {
      const lida = lerMontagemPersistida(JSON.parse(readFileSync(fileURLToPath(new URL(arquivo, import.meta.url)), 'utf8')));
      expect(lida.versao).toBe(5);
      expect(Object.hasOwn(lida, 'apoioNoChao')).toBe(false);
    }
  });

  it('ordena os apoios por caminho, para o arquivo ter uma forma só', () => {
    const lida = lerMontagemPersistida(comChao({ ...valido(), apoiam: [{ caminho: ['roda'] }, { caminho: ['chassi'] }] }));
    expect(lida.apoioNoChao.apoiam.map((item) => item.caminho[0])).toEqual(['chassi', 'roda']);
  });

  it('só a v5 aceita o campo', () => {
    const v3 = { formato: 'mecanifica.montagem', versao: 3, id: 'x', instancias: base().instancias, relacoes: [], apoioNoChao: valido() };
    recusa(v3, 'chave-desconhecida', '$');
  });

  it('recusa o que a medida não saberia ler', () => {
    recusa(comChao(null), 'estrutura-invalida', 'apoioNoChao');
    recusa(comChao({ ...valido(), extra: 1 }), 'chave-desconhecida', 'apoioNoChao');
    recusa(comChao({ plano: valido().plano, apoiam: valido().apoiam }), 'especificacao-invalida', 'apoioNoChao.toleranciaNumerica');
    recusa(comChao({ ...valido(), toleranciaNumerica: -1 }), 'especificacao-invalida', 'apoioNoChao.toleranciaNumerica');
    recusa(comChao({ ...valido(), plano: { normal: [0, 2, 0], altura: 0 } }), 'apoio-invalido', 'apoioNoChao.plano.normal');
    recusa(comChao({ ...valido(), plano: { normal: [0, 1], altura: 0 } }), 'apoio-invalido', 'apoioNoChao.plano.normal');
    recusa(comChao({ ...valido(), plano: { normal: [0, 1, 0] } }), 'apoio-invalido', 'apoioNoChao.plano.altura');
    recusa(comChao({ ...valido(), plano: { normal: [0, 1, 0], altura: 0, outro: 1 } }), 'chave-desconhecida', 'apoioNoChao.plano');
  });

  it('aceita parte opcional no apoio, sem parte vale a instância inteira, e ordena por caminho e parte', () => {
    const lida = lerMontagemPersistida(comChao({ ...valido(), apoiam: [{ caminho: ['roda'], parte: 'pneu' }, { caminho: ['roda'] }, { caminho: ['roda'], parte: 'aro' }] }));
    expect(lida.apoioNoChao.apoiam).toEqual([{ caminho: ['roda'] }, { caminho: ['roda'], parte: 'aro' }, { caminho: ['roda'], parte: 'pneu' }]);
    recusa(comChao({ ...valido(), apoiam: [{ caminho: ['roda'], parte: 'aro' }, { caminho: ['roda'], parte: 'aro' }] }), 'apoio-duplicado', 'apoioNoChao.apoiam[1]');
    recusa(comChao({ ...valido(), apoiam: [{ caminho: ['roda'], parte: '' }] }), 'apoio-invalido', 'apoioNoChao.apoiam[0].parte');
  });

  it('recusa apoio vazio, duplicado e de instância que a montagem não tem', () => {
    recusa(comChao({ ...valido(), apoiam: [] }), 'apoio-invalido', 'apoioNoChao.apoiam');
    recusa(comChao({ ...valido(), apoiam: [{ caminho: [] }] }), 'apoio-invalido', 'apoioNoChao.apoiam[0].caminho');
    recusa(comChao({ ...valido(), apoiam: [{ caminho: ['roda'] }, { caminho: ['roda'] }] }), 'apoio-duplicado', 'apoioNoChao.apoiam[1]');
    recusa(comChao({ ...valido(), apoiam: [{ caminho: ['helice'] }] }), 'instancia-desconhecida', 'apoioNoChao.apoiam[0].caminho[0]');
    recusa(comChao({ ...valido(), apoiam: [{ caminho: ['roda'], motivo: 'x' }] }), 'chave-desconhecida', 'apoioNoChao.apoiam[0]');
  });
});
