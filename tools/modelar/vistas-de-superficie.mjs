#!/usr/bin/env node
/* vistas-de-superficie.mjs — a luz rasante e a curvatura da lataria de uma peça, e a conferência de que o pacote do crítico as trouxe.
 *
 * POR QUE ELE EXISTE. As duas vistas de `tools/blender/` (fatia 13 do plano de ajustes no núcleo) mostram o amassado largo e raso e a
 * quina que ondula, que passam por todas as medidas e pela vista comum da bancada. A instrução mandava usá-las e nada obrigava a
 * rodá-las. Por decisão da pessoa em 2026-10-30, a peça de lataria (`src/autoria/lataria.js`) não fecha a rodada de forma sem as duas
 * no pacote do crítico: `vistas:critica` as gera com o resto do pacote e grava, na pasta da rodada, o `pacote.json` que diz o que o
 * pacote trouxe e de que versão da receita; o registro da rodada (`rodada-de-modelagem --registrar`) recusa o veredito do crítico de
 * peça de lataria cujo pacote não as trouxe, e a ação do laço não dá a peça por fechada sem elas.
 *
 * COMO AS VISTAS SAEM. A peça é exportada em OBJ na pasta da rodada (`exportar:obj`, uma parte por objeto), e o Blender roda
 * `luz-rasante.py` e `curvatura-da-lataria.py` nas vistas de frente, de lado, de cima e de três quartos, com as partes de lataria em
 * `--lataria`: as declaradas em `PLANO.lataria`, ou as que têm face nascida de passo `subdivisao`; as outras (frisos, calhas, abas)
 * saem em cinza na curvatura e fora da escala dela. O Blender vem de `MODELAR_BLENDER`.
 *
 * A FAIXA DOS VINCOS. Os vincos nomeados que os passos `subdivisao` declaram (os da gaiola, os da rede de curvas e os das estações)
 * são a dobra que a forma pede, e a curvatura deles, de 10 1/m ou mais depois da média, esticava a escala da cor: na carenagem de
 * prova o vinco da cintura e o ombro a levavam a 11,1 1/m, e um amassado de 1 1/m saía quase branco. Por decisão da pessoa em
 * 2026-10-30, as vistas obrigatórias passam os vincos à curvatura (`--vincos`), que pinta de ocre a lataria junto deles e a tira da
 * escala, com a faixa escrita na legenda; `--sem-faixa-dos-vincos` volta à escala da lataria inteira.
 *
 * Uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--saida=<pasta>] [--faixa-mm=<mm> | --sem-faixa-dos-vincos] */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { latariaDaReceita, partesDaLataria } from '../../src/autoria/lataria.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';
import { idDoPasso } from '../../procedural/nucleo/nucleo.js';
import { gaiolaDoPasso } from '../../procedural/nucleo/operacoes/subdivisao.js';
import { subdividirCatmullClark } from '../../procedural/nucleo/subdivisao.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { doAmbiente } from '../ambiente.mjs';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const BLENDER_TOOLS = join(REPO, 'tools/blender');
export const SAIDA_PADRAO = join(REPO, 'tools/bancadas/out');

/** A pasta da rodada de uma peça: `critica-<peça>` ao lado das capturas da bancada. */
export function pastaDaRodada(peca, base = SAIDA_PADRAO) {
  return join(base, `critica-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
}

/* As vistas de `vistas_padrao` (tools/blender/comum.py) que vão ao crítico, com o lado de onde olham: a de trás fica fora porque a
   lataria de uma carroceria simétrica se repete nela, e a luz rasante só é rasante para o painel que a câmera enfrenta. */
export const VISTAS_DE_SUPERFICIE = Object.freeze(['frente', 'lado', 'topo', 'tresquartos']);
export const LADO_DA_VISTA_DE_SUPERFICIE = Object.freeze({
  frente: 'olha de +z para -z, com +y para cima',
  lado: 'olha de +x para -x, com +y para cima',
  topo: 'olha de +y para baixo, com a frente (+z) embaixo da imagem',
  tresquartos: 'olha de +x, +y e +z ao mesmo tempo, com +y para cima',
});
export const PASTA_DA_SUPERFICIE = 'superficie';
export const MANIFESTO_DO_PACOTE = 'pacote.json';
export const FORMATO_DO_MANIFESTO = 'modelar.pacote-do-critico';

/** O comando que gera o pacote do crítico com as duas vistas, para as mensagens de recusa. */
export const comandoDoPacote = (peca) => `MODELAR_BLENDER=<caminho do Blender> npm run vistas:critica -- ${peca}`;
/** O comando que gera só as duas vistas, para quem modela olhar antes do crítico. */
export const comandoDasVistas = (peca) => `MODELAR_BLENDER=<caminho do Blender> npm run vistas:superficie -- ${peca}`;

export const impressaoDoTexto = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;

/**
 * Se a peça é de lataria, pela receita (sem executar): `{ lataria, porque, partes }` de `latariaDaReceita`, com o caminho e o
 * texto da receita lida.
 */
export async function latariaDaPeca(peca) {
  const caminho = resolverCaminhoReceita(peca);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const plano = normalizarPlanoDeModelagem(receita?.PLANO);
  return { ...latariaDaReceita(receita, plano), caminho };
}

/** A recusa de gerar as vistas sem Blender, com o comando. */
export function mensagemSemBlender(peca, lataria) {
  return `a peça '${peca}' é de lataria (${lataria.porque}), e o pacote do crítico de peça de lataria leva a luz rasante e a curvatura `
    + 'da lataria, que saem do Blender; MODELAR_BLENDER não aponta o executável. Rode '
    + `\`${comandoDoPacote(peca)}\`, que gera o pacote inteiro com as duas vistas (só elas saem de \`${comandoDasVistas(peca)}\`).`;
}

/* ---------- os vincos declarados, na malha entregue ---------- */

const chaveDaAresta = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
const operacaoDe = (passo) => (Array.isArray(passo) ? passo[0] : passo?.op);
const argumentosDe = (passo) => (Array.isArray(passo) ? passo[1] ?? {} : passo ?? {});

function distanciaAoSegmento(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = L > 0 ? Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L)) : 0;
  return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]);
}

/**
 * Os vincos nomeados dos passos `subdivisao` (os da gaiola declarada e os que a rede ou as estações escrevem no passo), onde eles
 * ficaram na malha entregue: `[{ passo, nome, viva, segmentos: [[p, q], ...] }]`, em metro, ordenados por passo e nome. Os
 * segmentos são as arestas da malha final que descendem de um vinco de nitidez maior que zero (`subdividirCatmullClark` com
 * `comVincos`), com a posição que o estado da receita deu aos vértices, de modo que um passo posterior que mova a chapa os leva
 * junto; a aresta cujo vértice um passo posterior tirou fica de fora. Cada aresta leva o nome do vinco declarado cujo trecho da
 * gaiola fica mais perto do meio dela (na simetria em x, a imagem espelhada leva o mesmo nome). É a feição que a forma pede, e a
 * curvatura da lataria a tira da escala dela (`curvatura-da-lataria.py --vincos`).
 */
export function vincosDaMalha(receita, executada = executarReceita(receita)) {
  const { entrada, neutro } = executada;
  const dict = { ...entrada.PARAMS, ...entrada.TOPO };
  const { num } = criarResolverNumerico(dict);
  const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
  const saida = [];
  (entrada.PASSOS ?? []).forEach((passo, i) => {
    const args = argumentosDe(passo);
    if (operacaoDe(passo) !== 'subdivisao' || !Array.isArray(args.vincos) || !args.vincos.length) return;
    const resolvida = gaiolaDoPasso(args, { vec, num });
    if (resolvida.erro) throw new Error(`vincosDaMalha: o passo ${i} (subdivisao) não resolve a gaiola: ${resolvida.erro[1]}`);
    const { gaiola, declarados } = resolvida;
    /* os trechos da gaiola de cada vinco nomeado, com as imagens espelhadas */
    const indiceDoNome = new Map(declarados.map((d, k) => [d, k]).filter(([d]) => typeof d === 'string'));
    const trechos = [];
    for (const v of args.vincos) {
      if (!v || typeof v !== 'object' || !Array.isArray(v.pontos)) continue;
      const ids = v.pontos.map((p) => indiceDoNome.get(p));
      for (let k = 0; k + 1 < ids.length; k++) {
        const pares = [[ids[k], ids[k + 1]]];
        if (gaiola.imagem) pares.push([gaiola.imagem[ids[k]], gaiola.imagem[ids[k + 1]]]);
        for (const [a, b] of pares) trechos.push({ nome: v.nome, a: gaiola.vertices[a], b: gaiola.vertices[b] });
      }
    }
    const r = subdividirCatmullClark({ ...gaiola, niveis: Math.trunc(num(args.niveis ?? 2)), borda: args.borda ?? 'suave', aoLimite: args.medidas != null, comVincos: true });
    const porNome = new Map();
    const vistas = new Set();
    for (const [a, b, viva] of r.vincos) {
      const chave = chaveDaAresta(a, b);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      const p = neutro.V.get(idDoPasso(i, a));
      const q = neutro.V.get(idDoPasso(i, b));
      if (!p || !q) continue;
      const meio = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      let nome = null;
      let perto = Infinity;
      for (const t of trechos) {
        const d = distanciaAoSegmento(meio, t.a, t.b);
        if (d < perto) { perto = d; nome = t.nome; }
      }
      if (!porNome.has(nome)) porNome.set(nome, { passo: i, nome, viva: true, segmentos: [] });
      const item = porNome.get(nome);
      item.viva &&= Boolean(viva);
      item.segmentos.push([[...p], [...q]]);
    }
    saida.push(...[...porNome.values()].sort((x, y) => (x.nome < y.nome ? -1 : x.nome > y.nome ? 1 : 0)));
  });
  return saida;
}

function rodarBlender(blender, script, args, executar) {
  const r = executar(blender, ['-b', '--factory-startup', '--python', join(BLENDER_TOOLS, script), '--', ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.error) throw new Error(`o Blender (${blender}) não rodou ${script}: ${r.error.message}`);
  if (r.status !== 0) {
    const saida = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n');
    throw new Error(`${script} saiu com ${r.status}:\n${saida}`);
  }
}

/**
 * Gera as duas vistas da peça em `<pasta>/superficie/`: exporta o OBJ, roda a luz rasante e a curvatura da lataria e devolve
 * `{ obj, partes, rasante: [{ arquivo, vista, azimute }], curvatura: [{ arquivo, vista }] }`, com a curvatura na imagem com a legenda
 * da escala. `partes` são as partes de lataria passadas à curvatura: as de `lataria.partes`, ou as que a malha diz que nasceram de
 * subdivisão, ou nenhuma (a malha inteira é lataria). Com `faixaDosVincos` (o padrão das vistas do pacote do crítico), os vincos
 * declarados dos passos `subdivisao` (`vincosDaMalha`) vão à curvatura em `--vincos`, e a lataria junto deles sai em ocre e fora
 * da escala (`faixaMm`, ou o padrão do script, o dobro do raio da média); `faixa` devolve `{ larguraMm, vincos, escala, escalaComAFaixa }`,
 * ou null quando a peça não tem vinco declarado ou a opção está desligada. `executar` troca o `spawnSync` no teste.
 */
export async function vistasDeSuperficie(peca, {
  pasta, blender = doAmbiente('BLENDER'), lataria = null, faixaDosVincos = true, faixaMm = null, executar = spawnSync,
} = {}) {
  const decidida = lataria ?? await latariaDaPeca(peca);
  if (!blender) {
    throw new Error(decidida.lataria ? mensagemSemBlender(peca, decidida)
      : `as vistas de superfície saem do Blender, e MODELAR_BLENDER não aponta o executável: rode \`${comandoDasVistas(peca)}\`.`);
  }
  const caminho = resolverCaminhoReceita(peca);
  const destino = join(resolve(pasta), PASTA_DA_SUPERFICIE);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  const obj = join(destino, 'peca.obj');
  const { exportarArquivoObj } = await import('./exportar-obj.mjs');
  await exportarArquivoObj({ arquivo: caminho, saida: obj, sobrescrever: true });
  let partes = decidida.partes ?? null;
  let executada = null;
  const receitaExecutada = async () => (executada ??= executarReceita(receitaDoModulo(await importarReceita(caminho))));
  if (!partes) partes = partesDaLataria((await receitaExecutada()).neutro);
  const argsDaFaixa = [];
  if (faixaDosVincos) {
    const vincos = vincosDaMalha(null, await receitaExecutada());
    if (vincos.length) {
      const arquivo = join(destino, 'vincos.json');
      writeFileSync(arquivo, `${JSON.stringify({ vincos })}\n`, 'utf8');
      argsDaFaixa.push('--vincos', arquivo, ...(faixaMm != null ? ['--faixa-mm', String(faixaMm)] : []));
    }
  }
  const prefixo = join(destino, 'peca-');
  const vistas = ['--vista', VISTAS_DE_SUPERFICIE.join(',')];
  rodarBlender(blender, 'luz-rasante.py', ['--malha', obj, '--saida', prefixo, ...vistas], executar);
  rodarBlender(blender, 'curvatura-da-lataria.py', [
    '--malha', obj, '--saida', prefixo, ...vistas, ...(partes.length ? ['--lataria', partes.join(',')] : []), ...argsDaFaixa,
  ], executar);
  const rasante = JSON.parse(readFileSync(`${prefixo}rasante.json`, 'utf8')).imagens
    .map((i) => ({ arquivo: i.arquivos.malha, vista: i.vista, azimute: i.azimute }));
  const resumo = JSON.parse(readFileSync(`${prefixo}curvatura.json`, 'utf8'));
  const curvatura = resumo.imagens.map((i) => ({ arquivo: i.legenda, vista: i.vista }));
  const f = resumo.faixa_dos_vincos ?? null;
  const faixa = f ? { larguraMm: f.largura_mm, vincos: f.vincos, escala: resumo.escala_1_m, escalaComAFaixa: f.escala_com_a_faixa_1_m } : null;
  const faltam = [...rasante, ...curvatura].map((i) => i.arquivo).filter((a) => !existsSync(a));
  if (!rasante.length || !curvatura.length || faltam.length) {
    throw new Error(`as vistas de superfície de '${peca}' não saíram inteiras (${rasante.length} da luz rasante, ${curvatura.length} da curvatura${faltam.length ? `; faltam ${faltam.join(', ')}` : ''}).`);
  }
  return { obj, partes, rasante, curvatura, faixa };
}

/* ---------- o manifesto do pacote ---------- */

/**
 * Grava `pacote.json` na pasta da rodada: a peça, a impressão do texto da receita que o pacote mostra, se ela é de lataria e as
 * imagens das duas vistas (ou null). É o que o registro da rodada lê para saber se o crítico recebeu as vistas da versão medida.
 */
export function gravarManifesto(pasta, { peca, receita, lataria = null, superficie = null }) {
  const dado = {
    formato: FORMATO_DO_MANIFESTO,
    versao: 1,
    peca,
    receita,
    lataria: lataria?.lataria ? { porque: lataria.porque, partes: superficie?.partes ?? lataria.partes ?? null } : null,
    superficie: superficie ? {
      rasante: superficie.rasante.map((i) => i.arquivo), curvatura: superficie.curvatura.map((i) => i.arquivo), faixaDosVincos: superficie.faixa ?? null,
    } : null,
  };
  const arquivo = join(pasta, MANIFESTO_DO_PACOTE);
  writeFileSync(arquivo, `${JSON.stringify(dado, null, 2)}\n`, 'utf8');
  return arquivo;
}

/**
 * Se o pacote da pasta trouxe as duas vistas da versão `sha256` da receita de `peca`: `{ ok: true, imagens }` (os nomes das
 * imagens) ou `{ ok: false, motivo }`, com o motivo em texto para a mensagem de recusa.
 */
export function superficieDoPacote(peca, { pasta, sha256 }) {
  const arquivo = join(pasta, MANIFESTO_DO_PACOTE);
  if (!existsSync(arquivo)) return { ok: false, motivo: `a pasta da rodada ${pasta} não tem o ${MANIFESTO_DO_PACOTE} que o vistas:critica grava com o pacote` };
  let dado;
  try { dado = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) { return { ok: false, motivo: `${arquivo} não é JSON válido (${erro.message})` }; }
  if (dado?.formato !== FORMATO_DO_MANIFESTO) return { ok: false, motivo: `${arquivo} não é o manifesto do pacote do crítico` };
  if (dado.peca !== peca) return { ok: false, motivo: `o pacote de ${pasta} é da peça '${dado.peca}'` };
  if (dado.receita !== sha256) {
    return { ok: false, motivo: `o pacote de ${pasta} mostra outra versão da receita (${String(dado.receita).slice(7, 15)}) que a medida agora (${String(sha256).slice(7, 15)})` };
  }
  const { rasante = [], curvatura = [] } = dado.superficie ?? {};
  if (!rasante.length || !curvatura.length) return { ok: false, motivo: `o pacote de ${pasta} não trouxe a luz rasante e a curvatura da lataria` };
  const faltam = [...rasante, ...curvatura].filter((a) => !existsSync(a));
  if (faltam.length) return { ok: false, motivo: `o pacote de ${pasta} cita imagens de superfície que não existem mais (${faltam.map((a) => basename(a)).join(', ')})` };
  return { ok: true, imagens: [...rasante, ...curvatura].map((a) => basename(a)) };
}

/* ---------- a linha de comando ---------- */

async function principal(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv.slice(2), { opcoes: ['saida', 'faixa-mm'], bandeiras: ['sem-faixa-dos-vincos'], posicional: { nome: 'a peça', obrigatorio: true } });
  } catch (erro) {
    process.stderr.write(`uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--saida=<pasta>] [--faixa-mm=<mm> | --sem-faixa-dos-vincos]\n${erro.message}\n`);
    return 2;
  }
  const peca = lido.posicional;
  const pasta = lido.opcao('saida') ?? join(SAIDA_PADRAO, `superficie-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
  const faixaDosVincos = !lido.bandeira('sem-faixa-dos-vincos');
  const faixaMm = lido.opcao('faixa-mm') == null ? null : Number(lido.opcao('faixa-mm'));
  if (faixaMm != null && !(faixaMm > 0)) throw new Error(`--faixa-mm precisa ser número maior que zero, e veio '${lido.opcao('faixa-mm')}'`);
  if (faixaMm != null && !faixaDosVincos) throw new Error('--faixa-mm e --sem-faixa-dos-vincos juntas: a largura só vale com a faixa');
  const lataria = await latariaDaPeca(peca);
  const feitas = await vistasDeSuperficie(peca, { pasta, lataria, faixaDosVincos, faixaMm });
  const { faixa } = feitas;
  const linhas = [
    `vistas:superficie — ${peca}`,
    `lataria: ${lataria.lataria ? 'sim' : 'não'} (${lataria.porque}); partes de lataria na curvatura: ${feitas.partes.length ? feitas.partes.join(', ') : 'a malha inteira'}`,
    faixa
      ? `faixa dos vincos fora da escala: ${faixa.larguraMm} mm de ${faixa.vincos.join(', ')}; escala ${faixa.escala} 1/m (com a faixa seria ${faixa.escalaComAFaixa} 1/m)`
      : `faixa dos vincos: ${faixaDosVincos ? 'nenhuma (a peça não declara vinco)' : 'desligada (--sem-faixa-dos-vincos)'}`,
    '', 'LUZ RASANTE:', ...feitas.rasante.map((i) => `  ${i.arquivo}`),
    '', 'CURVATURA DA LATARIA:', ...feitas.curvatura.map((i) => `  ${i.arquivo}`),
  ];
  process.stdout.write(`${linhas.join('\n')}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`vistas-de-superficie: ${erro.message}\n`);
    process.exitCode = 1;
  });
}
