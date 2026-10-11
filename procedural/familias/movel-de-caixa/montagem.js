/* montagem.js — a montagem v5 que a família gera: o corpo, as portas, as gavetas e os guias e as duas metades de cada
   dobradiça como peças soltas, com uma articulação de revolução por porta e uma prismática por gaveta.

   O formato da montagem não muda. Cada peça aponta por `alvo.ref` para uma receita, e quem carrega as peças devolve a
   receita já fina da instância, com os argumentos desta chamada dentro (é o que `receitas` leva). As peças já nascem na pose do
   mundo, com as portas e as gavetas fechadas, porque a dobradiça fechada traz a pose na composição da metade móvel e a gaveta
   fechada está no lugar dela.

   A dobradiça de cada porta vem da família `dobradica`, chamada por `chamar` com os parâmetros que `dobradicaDaPorta` deriva
   da altura e do peso da porta (a recusa da dobradiça seria a do `chamar` dela). Cada dobradiça tem duas peças: a fixa (a
   folha fixa e o pino, num rasgo da parede) e a móvel (a folha móvel e os nós, num rasgo da borda da porta). A articulação de
   uma porta liga a porta do tambor da fixa da primeira dobradiça à da móvel, e a porta e as outras móveis a acompanham. O
   sentido positivo abre a porta para a frente: o eixo é -y para a porta que gira na esquerda do vão e +y para a outra. A
   dobradiça da porta sobreposta é a mesma, com outra pose: a folha fixa na face externa da lateral, a móvel no verso da porta.

   A gaveta e o guia dela (os dois trilhos presos às laterais do corpo) são duas peças ligadas por uma articulação prismática
   cujo eixo é z, para fora da frente, com o curso da gaveta em milímetro. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { DOBRADICA } from '../dobradica/index.js';
import { MATERIAIS_DA_DOBRADICA, TOLERANCIA_DO_CONTATO } from '../dobradica/montagem.js';
import { geometriaDaDobradica } from '../dobradica/geometria.js';
import {
  COMPOSICOES, ID_DA_DOBRADICA, ID_DA_GAVETA, ID_DA_PORTA, ID_DA_PORTA_DE_CORRER, ID_DO_CORPO, ID_DO_GUIA, ID_DO_TRILHO, argumentosDaDobradica, corpoDe,
  gavetaDe, guiaDe, portaDe, trilhoDe,
} from './composicoes.js';
import { cursoNaDivisoria, geometriaDoMovel } from './geometria.js';

export const MATERIAIS_DO_MOVEL = Object.freeze({
  painel: Object.freeze({ cor: '#c9a679', aspereza: 0.7, metalicidade: 0 }),
  porta: Object.freeze({ cor: '#e6dfd0', aspereza: 0.6, metalicidade: 0 }),
  ...MATERIAIS_DA_DOBRADICA,
});

export const REF_DO_CORPO = 'movel-de-caixa-corpo';
export const refDaPorta = (n) => `movel-de-caixa-porta-${n}`;
export const refDaDobradica = (porta, k, lado) => `movel-de-caixa-dobradica-${porta}-${k}-${lado}`;
export const refDaGaveta = (n) => `movel-de-caixa-gaveta-${n}`;
export const refDoGuia = (n) => `movel-de-caixa-guia-${n}`;
export const refDoTrilho = (n) => `movel-de-caixa-trilho-${n}`;
export const idDaPorta = (n) => `porta-${n}`;
export const idDaDobradica = (porta, k, quem) => `dobradica-${porta}-${k}-${quem}`;
export const idDaGaveta = (n) => `gaveta-${n}`;
export const idDoGuia = (n) => `guia-${n}`;
export const idDoTrilho = (n) => `trilho-${n}`;
export const idDaArticulacao = (n) => `abre-${idDaPorta(n)}`;
export const idDaArticulacaoDaGaveta = (n) => `abre-${idDaGaveta(n)}`;

/** Um passo do curso da porta a cada 10 graus, ao menos 8. */
export const passosDoCurso = (curso) => Math.max(8, Math.ceil(curso / 10));
/** Um passo do curso da gaveta a cada 25 milímetros, de 8 a 60. */
export const passosDoCursoDaGaveta = (curso) => Math.min(60, Math.max(8, Math.ceil(curso / 25)));

/* os parâmetros completos: o que o chamador escreveu, senão o do perfil que ele pediu, senão o padrão (como o `chamar`) */
const completar = (contrato, parametros) => {
  const doPerfil = parametros.perfil ? contrato.perfis[parametros.perfil].parametros : {};
  return Object.fromEntries(Object.entries(contrato.parametros)
    .map(([nome, { padrao }]) => [nome, Object.hasOwn(parametros, nome) ? parametros[nome] : Object.hasOwn(doPerfil, nome) ? doPerfil[nome] : padrao]));
};

/* Só os argumentos que a composição declara: a dobradiça da família `dobradica` calcula alguns que esta composição não usa. */
const declarados = (composicao, argumentos) => {
  const alvo = COMPOSICOES.find(({ id }) => id === composicao);
  return Object.fromEntries(Object.entries(argumentos).filter(([nome]) => Object.hasOwn(alvo.parametros, nome)));
};

const receitaDe = (nome, chamada, materiais) => ({
  meta: { nome, tipo: 'objeto', desc: `peça '${nome}' do móvel de caixa gerada pela família` },
  CHAMADAS_COMPOSICOES: [chamada],
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: { ...materiais },
});

/**
 * Gera a montagem v5 do móvel de caixa para um conjunto de parâmetros. Confere faixa e restrição pelo `chamar` do móvel e a
 * dobradiça derivada pelo `chamar` da dobradiça. Devolve `{ parametros, montagem, receitas, articulacoes, cursoMaximo,
 * geometria }`: `receitas` mapeia o `ref` de cada instância à receita dela e `articulacoes` é a lista de declarações que
 * `conferirArticulacao` lê, uma por porta (revolução, em graus) e uma por gaveta (prismática, em milímetro). `cursoMaximo` é
 * o maior curso das portas, em graus, ou o das gavetas, em milímetro, se não há portas.
 */
export function montarMovel(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const g = geometriaDoMovel(completos);
  if (g.dobradica) chamar(DOBRADICA, 'dobradica', g.dobradica.parametros);
  const cursoDaDivisoria = cursoNaDivisoria(g, completos.painel);
  for (const porta of g.portas) if (porta.apoio?.startsWith('divisoria')) porta.curso = Math.min(porta.curso, cursoDaDivisoria);

  const receitas = {};
  const instancias = [];
  const articulacoes = [];

  const corpo = corpoDe(g, completos);
  receitas[REF_DO_CORPO] = receitaDe('corpo', { id: 'corpo', composicao: ID_DO_CORPO, argumentos: corpo.argumentos }, MATERIAIS_DO_MOVEL);
  instancias.push({ id: 'corpo', alvo: { tipo: 'peca', ref: REF_DO_CORPO } });

  if (g.correr) {
    /* a folha de correr e o trilho dela (o de baixo e o de cima, presos ao piso e ao teto da zona): duas peças ligadas por uma
       articulação prismática ao longo de x, no sentido em que a folha abre */
    for (const porta of g.portas) {
      const numero = porta.indice + 1;
      const folha = portaDe(g, completos, porta.indice, { portas: true });
      const trilho = trilhoDe(g, completos, porta.indice);
      receitas[refDaPorta(numero)] = receitaDe(`porta-${numero}`, { id: 'porta', composicao: ID_DA_PORTA_DE_CORRER(numero), argumentos: folha.argumentos }, MATERIAIS_DO_MOVEL);
      receitas[refDoTrilho(numero)] = receitaDe(`trilho-${numero}`, { id: 'trilho', composicao: ID_DO_TRILHO(numero), argumentos: trilho.argumentos }, MATERIAIS_DO_MOVEL);
      instancias.push({ id: idDoTrilho(numero), alvo: { tipo: 'peca', ref: refDoTrilho(numero) } });
      instancias.push({ id: idDaPorta(numero), alvo: { tipo: 'peca', ref: refDaPorta(numero) } });
      articulacoes.push({
        id: idDaArticulacao(numero),
        tipo: 'prismatica',
        fixo: { caminho: [idDoTrilho(numero)], porta: 'guia-da-porta' },
        movel: { caminho: [idDaPorta(numero)], porta: 'eixo-da-porta' },
        unidade: 'mm',
        curso: { minimo: 0, maximo: porta.curso },
        passos: passosDoCursoDaGaveta(porta.curso),
        folga: { valor: 0, unidade: 'mm' },
      });
    }
  }

  if (g.dobradica) {
    const { nos, furos } = g.dobradica.parametros;
    const geo = geometriaDaDobradica(g.dobradica.parametros);
    for (const porta of g.portas) {
      const numero = porta.indice + 1;
      const peca = portaDe(g, completos, porta.indice);
      receitas[refDaPorta(numero)] = receitaDe(`porta-${numero}`, { id: 'porta', composicao: ID_DA_PORTA(numero), argumentos: peca.argumentos }, MATERIAIS_DO_MOVEL);
      instancias.push({ id: idDaPorta(numero), alvo: { tipo: 'peca', ref: refDaPorta(numero) } });

      const eixo = porta.vao === 1 ? [0, -1, 0] : [0, 1, 0];
      const moveis = [];
      porta.dobradicas.forEach((dobradica, k) => {
        const j = k + 1;
        const posicao = [dobradica.x, dobradica.y, dobradica.z];
        const fixa = argumentosDaDobradica(geo, 'd', { giro: 90, posicao, eixo, viraEmZ: porta.vao === 1 ? 0 : 180 });
        /* a móvel da embutida fica atrás do pino (a porta está atrás da frente) e a da sobreposta à frente dele: a imagem espelhada */
        const movel = g.sobreposta
          ? argumentosDaDobradica(geo, 'e', { giro: porta.vao === 1 ? 180 : 0, posicao, eixo, viraEmX: porta.vao === 1 ? 180 : 0 })
          : argumentosDaDobradica(geo, 'e', { giro: porta.vao === 1 ? 180 : 0, posicao, eixo, viraEmX: porta.vao === 1 ? 0 : 180 });
        receitas[refDaDobradica(numero, j, 'd')] = receitaDe(`dobradica-${numero}-${j}-fixa`, { id: 'fixa', composicao: ID_DA_DOBRADICA('d', nos, furos), argumentos: declarados(ID_DA_DOBRADICA('d', nos, furos), fixa) }, MATERIAIS_DO_MOVEL);
        receitas[refDaDobradica(numero, j, 'e')] = receitaDe(`dobradica-${numero}-${j}-movel`, { id: 'movel', composicao: ID_DA_DOBRADICA('e', nos, furos), argumentos: declarados(ID_DA_DOBRADICA('e', nos, furos), movel) }, MATERIAIS_DO_MOVEL);
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
  }

  for (const gaveta of g.gavetas) {
    const numero = gaveta.indice + 1;
    const peca = gavetaDe(g, completos, gaveta.indice, { portas: true });
    const guia = guiaDe(g, completos, gaveta.indice);
    receitas[refDoGuia(numero)] = receitaDe(`guia-${numero}`, { id: 'guia', composicao: ID_DO_GUIA(numero), argumentos: guia.argumentos }, MATERIAIS_DO_MOVEL);
    receitas[refDaGaveta(numero)] = receitaDe(`gaveta-${numero}`, { id: 'gaveta', composicao: ID_DA_GAVETA(numero), argumentos: peca.argumentos }, MATERIAIS_DO_MOVEL);
    instancias.push({ id: idDoGuia(numero), alvo: { tipo: 'peca', ref: refDoGuia(numero) } });
    instancias.push({ id: idDaGaveta(numero), alvo: { tipo: 'peca', ref: refDaGaveta(numero) } });
    articulacoes.push({
      id: idDaArticulacaoDaGaveta(numero),
      tipo: 'prismatica',
      fixo: { caminho: [idDoGuia(numero)], porta: 'guia-da-gaveta' },
      movel: { caminho: [idDaGaveta(numero)], porta: 'eixo-da-gaveta' },
      unidade: 'mm',
      curso: { minimo: 0, maximo: gaveta.curso },
      passos: passosDoCursoDaGaveta(gaveta.curso),
      folga: { valor: 0, unidade: 'mm' },
    });
  }

  const montagem = {
    formato: 'mecanifica.montagem',
    versao: 5,
    id: 'movel-de-caixa',
    instancias,
    relacoes: [],
    etapas: instancias.map(({ id }) => id),
    vinculos: [],
    posicoes: [],
    auditoriaIntersecoes: { toleranciaNumerica: TOLERANCIA_DO_CONTATO, expectativas: [] },
  };
  const cursosDasPortas = g.correr ? [] : g.portas.map((porta) => porta.curso);
  const cursosDasGavetas = g.gavetas.map((gaveta) => gaveta.curso);
  return {
    parametros: completos, montagem, receitas, articulacoes, cursoMaximo: Math.max(...(cursosDasPortas.length ? cursosDasPortas : cursosDasGavetas), 0), geometria: g,
  };
}
