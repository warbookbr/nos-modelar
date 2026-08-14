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
const FS_PADRAO = { link, lstat, mkdir, open, readFile, readdir, unlink };

function fsDe(opcoes = {}) {
  return { ...FS_PADRAO, ...(opcoes.fs ?? {}) };
}

function registrar(telemetria, evento) {
  telemetria?.(evento);
}

function erroTransicao(mensagem, acao = 'Repare ou descarte a transição sem ativar bytes não verificados.') {
  return new ErroRepositorioAutoria('transicao-invalida', mensagem, acao);
}

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

async function garantirDiretorio(caminho, fs = FS_PADRAO) {
  try { await fs.mkdir(caminho, { recursive: true }); } catch (erro) {
    if (erro?.code === 'EEXIST') throw new ErroRepositorioAutoria('raiz-insegura', `caminho não é diretório: ${caminho}`, 'Use diretório local comum, sem symlink ou arquivo no caminho.');
    throw erro;
  }
  const estado = await fs.lstat(caminho);
  if (!estado.isDirectory() || estado.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${caminho}`, 'Use diretório local comum, sem symlink.');
}

async function publicarArquivoImutavel(diretorio, nome, bytes, etapa, { falhaInjetada, fs = FS_PADRAO, telemetria, conflitoCodigo } = {}) {
  const temporario = join(diretorio, `.${nome}.${randomUUID()}.tmp`);
  const destino = join(diretorio, `${nome}.json`);
  let arquivo;
  try {
    registrar(telemetria, { tipo: 'chamada', nome: 'open', caminho: temporario });
    arquivo = await fs.open(temporario, 'wx');
    await arquivo.writeFile(bytes, 'utf8');
    registrar(telemetria, { tipo: 'bytes-escritos', bytes: bytes.length });
    await arquivo.sync();
    await arquivo.close();
    arquivo = null;
    await falhaInjetada?.(etapa);
    try {
      registrar(telemetria, { tipo: 'chamada', nome: 'link', caminho: destino });
      await fs.link(temporario, destino);
      registrar(telemetria, { tipo: 'arquivo-visivel', caminho: destino, bytes: bytes.length });
    } catch (erro) {
      if (erro?.code !== 'EEXIST') throw erro;
      const estado = await fs.lstat(destino);
      if (estado.isSymbolicLink()) throw new ErroRepositorioAutoria('destino-inseguro', `destino simbólico: ${destino}`, 'Remova o symlink e repita em uma raiz local segura.');
      const existente = await fs.readFile(destino, 'utf8');
      if (existente !== bytes) {
        if (conflitoCodigo) throw new ErroRepositorioAutoria(conflitoCodigo, `destino ${nome} já foi vencido por outra revisão.`, 'Leia a revisão ativa e planeje novamente.');
        throw new ErroRepositorioAutoria('hash-colidiu', `destino ${nome} diverge dos bytes planejados.`, 'Interrompa e preserve o repositório para auditoria.');
      }
      registrar(telemetria, { tipo: 'arquivo-ja-publicado', caminho: destino, bytes: bytes.length });
    }
  } catch (erro) {
    if (erro?.code === 'EXDEV') throw new ErroRepositorioAutoria('filesystem-inadequado', `filesystem sem hard link na fronteira: ${destino}`, 'Use um filesystem local que ofereça link exclusivo.');
    throw erro;
  } finally {
    await arquivo?.close().catch(() => {});
    await fs.unlink(temporario).catch((erro) => { if (erro?.code !== 'ENOENT') throw erro; });
  }
}

async function validarPlano(plano) {
  const conteudo = JSON.parse(plano?.objetoBytes ?? '{}').conteudo;
  const recalculado = planejarRevisaoAutoria({ entidade: plano?.entidade, conteudo, pai: plano?.pai ?? null });
  if (recalculado.objeto !== plano.objeto || recalculado.commit !== plano.commit || recalculado.commitBytes !== plano.commitBytes) {
    throw new ErroRepositorioAutoria('plano-divergente', 'plano não corresponde aos bytes canônicos.', 'Planeje novamente e publique o plano intacto.');
  }
  return recalculado;
}

async function prepararRaiz(raiz, fs) {
  if (typeof raiz !== 'string' || !raiz) throw new ErroRepositorioAutoria('raiz-invalida', 'raiz precisa ser caminho local explícito.', 'Informe o repositório local autorizado.');
  const base = resolve(raiz);
  const objetos = join(base, 'objetos');
  const commits = join(base, 'commits');
  const transicoes = join(base, 'transicoes');
  await garantirDiretorio(base, fs); await garantirDiretorio(objetos, fs); await garantirDiretorio(commits, fs); await garantirDiretorio(transicoes, fs);
  return { base, objetos, commits, transicoes };
}

async function prepararRaizLeitura(raiz, fs) {
  if (typeof raiz !== 'string' || !raiz) throw new ErroRepositorioAutoria('raiz-invalida', 'raiz precisa ser caminho local explícito.', 'Informe o repositório local autorizado.');
  const base = resolve(raiz);
  const estadoBase = await fs.lstat(base).catch((erro) => { if (erro?.code === 'ENOENT') return null; throw erro; });
  if (!estadoBase) return null;
  if (!estadoBase.isDirectory() || estadoBase.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${base}`, 'Use diretório local comum, sem symlink.');
  const diretorios = { base, objetos: join(base, 'objetos'), commits: join(base, 'commits'), transicoes: join(base, 'transicoes') };
  for (const caminho of [diretorios.objetos, diretorios.commits, diretorios.transicoes]) {
    const estado = await fs.lstat(caminho).catch((erro) => { if (erro?.code === 'ENOENT') return null; throw erro; });
    if (!estado) return null;
    if (!estado.isDirectory() || estado.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${caminho}`, 'Use diretório local comum, sem symlink.');
  }
  return diretorios;
}

async function lerArquivoSeguro(caminho, fs, codigo, acao) {
  const estado = await fs.lstat(caminho).catch((erro) => {
    if (erro?.code === 'ENOENT') return null;
    throw erro;
  });
  if (!estado) return null;
  if (estado.isSymbolicLink() || !estado.isFile()) {
    throw new ErroRepositorioAutoria(codigo, `arquivo inseguro: ${caminho}`, acao);
  }
  return fs.readFile(caminho, 'utf8');
}

async function publicarSnapshot({ raiz, plano, falhaInjetada, fs: fsOpcoes, telemetria } = {}) {
  const fs = fsDe({ fs: fsOpcoes });
  const recalculado = await validarPlano(plano);
  const diretorios = await prepararRaiz(raiz, fs);
  await publicarArquivoImutavel(diretorios.objetos, plano.objeto, plano.objetoBytes, 'antes-publicar-objeto', { falhaInjetada, fs, telemetria });
  await publicarArquivoImutavel(diretorios.commits, plano.commit, plano.commitBytes, 'antes-publicar-commit', { falhaInjetada, fs, telemetria });
  return { ...diretorios, ...recalculado };
}

export async function publicarRevisaoAutoria({ raiz, plano, falhaInjetada, fs, telemetria } = {}) {
  await publicarSnapshot({ raiz, plano, falhaInjetada, fs, telemetria });
  return { estado: 'aplicado', entidade: plano.entidade, commit: plano.commit, objeto: plano.objeto };
}

function nomePai(pai) {
  return pai ?? 'raiz';
}

async function lerTransicao({ diretorios, entidade, pai, fs }) {
  const pasta = join(diretorios.transicoes, entidade);
  const estadoPasta = await fs.lstat(pasta).catch((erro) => { if (erro?.code === 'ENOENT') return null; throw erro; });
  if (!estadoPasta) return null;
  if (!estadoPasta.isDirectory() || estadoPasta.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${pasta}`, 'Use diretório local comum, sem symlink.');
  const caminho = join(pasta, `${nomePai(pai)}.json`);
  try {
    const bytes = await lerArquivoSeguro(caminho, fs, 'transicao-insegura', 'Remova o symlink ou arquivo especial e repita em uma raiz local segura.');
    if (bytes === null) return null;
    let commit;
    try { commit = JSON.parse(bytes); } catch (erro) { throw erroTransicao(`JSON inválido na transição ${caminho}.`); }
    return { caminho, bytes, commit: { ...commit, id: hash(bytes) } };
  } catch (erro) {
    if (erro?.code === 'ENOENT') return null;
    throw erro;
  }
}

function validarTransicao(transicao, entidade, pai) {
  const commit = transicao?.commit;
  if (!commit || typeof commit !== 'object' || Array.isArray(commit)
    || commit.formato !== 'mecanifica.commit-autoria'
    || commit.versao !== 1
    || commit.entidade !== entidade
    || commit.pai !== pai
    || !/^[0-9a-f]{64}$/.test(commit.objeto)
    || hash(transicao.bytes) !== commit.id) {
    throw erroTransicao(`transição inválida para ${entidade}.`);
  }
  return commit;
}

async function lerObjetoSeguro(diretorios, objeto, fs) {
  if (!/^[0-9a-f]{64}$/.test(objeto)) throw erroTransicao(`objeto inválido: ${objeto}.`);
  const caminho = join(diretorios.objetos, `${objeto}.json`);
  const bytes = await lerArquivoSeguro(caminho, fs, 'objeto-inseguro', 'Remova o symlink ou arquivo especial e repita em uma raiz local segura.');
  if (bytes === null) throw new ErroRepositorioAutoria('objeto-ausente', `objeto ${objeto} não existe.`, 'Preserve o repositório e recupere o snapshot antes de ler a revisão.');
  if (hash(bytes) !== objeto) throw new ErroRepositorioAutoria('objeto-adulterado', `objeto ${objeto} diverge do hash.`, 'Preserve o repositório para auditoria.');
  let documento;
  try { documento = JSON.parse(bytes); } catch (erro) { throw new ErroRepositorioAutoria('objeto-invalido', `objeto ${objeto} não contém JSON válido.`, 'Preserve o repositório e descarte o snapshot inválido.'); }
  if (documento?.formato !== 'mecanifica.objeto-autoria' || documento?.versao !== 1 || !Object.hasOwn(documento, 'conteudo')) {
    throw new ErroRepositorioAutoria('objeto-invalido', `objeto ${objeto} não respeita o contrato de autoria.`, 'Preserve o repositório e descarte o snapshot inválido.');
  }
  return { bytes, documento };
}

export async function lerRevisaoAtivaAutoria(raiz, entidade, { fs: fsOpcoes } = {}) {
  if (!slugValido(entidade)) throw new ErroRepositorioAutoria('entidade-invalida', 'entidade precisa ser slug canônico.', 'Use letras minúsculas, números, ponto, hífen ou sublinhado.');
  const fs = fsDe({ fs: fsOpcoes });
  const diretorios = await prepararRaizLeitura(raiz, fs);
  if (!diretorios) return null;
  let pai = null;
  let ativa = null;
  const vistos = new Set();
  while (true) {
    const transicao = await lerTransicao({ diretorios, entidade, pai, fs });
    if (!transicao) break;
    if (vistos.has(transicao.commit.id)) throw new ErroRepositorioAutoria('transicao-ciclica', `transição cíclica para ${entidade}.`, 'Preserve a raiz e interrompa a leitura.');
    vistos.add(transicao.commit.id);
    const commit = validarTransicao(transicao, entidade, pai);
    const objeto = await lerObjetoSeguro(diretorios, commit.objeto, fs);
    ativa = { estado: 'aplicado', entidade, pai: commit.pai, commit: transicao.commit.id, objeto: commit.objeto, conteudo: objeto.documento.conteudo };
    pai = transicao.commit.id;
  }
  return ativa;
}

export async function materializarRevisaoAutoria({ raiz, plano, falhaInjetada, fs: fsOpcoes, telemetria } = {}) {
  const fs = fsDe({ fs: fsOpcoes });
  const inicio = Date.now();
  try {
    await validarPlano(plano);
    const ativo = await lerRevisaoAtivaAutoria(raiz, plano?.entidade, { fs });
    if (ativo?.commit === plano?.commit) {
      registrar(telemetria, { tipo: 'idempotente', commit: plano.commit });
      return { estado: 'aplicado', idempotente: true, entidade: plano.entidade, commit: plano.commit, objeto: plano.objeto };
    }
    if ((ativo?.commit ?? null) !== (plano?.pai ?? null)) {
      throw new ErroRepositorioAutoria('revisao-desatualizada', `a revisão ativa é ${ativo?.commit ?? 'null'}, mas o plano usa ${plano?.pai ?? 'null'}.`, 'Leia a revisão ativa, planeje novamente e confirme os bytes atuais.');
    }
    const diretorios = await publicarSnapshot({ raiz, plano, falhaInjetada, fs, telemetria });
    const transicoesDaEntidade = join(diretorios.transicoes, plano.entidade);
    await garantirDiretorio(transicoesDaEntidade, fs);
    await publicarArquivoImutavel(transicoesDaEntidade, nomePai(plano.pai), plano.commitBytes, 'antes-publicar-transicao', { falhaInjetada, fs, telemetria, conflitoCodigo: 'revisao-desatualizada' });
    return { estado: 'aplicado', entidade: plano.entidade, commit: plano.commit, objeto: plano.objeto };
  } finally {
    registrar(telemetria, { tipo: 'duracao', ms: Math.max(0, Date.now() - inicio) });
  }
}

async function listarTransicoes(diretorios, fs) {
  const entidades = await fs.readdir(diretorios.transicoes);
  const referencias = { commits: new Set(), objetos: new Set() };
  for (const entidade of entidades) {
    if (!slugValido(entidade)) throw erroTransicao(`entidade inválida na árvore de transições: ${entidade}.`);
    const pasta = join(diretorios.transicoes, entidade);
    const estadoPasta = await fs.lstat(pasta);
    if (!estadoPasta.isDirectory() || estadoPasta.isSymbolicLink()) throw new ErroRepositorioAutoria('raiz-insegura', `diretório inseguro: ${pasta}`, 'Use diretório local comum, sem symlink.');
    for (const nome of await fs.readdir(pasta)) {
      if (!/^raiz\.json$|^[0-9a-f]{64}\.json$/.test(nome)) continue;
      const pai = nome === 'raiz.json' ? null : nome.slice(0, -5);
      const transicao = await lerTransicao({ diretorios, entidade, pai, fs });
      if (!transicao) throw erroTransicao(`transição desapareceu durante a limpeza: ${join(pasta, nome)}.`);
      const commit = validarTransicao(transicao, entidade, pai);
      await lerObjetoSeguro(diretorios, commit.objeto, fs);
      referencias.commits.add(commit.id);
      referencias.objetos.add(commit.objeto);
    }
  }
  return referencias;
}

async function candidatosOrfaos(diretorio, referencias, fs) {
  const candidatos = [];
  for (const nome of await fs.readdir(diretorio)) {
    if (!/^[0-9a-f]{64}\.json$/.test(nome)) continue;
    const id = nome.slice(0, -5);
    const caminho = join(diretorio, nome);
    const estado = await fs.lstat(caminho);
    if (estado.isSymbolicLink() || !estado.isFile()) throw new ErroRepositorioAutoria('raiz-insegura', `arquivo inseguro: ${caminho}`, 'Use somente arquivos regulares no repositório de autoria.');
    if (!referencias.has(id)) candidatos.push(caminho);
  }
  return candidatos;
}

/**
 * Lista snapshots não alcançáveis por nenhuma transição. A remoção é opt-in;
 * mesmo ao aplicar, todas as transições e objetos referenciados são validados
 * antes de qualquer unlink.
 */
export async function limparOrfaosAutoria({ raiz, aplicar = false, fs: fsOpcoes, telemetria } = {}) {
  const fs = fsDe({ fs: fsOpcoes });
  const diretorios = await prepararRaizLeitura(raiz, fs);
  if (!diretorios) return { estado: 'vazio', aplicar, objetos: [], commits: [] };
  const referencias = await listarTransicoes(diretorios, fs);
  const objetos = await candidatosOrfaos(diretorios.objetos, referencias.objetos, fs);
  const commits = await candidatosOrfaos(diretorios.commits, referencias.commits, fs);
  if (aplicar) {
    for (const caminho of [...objetos, ...commits]) {
      await fs.unlink(caminho);
      registrar(telemetria, { tipo: 'arquivo-removido', caminho });
    }
  }
  return { estado: aplicar ? 'limpo' : 'simulado', aplicar, objetos, commits };
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
