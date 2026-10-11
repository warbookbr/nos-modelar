/* Fixture de teste: a família `suporte-de-prova`. O parâmetro `estrutura` escolhe a composição: 0 é uma chapa dobrada em
   L (a extensão `chapaDobrada`), 1 é um quadro de quatro barras de tubo quadrado (a extensão `estruturaDeBarras`). Serve
   para provar que a aprovação mecânica lê o planificado da chapa e o corte das barras. Quem a usa é
   `tools/mecanifica/aprovacao-da-familia.test.mjs`; mudar qualquer arquivo desta pasta muda o que ele prova. */
import { readFileSync } from 'node:fs';
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
const parametro = (nome) => ({ parametro: nome });

export const ID_CHAPA = 'prova.chapa-em-l';
export const ID_QUADRO = 'prova.quadro-de-barras';

const identidade = { id: 'identidade', operacao: 'parte', argumentos: { nome: parametro('parte'), sel: { tudo: true } } };

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_CHAPA,
    versao: '1.0.0',
    parametros: { espessura: { tipo: 'numero' }, aba: { tipo: 'numero' }, largura: { tipo: 'numero' }, parte: { tipo: 'texto' } },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'chapa',
        operacao: 'chapaDobrada',
        argumentos: {
          espessura: parametro('espessura'),
          raioInterno: parametro('espessura'),
          largura: parametro('largura'),
          abas: [{ comprimento: parametro('aba'), angulo: 90 }, { comprimento: parametro('aba') }],
        },
      },
      identidade,
    ],
  }),
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_QUADRO,
    versao: '1.0.0',
    parametros: { comprimento: { tipo: 'numero' }, altura: { tipo: 'numero' }, parte: { tipo: 'texto' } },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'barras',
        operacao: 'estruturaDeBarras',
        argumentos: {
          unidade: 'mm',
          nos: [
            { nome: 'a', posicao: [0, 0, 0] },
            { nome: 'b', posicao: [parametro('comprimento'), 0, 0] },
            { nome: 'c', posicao: [parametro('comprimento'), 0, parametro('altura')] },
            { nome: 'd', posicao: [0, 0, parametro('altura')] },
          ],
          barras: [
            { nome: 'base', de: 'a', para: 'b' },
            { nome: 'direita', de: 'b', para: 'c' },
            { nome: 'topo', de: 'c', para: 'd' },
            { nome: 'esquerda', de: 'd', para: 'a' },
          ],
          perfil: { tipo: 'tubo-quadrado', lado: 40, parede: 3 },
          densidade: 7850,
        },
      },
      identidade,
    ],
  }),
]);

export function criarSuporte() {
  const derivar = ({ aba, espessura, comprimento, estrutura }) => (estrutura === 0
    ? { composicao: ID_CHAPA, argumentos: { espessura: espessura * MM, aba: aba * MM, largura: 0.03, parte: 'suporte' } }
    : { composicao: ID_QUADRO, argumentos: { comprimento, altura: comprimento / 2, parte: 'quadro' } });
  return definirFamilia({
    contrato: JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8')),
    composicoes: COMPOSICOES,
    derivar,
  });
}
