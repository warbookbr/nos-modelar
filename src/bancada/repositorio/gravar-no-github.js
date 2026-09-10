/* gravar-no-github.js — a bancada publicada gravando no repositório.
 *
 * A bancada é página estática: no computador de quem tem o repositório existe o
 * atendente local, mas quem abre o endereço publicado não tem arquivo nenhum
 * para escrever. Sem isto, o site serve só para olhar.
 *
 * O caminho é a API de conteúdo do GitHub, com um token do próprio usuário. Não
 * há servidor no meio, e não há como haver sem um: uma troca de OAuth exigiria
 * guardar um segredo de aplicação, e segredo em página estática não é segredo.
 *
 * O QUE ISSO PEDE DE QUEM USA, dito sem rodeio: um token de acesso pessoal de
 * escopo estreito — `fine-grained`, um repositório só, permissão de conteúdo
 * para escrita. Ele fica guardado no navegador de quem o digitou. Quem tiver
 * esse token escreve nesse repositório, então token largo aqui é chave de casa
 * deixada na fechadura.
 *
 * A DISCIPLINA É A MESMA DO ARQUIVO LOCAL. O texto novo é montado, a receita
 * candidata é EXECUTADA a partir dele, e só depois de ela executar é que o
 * commit sai. Publicar primeiro e conferir depois deixaria no repositório uma
 * peça que não abre, e alguém descobriria pelo erro, não pelo aviso. */

import { executarReceita } from '../../autoria/executar-receita.js';
import { listarParametrosDeclarados, parametroDeclarado } from '../../autoria/parametros-declarados.js';
import { aplicarTrocas } from '../../autoria/texto-parametro.js';

const CHAVE_CONFIG = 'mecanifica.bancada.repositorio';
const API = 'https://api.github.com';

function falha(motivo, extra = {}) {
  return { estado: 'falha-recuperavel', motivo, ...extra };
}

export function lerConfiguracaoRepositorio({ armazenamento = globalThis.localStorage } = {}) {
  try {
    const bruto = JSON.parse(armazenamento?.getItem(CHAVE_CONFIG) ?? 'null');
    if (!bruto || typeof bruto !== 'object') return null;
    const { dono, repo, ramo, token } = bruto;
    if (!dono || !repo || !token) return null;
    return { dono, repo, ramo: ramo || 'main', token };
  } catch {
    return null;
  }
}

export function salvarConfiguracaoRepositorio(config, { armazenamento = globalThis.localStorage } = {}) {
  armazenamento?.setItem(CHAVE_CONFIG, JSON.stringify(config ?? {}));
  return lerConfiguracaoRepositorio({ armazenamento });
}

/* Base64 de texto com acento. `btoa` sozinho quebra em qualquer caractere fora
   do latin-1, e a tabela da bicicleta tem "avanço" e "direção" em comentário. */
export function paraBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

export function deBase64(base64) {
  const binario = atob(String(base64).replace(/\s/g, ''));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function chamar(config, caminho, opcoes = {}, buscar = fetch) {
  const resposta = await buscar(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
    },
  });
  const corpo = await resposta.json().catch(() => ({}));
  return { ok: resposta.ok, status: resposta.status, corpo };
}

/* A receita candidata é executada a partir do TEXTO, sem passar por disco: o
   módulo nasce de um endereço de blob, é importado e descartado. É o
   equivalente exato do arquivo de ensaio que o atendente local usa. */
async function executaDoTexto(texto, importar) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/javascript' }));
  try {
    const modulo = await importar(url);
    const receita = modulo.default ?? modulo;
    return { receita, execucao: executarReceita(receita) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resumoDaMensagem(aplicadas) {
  if (aplicadas.length === 1) {
    const [a] = aplicadas;
    return `bancada: ${a.id} de ${a.de} para ${a.para}`;
  }
  const corpo = aplicadas.map((a) => `- ${a.id}: ${a.de} → ${a.para}`).join('\n');
  return `bancada: ${aplicadas.length} parâmetros ajustados\n\n${corpo}`;
}

/**
 * Troca parâmetros declarados e publica UM commit com todos.
 *
 * `caminhoNoRepo` é o caminho dentro do repositório, por exemplo
 * `prototipos/procedural/v3/pecas/bicicleta-quadro.js`. `mudancas` é um objeto
 * de identificador para valor.
 *
 * Um commit por lote, e não por gesto: quem ajusta uma peça mexe em vários
 * números antes de estar satisfeito, e um commit por número encheria o
 * histórico de estados que ninguém escolheu, dispararia a integração contínua a
 * cada um, e abriria uma janela por gesto para outra pessoa commitar no meio.
 */
export async function gravarParametrosNoGitHub({
  config, caminhoNoRepo, mudancas, mensagem,
  buscar = (...a) => fetch(...a),
  importar = (url) => import(/* @vite-ignore */ url),
}) {
  if (!config) return falha('sem repositório configurado');
  if (!mudancas || Object.keys(mudancas).length === 0) return falha('não veio mudança nenhuma');
  /* Conferir o valor ANTES de falar com a rede: `aplicarTrocas` pegaria isto
     depois, mas só após uma leitura do repositório que já se sabe inútil. */
  for (const [id, valor] of Object.entries(mudancas)) {
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      return falha(`valor de '${id}' precisa ser número finito`);
    }
  }

  const endereco = `/repos/${config.dono}/${config.repo}/contents/${caminhoNoRepo}`;
  const atual = await chamar(config, `${endereco}?ref=${encodeURIComponent(config.ramo)}`, {}, buscar);
  if (!atual.ok) {
    return falha(`não consegui ler o arquivo no repositório: ${atual.corpo.message ?? atual.status}`);
  }

  const original = deBase64(atual.corpo.content ?? '');
  let receitaAtual;
  try {
    ({ receita: receitaAtual } = await executaDoTexto(original, importar));
  } catch (erro) {
    return falha(`a receita que está no repositório não executa: ${erro.message}`);
  }

  const troca = aplicarTrocas(original, mudancas, (id) => parametroDeclarado(receitaAtual, id));
  if (troca.erro) {
    return falha(troca.erro, { declarados: listarParametrosDeclarados(receitaAtual).map((p) => p.id) });
  }
  if (troca.texto === original) {
    return { estado: 'aplicado', aplicadas: troca.aplicadas, semMudanca: true };
  }

  let candidata;
  try {
    candidata = await executaDoTexto(troca.texto, importar);
  } catch (erro) {
    return falha(`a receita com os valores novos não executa: ${erro.message}`);
  }

  const esperado = new Map(troca.aplicadas.map((a) => [a.id, a.para]));
  const depois = new Map(listarParametrosDeclarados(candidata.receita).map((p) => [p.id, p.valor]));
  for (const [id, para] of esperado) {
    if (depois.get(id) !== para) return falha(`a troca não pegou: '${id}' continua ${depois.get(id)}`);
  }
  for (const antes of listarParametrosDeclarados(receitaAtual)) {
    if (esperado.has(antes.id)) continue;
    if (depois.get(antes.id) !== antes.valor) return falha(`a troca mexeu em '${antes.id}' também`);
  }

  const publicacao = await chamar(config, endereco, {
    method: 'PUT',
    body: JSON.stringify({
      message: mensagem ?? resumoDaMensagem(troca.aplicadas),
      content: paraBase64(troca.texto),
      sha: atual.corpo.sha,
      branch: config.ramo,
    }),
  }, buscar);

  if (!publicacao.ok) {
    /* 409 é o caso que importa: alguém commitou entre a leitura e a escrita, e
       o `sha` que enviamos ficou velho. Publicar por cima apagaria o trabalho
       dessa pessoa, então a resposta é recusar e mandar reabrir. */
    const motivo = publicacao.status === 409
      ? 'o arquivo mudou no repositório desde que a bancada o leu; reabra a peça e refaça'
      : `o GitHub recusou: ${publicacao.corpo.message ?? publicacao.status}`;
    return falha(motivo);
  }

  return {
    estado: 'aplicado',
    aplicadas: troca.aplicadas,
    commit: publicacao.corpo.commit?.html_url ?? null,
  };
}

/**
 * Um parâmetro só. Casca fina de `gravarParametrosNoGitHub`, mantida porque as
 * provas e o aviso da bancada falam de um número por vez.
 */
export async function gravarParametroNoGitHub({ id, valor, ...resto }) {
  const resultado = await gravarParametrosNoGitHub({ ...resto, mudancas: { [id]: valor } });
  if (resultado.estado !== 'aplicado') return resultado;
  const [aplicada] = resultado.aplicadas;
  return {
    estado: 'aplicado', id, de: aplicada?.de, para: aplicada?.para, commit: resultado.commit ?? null,
  };
}
