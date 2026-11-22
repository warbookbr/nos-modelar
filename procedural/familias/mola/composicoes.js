/* composicoes.js — as três composições da família `mola`, uma por forma, porque a composição v1 só substitui valores e o
   número de passos muda com a forma (o gancho tem 18 pontos nomeados; o braço, 2).

   O corpo é o `friso` com `helice`, que o núcleo varre ao longo de `caminhoHelicoidal` com a normal radial: a composição
   passa só números. O gancho e o braço são `friso` de polilinha com uma normal só, perpendicular ao plano deles, e a junta
   de cada ponta é uma `esfera` do diâmetro do fio. As partes são `espiras`, `ganchos` e `bracos`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_DO_GANCHO, PONTOS_POR_VOLTA } from './geometria.js';

export const ID_POR_FORMA = Object.freeze({ 1: 'mola.compressao', 2: 'mola.tracao', 3: 'mola.torcao' });

const p = (nome) => ({ parametro: nome });
const origem = (op, id) => ({ origem: { op, id } });
const LADOS_DA_JUNTA = 16;
const ANEIS_DA_JUNTA = 8;

function corpo(comPontas) {
  return [
    {
      id: 'espiras', operacao: 'friso',
      argumentos: {
        origemId: 1, linha: { nome: 'espiras' }, perfil: { circulo: { raio: p('raioDoFio') } },
        helice: { raio: p('raio'), passo: p('passo'), voltas: p('voltas'), centro: p('centro'), pontosPorVolta: PONTOS_POR_VOLTA, ...(comPontas ? { pontas: { voltas: 1, passo: p('passoDaPonta') } } : {}) },
      },
    },
    { id: 'parte-das-espiras', operacao: 'parte', argumentos: { nome: 'espiras', sel: origem('friso', 1) } },
  ];
}

/* a esfera da junta de uma ponta: ela se apoia no chão, então `em` é o ponto da junta menos o raio em y */
const junta = (id, quem, parte) => ([
  { id: `junta-${quem.toLowerCase()}`, operacao: 'esfera', argumentos: { origemId: id, raio: p('raioDoFio'), aneis: ANEIS_DA_JUNTA, lados: LADOS_DA_JUNTA, em: p(`apoioDaJunta${quem}`) } },
  { id: `parte-da-junta-${quem.toLowerCase()}`, operacao: 'parte', argumentos: { nome: parte, sel: origem('esfera', id) } },
]);

/* o friso de uma ponta (gancho ou braço): os pontos se chamam `<prefixo><Cima|Baixo><k>`, e a parte é `parte` */
function ponta(id, quem, parte, prefixo, pontos) {
  return [
    {
      id: `${prefixo}-${quem.toLowerCase()}`, operacao: 'friso',
      argumentos: {
        origemId: id, linha: { nome: `${prefixo}${quem}`, pontos: Array.from({ length: pontos }, (_, k) => p(`${prefixo}${quem}${k}`)) },
        normal: p(`normal${quem}`), perfil: { circulo: { raio: p('raioDoFio') } },
      },
    },
    { id: `parte-${prefixo}-${quem.toLowerCase()}`, operacao: 'parte', argumentos: { nome: parte, sel: origem('friso', id) } },
    ...junta(id + 10, quem, parte),
  ];
}

const parametros = (nomes) => Object.fromEntries(nomes.map(([nome, tipo]) => [nome, { tipo }]));
const BASE = [['raioDoFio', 'numero'], ['raio', 'numero'], ['passo', 'numero'], ['voltas', 'numero'], ['centro', 'vetor3']];
const DA_PONTA = (prefixo, pontos) => ['Cima', 'Baixo'].flatMap((quem) => [
  ...Array.from({ length: pontos }, (_, k) => [`${prefixo}${quem}${k}`, 'vetor3']), [`normal${quem}`, 'vetor3'], [`apoioDaJunta${quem}`, 'vetor3'],
]);

const composicao = (id, nomes, nos) => Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: parametros(nomes), artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] }, nos,
});

export const COMPOSICOES = Object.freeze([
  composicao(ID_POR_FORMA[1], [...BASE, ['passoDaPonta', 'numero']], corpo(true)),
  composicao(ID_POR_FORMA[2], [...BASE, ...DA_PONTA('gancho', PONTOS_DO_GANCHO)], [
    ...corpo(false), ...ponta(2, 'Cima', 'ganchos', 'gancho', PONTOS_DO_GANCHO), ...ponta(3, 'Baixo', 'ganchos', 'gancho', PONTOS_DO_GANCHO),
  ]),
  composicao(ID_POR_FORMA[3], [...BASE, ...DA_PONTA('braco', 2)], [
    ...corpo(false), ...ponta(2, 'Cima', 'bracos', 'braco', 2), ...ponta(3, 'Baixo', 'bracos', 'braco', 2),
  ]),
]);
