/* aprovacao-da-familia.mjs — a camada mecânica da aprovação de uma família, sem gastar token.
 *
 * Uma família (`procedural/familias/<id>/`, contrato `mecanifica.familia@1`) é aprovada em três camadas: a mecânica, que
 * este arquivo faz; o crítico, que julga os três pontos; e a pessoa, que assina a prancha. A mecânica roda sobre a
 * família inteira e só devolve o que se mede:
 *
 *   - o contrato é válido (`lerFamilia`);
 *   - os três pontos (todos os parâmetros no mínimo, no máximo e no médio) e a varredura de sensibilidade (cada
 *     parâmetro no mínimo e no máximo, os outros no padrão) executam pela mesma receita de composição que a varredura
 *     de parâmetros já aceita (`CHAMADAS_COMPOSICOES` com o registro de composições e de operações);
 *   - em cada ponto, nenhuma recusa fora das restrições declaradas, nenhum órfão ou face sem parte, malha fechada,
 *     mesmo hash da geometria em duas execuções, portas declaradas presentes e conferidas contra a malha, e as medidas
 *     das ferramentas que a receita usou (parede da casca, planificado da chapa, corte das barras, curso da articulação).
 *
 * A família que declara `perfis` (`familia.json`) tem também uma chamada por perfil, medida como um dos três pontos, e a escala
 * de cada perfil varrida (cada parâmetro em milímetro no mínimo e no máximo, os outros nos valores do perfil); o hash de cada
 * perfil entra em `mecanica.perfis` e o gate o confere.
 *
 * Recusa por restrição que a família declara é resposta, não defeito: nos extremos da varredura ela é registrada. Nos
 * três pontos ela reprova, porque ponto aprovado precisa ser chamável.
 *
 * O resultado fica em `aprovacao.json`, ao lado do `familia.json`: a camada mecânica com o hash da geometria de cada um
 * dos três pontos e a data, e as camadas do crítico e da pessoa vazias (`null`). Reaprovar uma geometria diferente
 * esvazia o que o crítico e a pessoa tinham julgado, porque eles julgaram outra forma. Quem confere depois é
 * `conferirAprovacao` (o gate `familias:check`): o hash dos três pontos tem de continuar batendo. */
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analisarTopologia } from '../../procedural/nucleo/topologia.js';
import {
  REGISTRO_OPERACOES, criarRegistroComExtensoes, criarRegistroComposicoes, expandirChamadasDeComposicao, neutroCanonico,
} from '../../procedural/nucleo/entrada.js';
import { TOLERANCIA_CASCA, calcularCasca } from '../../procedural/nucleo/casca.js';
import { medidasDaChapa } from '../../procedural/extensoes/chapa-dobrada/index.js';
import { descreverEstrutura } from '../../procedural/extensoes/estrutura-de-barras/estrutura.js';
import { EXTENSOES_NATIVAS, ErroChamadaDeFamilia, chamar } from '../../procedural/familias/index.js';
import { descreverPeca } from '../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerFamilia } from '../../src/autoria/familia.js';
import { resolverPortasDeMontagem } from '../../src/autoria/interfaces-montagem.js';
import { receitaComParametros } from '../../src/autoria/parametros-vivos.js';
import { conferirPortasNaForma } from '../../src/autoria/porta-confere-forma.js';
import { conferirVaosDaPeca } from '../../src/autoria/molduras-do-vao.js';
import { execucaoDe, invariantesDe } from '../../src/autoria/varrer-parametros.js';
import { conferirMontagemDaFamilia } from './montagem-da-familia.mjs';

export const FORMATO_APROVACAO = 'mecanifica.aprovacao-da-familia@1';
export const ARQUIVO_APROVACAO = 'aprovacao.json';
export const ARQUIVO_CONTRATO = 'familia.json';
export const NOMES_DOS_PONTOS = Object.freeze(['minimo', 'medio', 'maximo']);

/* Quanto a parede medida da casca pode passar da pedida. Em aresta côncava a parede interna engrossa até
   t / sin(a / 2), com `a` a abertura do vão (90 graus numa quina em L dá 1,414 t); acima de 1,5 t a abertura é menor que
   cerca de 84 graus e a parede deixa de ser uma parede de espessura constante. Abaixo da pedida o limite é a tolerância
   da própria casca (`TOLERANCIA_CASCA`). */
export const LIMITE_DA_PAREDE_MAXIMA = 1.5;

const IDENTIDADE_DA_CHAMADA = 'corpo';
/* A família não traz a aparência: a receita que a chama escolhe os materiais. O que se aprova é a geometria, que não
   depende da aparência, então cada material que a composição cita recebe esta aparência neutra. */
export const MATERIAL_NEUTRO = Object.freeze({ cor: '#808080', aspereza: 0.5, metalicidade: 0 });
const TOLERANCIA_DE_SOMA = 1e-9;
const CODIGOS_DE_MALHA_ABERTA = Object.freeze(['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente']);

/* a impressão da geometria de uma peça executada, a que o `aprovacao.json` guarda por ponto (o conjunto de calibração do
   crítico a usa para conferir que o controle é a geometria aprovada) */
export const hashDe = (neutro) => `sha256:${createHash('sha256').update(JSON.stringify(neutroCanonico(neutro))).digest('hex')}`;
const numero = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null);
const problema = (codigo, mensagem, extra = {}) => ({ codigo, mensagem, ...extra });
/* doze algarismos significativos: tira o ruído de ponto flutuante do que vai para o arquivo, sem mexer em medida real */
const arredondar = (valor) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Number(valor.toPrecision(12)) : valor;
  if (Array.isArray(valor)) return valor.map(arredondar);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, arredondar(v)]));
  return valor;
};
const curto = (valor) => (typeof valor === 'number' ? Number(valor.toPrecision(4)) : valor);
const ordenar = (lista) => [...lista].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/* ---------- os pontos ---------- */

/** Os três pontos aprovados: todos os parâmetros no mínimo, no médio e no máximo do contrato. */
export function pontosDaFamilia(contrato) {
  const nomes = Object.keys(contrato.parametros);
  return Object.fromEntries(NOMES_DOS_PONTOS.map((ponto) => [
    ponto, Object.fromEntries(nomes.map((nome) => [nome, contrato.parametros[nome][ponto]])),
  ]));
}

/** A varredura de sensibilidade: cada parâmetro no mínimo e no máximo, os outros no padrão. */
export function varreduraDaFamilia(contrato) {
  const padroes = Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, padrao]));
  return Object.keys(contrato.parametros).flatMap((nome) => ['minimo', 'maximo'].map((extremo) => ({
    rotulo: `${nome}=${contrato.parametros[nome][extremo]}`,
    parametro: nome,
    extremo,
    parametros: { ...padroes, [nome]: contrato.parametros[nome][extremo] },
  })));
}

/** Os pontos dos perfis: para cada perfil do contrato, todos os parâmetros completos (o do perfil, senão o padrão). */
export function pontosDosPerfis(contrato) {
  const padroes = Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, padrao]));
  return Object.fromEntries(Object.entries(contrato.perfis ?? {}).map(([nome, perfil]) => [nome, { ...padroes, ...perfil.parametros }]));
}

/**
 * A varredura de escala dos perfis: cada perfil com cada parâmetro em milímetro no mínimo e no máximo da faixa, os outros nos
 * valores do perfil. Numa família cujas medidas são proporções do diâmetro, é o perfil chamado em qualquer tamanho.
 */
export function escalasDosPerfis(contrato) {
  const mm = Object.entries(contrato.parametros).filter(([, { unidade }]) => unidade === 'mm').map(([nome]) => nome);
  return Object.entries(pontosDosPerfis(contrato)).flatMap(([perfil, base]) => mm.flatMap((nome) => ['minimo', 'maximo'].map((extremo) => ({
    rotulo: `${perfil}: ${nome}=${contrato.parametros[nome][extremo]}`,
    perfil,
    parametro: nome,
    extremo,
    parametros: { ...base, [nome]: contrato.parametros[nome][extremo] },
  }))));
}

/** A receita que chama a família com `parametros`; o `get` faz a recusa acontecer na leitura, antes de existir passo. */
export function receitaDaFamilia(familia, parametros) {
  return {
    get CHAMADAS_COMPOSICOES() { return [chamar(familia, IDENTIDADE_DA_CHAMADA, this.PARAMS)]; },
    PARAMS: { ...parametros },
    TOPO: {},
    ALIASES: [],
    MATERIAIS: {},
  };
}

/* ---------- o ambiente de execução e as medidas das ferramentas ---------- */

/* Cada extensão nativa embrulhada para anotar a medida que ela mesma expõe, sem mudar o que emite: o embrulho lê com as
   funções públicas da extensão e chama a implementação original. Se a medida lança, a mensagem verdadeira vem da
   implementação original logo depois. */
export function extensoesMedidas(coletor) {
  const anotar = (ferramenta, dados) => coletor.push({ ferramenta, ...dados });
  const tentar = (funcao) => { try { funcao(); } catch { /* quem recusa de verdade é a implementação original */ } };
  const porNome = {
    casca: (original) => (contexto, argumentos = {}) => {
      tentar(() => {
        const solido = contexto.selecionar(argumentos.solido, 'solido');
        const abertas = argumentos.abertas == null ? [] : contexto.selecionar(argumentos.abertas, 'abertas').faces.map(([id]) => id);
        const { medidas } = calcularCasca({
          vertices: solido.vertices, faces: solido.faces, abertas, espessura: contexto.numero(argumentos.espessura), limiteDeIds: contexto.limiteDeIds,
        });
        anotar('casca', {
          origemId: argumentos.origemId, espessura: medidas.espessura, espessuraMinima: medidas.espessuraMinima, espessuraMaxima: medidas.espessuraMaxima,
        });
      });
      return original(contexto, argumentos);
    },
    chapaDobrada: (original) => (contexto, argumentos = {}) => {
      tentar(() => {
        const m = medidasDaChapa(argumentos, contexto.numero);
        anotar('chapaDobrada', {
          espessura: m.espessura, comprimentoReto: m.comprimentoReto, desenvolvimentoDasDobras: m.desenvolvimentoDasDobras,
          comprimentoPlanificado: m.comprimentoPlanificado, areaPlanificada: m.areaPlanificada,
        });
      });
      return original(contexto, argumentos);
    },
    estruturaDeBarras: (original) => (contexto, argumentos = {}) => {
      tentar(() => {
        const m = descreverEstrutura(argumentos, contexto);
        anotar('estruturaDeBarras', {
          unidade: m.unidade, componentes: m.componentes,
          cortes: m.barras.map((barra) => ({ barra: barra.nome, comprimentoEntreNos: barra.comprimentoEntreNos, comprimentoDeCorte: barra.comprimentoDeCorte })),
        });
      });
      return original(contexto, argumentos);
    },
    articulacao: (original) => (contexto, argumentos = {}) => {
      const declaracao = original(contexto, argumentos);
      if (declaracao && typeof declaracao === 'object') {
        anotar('articulacao', {
          id: declaracao.id, tipo: declaracao.tipo, unidade: declaracao.unidade, curso: { ...declaracao.curso }, passos: declaracao.passos,
        });
      }
      return declaracao;
    },
  };
  return EXTENSOES_NATIVAS.map(({ manifesto, implementacao }) => {
    const embrulho = porNome[manifesto.operacao.nome];
    return embrulho ? Object.freeze({ manifesto, implementacao: embrulho(implementacao) }) : Object.freeze({ manifesto, implementacao });
  });
}

/* O registro de composições de uma família é um valor imutável (as composições ficam congeladas e `resolver` devolve cópia) que
   depende só das composições e das interfaces das operações, e montá-lo de novo a cada execução custava de 25% a 30% da
   aprovação de uma família grande (13 s dos 47 s de `roda-pneu`). Cada família guarda o seu, um para as extensões medidas e um para as
   nativas, e a guarda vale enquanto as composições da família são as mesmas (o mesmo objeto, na mesma ordem). */
const REGISTROS_DE_COMPOSICOES = new WeakMap();

function registroDeComposicoes(familia, medir, registroOperacoes) {
  const guardado = REGISTROS_DE_COMPOSICOES.get(familia);
  const composicoes = familia.composicoes;
  const valido = guardado && guardado.composicoes.length === composicoes.length && guardado.composicoes.every((composicao, i) => composicao === composicoes[i]);
  const entrada = valido ? guardado : { composicoes: [...composicoes], medido: null, nativo: null };
  const chave = medir ? 'medido' : 'nativo';
  if (!entrada[chave]) entrada[chave] = criarRegistroComposicoes({ composicoes: [...composicoes], resolverOperacao: registroOperacoes.resolver });
  REGISTROS_DE_COMPOSICOES.set(familia, entrada);
  return entrada[chave];
}

/* Os registros de uma execução. Sem `medir`, as extensões são as nativas, sem embrulho. O registro de operações é novo a cada
   execução, com o coletor dela: nada que uma execução mede é guardado para a seguinte. */
export function ambienteDaExecucao(familia, { medir }) {
  const coletor = [];
  const registroOperacoes = criarRegistroComExtensoes({
    registroBase: REGISTRO_OPERACOES, extensoes: medir ? extensoesMedidas(coletor) : [...EXTENSOES_NATIVAS],
  });
  const registroComposicoes = registroDeComposicoes(familia, medir, registroOperacoes);
  return { coletor, execucao: execucaoDe({ registroComposicoes, registroOperacoes }) };
}

/* ---------- as conferências de um ponto ---------- */

function conferirPortas(contrato, neutro) {
  const achados = [];
  const publicadas = neutro.portas instanceof Map ? neutro.portas : new Map();
  for (const declarada of contrato.portas) {
    const porta = publicadas.get(declarada.id);
    if (!porta) {
      achados.push(problema('porta-ausente', `a família declara a porta '${declarada.id}' (${declarada.tipo}, ${declarada.papel}) e a receita não a publica; publicadas: ${ordenar(publicadas.keys()).join(', ') || '(nenhuma)'}`, { porta: declarada.id }));
      continue;
    }
    const interfaceDaPorta = porta.interface;
    if (!interfaceDaPorta) {
      achados.push(problema('porta-sem-interface', `a porta '${declarada.id}' foi publicada sem interface mensurável`, { porta: declarada.id }));
    } else if (interfaceDaPorta.forma !== declarada.tipo) {
      achados.push(problema('porta-de-outro-tipo', `a porta '${declarada.id}' é declarada ${declarada.tipo} e a receita publica ${interfaceDaPorta.forma}`, { porta: declarada.id }));
    } else if (interfaceDaPorta.papel !== declarada.papel) {
      achados.push(problema('porta-de-outro-papel', `a porta '${declarada.id}' é declarada com papel '${declarada.papel}' e a receita publica '${interfaceDaPorta.papel}'`, { porta: declarada.id }));
    }
  }
  /* a porta contra a malha: plano e raio medidos nos vértices da peça */
  for (const achado of conferirPortasNaForma(neutro)) {
    achados.push(problema(achado.codigo, achado.mensagem, { porta: achado.porta }));
  }
  /* a interface lida como a montagem a lê: a régua de portas (`regua-de-portas`) mede os encaixes a partir dela */
  try {
    resolverPortasDeMontagem([{ id: 'familia', neutro }]);
  } catch (erro) {
    achados.push(problema('porta-invalida-para-montagem', erro.message));
  }
  const declaradas = new Set(contrato.portas.map(({ id }) => id));
  return { achados, naoDeclaradas: ordenar([...publicadas.keys()].filter((id) => !declaradas.has(id))) };
}

function conferirMedidas(medidas) {
  const achados = [];
  for (const m of medidas) {
    if (m.ferramenta === 'casca') {
      const { espessura, espessuraMinima, espessuraMaxima } = m;
      if (numero(espessuraMinima) === null || numero(espessuraMaxima) === null || numero(espessura) === null) {
        achados.push(problema('parede-nao-medida', `a casca ${m.origemId} não devolveu a parede medida`, { ferramenta: 'casca' }));
        continue;
      }
      if (espessuraMinima < espessura * (1 - TOLERANCIA_CASCA)) {
        achados.push(problema('parede-fina', `a parede da casca ${m.origemId} chega a ${curto(espessuraMinima)} onde se pediu ${curto(espessura)} (tolerância ${TOLERANCIA_CASCA * 100}%)`, { ferramenta: 'casca' }));
      }
      if (espessuraMaxima > espessura * LIMITE_DA_PAREDE_MAXIMA) {
        achados.push(problema('parede-acima-do-limite', `a parede da casca ${m.origemId} engrossa até ${curto(espessuraMaxima)}, ${(espessuraMaxima / espessura).toFixed(2)} vezes a pedida (${curto(espessura)}); o limite é ${LIMITE_DA_PAREDE_MAXIMA} vezes`, { ferramenta: 'casca' }));
      }
    } else if (m.ferramenta === 'chapaDobrada') {
      const { comprimentoReto, desenvolvimentoDasDobras, comprimentoPlanificado, areaPlanificada } = m;
      if (!(numero(comprimentoPlanificado) > 0) || !(numero(areaPlanificada) > 0)) {
        achados.push(problema('planificado-invalido', `o planificado da chapa não é um comprimento positivo (comprimento ${comprimentoPlanificado}, área ${areaPlanificada})`, { ferramenta: 'chapaDobrada' }));
      } else if (Math.abs(comprimentoPlanificado - (comprimentoReto + desenvolvimentoDasDobras)) > TOLERANCIA_DE_SOMA * Math.max(1, comprimentoPlanificado)) {
        achados.push(problema('planificado-incoerente', `o planificado ${comprimentoPlanificado} não é a soma dos trechos retos ${comprimentoReto} com o desenvolvimento das dobras ${desenvolvimentoDasDobras}`, { ferramenta: 'chapaDobrada' }));
      }
    } else if (m.ferramenta === 'estruturaDeBarras') {
      for (const corte of m.cortes) {
        if (!(numero(corte.comprimentoDeCorte) > 0)) {
          achados.push(problema('corte-invalido', `a barra '${corte.barra}' tem comprimento de corte ${corte.comprimentoDeCorte}, que não é positivo`, { ferramenta: 'estruturaDeBarras' }));
        }
      }
    }
  }
  return achados;
}

/**
 * O que se guarda de uma medida: a articulação registra a declaração, porque o curso se confere contra a montagem. Se a
 * família gera a montagem e o curso dessa articulação foi conferido (`conferidas`, as de `montagem.articulacoes`), a medida
 * diz que foi, e o resultado está no `montagem` do ponto.
 */
function medidaGuardada(m, conferidas = []) {
  const arredondada = Object.fromEntries(Object.entries(m).map(([chave, valor]) => [chave, arredondar(valor)]));
  if (m.ferramenta !== 'articulacao') return arredondada;
  const feita = conferidas.find((articulacao) => articulacao.id === m.id);
  if (feita) return { ...arredondada, conferido: feita.conferido };
  return { ...arredondada, conferido: false, motivo: 'o curso se confere contra as malhas das duas peças numa montagem resolvida (conferirArticulacao); esta família é um componente' };
}

function executar(familia, parametros, { medir }) {
  const { coletor, execucao } = ambienteDaExecucao(familia, { medir });
  const receita = receitaDaFamilia(familia, parametros);
  const { passos } = expandirChamadasDeComposicao(execucao.registroComposicoes, receita.CHAMADAS_COMPOSICOES);
  receita.MATERIAIS = Object.fromEntries(passos.filter(([operacao, args]) => operacao === 'material' && typeof args?.usa === 'string').map(([, args]) => [args.usa, MATERIAL_NEUTRO]));
  const { neutro } = executarReceita(receita, execucao);
  return { neutro, medidas: coletor, receita };
}

/**
 * Executa e confere um ponto da família. Devolve `{ rotulo, parametros, estado, hash, problemas, medidas, portas }`,
 * com `estado` `ok`, `recusa-declarada` (a família recusou o ponto por uma restrição que declara) ou `reprovado`.
 *
 * Uma família que gera montagem (`familia.montar`, a dobradiça) tem também a montagem conferida, e o resultado traz
 * `montagem` (impressão das peças e das articulações e, quando o curso foi conferido, o resultado de cada articulação).
 * `montagem` escolhe quanto: 'completa' confere o curso com `conferirArticulacao` (dezenas de segundos), 'hash' só gera,
 * executa e imprime (o gate) e 'nenhuma' pula (a varredura de sensibilidade, que olha a peça).
 */
export function medirPonto(familia, parametros, rotulo = 'ponto', { montagem = 'completa' } = {}) {
  const base = { rotulo, parametros: { ...parametros }, hash: null, problemas: [], medidas: [], portas: [] };
  let medido;
  let repetido;
  try {
    medido = executar(familia, parametros, { medir: true });
    repetido = executar(familia, parametros, { medir: false });
  } catch (erro) {
    if (erro instanceof ErroChamadaDeFamilia && erro.restricao) {
      return { ...base, estado: 'recusa-declarada', restricao: erro.restricao, motivo: erro.motivo };
    }
    return { ...base, estado: 'reprovado', problemas: [problema('recusa-fora-das-restricoes', erro.message)] };
  }
  const { neutro } = medido;
  const problemas = [];
  const gritos = Array.isArray(neutro.orfaos) ? neutro.orfaos : [];
  if (gritos.length) {
    const primeiro = gritos[0];
    problemas.push(problema('orfaos', `${gritos.length} passo(s) não fizeram efeito; o primeiro: passo ${primeiro.passo} (${primeiro.op}): ${primeiro.motivo}`));
  }
  const descricao = descreverPeca(neutro);
  const invariantes = invariantesDe(descricao);
  if (invariantes.partes === 0) problemas.push(problema('sem-parte', 'a receita não publica nenhuma parte'));
  if (invariantes.facesSemParte > 0) problemas.push(problema('face-sem-parte', `${invariantes.facesSemParte} face(s) sem parte: ${descricao.facesSemParte.slice(0, 5).join(', ')}`));
  const abertos = analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((a) => CODIGOS_DE_MALHA_ABERTA.includes(a.codigo));
  if (abertos.length) problemas.push(problema('malha-aberta', `a malha não fecha: ${abertos.length} achado(s); o primeiro: ${abertos[0].mensagem}`));
  const hash = hashDe(neutro);
  if (hash !== hashDe(repetido.neutro)) problemas.push(problema('nao-deterministico', 'duas execuções com os mesmos parâmetros deram geometrias diferentes'));
  const portas = conferirPortas(familia.contrato, neutro);
  problemas.push(...portas.achados);
  /* a abertura de chapa sem declaração reprova o ponto, como no `descrever` da peça: a receita da família não leva `vaos`, de modo que a
     família que gerar chapa com abertura precisa primeiro de um jeito de declarar o vão */
  try {
    for (const t of conferirVaosDaPeca(neutro, medido.receita).problemas) problemas.push(problema('moldura-do-vao', t));
  } catch (erro) {
    problemas.push(problema('moldura-do-vao', erro.message));
  }
  problemas.push(...conferirMedidas(medido.medidas));
  const daMontagem = typeof familia.montar === 'function' && montagem !== 'nenhuma'
    ? conferirMontagemDaFamilia(familia, parametros, ambienteDaExecucao(familia, { medir: false }).execucao, { conferirCurso: montagem === 'completa' })
    : null;
  if (daMontagem) problemas.push(...daMontagem.problemas);
  return {
    ...base,
    estado: problemas.length ? 'reprovado' : 'ok',
    hash,
    problemas,
    medidas: medido.medidas.map((m) => medidaGuardada(m, daMontagem?.resumo?.articulacoes)),
    portas: ordenar(familia.contrato.portas.map(({ id }) => id)),
    portasNaoDeclaradas: portas.naoDeclaradas,
    ...(daMontagem?.resumo ? { montagem: daMontagem.resumo } : {}),
  };
}

/* ---------- a aprovação ---------- */

function lerAprovacaoGravada(pasta) {
  const caminho = join(pasta, ARQUIVO_APROVACAO);
  if (!existsSync(caminho)) return null;
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function pontoGravado(ponto) {
  return { parametros: ponto.parametros, hash: ponto.hash, medidas: ponto.medidas, ...(ponto.montagem ? { montagem: ponto.montagem } : {}) };
}

/**
 * Roda a camada mecânica sobre a família e, aprovada, grava `aprovacao.json` em `pasta` (a menos que `gravar` seja
 * falso). Devolve `{ aprovada, familia, pontos, varredura, problemas, gravada, esvaziou }`. `data` é o dia da aprovação
 * (padrão: hoje). Quem chama escolhe a pasta; o gate usa `procedural/familias/<id>`.
 */
export function aprovarFamilia(familia, { pasta = null, data = null, gravar = true, medidor = null } = {}) {
  const medir = medidor ?? ((parametros, rotulo, opcoes) => medirPonto(familia, parametros, rotulo, opcoes));
  const problemas = [];
  const id = familia?.contrato?.id;
  try {
    lerFamilia(familia.contrato);
  } catch (erro) {
    return { aprovada: false, familia: id ?? null, pontos: {}, varredura: [], problemas: [problema('contrato-invalido', erro.message)], gravada: false, esvaziou: false };
  }
  const definidos = pontosDaFamilia(familia.contrato);
  const pontos = Object.fromEntries(NOMES_DOS_PONTOS.map((nome) => [nome, medir(definidos[nome], nome)]));
  for (const ponto of Object.values(pontos)) {
    if (ponto.estado === 'recusa-declarada') {
      problemas.push({ ponto: ponto.rotulo, ...problema('ponto-aprovado-recusado', `o ponto '${ponto.rotulo}' é recusado pela restrição '${ponto.restricao}': ${ponto.motivo}`) });
    }
    for (const p of ponto.problemas) problemas.push({ ponto: ponto.rotulo, ...p });
  }
  const varredura = varreduraDaFamilia(familia.contrato).map((sonda) => ({ ...medir(sonda.parametros, sonda.rotulo, { montagem: 'nenhuma' }), parametro: sonda.parametro, extremo: sonda.extremo }));
  for (const ponto of varredura) {
    for (const p of ponto.problemas) problemas.push({ ponto: `varredura ${ponto.rotulo}`, ...p });
  }
  /* os perfis: cada um é uma chamada que a família tem de aceitar e medir como um dos três pontos, e a escala deles varre o
     diâmetro; a recusa por restrição declarada vale nas sondas de escala, e no ponto do perfil reprova */
  const perfis = Object.fromEntries(Object.entries(pontosDosPerfis(familia.contrato)).map(([nome, parametros]) => [nome, medir(parametros, `perfil ${nome}`)]));
  for (const ponto of Object.values(perfis)) {
    if (ponto.estado === 'recusa-declarada') {
      problemas.push({ ponto: ponto.rotulo, ...problema('ponto-aprovado-recusado', `o ${ponto.rotulo} é recusado pela restrição '${ponto.restricao}': ${ponto.motivo}`) });
    }
    for (const p of ponto.problemas) problemas.push({ ponto: ponto.rotulo, ...p });
  }
  const escalas = escalasDosPerfis(familia.contrato).map((sonda) => ({ ...medir(sonda.parametros, sonda.rotulo, { montagem: 'nenhuma' }), perfil: sonda.perfil, parametro: sonda.parametro, extremo: sonda.extremo }));
  for (const ponto of escalas) {
    for (const p of ponto.problemas) problemas.push({ ponto: `escala ${ponto.rotulo}`, ...p });
  }
  const aprovada = problemas.length === 0;
  const resultado = { aprovada, familia: id, pontos, varredura, perfis, escalas, problemas, gravada: false, esvaziou: false };
  if (!aprovada || !gravar || !pasta) return resultado;

  const anterior = lerAprovacaoGravada(pasta);
  const mesmaGeometria = Boolean(anterior?.mecanica?.pontos) && NOMES_DOS_PONTOS.every((nome) => anterior.mecanica.pontos[nome]?.hash === pontos[nome].hash)
    && Object.keys(perfis).every((nome) => anterior.mecanica.perfis?.[nome]?.hash === perfis[nome].hash)
    && Object.keys(anterior.mecanica.perfis ?? {}).length === Object.keys(perfis).length;
  const aprovacao = {
    formato: FORMATO_APROVACAO,
    familia: id,
    versao: familia.contrato.versao,
    mecanica: {
      data: data ?? new Date().toISOString().slice(0, 10),
      pontos: Object.fromEntries(NOMES_DOS_PONTOS.map((nome) => [nome, pontoGravado(pontos[nome])])),
      varredura: {
        sondas: varredura.length,
        recusasDeclaradas: varredura.filter((p) => p.estado === 'recusa-declarada').map((p) => ({ ponto: p.rotulo, restricao: p.restricao })),
      },
      portas: pontos.medio.portas,
      ...(Object.keys(perfis).length ? {
        perfis: Object.fromEntries(Object.entries(perfis).map(([nome, ponto]) => [nome, pontoGravado(ponto)])),
        escalasDosPerfis: {
          sondas: escalas.length,
          recusasDeclaradas: escalas.filter((p) => p.estado === 'recusa-declarada').map((p) => ({ ponto: p.rotulo, restricao: p.restricao })),
        },
      } : {}),
    },
    critico: mesmaGeometria ? (anterior.critico ?? null) : null,
    pessoa: mesmaGeometria ? (anterior.pessoa ?? null) : null,
  };
  writeFileSync(join(pasta, ARQUIVO_APROVACAO), `${JSON.stringify(aprovacao, null, 2)}\n`, 'utf8');
  return { ...resultado, gravada: true, esvaziou: Boolean(anterior) && !mesmaGeometria && Boolean(anterior.critico || anterior.pessoa) };
}

/** As medições que `aprovarFamilia` pede, na ordem em que as pede: os três pontos, a varredura, os perfis e a escala deles. */
export function medicoesDaAprovacao(contrato) {
  const definidos = pontosDaFamilia(contrato);
  return [
    ...NOMES_DOS_PONTOS.map((nome) => ({ parametros: definidos[nome], rotulo: nome, opcoes: undefined })),
    ...varreduraDaFamilia(contrato).map((sonda) => ({ parametros: sonda.parametros, rotulo: sonda.rotulo, opcoes: { montagem: 'nenhuma' } })),
    ...Object.entries(pontosDosPerfis(contrato)).map(([nome, parametros]) => ({ parametros, rotulo: `perfil ${nome}`, opcoes: undefined })),
    ...escalasDosPerfis(contrato).map((sonda) => ({ parametros: sonda.parametros, rotulo: sonda.rotulo, opcoes: { montagem: 'nenhuma' } })),
  ];
}

const chaveDaMedicao = (parametros, rotulo, opcoes) => JSON.stringify([parametros, rotulo, opcoes ?? null]);

/**
 * O mesmo que `aprovarFamilia`, com os pontos medidos ao mesmo tempo em `fios` processos. Os pontos não dependem uns dos outros
 * (cada um executa a família duas vezes e confere o resultado), e a aprovação de uma família grande levava de 30 a 80 s num
 * processo só. Cada processo carrega a família de `origem` ({ modulo: URL do módulo, exportacao: nome do export }), porque a família
 * tem funções e não atravessa a fronteira de um processo. O resultado é o de `aprovarFamilia`: a medição de cada ponto é determinística
 * e a montagem do resultado é a mesma função, na mesma ordem. Sem `origem` ou com um fio só, mede no próprio processo.
 */
export async function aprovarFamiliaEmParalelo(familia, { origem = null, fios = Math.min(availableParallelism(), 4), ...opcoes } = {}) {
  try { lerFamilia(familia.contrato); } catch { return aprovarFamilia(familia, opcoes); }
  if (!origem || fios < 2) return aprovarFamilia(familia, opcoes);
  const medicoes = medicoesDaAprovacao(familia.contrato);
  const resultados = new Map();
  const fila = medicoes.map((m, indice) => ({ ...m, indice }));
  const guardar = (indice, resultado) => {
    const { parametros, rotulo, opcoes: o } = medicoes[indice];
    resultados.set(chaveDaMedicao(parametros, rotulo, o), resultado);
  };
  const processos = [];
  /* o processo de quem chama também mede, entre uma mensagem e outra dos outros, e já tem a família carregada: os `fios` contam ele */
  const proprio = (async () => {
    for (let proxima = fila.shift(); proxima; proxima = fila.shift()) {
      guardar(proxima.indice, medirPonto(familia, proxima.parametros, proxima.rotulo, proxima.opcoes));
      await new Promise((continuar) => setImmediate(continuar));
    }
  })();
  const dosOutros = new Promise((resolver, rejeitar) => {
    let ativos = 0;
    const terminou = (erro) => { if (erro) { for (const p of processos) p.kill(); rejeitar(erro); } };
    const dar = (processo) => {
      const proxima = fila.shift();
      if (!proxima) { processo.emTrabalho = null; processo.kill(); return; }
      processo.emTrabalho = proxima.indice;
      processo.send(proxima);
    };
    const quantos = Math.min(Math.max(1, fios - 1), fila.length);
    ativos = quantos;
    for (let n = 0; n < quantos; n++) {
      const processo = fork(fileURLToPath(new URL('./aprovacao-da-familia-fio.mjs', import.meta.url)), [origem.modulo, origem.exportacao], { serialization: 'advanced', stdio: ['ignore', 'inherit', 'pipe', 'ipc'] });
      processo.erroEscrito = '';
      processo.stderr.on('data', (pedaco) => { processo.erroEscrito = `${processo.erroEscrito}${pedaco}`.slice(-1500); });
      processos.push(processo);
      processo.on('message', (mensagem) => {
        if (mensagem.erro) { terminou(new Error(`medição ${medicoes[mensagem.indice].rotulo}: ${mensagem.erro}`)); return; }
        guardar(mensagem.indice, mensagem.resultado);
        processo.emTrabalho = null;
        dar(processo);
      });
      processo.on('exit', (codigo, sinal) => {
        if (processo.emTrabalho !== null && processo.emTrabalho !== undefined) terminou(new Error(`o processo de medição terminou (código ${codigo}, sinal ${sinal}) com a medição ${medicoes[processo.emTrabalho].rotulo} na mão${processo.erroEscrito ? `:\n${processo.erroEscrito}` : ''}`));
        ativos -= 1;
        if (ativos === 0) resolver();
      });
      dar(processo);
    }
  });
  try { await Promise.all([proprio, dosOutros]); } finally { for (const p of processos) p.kill(); }
  return aprovarFamilia(familia, { ...opcoes, medidor: (parametros, rotulo, o) => resultados.get(chaveDaMedicao(parametros, rotulo, o)) });
}

/**
 * Confere uma família registrada contra o `aprovacao.json` da pasta: contrato válido, pasta com o nome do id (quando
 * `exigirNomeDaPasta`), aprovação mecânica gravada para os mesmos pontos do contrato, e o hash da geometria de cada um
 * dos três pontos ainda igual. Devolve `{ ok, familia, problemas }`; cada problema de geometria diz qual ponto mudou.
 */
export function conferirAprovacao(familia, { pasta, exigirNomeDaPasta = true } = {}) {
  const problemas = [];
  const id = familia?.contrato?.id;
  const reprovar = (codigo, mensagem, ponto = null) => problemas.push({ ...(ponto ? { ponto } : {}), ...problema(codigo, mensagem) });
  /* a montagem que a família gera (portas e gavetas): o curso conferido sem colisão, sozinha e com as outras abertas, e a impressão */
  const conferirMontagemGravada = (atual, aprovado, quem, ponto) => {
    if (!atual.montagem) return;
    const gravada = aprovado.montagem;
    if (!gravada?.conferido || gravada.articulacoes.some((articulacao) => !articulacao.conferido || articulacao.colisoes)
      || (gravada.articulacoes.length > 1 && (!gravada.simultaneas?.conferido || gravada.simultaneas.colisoes))) {
      reprovar('curso-nao-conferido', `${quem} não traz o curso da articulação conferido contra as malhas e sem colisão, sozinha e com as outras abertas ao mesmo tempo; reaprove com npm run familia -- aprovar ${id}`, ponto);
    }
    if (atual.montagem.hash !== gravada?.hash) {
      reprovar('montagem-mudou', `a montagem que a família gera em ${quem} mudou desde a aprovação (as peças, a articulação ou o curso); reaprove com npm run familia -- aprovar ${id}`, ponto);
    }
  };
  try {
    lerFamilia(familia.contrato);
  } catch (erro) {
    reprovar('contrato-invalido', erro.message);
    return { ok: false, familia: id ?? null, problemas };
  }
  if (exigirNomeDaPasta && basename(pasta) !== id) reprovar('pasta-com-outro-nome', `a pasta '${basename(pasta)}' precisa ter o nome do id da família, '${id}'`);
  const arquivoDoContrato = join(pasta, ARQUIVO_CONTRATO);
  if (!existsSync(arquivoDoContrato)) {
    reprovar('contrato-ausente', `a pasta '${pasta}' não tem ${ARQUIVO_CONTRATO}`);
  } else {
    try {
      const gravado = lerFamilia(JSON.parse(readFileSync(arquivoDoContrato, 'utf8')));
      if (JSON.stringify(gravado) !== JSON.stringify(familia.contrato)) reprovar('contrato-diferente-do-carregado', `o ${ARQUIVO_CONTRATO} da pasta não é o contrato com que a família foi carregada`);
    } catch (erro) {
      reprovar('contrato-invalido', `${ARQUIVO_CONTRATO} da pasta: ${erro.message}`);
    }
  }

  let aprovacao = null;
  try {
    aprovacao = lerAprovacaoGravada(pasta);
  } catch (erro) {
    reprovar('aprovacao-ilegivel', `${ARQUIVO_APROVACAO}: ${erro.message}`);
    return { ok: false, familia: id, problemas };
  }
  if (!aprovacao) {
    reprovar('sem-aprovacao', `a família '${id}' não tem ${ARQUIVO_APROVACAO}; rode npm run familia -- aprovar ${id}`);
    return { ok: false, familia: id, problemas };
  }
  if (aprovacao.formato !== FORMATO_APROVACAO || aprovacao.familia !== id || !aprovacao.mecanica?.pontos) {
    reprovar('aprovacao-invalida', `${ARQUIVO_APROVACAO} precisa ter formato '${FORMATO_APROVACAO}', familia '${id}' e a camada mecânica com os três pontos`);
    return { ok: false, familia: id, problemas };
  }
  const definidos = pontosDaFamilia(familia.contrato);
  for (const nome of NOMES_DOS_PONTOS) {
    const aprovado = aprovacao.mecanica.pontos[nome];
    if (!aprovado?.hash || !aprovado.parametros) {
      reprovar('ponto-nao-aprovado', `o ponto '${nome}' não está na aprovação mecânica; reaprove com npm run familia -- aprovar ${id}`, nome);
      continue;
    }
    if (JSON.stringify(aprovado.parametros) !== JSON.stringify(definidos[nome])) {
      reprovar('ponto-mudou-de-parametros', `o ponto '${nome}' aprovado tinha ${JSON.stringify(aprovado.parametros)} e o contrato agora pede ${JSON.stringify(definidos[nome])}; reaprove com npm run familia -- aprovar ${id}`, nome);
      continue;
    }
    const atual = medirPonto(familia, definidos[nome], nome, { montagem: 'hash' });
    if (atual.estado === 'recusa-declarada') {
      reprovar('ponto-aprovado-recusado', `o ponto '${nome}' agora é recusado pela restrição '${atual.restricao}': ${atual.motivo}`, nome);
    } else if (atual.hash !== null && atual.hash !== aprovado.hash) {
      reprovar('geometria-mudou', `a geometria do ponto '${nome}' mudou desde a aprovação (aprovado ${aprovado.hash.slice(0, 19)}, agora ${atual.hash.slice(0, 19)}); reaprove com npm run familia -- aprovar ${id}`, nome);
    }
    conferirMontagemGravada(atual, aprovado, `o ponto '${nome}'`, nome);
    for (const p of atual.problemas) reprovar(p.codigo, `no ponto '${nome}': ${p.mensagem}`, nome);
  }
  const definidosDosPerfis = pontosDosPerfis(familia.contrato);
  for (const nome of Object.keys(aprovacao.mecanica.perfis ?? {})) {
    if (!definidosDosPerfis[nome]) reprovar('perfil-removido', `o perfil '${nome}' está na aprovação e o contrato não o declara mais; reaprove com npm run familia -- aprovar ${id}`, `perfil ${nome}`);
  }
  for (const [nome, parametros] of Object.entries(definidosDosPerfis)) {
    const rotulo = `perfil ${nome}`;
    const aprovado = aprovacao.mecanica.perfis?.[nome];
    if (!aprovado?.hash || !aprovado.parametros) {
      reprovar('perfil-nao-aprovado', `o perfil '${nome}' não está na aprovação mecânica; reaprove com npm run familia -- aprovar ${id}`, rotulo);
      continue;
    }
    if (JSON.stringify(aprovado.parametros) !== JSON.stringify(parametros)) {
      reprovar('perfil-mudou-de-parametros', `o perfil '${nome}' aprovado tinha ${JSON.stringify(aprovado.parametros)} e o contrato agora o completa com ${JSON.stringify(parametros)}; reaprove com npm run familia -- aprovar ${id}`, rotulo);
      continue;
    }
    const atual = medirPonto(familia, parametros, rotulo, { montagem: 'hash' });
    if (atual.estado === 'recusa-declarada') {
      reprovar('ponto-aprovado-recusado', `o perfil '${nome}' agora é recusado pela restrição '${atual.restricao}': ${atual.motivo}`, rotulo);
    } else if (atual.hash !== null && atual.hash !== aprovado.hash) {
      reprovar('geometria-mudou', `a geometria do perfil '${nome}' mudou desde a aprovação (aprovado ${aprovado.hash.slice(0, 19)}, agora ${atual.hash.slice(0, 19)}); reaprove com npm run familia -- aprovar ${id}`, rotulo);
    }
    conferirMontagemGravada(atual, aprovado, `o perfil '${nome}'`, rotulo);
    for (const p of atual.problemas) reprovar(p.codigo, `no perfil '${nome}': ${p.mensagem}`, rotulo);
  }
  return { ok: problemas.length === 0, familia: id, problemas };
}

