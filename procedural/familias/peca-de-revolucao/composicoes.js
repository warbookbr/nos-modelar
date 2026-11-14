/* composicoes.js — as composições procedurais da família `peca-de-revolucao`.

   A composição v1 só substitui valores, e a quantidade de pontos do perfil muda com os parâmetros (os passos dos arcos do vaso e do
   prato), de modo que há uma composição por quantidade de pontos: `revolucao.pontos-<N>`, com N de 4 a `MAXIMO_DE_PONTOS`, e uma
   de seção em anel, `revolucao.anel-4`, para a cúpula, cuja seção não toca o eixo. Cada uma gira o perfil (`lathe`), publica a
   parte com o nome da forma (`parte`) e passa o `liso` pelo ângulo dado. O ponto `p<i>` é um vetor [raio, altura, concordância]
   em metro, e o `derivar` os escreve em ordem. A família não dá material: a receita que a chama liga o material à parte. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';

export const MINIMO_DE_PONTOS = 4;
/* o prato com 10 passos por arco tem 61 pontos, o maior perfil da família (o vaso com 18 tem 54) */
export const MAXIMO_DE_PONTOS = 64;
export const PONTOS_DO_ANEL = 4;

export const idDaComposicao = (pontos, anel) => (anel ? `revolucao.anel-${pontos}` : `revolucao.pontos-${pontos}`);

function composicaoDe(pontos, anel) {
  const parametros = {
    origem: { tipo: 'inteiro', padrao: 1 },
    nome: { tipo: 'texto' },
    lados: { tipo: 'inteiro' },
    segmentosCurva: { tipo: 'inteiro' },
    anguloLiso: { tipo: 'numero' },
  };
  for (let i = 1; i <= pontos; i++) parametros[`p${i}`] = { tipo: 'vetor3' };
  const origem = { origem: { op: 'lathe', id: { parametro: 'origem' } } };
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: idDaComposicao(pontos, anel),
    versao: '1.0.0',
    parametros,
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'revolucao',
        operacao: 'lathe',
        argumentos: {
          origemId: { parametro: 'origem' },
          lados: { parametro: 'lados' },
          segmentosCurva: { parametro: 'segmentosCurva' },
          perfil: Array.from({ length: pontos }, (_, i) => ({ parametro: `p${i + 1}` })),
          ...(anel ? { furos: [] } : {}),
        },
      },
      { id: 'parte', operacao: 'parte', argumentos: { nome: { parametro: 'nome' }, sel: origem } },
      { id: 'liso', operacao: 'liso', argumentos: { angulo: { parametro: 'anguloLiso' }, sel: origem } },
    ],
  });
}

export const COMPOSICOES = Object.freeze([
  ...Array.from({ length: MAXIMO_DE_PONTOS - MINIMO_DE_PONTOS + 1 }, (_, i) => composicaoDe(MINIMO_DE_PONTOS + i, false)),
  composicaoDe(PONTOS_DO_ANEL, true),
]);
