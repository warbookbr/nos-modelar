/* contorno-da-peca.mjs — o contorno por parte no veredito da peça.
 *
 * O comparador é o do esboço (`modulos/esboco/src/referencia.js`: razão interseção/união de 0,85 e desvio de até o maior entre 5 mm
 * e 3% da maior dimensão da referência), sem número novo. Aqui só se acha o contorno e se entrega a ele as partes da peça no lugar
 * das formas do esboço: cada parte da malha vira uma "forma de malha" (`facesDaMalha`, os triângulos em milímetro, triangulados
 * como o núcleo faz) e a região do contorno casa com a parte de mesmo nome, a convenção do esboço quando `plano.referencia` não
 * declara `partes`. A silhueta inteira da peça é comparada com a do contorno.
 *
 * ONDE ESTÁ O CONTORNO. Em `*.contornos.json` (o `mecanifica.contornos@1` que `npm run contorno` grava) na pasta da peça, ao lado
 * da receita ou em qualquer subpasta dela (`referencias/`). A vista sai do nome do arquivo, que começa por `frontal`, `lateral` ou
 * `superior`: o JSON não a diz. O contorno do OBJETO de que a peça é parte mora na pasta do objeto, fora da pasta de cada parte, e
 * por isso não entra: a parte de um objeto só se confere contra ele com o lugar dela no objeto, que a peça sozinha não tem.
 *
 * UM CONTORNO SEM VISTA NO NOME NÃO CONFERE NADA e diz isso ("não conferido"); não aprova nem barra. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { prepararSolido } from '../../src/autoria/contato-de-solidos.js';
import { conferirReferencia, formatarConferencia, lerContornos, VISTAS_DA_REFERENCIA } from '../../modulos/esboco/src/referencia.js';

const MM = 1000;
const FIM_DO_CONTORNO = '.contornos.json';
const PASTAS_QUE_NAO_SAO_REFERENCIA = new Set(['rodadas', 'node_modules']);

function arquivosDeContornos(pasta, profundidade = 3) {
  if (profundidade < 0 || !existsSync(pasta)) return [];
  const achados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      if (!PASTAS_QUE_NAO_SAO_REFERENCIA.has(entrada.name)) achados.push(...arquivosDeContornos(caminho, profundidade - 1));
    } else if (entrada.name.endsWith(FIM_DO_CONTORNO)) {
      achados.push(caminho);
    }
  }
  return achados;
}

export const vistaDoContorno = (arquivo) => VISTAS_DA_REFERENCIA.find((v) => basename(arquivo).startsWith(v)) ?? null;

/** Os arquivos `*.contornos.json` da pasta da peça, por ordem de caminho: `{ caminho, arquivo (relativo à raiz), vista (ou nula) }`. */
export function contornosDaPeca({ caminhoDaReceita, raiz }) {
  if (!caminhoDaReceita) return [];
  return arquivosDeContornos(dirname(caminhoDaReceita)).map((caminho) => ({ caminho, arquivo: relative(raiz, caminho), vista: vistaDoContorno(caminho) }));
}

/** As partes da malha como formas de malha para o comparador: `{ id, facesDaMalha: [{ pts }] }`, os triângulos em milímetro, na
 *  ordem do nome da parte. Uma parte sem triângulo (malha que o núcleo não consegue triangular) fica de fora. */
export function formasDaMalha(neutro) {
  const porParte = new Map();
  for (const face of neutro.F.values()) {
    if (!face.parte) continue;
    if (!porParte.has(face.parte)) porParte.set(face.parte, new Map());
    porParte.get(face.parte).set(face.id, face);
  }
  return [...porParte.keys()].sort().flatMap((parte) => {
    const solido = prepararSolido({ V: neutro.V, F: porParte.get(parte) }, null, parte);
    if (!solido.triangulos?.length) return [];
    return [{ id: parte, facesDaMalha: solido.triangulos.map((t) => ({ pts: t.map((p) => p.map((c) => c * MM)) })) }];
  });
}

/** Confere cada contorno contra a silhueta e as partes da peça. Devolve `{ conferencias, naoConferidos, ok }`: `conferencias` com o
 *  resultado do comparador por contorno (`vista`, `resultados`, `semParte`, `ok`, e o texto pronto em `texto`), `naoConferidos` com o
 *  arquivo e o motivo do que não deu para conferir (a vista que o nome não diz). */
export function conferirContornosDaPeca({ neutro, contornos }) {
  const formas = formasDaMalha(neutro);
  const conferencias = [];
  const naoConferidos = [];
  for (const c of contornos) {
    if (!c.vista) {
      naoConferidos.push({ arquivo: c.arquivo, motivo: `o nome não diz a vista (comece por ${VISTAS_DA_REFERENCIA.join(', ')})` });
      continue;
    }
    const ref = lerContornos(JSON.parse(readFileSync(c.caminho, 'utf8')), c.arquivo);
    const entrada = { arquivo: basename(c.arquivo), vista: c.vista };
    const tentar = (q) => formas.filter((f) => f.id === q);
    const r = conferirReferencia(entrada, ref, formas, { selecionar: tentar, tentar, sujeito: 'da peça' });
    conferencias.push({ arquivo: c.arquivo, ...r, texto: formatarConferencia(entrada, r) });
  }
  return { conferencias, naoConferidos, ok: conferencias.every((x) => x.ok) };
}
