/* montagem.js — a montagem v5 que a família gera: o corpo, as portas e as duas metades de cada dobradiça como peças
   soltas, com uma articulação de revolução por porta.

   O formato da montagem não muda. Cada peça aponta por `alvo.ref` para uma receita, e quem carrega as peças devolve a
   receita já fina da instância, com os argumentos desta chamada dentro (é o que `receitas` leva). As peças já nascem na pose
   do mundo, com as portas fechadas, porque a dobradiça gira a 90 graus quando a porta está fechada e a composição da metade
   móvel traz essa pose.

   A dobradiça de cada porta vem da família `dobradica`, chamada por `chamar` com os parâmetros que `dobradicaDaPorta` deriva
   da altura e do peso da porta (a recusa da dobradiça seria a do `chamar` dela). Cada dobradiça tem duas peças: a fixa (a
   folha fixa e o pino, num rasgo da parede) e a móvel (a folha móvel e os nós, num rasgo da borda da porta). A articulação de
   uma porta liga a porta do tambor da fixa da primeira dobradiça à da móvel, e a porta e as outras móveis a acompanham. O
   sentido positivo abre a porta para a frente: o eixo é -y para a porta que gira na esquerda do vão e +y para a outra. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { DOBRADICA } from '../dobradica/index.js';
import { MATERIAIS_DA_DOBRADICA, TOLERANCIA_DO_CONTATO } from '../dobradica/montagem.js';
import { geometriaDaDobradica } from '../dobradica/geometria.js';
import {
  COMPOSICOES, ID_DA_DOBRADICA, ID_DA_PORTA, ID_DO_CORPO, argumentosDaDobradica, corpoDe, portaDe,
} from './composicoes.js';
import { cursoNaDivisoria, geometriaDoRoupeiro } from './geometria.js';

export const MATERIAIS_DO_ROUPEIRO = Object.freeze({
  painel: Object.freeze({ cor: '#c9a679', aspereza: 0.7, metalicidade: 0 }),
  porta: Object.freeze({ cor: '#e6dfd0', aspereza: 0.6, metalicidade: 0 }),
  ...MATERIAIS_DA_DOBRADICA,
});

export const REF_DO_CORPO = 'roupeiro-corpo';
export const refDaPorta = (n) => `roupeiro-porta-${n}`;
export const refDaDobradica = (porta, k, lado) => `roupeiro-dobradica-${porta}-${k}-${lado}`;
export const idDaPorta = (n) => `porta-${n}`;
export const idDaDobradica = (porta, k, quem) => `dobradica-${porta}-${k}-${quem}`;
export const idDaArticulacao = (n) => `abre-${idDaPorta(n)}`;

/** Um passo do curso a cada 10 graus, ao menos 8. */
export const passosDoCurso = (curso) => Math.max(8, Math.ceil(curso / 10));

const completar = (contrato, parametros) => Object.fromEntries(Object.entries(contrato.parametros)
  .map(([nome, { padrao }]) => [nome, Object.hasOwn(parametros, nome) ? parametros[nome] : padrao]));

/* Só os argumentos que a composição declara: a dobradiça da família `dobradica` calcula alguns que esta composição não usa. */
const declarados = (composicao, argumentos) => {
  const alvo = COMPOSICOES.find(({ id }) => id === composicao);
  return Object.fromEntries(Object.entries(argumentos).filter(([nome]) => Object.hasOwn(alvo.parametros, nome)));
};

const receitaDe = (nome, chamada, materiais) => ({
  meta: { nome, tipo: 'objeto', desc: `peça '${nome}' do roupeiro gerada pela família` },
  CHAMADAS_COMPOSICOES: [chamada],
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: { ...materiais },
});

/**
 * Gera a montagem v5 do roupeiro para um conjunto de parâmetros. Confere faixa e restrição pelo `chamar` do roupeiro e a
 * dobradiça derivada pelo `chamar` da dobradiça. Devolve `{ parametros, montagem, receitas, articulacoes, cursoMaximo,
 * geometria }`: `receitas` mapeia o `ref` de cada instância à receita dela e `articulacoes` é a lista de declarações que
 * `conferirArticulacao` lê, uma por porta.
 */
export function montarRoupeiro(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const g = geometriaDoRoupeiro(completos);
  chamar(DOBRADICA, 'dobradica', g.dobradica.parametros);
  const cursoDaDivisoria = cursoNaDivisoria(g, completos.painel);
  for (const porta of g.portas) if (porta.apoio.startsWith('divisoria')) porta.curso = Math.min(porta.curso, cursoDaDivisoria);
  const { nos, furos } = g.dobradica.parametros;
  const geo = geometriaDaDobradica(g.dobradica.parametros);

  const receitas = {};
  const instancias = [];
  const articulacoes = [];

  const corpo = corpoDe(g, completos);
  receitas[REF_DO_CORPO] = receitaDe('corpo', {
    id: 'corpo', composicao: ID_DO_CORPO(completos.portas, completos.prateleiras, completos.cabideiro), argumentos: corpo.argumentos,
  }, MATERIAIS_DO_ROUPEIRO);
  instancias.push({ id: 'corpo', alvo: { tipo: 'peca', ref: REF_DO_CORPO } });

  for (const porta of g.portas) {
    const numero = porta.indice + 1;
    const peca = portaDe(g, completos, porta.indice);
    receitas[refDaPorta(numero)] = receitaDe(`porta-${numero}`, { id: 'porta', composicao: ID_DA_PORTA(numero), argumentos: peca.argumentos }, MATERIAIS_DO_ROUPEIRO);
    instancias.push({ id: idDaPorta(numero), alvo: { tipo: 'peca', ref: refDaPorta(numero) } });

    const eixo = porta.vao === 1 ? [0, -1, 0] : [0, 1, 0];
    const moveis = [];
    porta.dobradicas.forEach((dobradica, k) => {
      const j = k + 1;
      const posicao = [dobradica.x, dobradica.y, dobradica.z];
      const fixa = argumentosDaDobradica(geo, 'd', { giro: 90, posicao, eixo });
      const movel = argumentosDaDobradica(geo, 'e', { giro: porta.vao === 1 ? 180 : 0, posicao, eixo });
      receitas[refDaDobradica(numero, j, 'd')] = receitaDe(`dobradica-${numero}-${j}-fixa`, { id: 'fixa', composicao: ID_DA_DOBRADICA('d', nos, furos), argumentos: declarados(ID_DA_DOBRADICA('d', nos, furos), fixa) }, MATERIAIS_DO_ROUPEIRO);
      receitas[refDaDobradica(numero, j, 'e')] = receitaDe(`dobradica-${numero}-${j}-movel`, { id: 'movel', composicao: ID_DA_DOBRADICA('e', nos, furos), argumentos: declarados(ID_DA_DOBRADICA('e', nos, furos), movel) }, MATERIAIS_DO_ROUPEIRO);
      instancias.push({ id: idDaDobradica(numero, j, 'fixa'), alvo: { tipo: 'peca', ref: refDaDobradica(numero, j, 'd') } });
      instancias.push({ id: idDaDobradica(numero, j, 'movel'), alvo: { tipo: 'peca', ref: refDaDobradica(numero, j, 'e') } });
      moveis.push([idDaDobradica(numero, j, 'movel')]);
    });
    articulacoes.push({
      id: idDaArticulacao(numero),
      tipo: 'revolucao',
      fixo: { caminho: [idDaDobradica(numero, 1, 'fixa')], porta: 'nos-da-folha-d' },
      movel: { caminho: moveis[0], porta: 'nos-da-folha-e' },
      acompanham: [[idDaPorta(numero)], ...moveis.slice(1)],
      unidade: 'graus',
      curso: { minimo: 0, maximo: porta.curso },
      passos: passosDoCurso(porta.curso),
      folga: { valor: 0, unidade: 'mm' },
    });
  }

  const montagem = {
    formato: 'mecanifica.montagem',
    versao: 5,
    id: 'roupeiro',
    instancias,
    relacoes: [],
    etapas: instancias.map(({ id }) => id),
    vinculos: [],
    posicoes: [],
    auditoriaIntersecoes: { toleranciaNumerica: TOLERANCIA_DO_CONTATO, expectativas: [] },
  };
  return {
    parametros: completos, montagem, receitas, articulacoes, cursoMaximo: Math.max(...g.portas.map((porta) => porta.curso)), geometria: g,
  };
}
