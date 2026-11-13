/* retirados.mjs — caminho sob uma pasta que saiu da árvore e que a crônica guarda no git. As pastas docs/modelar/planos/encerrados/
 * e docs/modelar/historico/ saíram em 2026-11-13, e o texto de cada arquivo continua no commit que a crônica nomeia. Comentário de
 * código e de receita, e a linha `Origem:` dos registros, citam esses caminhos como registro da época, e reescrevê-los seria editar
 * evidência. O gate aceita o caminho quando o NOME do arquivo (ou da subpasta de dados) consta na crônica da pasta, e recusa quando
 * não consta: citar um arquivo que nunca existiu ou que ninguém registrou continua sendo erro. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const PASTAS_RETIRADAS = [
  { pasta: 'docs/modelar/planos/encerrados/', cronica: 'docs/modelar/decisoes/PLANOS-ENCERRADOS.md' },
  { pasta: 'docs/modelar/historico/', cronica: 'docs/modelar/decisoes/HISTORICO-RETIRADO.md' },
  { pasta: 'docs/modelar/planos/', cronica: 'docs/modelar/decisoes/PLANOS-ENCERRADOS.md', soRaizAusente: true },
];

/* Devolve null quando o caminho não está sob uma pasta retirada; senão { cronica, nome, consta }. O nome é o arquivo ou, para um
   arquivo dentro de subpasta de dados (ciclo6/criticas.json), a subpasta com a barra (ciclo6/). */
export function caminhoRetirado(citado, raiz) {
  const normal = String(citado).replace(/\\/g, '/');
  for (const { pasta, cronica, soRaizAusente } of PASTAS_RETIRADAS) {
    if (!normal.startsWith(pasta)) continue;
    const resto = normal.slice(pasta.length);
    /* O plano encerrado depois da retirada saiu da raiz de planos/: só vale para arquivo direto da raiz que já não existe. */
    if (soRaizAusente && (resto.includes('/') || existsSync(path.join(raiz, normal)))) continue;
    const [primeiro, ...demais] = resto.split('/');
    const nome = demais.length ? `${primeiro}/` : primeiro;
    const arquivo = path.join(raiz, cronica);
    const texto = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : '';
    return { cronica, nome, consta: nome !== '' && texto.includes(`\`${nome}\``) };
  }
  return null;
}

export function motivoRecusa(retirado) {
  return `fica sob pasta retirada e o nome ${retirado.nome} não consta em ${retirado.cronica}`;
}
