/* composicoes.js — as composições da família `atuador-de-junta`, três por forma: o atuador inteiro (o id da forma, que a
   família chama) e cada peça sozinha (`<id>.carcaca` e `<id>.saida`), que a montagem da família usa como peças soltas
   ligadas pela articulação de revolução. As três saem da mesma lista de nós: a inteira é a da carcaça seguida da da saída.

   Forma 1, cilíndrico: a carcaça por `lathe` unida à saída do cabo (`lathe` em x), menos os furos da flange de fixação (um
   `lathe` repetido por `arranja` radial); e a flange de saída por `lathe`, menos os furos cegos.
   Forma 2, de caixa (o servo): a caixa e as orelhas por `extrusao` em y, unidas à torre e ao cabo (`lathe`), menos os
   quatro furos das orelhas; o horn por `lathe`, menos o furo cego repetido por `arranja` radial em volta do eixo.

   As partes são `carcaca` e `saida`. As portas são o padrão dos furos de fixação (`fixacao`) e o da saída (`saida`), com a
   referência em +x para a posição por porta definir o giro; e a `cabo`, um plano no centro da ponta livre do cilindro de saída do cabo, com a normal para fora dele; e o eixo da junta, um anel na face da carcaça onde a saída
   assenta (`eixo`) e outro na face de baixo da saída (`eixo-da-saida`), que a articulação liga. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

export const ID_POR_FORMA = Object.freeze({ 1: 'atuador-de-junta.cilindrico', 2: 'atuador-de-junta.caixa' });
export const idDaPeca = (forma, peca) => `${ID_POR_FORMA[forma]}.${peca}`;
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}r${k}`), p(`${prefixo}y${k}`)]);
const nomes = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}r${k}`, 'numero'], [`${prefixo}y${k}`, 'numero']]).flat();
const o = (op, id) => ({ origem: { op, id } });
const ret = (prefixo) => ({ retangulo: { largura: p(`${prefixo}Largura`), profundidade: p(`${prefixo}Profundidade`), cantos: p(`${prefixo}Cantos`) } });
const REFERENCIA = [1, 0, 0];
const SAI = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];
const NOMES_DO_CABO = [['centroDoCabo', 'vetor3'], ['eixoDoCabo', 'vetor3'], ['extensaoDoCabo', 'numero']];
const NOMES_DO_EIXO = [['centroDoEixo', 'vetor3'], ['raioDoEixo', 'numero'], ['raioDoEixoDaSaida', 'numero'], ['inicioDoEixo', 'numero'], ['fimDoEixoDaSaida', 'numero']];
const portaDoEixo = (id, de, raio, inicio, fim) => ({ id: `porta-${id}`, operacao: 'publicarPorta', argumentos: { id, de, interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: p('centroDoEixo'), raioInterno: 0, raioExterno: p(raio), inicio, fim } } });

/* as três composições de uma forma, da lista de nós de cada peça */
function tres(forma, tipos, carcaca, saida, portaDaCarcaca) {
  const parametros = Object.fromEntries([...tipos, ...NOMES_DO_EIXO, ...NOMES_DO_CABO].map(([n, t]) => [n, { tipo: t }]));
  const comp = (id, nos) => Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros, artefatos: { entra: [], sai: SAI }, nos });
  /* a porta do cabo é o último passo de cada composição que tem a carcaça, para a numeração dos passos da saída ficar a de antes dela */
  return [comp(ID_POR_FORMA[forma], [...carcaca, ...saida, portaDaCarcaca]), comp(idDaPeca(forma, 'carcaca'), [...carcaca, portaDaCarcaca]), comp(idDaPeca(forma, 'saida'), saida)];
}

/* a porta do cabo: o plano da ponta livre do cilindro de saída, com o ponto no centro dela e a normal para fora, de modo que o cabo que parte dela sai pelo centro do cilindro e na direção dele. É plano, e não anel, porque a conferência
   de forma do anel mede o raio contra todos os vértices da carcaça perto do plano, e o flange do atuador de 100 mm tem o raio igual ao alcance da saída. */
const portaDoCabo = (de) => ({ id: 'porta-cabo', operacao: 'publicarPorta', argumentos: { id: 'cabo', de, interface: { forma: 'plano', papel: 'apoia', ponto: p('centroDoCabo'), normal: p('eixoDoCabo'), extensao: [p('extensaoDoCabo'), p('extensaoDoCabo')] } } });

const FURO_F = { op: 'lathe', id: 13 }; const FURO_S = { op: 'lathe', id: 21 };
const CILINDRICO = tres(1, [
  ...nomes('c', 8), ...nomes('s', 5), ...nomes('k', 4), ...nomes('ff', 4), ...nomes('fs', 4),
  ['emCabo', 'vetor3'], ['emFuroF', 'vetor3'], ['emFuroS', 'vetor3'], ['furosF', 'inteiro'], ['grausF', 'numero'], ['furosS', 'inteiro'], ['grausS', 'numero'],
  ['diametroF', 'numero'], ['raioF', 'numero'], ['anguloF', 'numero'], ['diametroS', 'numero'], ['raioS', 'numero'], ['anguloS', 'numero'], ['topo', 'vetor3'],
], [
  { id: 'carcaca', operacao: 'lathe', argumentos: { origemId: 10, lados: 96, perfil: lista('c', 8) } },
  { id: 'cabo', operacao: 'lathe', argumentos: { origemId: 11, lados: 32, eixo: 'x', perfil: lista('k', 4), em: p('emCabo') } },
  { id: 'carcaca-com-cabo', operacao: 'unir', argumentos: { origemId: 12, solidos: [o('lathe', 10), o('lathe', 11)] } },
  { id: 'furo-do-flange', operacao: 'lathe', argumentos: { origemId: 13, lados: 24, perfil: lista('ff', 4), em: p('emFuroF') } },
  { id: 'furos-do-flange', operacao: 'arranja', argumentos: { modo: 'radial', total: p('furosF'), graus: p('grausF'), eixo: 'y', pivo: [0, 0, 0], origemId: 14, derivaDe: FURO_F, sel: { origem: FURO_F } } },
  { id: 'carcaca-furada', operacao: 'subtrair', argumentos: { origemId: 15, solidos: [o('unir', 12), { origem: FURO_F }, { origem: { op: 'arranja', id: 14, de: FURO_F } }] } },
  { id: 'parte-carcaca', operacao: 'parte', argumentos: { nome: 'carcaca', sel: o('subtrair', 15) } },
  { id: 'porta-fixacao', operacao: 'publicarPorta', argumentos: { id: 'fixacao', de: { op: 'subtrair', id: 15 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: [0, 0, 0], normal: [0, -1, 0] }, referencia: REFERENCIA, diametro: p('diametroF'), padrao: { tipo: 'circular', centro: [0, 0, 0], raio: p('raioF'), quantidade: p('furosF'), anguloInicial: p('anguloF') } } } },
  portaDoEixo('eixo', { op: 'subtrair', id: 15 }, 'raioDoEixo', p('inicioDoEixo'), 0),
], [
  { id: 'saida', operacao: 'lathe', argumentos: { origemId: 20, lados: 96, perfil: lista('s', 5) } },
  { id: 'furo-da-saida', operacao: 'lathe', argumentos: { origemId: 21, lados: 24, perfil: lista('fs', 4), em: p('emFuroS') } },
  { id: 'furos-da-saida', operacao: 'arranja', argumentos: { modo: 'radial', total: p('furosS'), graus: p('grausS'), eixo: 'y', pivo: [0, 0, 0], origemId: 22, derivaDe: FURO_S, sel: { origem: FURO_S } } },
  { id: 'saida-furada', operacao: 'subtrair', argumentos: { origemId: 23, solidos: [o('lathe', 20), { origem: FURO_S }, { origem: { op: 'arranja', id: 22, de: FURO_S } }] } },
  { id: 'parte-saida', operacao: 'parte', argumentos: { nome: 'saida', sel: o('subtrair', 23) } },
  { id: 'porta-saida', operacao: 'publicarPorta', argumentos: { id: 'saida', de: { op: 'subtrair', id: 23 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: p('topo'), normal: [0, 1, 0] }, referencia: REFERENCIA, diametro: p('diametroS'), padrao: { tipo: 'circular', centro: p('topo'), raio: p('raioS'), quantidade: p('furosS'), anguloInicial: p('anguloS') } } } },
  portaDoEixo('eixo-da-saida', { op: 'subtrair', id: 23 }, 'raioDoEixoDaSaida', 0, p('fimDoEixoDaSaida')),
], portaDoCabo({ op: 'subtrair', id: 15 }));

const FURO_H = { op: 'lathe', id: 41 };
const CAIXA = tres(2, [
  ...['caixa', 'aba'].flatMap((n) => [[`${n}Largura`, 'numero'], [`${n}Profundidade`, 'numero'], [`${n}Cantos`, 'numero'], [`${n}Altura`, 'numero'], [`${n}Em`, 'vetor3']]),
  ...nomes('t', 4), ...nomes('k', 4), ...nomes('h', 4), ...nomes('fh', 4), ...nomes('fa', 4),
  ['emTorre', 'vetor3'], ['emCabo', 'vetor3'], ['emHorn', 'vetor3'], ['emFuroH', 'vetor3'], ['emFuroA0', 'vetor3'], ['emFuroA1', 'vetor3'], ['emFuroA2', 'vetor3'], ['emFuroA3', 'vetor3'],
  ['pivoH', 'vetor3'], ['diametroA', 'numero'], ['planoA', 'vetor3'], ['centroA0', 'vetor3'], ['centroA1', 'vetor3'], ['centroA2', 'vetor3'], ['centroA3', 'vetor3'],
  ['diametroH', 'numero'], ['raioH', 'numero'], ['topo', 'vetor3'],
], [
  { id: 'caixa', operacao: 'extrusao', argumentos: { origemId: 30, perfil: ret('caixa'), altura: p('caixaAltura'), em: p('caixaEm'), segmentosArco: 6 } },
  { id: 'aba', operacao: 'extrusao', argumentos: { origemId: 31, perfil: ret('aba'), altura: p('abaAltura'), em: p('abaEm'), segmentosArco: 6 } },
  { id: 'torre', operacao: 'lathe', argumentos: { origemId: 32, lados: 48, perfil: lista('t', 4), em: p('emTorre') } },
  { id: 'cabo', operacao: 'lathe', argumentos: { origemId: 33, lados: 24, eixo: 'x', perfil: lista('k', 4), em: p('emCabo') } },
  { id: 'caixa-inteira', operacao: 'unir', argumentos: { origemId: 34, solidos: [o('extrusao', 30), o('extrusao', 31), o('lathe', 32), o('lathe', 33)] } },
  ...[0, 1, 2, 3].map((k) => ({ id: `furo-da-aba-${k}`, operacao: 'lathe', argumentos: { origemId: 35 + k, lados: 20, perfil: lista('fa', 4), em: p(`emFuroA${k}`) } })),
  { id: 'caixa-furada', operacao: 'subtrair', argumentos: { origemId: 39, solidos: [o('unir', 34), o('lathe', 35), o('lathe', 36), o('lathe', 37), o('lathe', 38)] } },
  { id: 'parte-carcaca', operacao: 'parte', argumentos: { nome: 'carcaca', sel: o('subtrair', 39) } },
  { id: 'porta-fixacao', operacao: 'publicarPorta', argumentos: { id: 'fixacao', de: { op: 'subtrair', id: 39 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: p('planoA'), normal: [0, -1, 0] }, referencia: REFERENCIA, diametro: p('diametroA'), centros: [p('centroA0'), p('centroA1'), p('centroA2'), p('centroA3')] } } },
  portaDoEixo('eixo', { op: 'subtrair', id: 39 }, 'raioDoEixo', p('inicioDoEixo'), 0),
], [
  { id: 'horn', operacao: 'lathe', argumentos: { origemId: 40, lados: 64, perfil: lista('h', 4), em: p('emHorn') } },
  { id: 'furo-do-horn', operacao: 'lathe', argumentos: { origemId: 41, lados: 16, perfil: lista('fh', 4), em: p('emFuroH') } },
  { id: 'furos-do-horn', operacao: 'arranja', argumentos: { modo: 'radial', total: 4, graus: 90, eixo: 'y', pivo: p('pivoH'), origemId: 42, derivaDe: FURO_H, sel: { origem: FURO_H } } },
  { id: 'horn-furado', operacao: 'subtrair', argumentos: { origemId: 43, solidos: [o('lathe', 40), { origem: FURO_H }, { origem: { op: 'arranja', id: 42, de: FURO_H } }] } },
  { id: 'parte-saida', operacao: 'parte', argumentos: { nome: 'saida', sel: o('subtrair', 43) } },
  { id: 'porta-saida', operacao: 'publicarPorta', argumentos: { id: 'saida', de: { op: 'subtrair', id: 43 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: p('topo'), normal: [0, 1, 0] }, referencia: REFERENCIA, diametro: p('diametroH'), padrao: { tipo: 'circular', centro: p('topo'), raio: p('raioH'), quantidade: 4, anguloInicial: -90 } } } },
  portaDoEixo('eixo-da-saida', { op: 'subtrair', id: 43 }, 'raioDoEixoDaSaida', 0, p('fimDoEixoDaSaida')),
], portaDoCabo({ op: 'subtrair', id: 39 }));

export const COMPOSICOES = Object.freeze([...CILINDRICO, ...CAIXA]);
