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
 * Recusa por restrição que a família declara é resposta, não defeito: nos extremos da varredura ela é registrada. Nos
 * três pontos ela reprova, porque ponto aprovado precisa ser chamável.
 *
 * O resultado fica em `aprovacao.json`, ao lado do `familia.json`: a camada mecânica com o hash da geometria de cada um
 * dos três pontos e a data, e as camadas do crítico e da pessoa vazias (`null`). Reaprovar uma geometria diferente
 * esvazia o que o crítico e a pessoa tinham julgado, porque eles julgaram outra forma. Quem confere depois é
 * `conferirAprovacao` (o gate `familias:check`): o hash dos três pontos tem de continuar batendo. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { analisarTopologia } from '../../modulos/topologia/src/analisar.js';
import {
  REGISTRO_OPERACOES, criarRegistroComExtensoes, criarRegistroComposicoes, expandirChamadasDeComposicao, neutroCanonico,
} from '../../procedural/nucleo/entrada.js';
import { sha256Hex } from '../../procedural/nucleo/sha256.js';
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
import { execucaoDe, invariantesDe } from '../../src/autoria/varrer-parametros.js';
import { assinaturaDaMontagem, geraMontagem } from './curso-da-familia.mjs';

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
const MATERIAL_NEUTRO = Object.freeze({ cor: '#808080', aspereza: 0.5, metalicidade: 0 });
const TOLERANCIA_DE_SOMA = 1e-9;
const CODIGOS_DE_MALHA_ABERTA = Object.freeze(['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente']);

const hashDe = (neutro) => `sha256:${sha256Hex(JSON.stringify(neutroCanonico(neutro)))}`;
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

/* Os registros de uma execução. Sem `medir`, as extensões são as nativas, sem embrulho. Cada execução recebe registros
   novos: nada é guardado entre pontos. */
function ambienteDaExecucao(familia, { medir }) {
  const coletor = [];
  const registroOperacoes = criarRegistroComExtensoes({
    registroBase: REGISTRO_OPERACOES, extensoes: medir ? extensoesMedidas(coletor) : [...EXTENSOES_NATIVAS],
  });
  const registroComposicoes = criarRegistroComposicoes({ composicoes: [...familia.composicoes], resolverOperacao: registroOperacoes.resolver });
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

/** O que se guarda de uma medida: a articulação só registra a declaração, porque o curso se confere contra a montagem. */
function medidaGuardada(m) {
  const arredondada = Object.fromEntries(Object.entries(m).map(([chave, valor]) => [chave, arredondar(valor)]));
  if (m.ferramenta !== 'articulacao') return arredondada;
  return { ...arredondada, conferido: false, motivo: 'o curso se confere contra as malhas das duas peças numa montagem resolvida (conferirArticulacao); esta família é um componente' };
}

function executar(familia, parametros, { medir }) {
  const { coletor, execucao } = ambienteDaExecucao(familia, { medir });
  const receita = receitaDaFamilia(familia, parametros);
  const { passos } = expandirChamadasDeComposicao(execucao.registroComposicoes, receita.CHAMADAS_COMPOSICOES);
  receita.MATERIAIS = Object.fromEntries(passos.filter(([operacao, args]) => operacao === 'material' && typeof args?.usa === 'string').map(([, args]) => [args.usa, MATERIAL_NEUTRO]));
  const { neutro } = executarReceita(receita, execucao);
  return { neutro, medidas: coletor };
}

/**
 * Executa e confere um ponto da família. Devolve `{ rotulo, parametros, estado, hash, problemas, medidas, portas }`,
 * com `estado` `ok`, `recusa-declarada` (a família recusou o ponto por uma restrição que declara) ou `reprovado`.
 */
export function medirPonto(familia, parametros, rotulo = 'ponto') {
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
  problemas.push(...conferirMedidas(medido.medidas));
  return {
    ...base,
    estado: problemas.length ? 'reprovado' : 'ok',
    hash,
    problemas,
    medidas: medido.medidas.map(medidaGuardada),
    portas: ordenar(familia.contrato.portas.map(({ id }) => id)),
    portasNaoDeclaradas: portas.naoDeclaradas,
  };
}

/* ---------- o curso da articulação ---------- */

/** A medida da articulação com o curso conferido contra as malhas da montagem (`conferirCursoDaFamilia`). */
function medidaDoCurso(medidas, curso) {
  const declarada = medidas.find((m) => m.ferramenta === 'articulacao') ?? {};
  const semMotivo = { ...declarada };
  delete semMotivo.motivo;
  const conferida = { ...semMotivo, ferramenta: 'articulacao', ...arredondar(curso) };
  return [...medidas.filter((m) => m.ferramenta !== 'articulacao'), conferida];
}

/** Põe o curso conferido em cada ponto e acusa o ponto cujo curso colide ou nem foi conferido: uma família que gera montagem não fica sem a conta. */
export function integrarOCurso(pontos, cursos, problemas) {
  for (const nome of NOMES_DOS_PONTOS) {
    const ponto = pontos[nome];
    const curso = cursos?.[nome];
    if (!curso) {
      problemas.push({ ponto: nome, ...problema('curso-nao-conferido', 'a família gera montagem e o curso da articulação não foi conferido contra as malhas das peças; rode npm run familia -- aprovar, que o confere') });
      continue;
    }
    if (!curso.ok) problemas.push({ ponto: nome, ...problema('curso-colide', `o curso da articulação '${curso.articulacao}' não passa: ${curso.recusa.join(' ')}`) });
    if (ponto.estado !== 'recusa-declarada') ponto.medidas = medidaDoCurso(ponto.medidas, curso);
  }
}

/* ---------- a aprovação ---------- */

function lerAprovacaoGravada(pasta) {
  const caminho = join(pasta, ARQUIVO_APROVACAO);
  if (!existsSync(caminho)) return null;
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function pontoGravado(ponto) {
  return { parametros: ponto.parametros, hash: ponto.hash, medidas: ponto.medidas };
}

/**
 * Roda a camada mecânica sobre a família e, aprovada, grava `aprovacao.json` em `pasta` (a menos que `gravar` seja
 * falso). Devolve `{ aprovada, familia, pontos, varredura, problemas, gravada, esvaziou }`. `data` é o dia da aprovação
 * (padrão: hoje). Quem chama escolhe a pasta; o gate usa `procedural/familias/<id>`.
 */
export function aprovarFamilia(familia, { pasta = null, data = null, gravar = true, cursos = null } = {}) {
  const problemas = [];
  const id = familia?.contrato?.id;
  try {
    lerFamilia(familia.contrato);
  } catch (erro) {
    return { aprovada: false, familia: id ?? null, pontos: {}, varredura: [], problemas: [problema('contrato-invalido', erro.message)], gravada: false, esvaziou: false };
  }
  const definidos = pontosDaFamilia(familia.contrato);
  const pontos = Object.fromEntries(NOMES_DOS_PONTOS.map((nome) => [nome, medirPonto(familia, definidos[nome], nome)]));
  for (const ponto of Object.values(pontos)) {
    if (ponto.estado === 'recusa-declarada') {
      problemas.push({ ponto: ponto.rotulo, ...problema('ponto-aprovado-recusado', `o ponto '${ponto.rotulo}' é recusado pela restrição '${ponto.restricao}': ${ponto.motivo}`) });
    }
    for (const p of ponto.problemas) problemas.push({ ponto: ponto.rotulo, ...p });
  }
  if (geraMontagem(familia)) integrarOCurso(pontos, cursos, problemas);
  const varredura = varreduraDaFamilia(familia.contrato).map((sonda) => ({ ...medirPonto(familia, sonda.parametros, sonda.rotulo), parametro: sonda.parametro, extremo: sonda.extremo }));
  for (const ponto of varredura) {
    for (const p of ponto.problemas) problemas.push({ ponto: `varredura ${ponto.rotulo}`, ...p });
  }
  const aprovada = problemas.length === 0;
  const resultado = { aprovada, familia: id, pontos, varredura, problemas, gravada: false, esvaziou: false };
  if (!aprovada || !gravar || !pasta) return resultado;

  const anterior = lerAprovacaoGravada(pasta);
  const mesmaGeometria = Boolean(anterior?.mecanica?.pontos) && NOMES_DOS_PONTOS.every((nome) => anterior.mecanica.pontos[nome]?.hash === pontos[nome].hash);
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
    },
    critico: mesmaGeometria ? (anterior.critico ?? null) : null,
    pessoa: mesmaGeometria ? (anterior.pessoa ?? null) : null,
  };
  writeFileSync(join(pasta, ARQUIVO_APROVACAO), `${JSON.stringify(aprovacao, null, 2)}\n`, 'utf8');
  return { ...resultado, gravada: true, esvaziou: Boolean(anterior) && !mesmaGeometria && Boolean(anterior.critico || anterior.pessoa) };
}

/* O gate não repete a conta do curso (são dezenas de posições sobre malhas inteiras): confere que ela foi feita, que passou, e
   que a montagem que a família gera hoje, as duas peças e a declaração, é a que foi conferida. */
export function conferirOCursoGravado(familia, nome, parametros, aprovado, reprovar) {
  const gravado = aprovado.medidas?.find((m) => m.ferramenta === 'articulacao');
  const id = familia.contrato.id;
  if (!gravado?.conferido) {
    reprovar('curso-nao-conferido', `o ponto '${nome}' não traz o curso da articulação conferido contra as malhas; reaprove com npm run familia -- aprovar ${id}`, nome);
    return;
  }
  if (!gravado.ok) reprovar('curso-colide', `o curso da articulação '${gravado.articulacao}' no ponto '${nome}' foi aprovado com colisão`, nome);
  let atual;
  try {
    atual = assinaturaDaMontagem(familia.montar(parametros));
  } catch (erro) {
    reprovar('montagem-nao-gerada', `no ponto '${nome}' a família não gera a montagem: ${erro.message}`, nome);
    return;
  }
  if (JSON.stringify(gravado.hashDasPecas) !== JSON.stringify(atual.hashDasPecas)) {
    reprovar('montagem-mudou', `as peças da montagem do ponto '${nome}' mudaram desde que o curso foi conferido; reaprove com npm run familia -- aprovar ${id}`, nome);
  } else if (JSON.stringify(gravado.declaracao) !== JSON.stringify(atual.declaracao)) {
    reprovar('articulacao-mudou', `a declaração da articulação do ponto '${nome}' mudou desde que o curso foi conferido; reaprove com npm run familia -- aprovar ${id}`, nome);
  }
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
    const atual = medirPonto(familia, definidos[nome], nome);
    if (atual.estado === 'recusa-declarada') {
      reprovar('ponto-aprovado-recusado', `o ponto '${nome}' agora é recusado pela restrição '${atual.restricao}': ${atual.motivo}`, nome);
    } else if (atual.hash !== null && atual.hash !== aprovado.hash) {
      reprovar('geometria-mudou', `a geometria do ponto '${nome}' mudou desde a aprovação (aprovado ${aprovado.hash.slice(0, 19)}, agora ${atual.hash.slice(0, 19)}); reaprove com npm run familia -- aprovar ${id}`, nome);
    }
    for (const p of atual.problemas) reprovar(p.codigo, `no ponto '${nome}': ${p.mensagem}`, nome);
    if (geraMontagem(familia)) conferirOCursoGravado(familia, nome, definidos[nome], aprovado, reprovar);
  }
  return { ok: problemas.length === 0, familia: id, problemas };
}

