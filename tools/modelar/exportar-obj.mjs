/* exportar-obj.mjs — CLI para exportação atômica e segura de receitas procedurais em Wavefront OBJ (.obj). */
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ErroExportacaoObj, exportarObj, resolverEscalaPadrao, validarMalhaObj, validarOpcoes } from '../../modulos/exportador-obj/src/index.js';
import { separarCorpos } from '../../modulos/exportador-cad/src/separar-corpos.js';
import { normalizarMaterial } from '../../src/autoria/material-da-receita.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita } from './importar-receita.mjs';
import { avisoDeCache, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(AQUI, '../..');
export const CAMINHO_MODULO_TEXTURA = resolve(REPO, 'modulos/textura/src/index.js');
const PX_TEXTURA_PADRAO = 256;

/* FNV-1a de 32 bits: a semente da textura vem do nome do arquivo e do material, então a mesma saída gera a mesma imagem. */
export function sementeDe(texto) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/* O módulo de textura é opcional: só é importado quando a flag --com-textura está ligada. */
export async function carregarModuloTextura(caminho = CAMINHO_MODULO_TEXTURA) {
  if (!existsSync(caminho)) {
    throw new Error(
      '--com-textura: o módulo de textura não existe neste checkout (esperado em modulos/textura/src/index.js). '
      + 'A exportação não gerou imagens; exporte sem --com-textura ou aguarde o módulo.',
    );
  }
  const modulo = await import(pathToFileURL(caminho).href);
  if (typeof modulo.gerarTextura !== 'function' || typeof modulo.texturaParaPng !== 'function') {
    throw new Error('--com-textura: o módulo de textura precisa exportar gerarTextura e texturaParaPng.');
  }
  return modulo;
}

/* O módulo de textura recebe a especificação do material ({ tipo, cor: [r, g, b], ... }), e a receita do acervo guarda o material por
   nome, com `tipo` e `cor` em hexadecimal em MATERIAIS. Sem `tipo` declarado, o nome decide: o que cita metal, aço ou cromo vira
   `metal`, madeira vira `madeira`, tecido ou pano vira `tecido`, e o resto vira `liso`. */
export function especificacaoDeTextura(nome, entrada = {}) {
  /* A declaração passa antes pelo normalizador único (campo desconhecido, faixa e tipo recusados com o nome do material); daqui
     só se lê o que o módulo de textura usa, e só o que a receita declarou, para a especificação de hoje não ganhar campo. */
  const material = normalizarMaterial(nome, entrada);
  const declarado = (campo) => entrada[campo] !== undefined;
  let tipo = material.tipo;
  if (!tipo) {
    const n = nome.toLowerCase();
    tipo = /madeira|vime/.test(n) ? 'madeira' : /tecido|pano|estofado/.test(n) ? 'tecido' : /metal|inox|cromo|ferro|^aco/.test(n) ? 'metal' : 'liso';
  }
  let rgb = [128, 128, 128];
  if (material.cor) {
    const hex = material.cor.length === 4 ? [...material.cor.slice(1)].map((c) => c + c).join('') : material.cor.slice(1);
    rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  const extras = {};
  for (const campo of ['desgaste', 'veio', 'borda', 'tabuas', 'ferrugem', 'manchas', 'rasgos', 'acabamento']) if (declarado(campo)) extras[campo] = material[campo];
  if (declarado('brilho')) extras.brilho = material.brilho;
  return { tipo, cor: rgb, ...extras };
}

function materiaisDaMalha(neutro) {
  const nomes = new Set();
  for (const face of neutro.F.values()) {
    if (typeof face.material === 'string' && face.material.trim()) nomes.add(face.material.trim());
  }
  return [...nomes].sort();
}

function gravarAtomico(caminho, bytes) {
  const tempPath = `${caminho}.tmp.${Date.now()}`;
  try {
    writeFileSync(tempPath, bytes);
    renameSync(tempPath, caminho);
  } catch (err) {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    throw err;
  }
}

export function conferirSemOrfaos(nome, orfaos) {
  if (!orfaos || orfaos.length === 0) return;
  const primeiro = orfaos[0];
  throw new Error(
    `exportar-obj: a receita '${nome}' possui ${orfaos.length} órfão(s) e não pode ser exportada. `
    + `Primeiro: passo ${primeiro.passo}, op '${primeiro.op}', ${primeiro.ref} — ${primeiro.motivo}`,
  );
}

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = {
    arquivo: null,
    saida: null,
    unidade: 'm',
    tolerancia: 0.001,
    escala: null,
    sobrescrever: false,
    diagnosticoJson: false,
    somenteValidar: false,
    exigirFechado: false,
    comTextura: false,
    opcao: 1,
    pularFaceSemArea: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--arquivo=')) {
      opcoes.arquivo = arg.slice('--arquivo='.length).trim();
    } else if (arg.startsWith('--saida=')) {
      opcoes.saida = arg.slice('--saida='.length).trim();
    } else if (arg.startsWith('--unidade=')) {
      opcoes.unidade = arg.slice('--unidade='.length).trim();
    } else if (arg.startsWith('--tolerancia=')) {
      opcoes.tolerancia = parseFloat(arg.slice('--tolerancia='.length));
    } else if (arg.startsWith('--escala=')) {
      opcoes.escala = parseFloat(arg.slice('--escala='.length));
    } else if (arg === '--sem-cache') {
      opcoes.semCache = true;
    } else if (arg === '--sobrescrever') {
      opcoes.sobrescrever = true;
    } else if (arg === '--exigir-fechado') {
      opcoes.exigirFechado = true;
    } else if (arg === '--com-textura') {
      opcoes.comTextura = true;
    } else if (arg === '--pular-face-sem-area') {
      opcoes.pularFaceSemArea = true;
    } else if (arg.startsWith('--opcao=')) {
      opcoes.opcao = opcaoDaLinha(arg.slice('--opcao='.length).trim());
    } else if (arg === '--diagnostico=json') {
      opcoes.diagnosticoJson = true;
    } else if (arg === '--somente-validar') {
      opcoes.somenteValidar = true;
    } else if (!arg.startsWith('--') && !opcoes.arquivo) {
      opcoes.arquivo = arg.trim();
    }
  }

  opcoes.escala = resolverEscalaPadrao(opcoes.unidade, opcoes.escala);
  return opcoes;
}

export async function carregarReceita(caminhoArquivo, { opcao = 1, semCache = false } = {}) {
  if (!caminhoArquivo) {
    throw new Error('Caminho do arquivo da receita é obrigatório. Use --arquivo=<caminho>.');
  }

  const caminhoAbsoluto = isAbsolute(caminhoArquivo)
    ? resolve(caminhoArquivo)
    : resolve(process.cwd(), caminhoArquivo);

  const rel = relative(REPO, caminhoAbsoluto);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Confinamento violado: o arquivo '${caminhoArquivo}' está fora do repositório.`);
  }

  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo da receita não encontrado: ${caminhoAbsoluto}`);
  }

  const nomePadrao = basename(caminhoAbsoluto, extname(caminhoAbsoluto));
  /* O rascunho de um objeto é um esboço 2.0 (`.esboco.mjs` ou `.esboco.json`): o resolvedor comum das ferramentas de medida monta a
     opção escolhida e entrega a receita dela, com o neutro já executado. */
  const doEsboco = async () => {
    const lida = await lerEntradaDeMedida(caminhoAbsoluto, { opcao, montagem: false, cache: !semCache });
    if (lida.tipo !== 'esboco') return { receita: lida.receita, nome: nomePadrao, caminhoAbsoluto };
    const { neutro } = lida.executar();
    process.stderr.write(avisoDeCache(lida, 'exportar:obj'));
    return { receita: lida.receita, nome: lida.nome.replace(/\.esboco\.(mjs|js|json)$/, '').replace(/\.(mjs|js|json)$/, ''), caminhoAbsoluto, neutro, origem: lida.origem };
  };
  if (/\.json$/.test(caminhoAbsoluto)) return doEsboco();

  const mod = await importarReceita(caminhoAbsoluto);
  /* A exportação default da receita traz o conjunto inteiro (PASSOS, MATERIAIS, ALIASES); uma peça que também exporta PASSOS nomeado
     perdia o MATERIAIS quando o módulo inteiro era escolhido, e o passo `material` ficava órfão. */
  const receita = mod.default?.PASSOS || mod.default?.CHAMADAS_COMPOSICOES
    ? mod.default
    : (mod.PASSOS || mod.CHAMADAS_COMPOSICOES
        ? mod
        : Object.values(mod).find((v) => v && (Array.isArray(v.PASSOS) || Array.isArray(v.CHAMADAS_COMPOSICOES))));

  if (!receita) {
    if (mod.default && typeof mod.default === 'object') return doEsboco();
    throw new Error(`O módulo '${caminhoArquivo}' não exporta PASSOS nem CHAMADAS_COMPOSICOES.`);
  }

  const nome = (typeof receita.meta?.nome === 'string' && receita.meta.nome.trim().length > 0)
    ? receita.meta.nome.trim()
    : nomePadrao;

  return { receita, nome, caminhoAbsoluto };
}

const LIMITE_DE_FACES_PULADAS = 200;

/* A malha sem as faces que a exportação não consegue triangular sem triângulo de área nula (`face-degenerada`), e a lista delas:
   `[{ face, parte, vertices, motivo }]`. O leque e as orelhas de `triangularSemDegenerado` não acham triangulação numa tira fina com
   vários cantos colineares nos dois lados (a parede de um corte de 1 mm, com os vértices da chapa nos dois lados), embora a face tenha
   área; pular a face deixa um furo nessa tira e a imagem não a mostra. Passa de `LIMITE_DE_FACES_PULADAS`, a malha não é a de uma
   lasca de corte e a recusa volta como estava. */
export function semFaceSemArea(neutro, tolerancia = 0.001) {
  const F = new Map(neutro.F);
  /* o neutro pode ser de classe, com métodos que a exportação chama: a cópia leva o protótipo e troca só as faces */
  const semFaces = () => Object.assign(Object.create(Object.getPrototypeOf(neutro)), neutro, { F });
  const puladas = [];
  for (;;) {
    try {
      validarMalhaObj(semFaces(), { tolerancia });
      return { neutro: puladas.length ? semFaces() : neutro, puladas };
    } catch (erro) {
      const alvo = erro instanceof ErroExportacaoObj && erro.codigo === 'face-degenerada' ? erro.detalhes?.face : undefined;
      const chave = alvo === undefined ? undefined : [...F.keys()].find((k) => (F.get(k)?.id ?? k) === alvo);
      if (chave === undefined || puladas.length >= LIMITE_DE_FACES_PULADAS) throw erro;
      const face = F.get(chave);
      puladas.push({ face: alvo, parte: face.parte ?? null, vertices: face.vs.length, motivo: erro.message });
      F.delete(chave);
    }
  }
}

export async function exportarArquivoObj(opcoesArg) {
  const {
    arquivo,
    saida,
    unidade = 'm',
    tolerancia = 0.001,
    escala: escalaInformada,
    sobrescrever = false,
    diagnosticoJson = false,
    somenteValidar = false,
    exigirFechado = false,
    comTextura = false,
    moduloTextura,
    opcao = 1,
    pularFaceSemArea = false,
    carregada = null,
  } = opcoesArg;

  const escala = resolverEscalaPadrao(unidade, escalaInformada);
  /* `carregada` é o `{ receita, nome, neutro? }` que quem chama já leu (as vistas de superfície), para não montar a peça duas vezes */
  const { receita, nome, neutro: jaExecutado } = carregada ?? await carregarReceita(arquivo, { opcao, semCache: opcoesArg.semCache });
  let neutro = jaExecutado ?? executarReceita(receita).neutro;
  conferirSemOrfaos(nome, neutro.orfaos);
  let facesPuladas = [];
  if (pularFaceSemArea) ({ neutro, puladas: facesPuladas } = semFaceSemArea(neutro, tolerancia));

  const nomeNormalizado = nome.replace(/[^a-zA-Z0-9_-]/g, '_');
  const normalizadas = validarOpcoes({
    nome: nomeNormalizado,
    unidade,
    tolerancia,
    escala,
    exigirFechado,
  });

  if (somenteValidar) {
    const malha = validarMalhaObj(neutro, normalizadas);
    const corpos = separarCorpos(malha);
    const diagnostico = {
      valido: true,
      nome: nomeNormalizado,
      unidade: normalizadas.unidade,
      escala: normalizadas.escala,
      tolerancia: normalizadas.tolerancia,
      vertices: malha.vertices.size,
      facesOriginais: malha.faces.length,
      corpos: corpos.map((c) => ({ nome: c.nome, faces: c.faces.length })),
    };
    return { diagnostico: { ...diagnostico, ...(facesPuladas.length ? { facesPuladas } : {}) }, somenteValidar: true };
  }

  const caminhoSaida = saida
    ? (isAbsolute(saida) ? resolve(saida) : resolve(process.cwd(), saida))
    : resolve(REPO, 'exportacoes/obj', `${nomeNormalizado}.obj`);

  /* O .mtl leva o nome do .obj, e as imagens levam o nome do .obj mais o material: tudo na mesma pasta, sem colisão
     entre objetos diferentes. */
  const stem = basename(caminhoSaida, '.obj').replace(/[^a-zA-Z0-9_-]/g, '_');
  const imagens = [];
  let texturas;
  if (comTextura) {
    const modulo = moduloTextura ?? await carregarModuloTextura();
    texturas = {};
    for (const material of materiaisDaMalha(neutro)) {
      const { brilho, ...especificacao } = especificacaoDeTextura(material, receita.MATERIAIS?.[material]);
      const textura = await modulo.gerarTextura(especificacao, { px: PX_TEXTURA_PADRAO, semente: sementeDe(`${stem}:${material}`) });
      const arquivo = `${stem}_${material}.png`;
      texturas[material] = { arquivo, metrosPorTile: textura.metrosPorTile, ...(brilho !== undefined ? { brilho } : {}) };
      imagens.push({ arquivo, bytes: Buffer.from(await modulo.texturaParaPng(textura)) });
    }
  }

  const resultado = await exportarObj({
    nome: nomeNormalizado,
    neutro,
    unidade: normalizadas.unidade,
    tolerancia: normalizadas.tolerancia,
    escala: normalizadas.escala,
    exigirFechado: normalizadas.exigirFechado,
    texturas,
    nomeMtl: `${stem}.mtl`,
  });

  const pastaDestino = dirname(caminhoSaida);
  const caminhoMtl = resultado.mtl ? join(pastaDestino, resultado.nomeMtl) : null;
  const destinos = [caminhoSaida, caminhoMtl, ...imagens.map((i) => join(pastaDestino, i.arquivo))].filter(Boolean);
  if (!sobrescrever) {
    const existente = destinos.find((caminho) => existsSync(caminho));
    if (existente) {
      throw new Error(`Arquivo de destino já existe: ${existente}. Use --sobrescrever para substituir.`);
    }
  }

  mkdirSync(pastaDestino, { recursive: true });
  gravarAtomico(caminhoSaida, resultado.bytes);
  if (caminhoMtl) {
    gravarAtomico(caminhoMtl, new TextEncoder().encode(resultado.mtl));
  }
  for (const imagem of imagens) {
    gravarAtomico(join(pastaDestino, imagem.arquivo), imagem.bytes);
  }

  const stat = statSync(caminhoSaida);
  return {
    caminhoSaida,
    caminhoRelativo: relative(REPO, caminhoSaida),
    tamanhoBytes: stat.size,
    arquivosTextura: [...(caminhoMtl ? [relative(REPO, caminhoMtl)] : []), ...imagens.map((i) => relative(REPO, join(pastaDestino, i.arquivo)))],
    diagnostico: resultado.diagnostico,
    diagnosticoJson,
    facesPuladas,
  };
}

async function main() {
  try {
    const opcoes = parseArgs();
    if (!opcoes.arquivo) {
      process.stderr.write('Uso: node tools/modelar/exportar-obj.mjs --arquivo=<caminho> [opções]\n');
      process.stderr.write('Opções:\n');
      process.stderr.write('  --saida=<caminho>       Caminho do arquivo .obj de destino\n');
      process.stderr.write('  --unidade=<m|cm|mm>     Unidade de exportação (padrão: m)\n');
      process.stderr.write('  --escala=<fator>        Fator multiplicador explícito\n');
      process.stderr.write('  --sobrescrever          Sobrescreve arquivo de destino existente\n');
      process.stderr.write('  --com-textura           Gera as imagens dos materiais e o .mtl ao lado do .obj (exige modulos/textura)\n');
      process.stderr.write('  --somente-validar       Apenas valida a receita e malha sem gravar\n');
      process.stderr.write('  --opcao=<n>             Com um esboço 2.0 (.esboco.mjs ou .esboco.json), a opção a exportar (padrão 1)\n');
      process.stderr.write('  --sem-cache             Monta o esboço ou a receita de novo, sem ler a montagem guardada em tmp/cache-de-medida/\n');
      process.stderr.write('  --pular-face-sem-area   Pula, com aviso e a lista das faces, a face que não se triangula sem triângulo de área nula\n');
      process.stderr.write('  --diagnostico=json      Emite diagnóstico detalhado em JSON no stdout\n');
      process.exit(1);
    }

    const res = await exportarArquivoObj(opcoes);

    if (res.facesPuladas?.length || res.diagnostico?.facesPuladas?.length) {
      const puladas = res.facesPuladas?.length ? res.facesPuladas : res.diagnostico.facesPuladas;
      process.stderr.write(`Aviso: ${puladas.length} face(s) sem triangulação válida ficaram fora do arquivo: ${puladas.map((f) => `${f.face} (${f.parte ?? 'sem parte'}, ${f.vertices} cantos)`).join(', ')}\n`);
    }

    if (opcoes.somenteValidar) {
      if (opcoes.diagnosticoJson) {
        process.stdout.write(JSON.stringify(res.diagnostico, null, 2) + '\n');
      } else {
        process.stdout.write(`Validação concluída com sucesso para '${res.diagnostico.nome}'.\n`);
        process.stdout.write(`Corpos: ${res.diagnostico.corpos.length} | Vértices: ${res.diagnostico.vertices} | Faces: ${res.diagnostico.facesOriginais}\n`);
      }
      return;
    }

    if (opcoes.diagnosticoJson) {
      process.stdout.write(JSON.stringify({
        arquivo: res.caminhoRelativo,
        bytes: res.tamanhoBytes,
        diagnostico: res.diagnostico,
      }, null, 2) + '\n');
    } else {
      process.stdout.write(`Exportação Wavefront OBJ concluída com sucesso!\n`);
      process.stdout.write(`Destino:  ${res.caminhoRelativo} (${(res.tamanhoBytes / 1024).toFixed(1)} KB)\n`);
      process.stdout.write(`Unidade:  ${res.diagnostico.unidade} (escala x${res.diagnostico.escala})\n`);
      process.stdout.write(`Corpos:   ${res.diagnostico.totalCorpos}\n`);
      process.stdout.write(`Vértices: ${res.diagnostico.totalVertices}\n`);
      process.stdout.write(`Faces:    ${res.diagnostico.totalTriangulos} triângulos\n`);
      for (const arquivo of res.arquivosTextura) {
        process.stdout.write(`Textura:  ${arquivo}\n`);
      }
    }
  } catch (err) {
    process.stderr.write(`Erro: ${err.message}\n`);
    process.exit(1);
  }
}

const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (executadoDireto) {
  main();
}
