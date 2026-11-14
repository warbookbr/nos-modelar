/* referencias-do-plano.mjs — o que `PLANO.referencias` cita, resolvido em disco.

   Duas ferramentas leem essa lista: `descrever-peca` confere logo no começo que cada caminho existe, e `vistas:critica` separa as
   imagens que vão ao crítico do resto. A conferência mora aqui, sem a captura da bancada, para a primeira não carregar o navegador. */
import { existsSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ehReferenciaLocal } from '../../src/autoria/plano-de-modelagem.js';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const EXTENSOES_DE_IMAGEM = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

/**
 * Os arquivos que `PLANO.referencias` cita, com o caminho absoluto: cada caminho vale a partir da raiz do repositório e, não existindo
 * ali, a partir da pasta da receita. O que não é imagem (o andaime, o esboço, o `alvo.md`) não vai ao crítico e sai em `ignoradas`, e o
 * que não existe sai em `ausentes`, salvo o declarado em `referencias/locais/` (ignorado pelo git), que sai em `locaisAusentes` e não reprova. `existe` é injetável para o teste.
 */
export function referenciasDoPlano(plano, { pastaDaReceita, raiz = REPO, existe = existsSync } = {}) {
  const imagens = [];
  const ignoradas = [];
  const ausentes = [];
  const locaisAusentes = [];
  for (const citada of plano?.referencias ?? []) {
    const candidatos = isAbsolute(citada) ? [citada] : [resolve(raiz, citada), resolve(pastaDaReceita ?? raiz, citada)];
    const achado = candidatos.find((c) => existe(c));
    if (achado === undefined) { (ehReferenciaLocal(citada) ? locaisAusentes : ausentes).push(citada); continue; }
    if (!EXTENSOES_DE_IMAGEM.has(extname(achado).toLowerCase())) { ignoradas.push(citada); continue; }
    imagens.push(achado);
  }
  return { imagens, ignoradas, ausentes, locaisAusentes };
}

/** A recusa de `PLANO.referencias` que cita arquivo inexistente: nomeia cada caminho, sem chamar de imagem o que pode ser texto. */
export function mensagemDeReferenciasAusentes(ausentes) {
  return `PLANO.referencias cita ${ausentes.length === 1 ? 'um arquivo que não existe' : `${ausentes.length} arquivos que não existem`}: ${ausentes.join(', ')}. `
    + 'Confira o caminho, que vale a partir da raiz do repositório ou da pasta da receita (a lista aceita imagem, o `alvo.md` e o andaime; a captura só usa as imagens).';
}

const AVISADAS = new Set();

/** O aviso das referências locais que faltam nesta máquina (outra máquina, CI): uma vez por caminho em cada processo, no stderr. */
export function avisarReferenciasLocaisAusentes(locaisAusentes, escrever = (linha) => process.stderr.write(linha)) {
  for (const caminho of locaisAusentes ?? []) {
    if (AVISADAS.has(caminho)) continue;
    AVISADAS.add(caminho);
    escrever(`referência local ausente nesta máquina: ${caminho}\n`);
  }
}
