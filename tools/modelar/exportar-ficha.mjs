/* exportar-ficha.mjs — CLI que exporta a ficha de um objeto montado para a ponte com o nos-mecatronica: a malha em .glb, com um
   nó por instância no identificador da ficha, e a ficha em JSON (esquema 1.1), conferida pela cópia do esquema antes de gravar.
   Uso: npm run exportar:ficha -- <objeto> [--ponte=<arquivo>] [--saida=<pasta>] */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exportarMontagemGltf } from '../../modulos/exportador-gltf/src/index.js';
import { portasPublicadas } from '../../src/autoria/descrever-partes.js';
import { conferirDocumento, idDaFicha, montarFicha, propriedadesDeMassa, textoDosErros } from '../../modulos/ficha-do-objeto/src/index.js';
import { validarMalhaObj } from '../../modulos/exportador-obj/src/validar-malha.js';
import { portasDoComponente } from '../../procedural/familias/componente-eletronico/portas-eletricas.js';
import { REPO, instanciasDaMontagem, resolverMontagemDeArquivo } from './exportar-gltf.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const USO = 'Uso: npm run exportar:ficha -- <objeto> [--ponte=<arquivo>] [--saida=<pasta>]\n'
  + '  <objeto>            o objeto montado: a pasta de procedural/pecas/<objeto> com montagem.json e ponte.json\n'
  + '  --ponte=<arquivo>   a declaração da ponte (padrão: procedural/pecas/<objeto>/ponte.json)\n'
  + '  --saida=<pasta>     onde gravar <objeto>.glb e <objeto>.ficha.json (padrão: exportacoes/ficha/<objeto>/)\n';

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = { objeto: null, ponte: null, saida: null, ajuda: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const [nome, valor] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (nome === '--ajuda' || nome === '--help') opcoes.ajuda = true;
    else if (nome === '--ponte' || nome === '--saida') {
      const v = valor ?? args[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${nome} pede um valor.\n${USO}`);
      if (valor === undefined) i += 1;
      opcoes[nome.slice(2)] = v;
    } else if (arg.startsWith('--')) throw new Error(`opção desconhecida '${arg}'.\n${USO}`);
    else if (!opcoes.objeto) opcoes.objeto = arg;
    else throw new Error(`argumento a mais '${arg}'.\n${USO}`);
  }
  return opcoes;
}

const absoluto = (p) => (isAbsolute(p) ? resolve(p) : resolve(process.cwd(), p));
const gravar = (caminho, conteudo) => { writeFileSync(`${caminho}.tmp`, conteudo); renameSync(`${caminho}.tmp`, caminho); };

/* As placas declaradas que a ponte do objeto cita (`placas: [{ instancia, exportacao, portas }]`): a função `exportacao` da receita
   da instância devolve a placa gerada (`{ pecas }`, como `placaDeclarada`); cada peça dela vira um componente da ficha, e as
   portas elétricas saem da tabela da família com os blocos declarados em `portas`. */
async function placasDaPonte(declaracao, porNome) {
  const componentes = []; const portas = []; const semTipo = []; const partes = new Map(); const cobre = {};
  for (const [k, pl] of (declaracao.placas ?? []).entries()) {
    const inst = porNome.get(pl.instancia);
    if (!inst) throw new Error(`ponte.json: placas[${k}].instancia é '${pl.instancia}', que a montagem não tem.`);
    const modulo = await import(pathToFileURL(resolverCaminhoReceita(inst.alvo.ref, { raiz: REPO })).href);
    if (typeof modulo[pl.exportacao] !== 'function') throw new Error(`ponte.json: placas[${k}].exportacao '${pl.exportacao}' não é função exportada pela receita '${inst.alvo.ref}'.`);
    const { pecas, declaracao: daPlaca } = modulo[pl.exportacao]();
    if (daPlaca?.cobre?.redes) cobre[daPlaca.id ?? 'placa'] = { redes: daPlaca.cobre.redes };
    const F = inst.definicao.neutro.F;
    const nomesDasPartes = new Set([...(F instanceof Map ? F.values() : Object.values(F))].map((f) => f.parte));
    const declaradas = { ...(pl.portas ?? {}) };
    for (const p of pecas) {
      if (!nomesDasPartes.has(p.id)) throw new Error(`a placa de '${pl.instancia}' tem a peça '${p.id}', que a malha da instância não tem como parte; a receita e a montagem divergem.`);
      componentes.push({ id: p.id, instancia: pl.instancia, ...(p.nome ? { nome: p.nome } : {}), familia: p.familia, variante: p.variante, posicao: p.posicao, orientacao: p.orientacao });
      partes.set(p.id, pl.instancia);
      if (!p.terminais) continue;
      const r = portasDoComponente(p, declaradas[p.id]);
      delete declaradas[p.id];
      portas.push(...r.portas);
      semTipo.push(...r.semTipo.map((t) => `${p.id}.${t}`));
    }
    const sobra = Object.keys(declaradas);
    if (sobra.length) throw new Error(`ponte.json: placas[${k}].portas cita ${sobra.join(', ')}, que a placa de '${pl.instancia}' não tem.`);
  }
  return { componentes, portas, semTipo, partes, cobre };
}

/* A malha de cada instância que carrega componentes, separada por parte: um nó por componente, com a pose da instância, e o resto
   no nó da instância. O exportador não muda; ele só recebe mais instâncias. */
function separarPorParte(instancias, partes) {
  const saida = [];
  for (const inst of instancias) {
    const minhas = [...partes].filter(([, dona]) => dona === inst.nome).map(([id]) => id);
    if (!minhas.length) { saida.push({ ...inst, nome: idDaFicha(inst.nome) }); continue; }
    const F = inst.neutro.F instanceof Map ? [...inst.neutro.F] : Object.entries(inst.neutro.F);
    const grupos = new Map([[idDaFicha(inst.nome), []], ...minhas.map((id) => [id, []])]);
    for (const [chave, f] of F) grupos.get(minhas.includes(f.parte) ? f.parte : idDaFicha(inst.nome)).push([chave, f]);
    for (const [nome, faces] of grupos) if (faces.length) saida.push({ ...inst, nome, neutro: { ...inst.neutro, F: new Map(faces) } });
  }
  return saida;
}

/* A massa de cada peça da malha separada, pela densidade do material que a ponte do objeto dá à instância (ou às placas), com o
   centro e o tensor no referencial da instância, em mm, g e g·mm². Sem `materiais` na ponte, nenhuma massa. */
function massasDasPecas(separadas, partes, declaracao) {
  const { materiais, materialDasInstancias = {}, materialDasPlacas = null } = declaracao;
  if (!materiais) return {};
  const ler = (nome, onde) => {
    const m = materiais[nome];
    if (!m || typeof m.densidade !== 'number' || m.densidade <= 0) throw new Error(`ponte.json: ${onde} cita o material '${nome}', que não está em materiais com densidade em g/cm³.`);
    return m;
  };
  const porFicha = new Map(Object.entries(materialDasInstancias).filter(([k]) => k !== 'padrao').map(([k, v]) => [idDaFicha(k), v]));
  const massas = {};
  for (const s of separadas) {
    const nome = partes.has(s.nome) ? materialDasPlacas : (porFicha.get(s.nome) ?? materialDasInstancias.padrao);
    if (!nome) continue;
    const material = ler(nome, partes.has(s.nome) ? 'materialDasPlacas' : `materialDasInstancias (${s.nome})`);
    const malha = validarMalhaObj(s.neutro, { tolerancia: 0.001 });
    const ponto = (id) => malha.vertices.get(id).map((x) => x * 1000);
    const triangulos = malha.faces.flatMap((f) => f.triangulos.map((tri) => tri.map(ponto)));
    const m = propriedadesDeMassa(triangulos, material.densidade / 1000);
    if (m) massas[s.nome] = { ...m, nota: `volume da malha (${Number(m.volume.toFixed(0))} mm³) vezes ${material.densidade} g/cm³ (${nome})` };
  }
  return massas;
}

/** Os triângulos de cada peça da ficha no referencial da montagem, em mm, a partir das instâncias separadas por parte. */
export function malhasNaMontagem(separadas) {
  const malhas = new Map();
  for (const s of separadas) {
    const malha = validarMalhaObj(s.neutro, { tolerancia: 0.001 });
    const { rotacao: r, deslocamento: d } = s.pose;
    const mundo = new Map([...malha.vertices].map(([id, p]) => [id, [0, 1, 2].map((k) => (r[k][0] * p[0] + r[k][1] * p[1] + r[k][2] * p[2] + d[k]) * 1000)]));
    malhas.set(s.nome, malha.faces.flatMap((f) => f.triangulos.map((tri) => tri.map((id) => mundo.get(id)))));
  }
  return malhas;
}

/** Exporta a ficha e a malha do objeto. Devolve `{ ficha, caminhoFicha, caminhoMalha, semTipo, separadas, placas }`; recusa a ficha que a cópia do esquema recusa. */
export async function exportarFicha({ objeto, ponte = null, saida = null }) {
  if (!objeto) throw new Error(`Informe o objeto.\n${USO}`);
  const pasta = resolve(REPO, 'procedural/pecas', objeto);
  const caminhoMontagem = resolve(pasta, 'montagem.json');
  if (!existsSync(caminhoMontagem)) throw new Error(`o objeto '${objeto}' não tem montagem.json em ${relative(REPO, pasta)}; a ficha sai de um objeto montado.`);
  const caminhoPonte = ponte ? absoluto(ponte) : resolve(pasta, 'ponte.json');
  if (!existsSync(caminhoPonte)) throw new Error(`falta a declaração da ponte em ${relative(REPO, caminhoPonte)}: os conjuntos e as juntas do objeto (veja modulos/ficha-do-objeto/README.md).`);
  const declaracao = JSON.parse(readFileSync(caminhoPonte, 'utf8'));
  const destino = saida ? absoluto(saida) : resolve(REPO, 'exportacoes/ficha', objeto);

  const resolvida = await resolverMontagemDeArquivo(caminhoMontagem);
  const instancias = instanciasDaMontagem(resolvida);
  const porNome = new Map();
  const percorrer = (m) => { for (const i of m.instancias) { if (i.alvo.tipo === 'montagem') percorrer(i.montagem); else porNome.set(i.caminho.join('/'), i); } };
  percorrer(resolvida);

  const { componentes, portas: portasEletricas, semTipo, partes, cobre } = await placasDaPonte(declaracao, porNome);

  /* a malha: um nó por peça da ficha, com o identificador dela */
  const nomeDaMalha = `${objeto}.glb`;
  const separadas = separarPorParte(instancias, partes);
  const { bytes, diagnostico } = exportarMontagemGltf({ nome: resolvida.id, instancias: separadas });
  const massas = massasDasPecas(separadas, partes, declaracao);
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const inst of instancias) {
    const { rotacao, deslocamento } = inst.pose;
    const vs = inst.neutro.V instanceof Map ? inst.neutro.V.values() : Object.values(inst.neutro.V);
    for (const p of vs) {
      for (let k = 0; k < 3; k += 1) {
        const x = (rotacao[k][0] * p[0] + rotacao[k][1] * p[1] + rotacao[k][2] * p[2] + deslocamento[k]) * 1000;
        if (x < min[k]) min[k] = x; if (x > max[k]) max[k] = x;
      }
    }
  }

  const ficha = montarFicha({
    declaracao,
    instancias: instancias.map((i) => ({
      id: i.nome,
      ref: porNome.get(i.nome).alvo.ref,
      pose: i.pose,
      portas: portasPublicadas(porNome.get(i.nome).definicao.neutro).map((p) => ({ id: p.id, interface: p.interface })),
    })),
    malha: { caminho: nomeDaMalha, caixa: { min, max }, faces: diagnostico.triangulos },
    componentes,
    portasEletricas,
    massas,
  });
  const conferida = conferirDocumento(ficha);
  if (conferida.erros.length) throw new Error(`a ficha montada não passa na cópia do esquema:\n${textoDosErros(conferida)}`);

  mkdirSync(destino, { recursive: true });
  const caminhoMalha = resolve(destino, nomeDaMalha);
  const caminhoFicha = resolve(destino, `${objeto}.ficha.json`);
  gravar(caminhoMalha, bytes);
  gravar(caminhoFicha, `${JSON.stringify(ficha, null, 2)}\n`);
  return { ficha, caminhoFicha, caminhoMalha, semTipo, separadas, placas: cobre };
}

async function main() {
  try {
    const opcoes = parseArgs();
    if (opcoes.ajuda || !opcoes.objeto) { process.stdout.write(USO); process.exit(opcoes.ajuda ? 0 : 1); }
    const { ficha, caminhoFicha, caminhoMalha, semTipo } = await exportarFicha(opcoes);
    const ausentes = JSON.stringify(ficha).match(/"ausente":true/g)?.length ?? 0;
    process.stdout.write(`Ficha ${ficha.objeto} revisão ${ficha.revisao} (esquema ${ficha.versao}), conferida pela cópia do esquema.\n`);
    process.stdout.write(`Ficha:   ${relative(REPO, caminhoFicha)}\nMalha:   ${relative(REPO, caminhoMalha)} (${ficha.malha.faces.valor} triângulos)\n`);
    process.stdout.write(`Peças ${ficha.pecas.length}, conjuntos ${ficha.conjuntos.length}, juntas ${ficha.juntas.length}, portas ${ficha.portas.length}; ${ausentes} valor(es) ausente(s), com o motivo.\n`);
    process.stdout.write(semTipo.length ? `Terminais sem tipo, fora da ficha (${semTipo.length}): ${semTipo.join(', ')}. Declare-os em placas[].portas da ponte do objeto.\n` : 'Todos os terminais elétricos têm tipo.\n');
  } catch (err) {
    process.stderr.write(`Erro: ${err.message}\n`);
    process.exit(1);
  }
}

const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (executadoDireto) main();
