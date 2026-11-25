/* composicoes.js — a composição da família `corrente`: para cada um dos quatro trechos (reto de cima, volta da roda 2,
   reto de baixo e volta da roda 1), o rolo e o pino por `lathe` em y e as duas placas internas e as duas externas por
   `extrusao` em y, cada um repetido por `arranja` (linear no reto, radial na volta). As partes são `rolos`, `pinos`,
   `placasInternas` e `placasExternas`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS_DO_PINO, PONTOS_DA_PLACA } from './geometria.js';

export const ID_DA_CORRENTE = 'corrente.de-rolos';
export const TRECHOS = Object.freeze(['reto', 'volta', 'reto', 'volta']);
const p = (nome) => ({ parametro: nome });
const PARTES = Object.freeze({ rolo: 'rolos', pino: 'pinos', interna: 'placasInternas', externa: 'placasExternas' });

function composicao() {
  const nomes = [['raioDoRolo', 'numero'], ['raioDoPino', 'numero'], ['meiaLargura', 'numero'], ['meioPino', 'numero'], ['espessuraInterna', 'numero'], ['espessuraExterna', 'numero']];
  const nos = [];
  let id = 10;
  TRECHOS.forEach((tipo, s) => {
    const repetir = (nome, fonte, passoOuGraus) => {
      const copias = id + 1;
      const args = tipo === 'reto'
        ? { modo: 'linear', total: p(`${nome}Total`), d: p(`${nome}Passo`) }
        : { modo: 'radial', total: p(`${nome}Total`), graus: p(`${nome}Graus`), eixo: 'y', pivo: p(`t${s}Centro`) };
      nomes.push([`${nome}Total`, 'inteiro'], tipo === 'reto' ? [`${nome}Passo`, 'vetor3'] : [`${nome}Graus`, 'numero']);
      nos.push({ id: `${nome}-copias`, operacao: 'arranja', argumentos: { ...args, origemId: copias, derivaDe: fonte, sel: { origem: fonte } } });
      return [{ origem: fonte }, { origem: { op: 'arranja', id: copias, de: fonte } }];
    };
    if (tipo === 'volta') nomes.push([`t${s}Centro`, 'vetor3']);
    const partes = [];
    /* o rolo e o pino */
    for (const [qual, perfil] of [['rolo', [[p('raioDoPino'), p('menosMeiaLargura')], [p('raioDoRolo'), p('menosMeiaLargura')], [p('raioDoRolo'), p('meiaLargura')], [p('raioDoPino'), p('meiaLargura')], [p('raioDoPino'), p('menosMeiaLargura')]]], ['pino', [[0, p('menosMeioPino')], [p('raioDoPino'), p('menosMeioPino')], [p('raioDoPino'), p('meioPino')], [0, p('meioPino')]]]]) {
      const nome = `t${s}${qual}`;
      nomes.push([`${nome}Em`, 'vetor3']);
      nos.push({ id: nome, operacao: 'lathe', argumentos: { origemId: id, lados: LADOS_DO_PINO, perfil, em: p(`${nome}Em`) } });
      partes.push([qual, repetir(nome, { op: 'lathe', id })]);
      id += 2;
    }
    /* as placas: duas internas e duas externas, de um lado e do outro */
    for (const qual of ['interna', 'externa']) for (const lado of [0, 1]) {
      const nome = `t${s}${qual}${lado}`;
      const base = `t${s}${qual}`;
      if (lado === 0) nomes.push(...Array.from({ length: PONTOS_DA_PLACA }, (_, k) => [[`${base}u${k}`, 'numero'], [`${base}v${k}`, 'numero']]).flat(), ...['A', 'B'].flatMap((f) => Array.from({ length: LADOS_DO_PINO }, (_, k) => [[`${base}Furo${f}u${k}`, 'numero'], [`${base}Furo${f}v${k}`, 'numero']]).flat()));
      nomes.push([`${nome}Em`, 'vetor3']);
      const perfil = Array.from({ length: PONTOS_DA_PLACA }, (_, k) => [p(`${base}u${k}`), p(`${base}v${k}`)]);
      /* o furo é o mesmo polígono de 24 lados do pino, vértice com vértice, para o pino só encostar */
      const furos = ['A', 'B'].map((f) => Array.from({ length: LADOS_DO_PINO }, (_, k) => [p(`${base}Furo${f}u${k}`), p(`${base}Furo${f}v${k}`)]));
      nos.push({ id: nome, operacao: 'extrusao', argumentos: { origemId: id, perfil, furos, altura: p(qual === 'interna' ? 'espessuraInterna' : 'espessuraExterna'), em: p(`${nome}Em`) } });
      partes.push([qual, repetir(nome, { op: 'extrusao', id })]);
      id += 2;
    }
    partes.forEach(([qual, sels], k) => sels.forEach((sel, j) => nos.push({ id: `parte-t${s}-${k}-${j}`, operacao: 'parte', argumentos: { nome: PARTES[qual], sel } })));
  });
  nomes.push(['menosMeiaLargura', 'numero'], ['menosMeioPino', 'numero']);
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_CORRENTE, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] }, nos });
}

export const COMPOSICOES = Object.freeze([composicao()]);
