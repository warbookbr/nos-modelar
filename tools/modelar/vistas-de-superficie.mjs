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
 * A LUZ QUE ALCANÇA A CHAPA. Com a luz de 30 e 120 graus em todas as vistas, a de três quartos da carenagem de prova a 30 graus saía com
 * 0,5 % da peça iluminada: a luz vinha de um lado que a câmera não via, e o crítico recebia uma imagem preta com traços de borda (a chapa
 * de `tools/fixtures/lataria-de-prova/` saía assim em seis das oito imagens). Por
 * decisão da pessoa em 2026-10-30, o `luz-rasante.py` escolhe os dois azimutes de cada vista pelo que a câmera dela vê, ainda a 10 graus
 * do plano da imagem, e mede em cada PNG a fração da peça iluminada; o pacote do crítico recusa a imagem abaixo de
 * `LIMIAR_DA_LUZ_RASANTE`, com a imagem, a fração e o limiar (`exigirLuzNaSuperficie`), e o registro da rodada recusa o pacote cujo
 * manifesto não traz a fração de cada imagem ou traz uma abaixo dele.
 *
 * A PEÇA pode ser receita ou esboço 2.0 (`.esboco.mjs` ou `.esboco.json`, com `--opcao`, de 1), lidos pelo resolvedor comum das ferramentas
 * de medida (`entrada-de-medida.mjs`). A face que a exportação não triangula sem triângulo de área nula (a parede fina de um corte, com
 * vários cantos colineares nos dois lados) não derruba mais as vistas: ela é pulada, e o aviso lista cada uma (`facesPuladas`).
 *
 * Uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--opcao=<n>] [--saida=<pasta>] [--faixa-mm=<mm> | --sem-faixa-dos-vincos] */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { partesDaLataria, superficieDaReceita } from '../../src/autoria/lataria.js';
import { vincosDaMalha } from '../../src/autoria/vincos-da-malha.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { doAmbiente } from '../ambiente.mjs';
import { lerArgumentos } from './argumentos.mjs';
import { lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const BLENDER_TOOLS = join(REPO, 'tools/blender');
export const SAIDA_PADRAO = join(REPO, 'tools/bancadas/out');

/** A pasta da rodada de uma peça: `critica-<peça>` ao lado das capturas da bancada. */
export function pastaDaRodada(peca, base = SAIDA_PADRAO) {
  return join(base, `critica-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
}

/* As vistas de `vistas_padrao` (tools/blender/comum.py) que vão ao crítico, com o lado de onde olham: a de trás fica fora porque a
   lataria de uma carroceria simétrica se repete nela. Os dois azimutes da luz rasante de cada vista o `luz-rasante.py` escolhe pelo
   que a câmera dela vê. */
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
 * Se a etapa da peça, na montagem do objeto dela (`<objeto>/montagem.json`), está fixa no registro: a peça aceita pela pessoa.
 * Peça fora de montagem, ou sem registro, não está.
 */
export function etapaFixaDaPeca(peca, { raiz = join(REPO, 'procedural/pecas') } = {}) {
  const [objeto, parte] = peca.split('/');
  if (!parte) return false;
  const arquivo = join(raiz, objeto, 'montagem.json');
  const registro = join(raiz, objeto, 'montagem.etapas.json');
  if (!existsSync(arquivo) || !existsSync(registro)) return false;
  try {
    const instancia = (JSON.parse(readFileSync(arquivo, 'utf8')).instancias ?? []).find((item) => item.alvo?.ref === peca);
    return Boolean(instancia) && JSON.parse(readFileSync(registro, 'utf8')).etapas?.find((e) => e.instancia === instancia.id)?.estado === 'fixa';
  } catch { return false; }
}

/**
 * O que a peça leva ao pacote, pela receita (sem executar): `{ lataria, luzRasante, porque, partes }` de `superficieDaReceita`. A peça
 * de lataria leva a luz rasante e a curvatura; a de emenda sombreada, só a luz rasante. A emenda sombreada não reabre a peça cuja
 * etapa a pessoa já fixou: o aceite vale como foi dado, e a regra vale quando a peça volta ao laço (a pessoa reabre a etapa, ou ela
 * quebra). A lataria não tem essa folga, porque a obrigação dela é anterior.
 */
export function superficieDaPeca(peca, receita, plano = null, opcoes = {}) {
  const decidida = superficieDaReceita(receita, plano);
  if (decidida.luzRasante && !decidida.lataria && etapaFixaDaPeca(peca, opcoes)) {
    return { ...decidida, luzRasante: false, porque: `${decidida.porque}, e a etapa da peça está fixa por aceite da pessoa` };
  }
  return decidida;
}

/**
 * O que a peça leva ao pacote, lido da receita do acervo: `superficieDaPeca` com o caminho da receita.
 */
export async function latariaDaPeca(peca, { opcao = 1, entrada = null } = {}) {
  const lida = entrada ?? await lerEntradaDeMedida(peca, { opcao, montagem: false });
  const plano = normalizarPlanoDeModelagem(lida.receita?.PLANO);
  return { ...superficieDaPeca(peca, lida.receita, plano), caminho: lida.abs };
}

/* ---------- a luz rasante quase toda escura ---------- */

/**
 * A fração da peça que a luz alcança (`superficie.fracao_iluminada`, medida pelo `luz-rasante.py` em cada PNG) abaixo da qual a imagem
 * de luz rasante é recusada no pacote do crítico. Com os azimutes de 30 e 120 graus em todas as vistas, a carenagem de prova saía
 * com 0,005 na de três quartos a 30 graus (só traços de borda) e de 0,35 a 0,87 nas outras, e a chapa de `tools/fixtures/lataria-de-prova/`
 * saía escura em seis das oito, de 0,014 a 0,155 (a de frente a 30 graus, com 0,155, mostra só a borda e um canto). Com os azimutes
 * escolhidos pela vista, a menor imagem das duas peças é a de frente da carenagem, com 0,349, em que a câmera vê a casca de quina e a
 * luz de um lado alcança uma parede só. 0,25 é o meio entre a pior imagem escura medida (0,155) e a menor boa (0,349).
 */
export const LIMIAR_DA_LUZ_RASANTE = 0.25;

const porcento = (f) => `${(100 * f).toFixed(1).replace('.', ',')} %`;

/** As imagens de luz rasante (`[{ arquivo, vista, azimute, iluminada }]`) sem a fração iluminada medida ou com ela abaixo do limiar. */
export function imagensEscuras(rasante, limiar = LIMIAR_DA_LUZ_RASANTE) {
  return rasante.filter((i) => !(typeof i.iluminada === 'number' && i.iluminada >= limiar));
}

function textoDaEscura(i, limiar) {
  const onde = i.vista != null ? ` (vista ${i.vista}, luz a ${String(i.azimute).replace('.', ',')} graus)` : '';
  return typeof i.iluminada === 'number'
    ? `${i.arquivo}${onde} tem ${porcento(i.iluminada)} da peça iluminada, abaixo do limiar de ${porcento(limiar)}`
    : `${i.arquivo}${onde} não traz a fração iluminada medida, e o limiar é de ${porcento(limiar)}`;
}

/**
 * Recusa o pacote do crítico cuja luz rasante saiu quase toda escura: a imagem em que a luz vem de um lado que a câmera não vê
 * mostra só traços de borda, e o crítico a julgaria sem ver a chapa. A mensagem diz cada imagem, a fração medida e o limiar.
 */
export function exigirLuzNaSuperficie(peca, superficie, limiar = LIMIAR_DA_LUZ_RASANTE) {
  const escuras = imagensEscuras(superficie?.rasante ?? [], limiar);
  if (!escuras.length) return;
  throw new Error(`a luz rasante de '${peca}' saiu quase toda escura em ${escuras.length === 1 ? 'uma imagem' : `${escuras.length} imagens`}, e o pacote do crítico não leva `
    + `imagem de superfície em que a luz não alcança a peça: ${escuras.map((i) => textoDaEscura(i, limiar)).join('; ')}. Os azimutes da luz são escolhidos pelo que `
    + 'a câmera de cada vista vê (`tools/blender/luz-rasante.py`); a imagem escura com eles diz que a vista não enxerga a chapa, e o '
    + `\`rasante.json\` da pasta traz a estimativa de cada azimute. Gere de novo com \`${comandoDasVistas(peca)}\` para olhar as imagens.`);
}

/** A recusa de gerar as vistas sem Blender, com o comando. */
export function mensagemSemBlender(peca, lataria) {
  const quem = lataria.lataria
    ? `a peça '${peca}' é de lataria (${lataria.porque}), e o pacote do crítico de peça de lataria leva a luz rasante e a curvatura da lataria, que saem do Blender`
    : `a peça '${peca}' tem ${lataria.porque}, e o pacote do crítico dela leva a luz rasante, que sai do Blender`;
  return `${quem}; MODELAR_BLENDER não aponta o executável. Rode `
    + `\`${comandoDoPacote(peca)}\`, que gera o pacote inteiro com ${lataria.lataria ? 'as duas vistas' : 'a vista'} (só ${lataria.lataria ? 'elas saem' : 'ela sai'} de \`${comandoDasVistas(peca)}\`).`;
}

/* ---------- os vincos declarados, na malha entregue ---------- */

/* `vincosDaMalha` mora em `src/autoria/vincos-da-malha.js`, onde a bancada também a alcança para pintar a faixa dos vincos na
   curvatura (`src/autoria/curvatura-da-lataria.js`); daqui ela segue exportada para quem já a importava. */
export { vincosDaMalha };

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
 * `{ obj, partes, rasante: [{ arquivo, vista, azimute, iluminada }], curvatura: [{ arquivo, vista }] }`, com a curvatura na imagem com a
 * legenda da escala e, em `iluminada`, a fração da peça que a luz rasante alcança naquela imagem (`exigirLuzNaSuperficie` a confere no
 * pacote do crítico; aqui ela só é devolvida, para quem modela poder olhar a imagem escura). `partes` são as partes de lataria passadas à curvatura: as de `lataria.partes`, ou as que a malha diz que nasceram de
 * subdivisão, ou nenhuma (a malha inteira é lataria). Com `faixaDosVincos` (o padrão das vistas do pacote do crítico), os vincos
 * declarados dos passos `subdivisao` (`vincosDaMalha`) vão à curvatura em `--vincos`, e a lataria junto deles sai em ocre e fora
 * da escala (`faixaMm`, ou o padrão do script, o dobro do raio da média); `faixa` devolve `{ larguraMm, vincos, escala, escalaComAFaixa }`,
 * ou null quando a peça não tem vinco declarado ou a opção está desligada. `executar` troca o `spawnSync` no teste.
 */
export async function vistasDeSuperficie(peca, {
  pasta, blender = doAmbiente('BLENDER'), lataria = null, faixaDosVincos = true, faixaMm = null, executar = spawnSync, opcao = 1,
} = {}) {
  const lida = await lerEntradaDeMedida(peca, { opcao, montagem: false });
  const decidida = lataria ?? await latariaDaPeca(peca, { entrada: lida });
  /* A curvatura é da lataria. A peça de emenda sombreada leva só a luz rasante, e a peça que não leva nenhuma das duas (chamada pela
     linha de comando para olhar) recebe as duas, como sempre. */
  const comCurvatura = decidida.lataria || !decidida.luzRasante;
  if (!blender) {
    throw new Error(decidida.luzRasante ? mensagemSemBlender(peca, decidida)
      : `as vistas de superfície saem do Blender, e MODELAR_BLENDER não aponta o executável: rode \`${comandoDasVistas(peca)}\`.`);
  }
  const destino = join(resolve(pasta), PASTA_DA_SUPERFICIE);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  const obj = join(destino, 'peca.obj');
  const { exportarArquivoObj } = await import('./exportar-obj.mjs');
  /* a receita e a execução vêm da mesma leitura: o esboço de lataria monta em segundos, e montá-lo três vezes era o custo da rodada */
  const receitaExecutada = async () => lida.executar();
  const nomeDoObj = lida.nome.replace(/\.esboco\.(mjs|js|json)$/, '').replace(/\.(mjs|js|json)$/, '');
  const exportada = await exportarArquivoObj({ carregada: { receita: lida.receita, nome: nomeDoObj, neutro: (await receitaExecutada()).neutro }, saida: obj, sobrescrever: true, pularFaceSemArea: true });
  const facesPuladas = exportada.facesPuladas ?? [];
  let partes = decidida.partes ?? null;
  if (!partes) partes = comCurvatura ? partesDaLataria((await receitaExecutada()).neutro) : [];
  const argsDaFaixa = [];
  if (faixaDosVincos && comCurvatura) {
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
  if (comCurvatura) {
    rodarBlender(blender, 'curvatura-da-lataria.py', [
      '--malha', obj, '--saida', prefixo, ...vistas, ...(partes.length ? ['--lataria', partes.join(',')] : []), ...argsDaFaixa,
    ], executar);
  }
  const rasante = JSON.parse(readFileSync(`${prefixo}rasante.json`, 'utf8')).imagens
    .map((i) => ({ arquivo: i.arquivos.malha, vista: i.vista, azimute: i.azimute, iluminada: i.iluminacao?.fracao ?? null }));
  const resumo = comCurvatura ? JSON.parse(readFileSync(`${prefixo}curvatura.json`, 'utf8')) : null;
  const curvatura = resumo ? resumo.imagens.map((i) => ({ arquivo: i.legenda, vista: i.vista })) : [];
  const f = resumo?.faixa_dos_vincos ?? null;
  const faixa = f ? { larguraMm: f.largura_mm, vincos: f.vincos, escala: resumo.escala_1_m, escalaComAFaixa: f.escala_com_a_faixa_1_m } : null;
  const faltam = [...rasante, ...curvatura].map((i) => i.arquivo).filter((a) => !existsSync(a));
  if (!rasante.length || (comCurvatura && !curvatura.length) || faltam.length) {
    throw new Error(`as vistas de superfície de '${peca}' não saíram inteiras (${rasante.length} da luz rasante, ${curvatura.length} da curvatura${faltam.length ? `; faltam ${faltam.join(', ')}` : ''}).`);
  }
  return { obj, partes, rasante, curvatura, faixa, facesPuladas };
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
    luzRasante: lataria?.luzRasante ? { porque: lataria.porque } : null,
    superficie: superficie ? {
      rasante: superficie.rasante.map((i) => i.arquivo), curvatura: superficie.curvatura.map((i) => i.arquivo), faixaDosVincos: superficie.faixa ?? null,
      luzRasante: superficie.rasante.map(({ arquivo, vista, azimute, iluminada = null }) => ({ arquivo, vista, azimute, iluminada })),
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
  /* a curvatura é da lataria: o pacote da peça de emenda sombreada leva só a luz rasante */
  const exigeCurvatura = Boolean(dado.lataria);
  if (!rasante.length || (exigeCurvatura && !curvatura.length)) {
    return { ok: false, motivo: `o pacote de ${pasta} não trouxe ${exigeCurvatura ? 'a luz rasante e a curvatura da lataria' : 'a luz rasante'}` };
  }
  const faltam = [...rasante, ...curvatura].filter((a) => !existsSync(a));
  if (faltam.length) return { ok: false, motivo: `o pacote de ${pasta} cita imagens de superfície que não existem mais (${faltam.map((a) => basename(a)).join(', ')})` };
  const medidas = new Map((dado.superficie.luzRasante ?? []).map((i) => [i.arquivo, i]));
  const escuras = imagensEscuras(rasante.map((arquivo) => ({ ...medidas.get(arquivo), arquivo: basename(arquivo) })));
  if (escuras.length) {
    return { ok: false, motivo: `o pacote de ${pasta} tem luz rasante quase toda escura: ${escuras.map((i) => textoDaEscura(i, LIMIAR_DA_LUZ_RASANTE)).join('; ')}` };
  }
  return { ok: true, imagens: [...rasante, ...curvatura].map((a) => basename(a)) };
}

/* ---------- a linha de comando ---------- */

async function principal(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv.slice(2), { opcoes: ['saida', 'faixa-mm', 'opcao'], bandeiras: ['sem-faixa-dos-vincos'], posicional: { nome: 'a peça', obrigatorio: true } });
  } catch (erro) {
    process.stderr.write(`uso: MODELAR_BLENDER=<blender> node tools/modelar/vistas-de-superficie.mjs <peça> [--opcao=<n>] [--saida=<pasta>] [--faixa-mm=<mm> | --sem-faixa-dos-vincos]\n${erro.message}\n`);
    return 2;
  }
  const peca = lido.posicional;
  const pasta = lido.opcao('saida') ?? join(SAIDA_PADRAO, `superficie-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
  const faixaDosVincos = !lido.bandeira('sem-faixa-dos-vincos');
  const faixaMm = lido.opcao('faixa-mm') == null ? null : Number(lido.opcao('faixa-mm'));
  if (faixaMm != null && !(faixaMm > 0)) throw new Error(`--faixa-mm precisa ser número maior que zero, e veio '${lido.opcao('faixa-mm')}'`);
  if (faixaMm != null && !faixaDosVincos) throw new Error('--faixa-mm e --sem-faixa-dos-vincos juntas: a largura só vale com a faixa');
  const opcao = opcaoDaLinha(lido.opcao('opcao'));
  const lataria = await latariaDaPeca(peca, { opcao });
  const feitas = await vistasDeSuperficie(peca, { pasta, lataria, faixaDosVincos, faixaMm, opcao });
  const { faixa } = feitas;
  const linhas = [
    `vistas:superficie — ${peca}`,
    `lataria: ${lataria.lataria ? 'sim' : 'não'}${lataria.luzRasante && !lataria.lataria ? ', com luz rasante pela emenda sombreada' : ''} (${lataria.porque}); partes de lataria na curvatura: ${feitas.partes.length ? feitas.partes.join(', ') : 'a malha inteira'}`,
    faixa
      ? `faixa dos vincos fora da escala: ${faixa.larguraMm} mm de ${faixa.vincos.join(', ')}; escala ${faixa.escala} 1/m (com a faixa seria ${faixa.escalaComAFaixa} 1/m)`
      : `faixa dos vincos: ${faixaDosVincos ? 'nenhuma (a peça não declara vinco)' : 'desligada (--sem-faixa-dos-vincos)'}`,
    '', `LUZ RASANTE (fração da peça iluminada; o pacote do crítico recusa abaixo de ${porcento(LIMIAR_DA_LUZ_RASANTE)}):`,
    ...feitas.rasante.map((i) => `  ${i.arquivo} (${i.iluminada == null ? 'sem medida' : porcento(i.iluminada)}${imagensEscuras([i]).length ? ', QUASE TODA ESCURA' : ''})`),
    '', 'CURVATURA DA LATARIA:', ...feitas.curvatura.map((i) => `  ${i.arquivo}`),
    ...(feitas.facesPuladas.length ? ['', `AVISO: ${feitas.facesPuladas.length} face(s) sem triangulação válida ficaram fora das imagens (a exportação não as tria sem triângulo de área nula; rode \`npm run -s malha:lascas -- ${peca}\` e \`npm run exportar:obj\` para vê-las): ${feitas.facesPuladas.map((f) => `${f.face} (${f.parte ?? 'sem parte'}, ${f.vertices} cantos)`).join(', ')}`] : []),
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
