/* composicoes.js — as composições procedurais da família `cadeira`, geradas por laço porque a quantidade de tábuas do assento e de
   ripas, e a presença de postes, saias, travessão e travessas, mudam a quantidade de passos e a composição v1 só substitui valores.

   Uma composição por combinação (`combinacaoDaCadeira`): `planoDaCadeira` monta os passos e os argumentos dela a partir das caixas
   em milímetro de `geometria.js`, e é a mesma função que o `derivar` chama com os parâmetros da chamada, de modo que os nomes dos
   argumentos saem do mesmo código. Cada caixa é um `cubo` com a parte própria (assento, perna-frente-esq, ripa-1...), e os cubos
   se unem numa peça só; os que não se tocam (as tábuas do meio do assento) continuam sólidos separados. A família não desenha
   material nem cor: a receita que a chama liga o material à parte. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { geometriaDaCadeira, idDaCadeira } from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
const metro = (mm) => Number((mm * MM).toPrecision(12));

export const FAIXA_DE_CONTAGEM = Object.freeze({ tabuas: { minimo: 1, maximo: 6 }, ripas: { minimo: 1, maximo: 5 } });

/** As combinações que a família chama. */
export function combinacoes() {
  const lista = [];
  for (let postes = 0; postes <= 1; postes += 1) {
    for (let saia = 0; saia <= 2; saia += 1) {
      for (let travessao = 0; travessao <= 1; travessao += 1) {
        for (let alta = 0; alta <= 1; alta += 1) {
          for (let baixa = 0; baixa <= 1; baixa += 1) {
            for (let tabuas = FAIXA_DE_CONTAGEM.tabuas.minimo; tabuas <= FAIXA_DE_CONTAGEM.tabuas.maximo; tabuas += 1) {
              for (let ripas = FAIXA_DE_CONTAGEM.ripas.minimo; ripas <= FAIXA_DE_CONTAGEM.ripas.maximo; ripas += 1) {
                lista.push({ postes, saia, travessao, alta, baixa, tabuas, ripas });
              }
            }
          }
        }
      }
    }
  }
  return lista;
}

/** Os passos e os argumentos de uma cadeira, a partir dos parâmetros completos em milímetro. */
export function planoDaCadeira(parametros) {
  const { caixas } = geometriaDaCadeira(parametros);
  const argumentos = {};
  const nos = [];
  const valor = (nome, v) => { argumentos[nome] = v; return { parametro: nome }; };
  const cubos = caixas.map((c, i) => {
    const n = i + 1;
    nos.push({
      id: `no-${n}`,
      operacao: 'cubo',
      argumentos: {
        origemId: n,
        larg: valor(`larg${n}`, metro(c.larg)),
        alt: valor(`alt${n}`, metro(c.alt)),
        prof: valor(`prof${n}`, metro(c.prof)),
        em: valor(`pos${n}`, c.centro.map(metro)),
      },
    });
    return { op: 'cubo', id: n, nome: c.nome };
  });
  const ref = ({ op, id }) => ({ origem: { op, id } });
  cubos.forEach((c, i) => nos.push({ id: `parte-${i + 1}`, operacao: 'parte', argumentos: { nome: c.nome, sel: ref(c) } }));
  const idUniao = cubos.length + 1;
  nos.push({ id: 'uniao', operacao: 'unir', argumentos: { origemId: idUniao, solidos: cubos.map(ref) } });
  nos.push({ id: 'solido-da-peca', operacao: 'solido', argumentos: { sel: ref({ op: 'unir', id: idUniao }) } });
  return { nos, argumentos };
}

/* Os parâmetros de uma composição: o nome de cada argumento e o tipo (vetor de três para as posições). */
const parametrosDe = (argumentos) => Object.fromEntries(Object.entries(argumentos).map(([nome, v]) => [nome, { tipo: Array.isArray(v) ? 'vetor3' : 'numero' }]));

/* Uma cadeira de exemplo com a estrutura da combinação, só para dar os nomes e os tipos dos argumentos. */
function exemploDe(combo) {
  return {
    larguraDoAssento: 520, profundidadeDoAssento: 520, alturaDoAssento: 450, espessuraDoAssento: 50, tabuasDoAssento: combo.tabuas,
    larguraDaPerna: 50, profundidadeDaPerna: 50, recuoLateral: 10, recuoDeTras: 10,
    alturaDaSaia: combo.saia ? 60 : 0, saiaNosLados: combo.saia === 2 ? 1 : 0, espessuraDaSaia: 30, alturaDoTravessaoLateral: combo.travessao ? 140 : 0,
    alturaDosPostes: combo.postes ? 1000 : 0, numeroDeRipas: combo.ripas, ocupacaoDoVao: 0.8, vaoEntreRipas: 20, espessuraDaRipa: 20,
    baseDasRipas: 550, topoDasRipas: 950, alturaDaTravessaAlta: combo.alta ? 100 : 0, topoDaTravessaAlta: 1000,
    alturaDaTravessaBaixa: combo.baixa ? 40 : 0, espessuraDasTravessas: 30,
  };
}

function composicaoDe(combo) {
  const { nos, argumentos } = planoDaCadeira(exemploDe(combo));
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDaCadeira(combo), versao: '1.0.0', parametros: parametrosDe(argumentos),
    artefatos: { entra: [], sai: [MALHA, PARTE] }, nos,
  });
}

export const COMPOSICOES = Object.freeze(combinacoes().map(composicaoDe));
