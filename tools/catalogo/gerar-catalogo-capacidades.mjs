#!/usr/bin/env node
/* Gera projeções publicáveis. O motor permanece puro; somente esta borda lê e escreve disco. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRO_OPERACOES } from '../../prototipos/procedural/v3/motor/oficina.js';
import { catalogoDeCapacidades, hipergrafoDeCapacidades } from '../../prototipos/procedural/v3/motor/catalogo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DESTINO = join(RAIZ, 'docs/mecanifica/gerado');
const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);
const grafo = hipergrafoDeCapacidades(catalogo);
const esquemaCatalogo = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'mecanifica.catalogo-capacidades@1',
  type: 'object', required: ['formato', 'assinatura', 'modulos', 'operacoes'], additionalProperties: false,
  properties: { formato: { const: 'mecanifica.catalogo-capacidades@1' }, assinatura: { type: 'string' }, modulos: { type: 'array' }, operacoes: { type: 'array' } },
};
const esquemaGrafo = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'mecanifica.hipergrafo-capacidades@1',
  type: 'object', required: ['formato', 'assinatura', 'nos', 'hiperarestas'], additionalProperties: false,
  properties: { formato: { const: 'mecanifica.hipergrafo-capacidades@1' }, assinatura: { type: 'string' }, nos: { type: 'array' }, hiperarestas: { type: 'array' } },
};
function markdown() {
  const linhas = [
    '# Catálogo de capacidades procedural', '',
    '> Gerado por `npm run catalogo:gerar`; não edite à mão. A fonte é o registro explícito do motor.', '',
    `Assinatura SHA-256 do registro: \`${createHash('sha256').update(catalogo.assinatura).digest('hex')}\`.`, '',
    `Há ${catalogo.operacoes.length} operações em ${catalogo.modulos.length} módulo(s).`, '',
    '| operação | entra | sai | efeitos | identidade |', '|---|---|---|---|---|',
    ...catalogo.operacoes.map((operacao) => `| \`${operacao.nome}\` | ${operacao.artefatos.entra.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.artefatos.sai.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.efeitos.map((item) => `\`${item}\``).join(', ')} | \`${operacao.identidade}\` |`),
    '', '## Como usar', '',
    'Consulte o catálogo para descobrir contratos disponíveis. Ele descreve capacidade registrada; a validação de uma receita concreta continua sendo feita pelo executor e pelos gates.', '',
    'O arquivo `grafo-capacidades.json` é um **hipergrafo direcionado**: uma operação pode consumir e produzir o mesmo tipo de artefato. Por isso ele não finge ser um DAG; um DAG nessa projeção apagaria ciclos reais de transformação.',
  ];
  return `${linhas.join('\n')}\n`;
}
function indice() {
  return `# Artefatos gerados do catálogo procedural\n\n> Gerado por \`npm run catalogo:gerar\`; não edite à mão.\n\n- [Catálogo legível](CATALOGO-CAPACIDADES.md)\n- [Catálogo JSON](catalogo-capacidades.json)\n- [Schema do catálogo](catalogo-capacidades.schema.json)\n- [Hipergrafo de capacidades](grafo-capacidades.json)\n- [Schema do hipergrafo](grafo-capacidades.schema.json)\n\nO catálogo descreve capacidades registradas; a validação de receita concreta continua no executor.\n`;
}
const arquivos = new Map([
  ['catalogo-capacidades.json', `${JSON.stringify(catalogo, null, 2)}\n`],
  ['catalogo-capacidades.schema.json', `${JSON.stringify(esquemaCatalogo, null, 2)}\n`],
  ['grafo-capacidades.json', `${JSON.stringify(grafo, null, 2)}\n`],
  ['grafo-capacidades.schema.json', `${JSON.stringify(esquemaGrafo, null, 2)}\n`],
  ['CATALOGO-CAPACIDADES.md', markdown()],
  ['INDEX.md', indice()],
]);
const conferir = process.argv.includes('--check');
let divergente = false;
for (const [nome, conteudo] of arquivos) {
  const arquivo = join(DESTINO, nome);
  let atual = null;
  try { atual = readFileSync(arquivo, 'utf8'); } catch { /* arquivo ausente também é divergência */ }
  if (atual === conteudo) continue;
  divergente = true;
  if (conferir) console.error(`gerado desatualizado: docs/mecanifica/gerado/${nome}`);
  else { mkdirSync(DESTINO, { recursive: true }); writeFileSync(arquivo, conteudo); console.log(`gerado: docs/mecanifica/gerado/${nome}`); }
}
if (conferir && divergente) process.exit(1);
