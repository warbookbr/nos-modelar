/* composicoes.js — a composição da família `gabinete`: cada metade é a extrusão em y do retângulo de cantos arredondados
   menos o vão de dentro; a base ganha o lábio (um anel extrudado, unido) e os quatro ressaltos (anéis por `lathe` em y,
   unidos), e perde os furos passantes; a tampa perde o rebaixo do encaixe, ganha os ressaltos e perde os furos pilotos.
   As partes são `base` e `tampa`; as portas são o plano de apoio de baixo, o plano de cima e o padrão dos furos dos
   ressaltos na face de baixo. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

export const ID_DO_GABINETE = 'gabinete.de-plastico';
const p = (nome) => ({ parametro: nome });
const ret = (prefixo) => ({ retangulo: { largura: p(`${prefixo}Largura`), profundidade: p(`${prefixo}Profundidade`), cantos: p(`${prefixo}Cantos`) } });
const o = (op, id) => ({ origem: { op, id } });

function composicao() {
  const nomes = [];
  const nos = [];
  for (const prefixo of ['externo', 'interno', 'labio']) nomes.push([`${prefixo}Largura`, 'numero'], [`${prefixo}Profundidade`, 'numero'], [`${prefixo}Cantos`, 'numero']);
  const bloco = (id, prefixo, faixa) => { nomes.push([`${faixa}Altura`, 'numero'], [`${faixa}Em`, 'vetor3']); nos.push({ id: `${faixa.toLowerCase()}-${id}`, operacao: 'extrusao', argumentos: { origemId: id, perfil: ret(prefixo), altura: p(`${faixa}Altura`), em: p(`${faixa}Em`), segmentosArco: 6 } }); return o('extrusao', id); };
  const tubo = (id, nome, comFuro) => { nomes.push([`${nome}Em`, 'vetor3'], [`${nome}Altura`, 'numero']); nos.push({ id: nome.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`), operacao: 'lathe', argumentos: { origemId: id, lados: 32, perfil: comFuro ? [[0, 0], [p('raioDoFuro'), 0], [p('raioDoFuro'), p(`${nome}Altura`)], [0, p(`${nome}Altura`)]] : [[0, 0], [p('raioDoRessalto'), 0], [p('raioDoRessalto'), p(`${nome}Altura`)], [0, p(`${nome}Altura`)]], em: p(`${nome}Em`) } }); return o('lathe', id); };
  nomes.push(['raioDoRessalto', 'numero'], ['raioDoFuro', 'numero']);
  /* a base */
  const caixaDaBase = bloco(10, 'externo', 'base');
  const vaoDaBase = bloco(11, 'interno', 'vaoDaBase');
  nos.push({ id: 'base-oca', operacao: 'subtrair', argumentos: { origemId: 12, solidos: [caixaDaBase, vaoDaBase] } });
  const labioFora = bloco(13, 'labio', 'labioY');
  const labioDentro = bloco(14, 'interno', 'labioVao');
  nos.push({ id: 'labio', operacao: 'subtrair', argumentos: { origemId: 15, solidos: [labioFora, labioDentro] } });
  const ressaltosDaBase = [0, 1, 2, 3].map((k) => tubo(20 + k, `ressaltoDaBase${k}`, false));
  nos.push({ id: 'base-unida', operacao: 'unir', argumentos: { origemId: 30, solidos: [o('subtrair', 12), o('subtrair', 15), ...ressaltosDaBase] } });
  const furosDaBase = [0, 1, 2, 3].map((k) => tubo(31 + k, `furoDaBase${k}`, true));
  nos.push({ id: 'base', operacao: 'subtrair', argumentos: { origemId: 40, solidos: [o('unir', 30), ...furosDaBase] } });
  /* a tampa */
  const caixaDaTampa = bloco(50, 'externo', 'tampa');
  const vaoDaTampa = bloco(51, 'interno', 'vaoDaTampa');
  const rebaixo = bloco(52, 'labio', 'rebaixo');
  nos.push({ id: 'tampa-oca', operacao: 'subtrair', argumentos: { origemId: 53, solidos: [caixaDaTampa, vaoDaTampa, rebaixo] } });
  const ressaltosDaTampa = [0, 1, 2, 3].map((k) => tubo(60 + k, `ressaltoDaTampa${k}`, false));
  nos.push({ id: 'tampa-unida', operacao: 'unir', argumentos: { origemId: 70, solidos: [o('subtrair', 53), ...ressaltosDaTampa] } });
  const furosDaTampa = [0, 1, 2, 3].map((k) => tubo(71 + k, `furoDaTampa${k}`, true));
  nos.push({ id: 'tampa', operacao: 'subtrair', argumentos: { origemId: 80, solidos: [o('unir', 70), ...furosDaTampa] } });
  nos.push(
    { id: 'parte-base', operacao: 'parte', argumentos: { nome: 'base', sel: o('subtrair', 40) } },
    { id: 'parte-tampa', operacao: 'parte', argumentos: { nome: 'tampa', sel: o('subtrair', 80) } },
  );
  nomes.push(['altura', 'numero'], ['pontoDoTopo', 'vetor3'], ['diametroDoFuro', 'numero'], ...[0, 1, 2, 3].map((k) => [`centro${k}`, 'vetor3']));
  nos.push(
    { id: 'porta-apoio', operacao: 'publicarPorta', argumentos: { id: 'apoio', de: { op: 'subtrair', id: 40 }, interface: { forma: 'plano', papel: 'apoia', ponto: [0, 0, 0], normal: [0, -1, 0], extensao: [p('externoLargura'), p('externoProfundidade')] } } },
    { id: 'porta-topo', operacao: 'publicarPorta', argumentos: { id: 'topo', de: { op: 'subtrair', id: 80 }, interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDoTopo'), normal: [0, 1, 0], extensao: [p('externoLargura'), p('externoProfundidade')] } } },
    { id: 'porta-fixacao', operacao: 'publicarPorta', argumentos: { id: 'fixacao', de: { op: 'subtrair', id: 40 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto: [0, 0, 0], normal: [0, -1, 0] }, diametro: p('diametroDoFuro'), centros: [0, 1, 2, 3].map((k) => p(`centro${k}`)) } } },
  );
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DO_GABINETE, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] }, nos });
}

export const COMPOSICOES = Object.freeze([composicao()]);
