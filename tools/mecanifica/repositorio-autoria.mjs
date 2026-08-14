/* repositorio-autoria.mjs — revisões imutáveis com commit como fronteira de visibilidade. */
import { createHash, randomUUID } from 'node:crypto';
import { link, lstat, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export class ErroRepositorioAutoria extends Error {
  constructor(codigo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroRepositorioAutoria';
    this.codigo = codigo;
    this.acao = acao;
  }
}

function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

function validarJson(valor, caminho = 'conteudo') {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return;
  if (typeof valor === 'number' && Number.isFinite(valor)) return;
  if (Array.isArray(valor)) return valor.forEach((item, indice) => validarJson(item, `${caminho}[${indice}]`));
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.entries(valor).forEach(([chave, item]) => validarJson(item, `${caminho}.${chave}`));
  }
  throw new ErroRepositorioAutoria('conteudo-invalido', `${caminho} não é JSON canônico.`, 'Use somente objeto, lista, texto, booleano, null e número finito.');
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const slugValido = (valor) => typeof valor === 'string' && /^[a-z0-9][a-z0-9._-]*$/.test(valor);

export function planejarRevisaoAutoria({ entidade, conteudo, pai = null }) {
  if (!slugValido(entidade)) throw new ErroRepositorioAutoria('entidade-invalida', 'entidade precisa ser slug canônico.', 'Use letras minúsculas, números, ponto, hífen ou sublinhado.');
  if (pai !== null && !/^[0-9a-f]{64}$/.test(pai)) throw new ErroRepositorioAutoria('pai-invalido', 'pai precisa ser hash de commit ou null.', 'Use o commit atualmente observado.');
  if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)) throw new ErroRepositorioAutoria('conteudo-invalido', 'conteúdo precisa ser objeto.', 'Informe os documentos canônicos da revisão.');
  validarJson(conteudo);
  const objetoBytes = `${canonico({ formato: 'mecanifica.objeto-autoria', versao: 1, conteudo })}\n`;
  const objeto = hash(objetoBytes);
  const commitBase = { formato: 'mecanifica.commit-autoria', versao: 1, entidade, pai, objeto };
  const commitBytes = `${canonico(commitBase)}\n`;
  const commit = hash(commitBytes);
  return { entidade, pai, objeto, commit, objetoBytes, commitBytes };
}

async function garantirDiretorio(caminho) {
  await mkdir(caminho, { recursive: true });
  const estado = await lstat(caminho);
  if (!estado.isDirectory() || estado.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${caminho}`, 'Use diretório local comum, sem symlink.');
}

async function publicarArquivoImutavel(diretorio, nome, bytes, etapa, falhaInjetada) {
  const temporario = join(diretorio, `.${nome}.${randomUUID()}.tmp`);
  const destino = join(diretorio, `${nome}.json`);
  let arquivo;
  try {
    arquivo = await open(temporario, 'wx');
    await arquivo.writeFile(bytes, 'utf8');
    await arquivo.sync();
    await arquivo.close();
    arquivo = null;
    await falhaInjetada?.(etapa);
    try { await link(temporario, destino); } catch (erro) {
      if (erro?.code !== 'EEXIST') throw erro;
      const existente = await readFile(destino, 'utf8');
      if (existente !== bytes) throw new ErroRepositorioAutoria('hash-colidiu', `destino ${nome} diverge dos bytes planejados.`, 'Interrompa e preserve o repositório para auditoria.');
    }
  } finally {
    await arquivo?.close().catch(() => {});
    await unlink(temporario).catch((erro) => { if (erro?.code !== 'ENOENT') throw erro; });
  }
}

export async function publicarRevisaoAutoria({ raiz, plano, falhaInjetada } = {}) {
  if (typeof raiz !== 'string' || !raiz) throw new ErroRepositorioAutoria('raiz-invalida', 'raiz precisa ser caminho local explícito.', 'Informe o repositório local autorizado.');
  const recalculado = planejarRevisaoAutoria({ entidade: plano?.entidade, conteudo: JSON.parse(plano?.objetoBytes ?? '{}').conteudo, pai: plano?.pai ?? null });
  if (recalculado.objeto !== plano.objeto || recalculado.commit !== plano.commit || recalculado.commitBytes !== plano.commitBytes) {
    throw new ErroRepositorioAutoria('plano-divergente', 'plano não corresponde aos bytes canônicos.', 'Planeje novamente e publique o plano intacto.');
  }
  const base = resolve(raiz);
  const objetos = join(base, 'objetos');
  const commits = join(base, 'commits');
  await garantirDiretorio(base); await garantirDiretorio(objetos); await garantirDiretorio(commits);
  await publicarArquivoImutavel(objetos, plano.objeto, plano.objetoBytes, 'antes-publicar-objeto', falhaInjetada);
  await publicarArquivoImutavel(commits, plano.commit, plano.commitBytes, 'antes-publicar-commit', falhaInjetada);
  return { estado: 'aplicado', entidade: plano.entidade, commit: plano.commit, objeto: plano.objeto };
}

export async function lerHistoricoAutoria(raiz) {
  const diretorio = join(resolve(raiz), 'commits');
  let nomes = [];
  try { nomes = (await readdir(diretorio)).filter((nome) => /^[0-9a-f]{64}\.json$/.test(nome)).sort(); } catch (erro) { if (erro?.code !== 'ENOENT') throw erro; }
  const commits = [];
  for (const nome of nomes) commits.push({ id: nome.slice(0, -5), ...JSON.parse(await readFile(join(diretorio, nome), 'utf8')) });
  const grupos = new Map();
  for (const commit of commits) {
    const chave = `${commit.entidade}\0${commit.pai ?? ''}`;
    const lista = grupos.get(chave) ?? []; lista.push(commit.id); grupos.set(chave, lista);
  }
  const conflitos = [...grupos.entries()].filter(([, ids]) => ids.length > 1).map(([origem, commitsFilhos]) => ({ origem, commitsFilhos }));
  return { formato: 'mecanifica.historico-autoria', versao: 1, commits, conflitos };
}
