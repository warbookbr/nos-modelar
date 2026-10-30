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
 * Uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--saida=<pasta>] */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { latariaDaReceita, partesDaLataria } from '../../src/autoria/lataria.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
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
 * subdivisão, ou nenhuma (a malha inteira é lataria). `executar` troca o `spawnSync` no teste.
 */
export async function vistasDeSuperficie(peca, { pasta, blender = doAmbiente('BLENDER'), lataria = null, executar = spawnSync } = {}) {
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
  if (!partes) {
    const { neutro } = executarReceita(receitaDoModulo(await importarReceita(caminho)));
    partes = partesDaLataria(neutro);
  }
  const prefixo = join(destino, 'peca-');
  const vistas = ['--vista', VISTAS_DE_SUPERFICIE.join(',')];
  rodarBlender(blender, 'luz-rasante.py', ['--malha', obj, '--saida', prefixo, ...vistas], executar);
  rodarBlender(blender, 'curvatura-da-lataria.py', ['--malha', obj, '--saida', prefixo, ...vistas, ...(partes.length ? ['--lataria', partes.join(',')] : [])], executar);
  const rasante = JSON.parse(readFileSync(`${prefixo}rasante.json`, 'utf8')).imagens
    .map((i) => ({ arquivo: i.arquivos.malha, vista: i.vista, azimute: i.azimute }));
  const curvatura = JSON.parse(readFileSync(`${prefixo}curvatura.json`, 'utf8')).imagens
    .map((i) => ({ arquivo: i.legenda, vista: i.vista }));
  const faltam = [...rasante, ...curvatura].map((i) => i.arquivo).filter((a) => !existsSync(a));
  if (!rasante.length || !curvatura.length || faltam.length) {
    throw new Error(`as vistas de superfície de '${peca}' não saíram inteiras (${rasante.length} da luz rasante, ${curvatura.length} da curvatura${faltam.length ? `; faltam ${faltam.join(', ')}` : ''}).`);
  }
  return { obj, partes, rasante, curvatura };
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
    superficie: superficie ? { rasante: superficie.rasante.map((i) => i.arquivo), curvatura: superficie.curvatura.map((i) => i.arquivo) } : null,
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
    lido = lerArgumentos(argv.slice(2), { opcoes: ['saida'], posicional: { nome: 'a peça', obrigatorio: true } });
  } catch (erro) {
    process.stderr.write(`uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--saida=<pasta>]\n${erro.message}\n`);
    return 2;
  }
  const peca = lido.posicional;
  const pasta = lido.opcao('saida') ?? join(SAIDA_PADRAO, `superficie-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
  const lataria = await latariaDaPeca(peca);
  const feitas = await vistasDeSuperficie(peca, { pasta, lataria });
  const linhas = [
    `vistas:superficie — ${peca}`,
    `lataria: ${lataria.lataria ? 'sim' : 'não'} (${lataria.porque}); partes de lataria na curvatura: ${feitas.partes.length ? feitas.partes.join(', ') : 'a malha inteira'}`,
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
