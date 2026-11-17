/* origem-dos-contornos.mjs — confere que cada `*.contornos.json` do acervo diz de onde veio a imagem que mediu.

   O contorno gravava só o sha256 e o tamanho da imagem. Em 2026-11-17 um contorno do braço robótico cuja foto não estava no repositório
   continuou citado e serviu de medida sem nada acusar: o hash não dizia onde estava a imagem nem se ela ainda existia. Agora o campo
   `imagem` do contorno traz uma de duas coisas:
     `caminho`, relativo à pasta do contorno, quando a imagem está no repositório; a guarda confere que o arquivo existe, que fica dentro
       do repositório e que o sha256 gravado é o dele;
     `foraDoRepositorio: { motivo, encerrada }`, quando a imagem fica fora (foto de terceiro, imagem com marca, `referencias/locais/`);
       `motivo` diz por quê e `encerrada` diz se ainda há quem tenha a imagem (false) ou se o contorno não se refaz nem se confere mais
       (true), e então vale como registro do que foi medido, não como medida nova sem a imagem de volta.
   `npm run contorno` grava um dos dois; a guarda do acervo (`guarda-acervo.mjs`) reprova o contorno que não tem nenhum. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

function contornosDe(pasta, achados = []) {
  if (!existsSync(pasta)) return achados;
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') contornosDe(caminho, achados); }
    else if (e.name.endsWith('.contornos.json')) achados.push(caminho);
  }
  return achados.sort();
}

const COMO_CONSERTAR = 'grave de novo com `npm run contorno -- <imagem.png> --regioes=<regioes.json>`, que escreve imagem.caminho, ou, com a imagem fora do repositório, '
  + 'com `--fora-do-repositorio="<motivo>"`; num contorno antigo sem a imagem, escreva à mão imagem.foraDoRepositorio = { "motivo": "...", "encerrada": true }';

/** O motivo de recusa da origem da imagem de um contorno, ou null quando ela está dita e confere. */
export function motivoDaOrigem(contorno, arquivo, { repo = REPO } = {}) {
  const imagem = contorno?.imagem;
  if (imagem?.caminho !== undefined) {
    if (typeof imagem.caminho !== 'string' || !imagem.caminho.trim() || isAbsolute(imagem.caminho)) {
      return `imagem.caminho vale ${JSON.stringify(imagem.caminho)}; esperava o caminho da imagem relativo à pasta do contorno`;
    }
    const alvo = resolve(dirname(arquivo), imagem.caminho);
    const noRepo = relative(repo, alvo);
    if (noRepo.startsWith('..') || isAbsolute(noRepo)) return `imagem.caminho '${imagem.caminho}' sai do repositório; imagem de fora se declara em imagem.foraDoRepositorio, com o motivo`;
    if (!existsSync(alvo)) return `imagem.caminho '${imagem.caminho}' não existe; volte a imagem ao lugar ou declare imagem.foraDoRepositorio, com o motivo e encerrada: true`;
    const sha = createHash('sha256').update(readFileSync(alvo)).digest('hex');
    if (typeof imagem.sha256 !== 'string') return `imagem.caminho '${imagem.caminho}' não tem imagem.sha256 ao lado; esperava o sha256 dela (${sha.slice(0, 12)}...); ${COMO_CONSERTAR}`;
    if (sha !== imagem.sha256) return `o sha256 gravado (${imagem.sha256.slice(0, 12)}...) não é o de '${imagem.caminho}' (${sha.slice(0, 12)}...): a imagem mudou depois do contorno; tire o contorno de novo`;
    return null;
  }
  if (imagem?.foraDoRepositorio !== undefined) {
    const fora = imagem.foraDoRepositorio;
    if (typeof fora?.motivo !== 'string' || !fora.motivo.trim()) return `imagem.foraDoRepositorio não diz o motivo (recebi ${JSON.stringify(fora)}); esperava { "motivo": "<por que a imagem fica fora>", "encerrada": false | true }`;
    if (typeof fora.encerrada !== 'boolean') return `imagem.foraDoRepositorio.encerrada vale ${JSON.stringify(fora.encerrada)}; esperava true (ninguém tem mais a imagem) ou false`;
    return null;
  }
  return `o contorno não diz de onde veio a imagem (recebi imagem = ${JSON.stringify(imagem)}); esperava imagem.caminho ou imagem.foraDoRepositorio; ${COMO_CONSERTAR}`;
}

/** Os contornos sob `raiz` cuja imagem não tem origem dita ou não confere: [{ arquivo (relativo ao repositório), motivo }]. */
export function contornosSemOrigem({ raiz = ACERVO, repo = REPO } = {}) {
  const achados = [];
  for (const arquivo of contornosDe(raiz)) {
    const rel = relative(repo, arquivo).replaceAll('\\', '/');
    let contorno;
    try { contorno = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) { achados.push({ arquivo: rel, motivo: `não é JSON: ${erro.message}` }); continue; }
    const motivo = motivoDaOrigem(contorno, arquivo, { repo });
    if (motivo) achados.push({ arquivo: rel, motivo });
  }
  return achados;
}
