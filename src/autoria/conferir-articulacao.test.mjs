/* conferir-articulacao.test.mjs — o curso de uma articulação declarada é
   amostrado e medido contra as peças que ficam. Montagem sintética de caixas e
   cilindros cujas posições têm resposta analítica: a folha de uma porta de
   0,8 m gira em torno do eixo y e bate numa parede em x = -0,30 quando a quina
   da ponta (0,81 m do eixo, 0,02 m de lado) chega lá, a 110,32 graus. */
import { describe, expect, it } from 'vitest';
import { ErroArticulacao } from '../../procedural/extensoes/articulacao/declaracao.js';
import { conferirArticulacao, conferirArticulacoes, exigirArticulacaoLivre } from './conferir-articulacao.js';
import { executarReceita } from './executar-receita.js';
import { prepararSolido, profundidadeDeInterpenetracao } from './contato-de-solidos.js';

const portaAnel = (papel, centro = [0, 0, 0]) => ['publicarPorta', {
  nome: 'eixo-da-dobradica', de: { op: 'cubo', id: 1 },
  interface: { forma: 'anel', papel, eixo: [0, 1, 0], centro, raioInterno: 0, raioExterno: 0.01, inicio: 0, fim: 1.8 },
}];
const corpo = (origemId, dimensoes, extra = []) => [
  ['cubo', { origemId, ...dimensoes }],
  ['parte', { nome: `p${origemId}`, sel: { origem: { op: 'cubo', id: origemId } } }],
  ['solido', { sel: { grupo: `p${origemId}` } }],
  ...extra,
];
const peca = (nome, passos) => {
  const neutro = executarReceita({ meta: { nome }, PASSOS: passos }).neutro;
  expect(neutro.orfaos, `peça '${nome}' com órfãos`).toEqual([]);
  return neutro;
};

/* batente: parede de x = -0,60 a -0,30; folha: de x = 0,01 a 0,81, 0,04 de espessura */
const batente = () => peca('batente', corpo(1, { larg: 0.3, alt: 2, prof: 2, em: [-0.45, 0, 0] }, [portaAnel('recebe')]));
const folha = (centro) => peca('folha', corpo(1, { larg: 0.8, alt: 1.8, prof: 0.04, em: [0.41, 0, 0] }, [portaAnel('ocupa', centro)]));
const pino = () => peca('pino', [['cilindro', { origemId: 1, raio: 0.015, altura: 1.9, lados: 24 }], ['parte', { nome: 'pino', sel: { origem: { op: 'cilindro', id: 1 } } }], ['solido', { sel: { grupo: 'pino' } }]]);

const folhaDaMontagem = (id, neutro) => ({ caminho: [id], alvo: { tipo: 'peca' }, definicao: { neutro }, poseMundo: null });
const montagemDaPorta = (extra = [], centroDaFolha) => ({
  instancias: [folhaDaMontagem('batente', batente()), folhaDaMontagem('folha', folha(centroDaFolha)), ...extra],
});

const porta = (extra = {}) => ({
  id: 'porta-no-batente', tipo: 'revolucao',
  fixo: { caminho: ['batente'], porta: 'eixo-da-dobradica' }, movel: { caminho: ['folha'], porta: 'eixo-da-dobradica' },
  unidade: 'graus', curso: { minimo: 0, maximo: 90 }, passos: 18, folga: { valor: 0, unidade: 'mm' },
  ...extra,
});

function recusa(chamada, codigo) {
  let erro;
  try { chamada(); } catch (capturado) { erro = capturado; }
  expect(erro, `esperava recusa '${codigo}'`).toBeInstanceOf(ErroArticulacao);
  expect(erro.codigo).toBe(codigo);
  return erro;
}

describe('articulação de revolução: a folha da porta', () => {
  it('abre de 0 a 90 graus sem colidir, amostrando 19 posições no eixo da porta', () => {
    const r = conferirArticulacao(montagemDaPorta(), porta());
    expect(r.ok).toBe(true);
    expect(r.colisoes).toEqual([]);
    expect(r.recusa).toEqual([]);
    expect(r.posicoes).toHaveLength(19);
    expect(r.posicoes.map((p) => p.valor).slice(0, 3)).toEqual([0, 5, 10]);
    expect(r.posicoes.at(-1)).toEqual({ indice: 18, valor: 90, livre: true });
    expect(r.eixo).toEqual({ centro: [0, 0, 0], direcao: [0, 1, 0] });
    expect(r.moveis).toEqual([['folha']]);
    expect(r.fixos).toEqual([['batente']]);
    expect(r.paresConferidos).toBe(1);
    expect(exigirArticulacaoLivre(r)).toBe(r);
  });

  it('colide se o curso passar de onde bate, e diz a posição, o par e a penetração', () => {
    const r = conferirArticulacao(montagemDaPorta(), porta({ curso: { minimo: 0, maximo: 120 }, passos: 24 }));
    expect(r.ok).toBe(false);
    expect(r.posicoes.filter((p) => !p.livre).map((p) => p.valor)).toEqual([115, 120]);
    const primeira = r.colisoes[0];
    expect(primeira).toMatchObject({ movel: ['folha'], fixo: ['batente'], estado: 'interpenetram', posicao: { indice: 23, valor: 115, unidade: 'graus' } });
    /* a quina da ponta entra 0,81·cos115° − 0,02·sin115° = -0,3604 m: 60,4 mm na parede */
    expect(primeira.penetracao).toBeCloseTo(0.0604, 3);
    expect(r.primeirasColisoes).toEqual([expect.objectContaining({ movel: ['folha'], fixo: ['batente'], primeiraPosicao: { indice: 23, valor: 115 } })]);
    expect(r.primeirasColisoes[0].livreAte).toBeCloseTo(110.32, 1);
    expect(r.recusa[0]).toMatch(/posição 23 de 24 \(115 graus\) \["folha"\] penetra 60\.\d+ mm \["batente"\], acima da folga de 0 mm; livre até 110\.3/);
    expect(() => exigirArticulacaoLivre(r)).toThrow(/colisao|posição 23/);
    expect(recusa(() => exigirArticulacaoLivre(r), 'colisao-no-curso').caminho).toBe('articulacao.porta-no-batente');
  });

  it('a folga declarada tolera penetração até o valor, e só até ele', () => {
    const tolerada = conferirArticulacao(montagemDaPorta(), porta({ curso: { minimo: 0, maximo: 115 }, passos: 23, folga: { valor: 70, unidade: 'mm' } }));
    expect(tolerada.ok).toBe(true);
    expect(tolerada.folga).toBe(0.07);
    expect(tolerada.pares[0]).toMatchObject({ movel: ['folha'], fixo: ['batente'], estadoMaisGrave: 'interpenetram', colisoes: 0 });
    expect(tolerada.pares[0].penetracaoMaxima).toBeCloseTo(0.0604, 3);
    const alemDaFolga = conferirArticulacao(montagemDaPorta(), porta({ curso: { minimo: 0, maximo: 120 }, passos: 24, folga: { valor: 70, unidade: 'mm' } }));
    expect(alemDaFolga.colisoes.map((c) => c.posicao.valor)).toEqual([120]);
  });

  it('é determinística: mesma entrada, mesmo relatório, qualquer ordem das instâncias', () => {
    const declaracao = porta({ curso: { minimo: 0, maximo: 120 }, passos: 24 });
    const a = conferirArticulacao(montagemDaPorta(), declaracao);
    const b = conferirArticulacao(montagemDaPorta(), declaracao);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const invertida = montagemDaPorta();
    invertida.instancias.reverse();
    expect(JSON.stringify(conferirArticulacao(invertida, declaracao))).toBe(JSON.stringify(a));
    expect(Object.is(a.eixo.centro[0], -0)).toBe(false);
  });

  it('o pino que atravessa a folha por projeto entra em permitidos, com motivo; sem ele recusa já na posição 0', () => {
    const comPino = () => montagemDaPorta([folhaDaMontagem('pino', pino())]);
    const semDeclarar = conferirArticulacao(comPino(), porta());
    expect(semDeclarar.ok).toBe(false);
    expect(semDeclarar.colisoes[0]).toMatchObject({ movel: ['folha'], fixo: ['pino'], posicao: { indice: 0, valor: 0 } });
    expect(semDeclarar.primeirasColisoes[0].livreAte).toBeNull();
    const motivo = 'o pino é o eixo da dobradiça e passa pelo nó da folha';
    const declarado = conferirArticulacao(comPino(), porta({ permitidos: [{ movel: ['folha'], fixo: ['pino'], motivo }] }));
    expect(declarado.ok).toBe(true);
    expect(declarado.permitidos).toEqual([{ movel: ['folha'], fixo: ['pino'], motivo, contatoObservado: true }]);
    recusa(() => conferirArticulacao(comPino(), porta({ permitidos: [{ movel: ['folha'], fixo: ['pino'], motivo: 'curto' }] })), 'motivo-curto');
    recusa(() => conferirArticulacao(comPino(), porta({ permitidos: [{ movel: ['folha'], fixo: ['fantasma'], motivo }] })), 'permitido-invalido');
  });

  it('peça que acompanha a móvel gira junto, e a que fica continua sendo medida', () => {
    /* o pino acompanha a folha: o par folha-pino deixa de existir, e o pino gira colado na folha */
    const r = conferirArticulacao(montagemDaPorta([folhaDaMontagem('pino', pino())]), porta({ acompanham: [['pino']] }));
    expect(r.ok).toBe(true);
    expect(r.moveis).toEqual([['folha'], ['pino']]);
    expect(r.fixos).toEqual([['batente']]);
    expect(r.paresConferidos).toBe(2);
  });
});

describe('articulação presa às portas: o que se recusa antes de medir', () => {
  it('porta inexistente, nomeando as que a peça publica', () => {
    const erro = recusa(() => conferirArticulacao(montagemDaPorta(), porta({ fixo: { caminho: ['batente'], porta: 'fantasma' } })), 'porta-ausente');
    expect(erro.message).toMatch(/não publica a porta 'fantasma'.*eixo-da-dobradica/);
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ movel: { caminho: ['folha'], porta: 'fantasma' } })), 'porta-ausente');
  });

  it('instância inexistente, nomeando os caminhos da montagem', () => {
    const erro = recusa(() => conferirArticulacao(montagemDaPorta(), porta({ movel: { caminho: ['fantasma'], porta: 'eixo-da-dobradica' } })), 'instancia-ausente');
    expect(erro.message).toContain('["batente"], ["folha"]');
  });

  it('porta móvel fora do eixo da porta fixa', () => {
    const erro = recusa(() => conferirArticulacao(montagemDaPorta([], [0.2, 0, 0]), porta()), 'eixos-nao-coincidem');
    expect(erro.message).toMatch(/distância do centro ao eixo 200 mm/);
  });

  it('porta sem eixo, peça fixa que se move junto e declaração mal formada', () => {
    const comPlano = montagemDaPorta();
    comPlano.instancias[0].definicao.neutro.portas.set('apoio', { interface: { forma: 'plano', ponto: [0, 0, 0], normal: [0, 1, 0] } });
    recusa(() => conferirArticulacao(comPlano, porta({ fixo: { caminho: ['batente'], porta: 'apoio' } })), 'porta-sem-eixo');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ acompanham: [['batente']] })), 'fixo-move-junto');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ acompanham: [['fantasma']] })), 'instancia-ausente');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ tipo: 'esferica' })), 'tipo-desconhecido');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ unidade: 'mm' })), 'unidade-invalida');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ curso: { minimo: 90, maximo: 0 } })), 'curso-invalido');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ curso: { minimo: 0, maximo: 400 } })), 'curso-invalido');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ passos: 0 })), 'passos-invalidos');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ passos: 2.5 })), 'passos-invalidos');
    recusa(() => conferirArticulacao(montagemDaPorta(), porta({ folga: { valor: -1, unidade: 'mm' } })), 'articulacao-invalida');
    recusa(() => conferirArticulacao(montagemDaPorta(), { ...porta(), folga: undefined }), 'articulacao-invalida');
    recusa(() => conferirArticulacao(montagemDaPorta(), { ...porta(), extra: 1 }), 'chave-desconhecida');
    const semFolga = porta(); delete semFolga.folga;
    recusa(() => conferirArticulacao(montagemDaPorta(), semFolga), 'campo-ausente');
  });

  it('várias articulações da montagem saem em ordem de id e repetição de id é recusada', () => {
    const duas = conferirArticulacoes(montagemDaPorta(), [porta({ id: 'b' }), porta({ id: 'a', curso: { minimo: 0, maximo: 120 }, passos: 24 })]);
    expect(duas.resultados.map((r) => r.articulacao)).toEqual(['a', 'b']);
    expect(duas.ok).toBe(false);
    recusa(() => conferirArticulacoes(montagemDaPorta(), [porta(), porta()]), 'articulacao-duplicada');
  });
});

/* A gaveta de 0,5 × 0,2 × 0,4 m corre em +z numa guia de 0,30 m de curso; o
   fundo do corpo é uma parede de 0,20 m (z de -0,20 a 0) contra a qual a
   gaveta fechada encosta. */
const trilho = (papel) => ['publicarPorta', {
  nome: 'guia', de: { op: 'cubo', id: 1 },
  interface: { forma: 'trilho', papel, eixo: [0, 0, 1], centro: [0, 0.1, 0], perfil: { largura: 0.015, altura: 0.01 }, curso: 0.3 },
}];
const corpoDaGaveta = () => peca('corpo', corpo(1, { larg: 0.6, alt: 0.4, prof: 0.2, em: [0, 0, -0.1] }, [trilho('guia')]));
const gaveta = () => peca('gaveta', corpo(1, { larg: 0.5, alt: 0.2, prof: 0.4, em: [0, 0.05, 0.2] }, [trilho('deslizador')]));
const montagemDaGaveta = () => ({ instancias: [folhaDaMontagem('corpo', corpoDaGaveta()), folhaDaMontagem('gaveta', gaveta())] });
const corredica = (extra = {}) => ({
  id: 'gaveta-na-guia', tipo: 'prismatica',
  fixo: { caminho: ['corpo'], porta: 'guia' }, movel: { caminho: ['gaveta'], porta: 'guia' },
  unidade: 'mm', curso: { minimo: 0, maximo: 300 }, passos: 6, folga: { valor: 0, unidade: 'mm' },
  ...extra,
});

describe('articulação prismática: a gaveta na corrediça', () => {
  it('corre de 0 a 300 mm encostada no fundo sem colidir', () => {
    const r = conferirArticulacao(montagemDaGaveta(), corredica());
    expect(r.ok).toBe(true);
    expect(r.eixo.direcao).toEqual([0, 0, 1]);
    expect(r.posicoes.map((p) => p.valor)).toEqual([0, 50, 100, 150, 200, 250, 300]);
    expect(r.pares).toEqual([expect.objectContaining({ estadoMaisGrave: 'encostam', colisoes: 0 })]);
  });

  it('colide quando o curso empurra a gaveta contra o fundo, com 50 mm de penetração', () => {
    const r = conferirArticulacao(montagemDaGaveta(), corredica({ curso: { minimo: -50, maximo: 250 } }));
    expect(r.ok).toBe(false);
    expect(r.colisoes).toHaveLength(1);
    expect(r.colisoes[0]).toMatchObject({ movel: ['gaveta'], fixo: ['corpo'], posicao: { indice: 0, valor: -50, unidade: 'mm' } });
    expect(r.colisoes[0].penetracao).toBeCloseTo(0.05, 6);
    expect(r.primeirasColisoes[0].livreAte).toBeNull();
  });

  it('recusa curso maior que o curso do trilho', () => {
    const erro = recusa(() => conferirArticulacao(montagemDaGaveta(), corredica({ curso: { minimo: -50, maximo: 300 } })), 'curso-maior-que-o-trilho');
    expect(erro.message).toMatch(/350 mm.*300 mm/);
  });

  it('o trilho de outro sentido inverte o sinal do curso', () => {
    const invertida = montagemDaGaveta();
    invertida.instancias[0].poseMundo = { rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], deslocamento: [0, 0, 0] };
    invertida.instancias[1].poseMundo = { rotacao: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], deslocamento: [0, 0, 0] };
    const r = conferirArticulacao(invertida, corredica({ curso: { minimo: -50, maximo: 250 } }));
    expect(r.eixo.direcao.map((n) => Math.round(n))).toEqual([0, 0, -1]);
    expect(r.colisoes[0].posicao).toMatchObject({ indice: 0, valor: -50 });
  });
});

describe('profundidade de interpenetração do contato de sólidos', () => {
  const solido = (lado, x) => prepararSolido(peca('cubo', corpo(1, { larg: lado, alt: lado, prof: lado, em: [x, 0, 0] })), null, `cubo-${x}`);

  it('mede o afundamento do vértice mais fundo e devolve null onde não há invasão', () => {
    const grande = solido(1, 0);
    expect(profundidadeDeInterpenetracao(solido(0.4, 0.5), grande, 1e-9)).toBeCloseTo(0.2, 9);
    expect(profundidadeDeInterpenetracao(grande, solido(0.4, 0.5), 1e-9)).toBeCloseTo(0.2, 9);
    expect(profundidadeDeInterpenetracao(solido(0.4, 2), grande, 1e-9)).toBeNull();
    expect(profundidadeDeInterpenetracao(solido(1, 1), grande, 1e-9)).toBeNull();
  });
});
