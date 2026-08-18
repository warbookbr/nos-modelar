#!/usr/bin/env node
/* Gera projeções publicáveis. O motor permanece puro; somente esta borda lê e escreve disco. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRO_OPERACOES } from '../../prototipos/procedural/v3/motor/oficina.js';
import { catalogoDeCapacidades, hipergrafoDeCapacidades } from '../../prototipos/procedural/v3/motor/catalogo.js';
import { schemaDaLacunaCapacidade } from '../../prototipos/procedural/v3/motor/lacunas.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DESTINO = join(RAIZ, 'docs/mecanifica/gerado');
const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);
const grafo = hipergrafoDeCapacidades(catalogo);
const esquemaLacuna = schemaDaLacunaCapacidade();
const usosOperacoes = {
  formato: 'mecanifica.schemas-operacoes@1', assinatura: REGISTRO_OPERACOES.assinatura,
  total: REGISTRO_OPERACOES.listar().length,
  operacoes: REGISTRO_OPERACOES.listar().map(({ id, nome, uso }) => ({ id, nome, uso })),
};
const esquemaUsoCompacto = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', required: ['intencao', 'schema', 'obrigatorios'], additionalProperties: false,
      properties: {
        intencao: { type: 'string', minLength: 1 },
        schema: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        obrigatorios: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      },
    },
  ],
};
const esquemaOperacaoCatalogo = {
  type: 'object', required: ['id', 'nome', 'versao', 'categoria', 'artefatos', 'interfaces', 'requisitos', 'custo', 'efeitos', 'identidade', 'uso'], additionalProperties: false,
  properties: {
    id: { type: 'string' }, nome: { type: 'string' }, versao: { type: 'string' }, categoria: { type: 'string' },
    artefatos: { type: 'object', required: ['entra', 'sai'], additionalProperties: false, properties: { entra: { type: 'array', items: { type: 'string' } }, sai: { type: 'array', items: { type: 'string' } } } },
    interfaces: { type: 'object', required: ['entra', 'sai'], additionalProperties: false, properties: { entra: { type: 'array', items: { type: 'string' } }, sai: { type: 'array', items: { type: 'string' } } } },
    requisitos: { type: 'array', items: { type: 'string' } }, custo: { type: 'number', minimum: 0 },
    efeitos: { type: 'array', items: { type: 'string' } }, identidade: { type: 'string' }, uso: esquemaUsoCompacto,
  },
};
const esquemaCatalogo = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'mecanifica.catalogo-capacidades@1',
  type: 'object', required: ['formato', 'assinatura', 'modulos', 'operacoes'], additionalProperties: false,
  properties: {
    formato: { const: 'mecanifica.catalogo-capacidades@1' }, assinatura: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    modulos: {
      type: 'array', items: {
        type: 'object', required: ['id', 'versao', 'requer', 'operacoes'], additionalProperties: false,
        properties: { id: { type: 'string' }, versao: { type: 'string' }, requer: { type: 'array', items: { type: 'object' } }, operacoes: { type: 'array', items: esquemaOperacaoCatalogo } },
      },
    },
    operacoes: { type: 'array', items: esquemaOperacaoCatalogo },
  },
};
const esquemaGrafo = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'mecanifica.hipergrafo-capacidades@1',
  type: 'object', required: ['formato', 'assinatura', 'nos', 'hiperarestas'], additionalProperties: false,
  properties: {
    formato: { const: 'mecanifica.hipergrafo-capacidades@1' }, assinatura: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    nos: { type: 'array', items: { type: 'object', required: ['id', 'tipo'], properties: { id: { type: 'string' }, tipo: { enum: ['artefato', 'operacao'] }, artefato: { type: 'string' }, nome: { type: 'string' } } } },
    hiperarestas: { type: 'array', items: { type: 'object', required: ['id', 'operacao', 'entra', 'sai'], additionalProperties: false, properties: { id: { type: 'string' }, operacao: { type: 'string' }, entra: { type: 'array', items: { type: 'string' } }, sai: { type: 'array', items: { type: 'string' } } } } },
  },
};
function markdown() {
  const linhas = [
    '# Catálogo de capacidades procedural', '',
    '> Gerado por `npm run catalogo:gerar`; não edite à mão. A fonte é o registro explícito do motor.', '',
    `Assinatura do registro: \`${catalogo.assinatura}\`.`, '',
    `Há ${catalogo.operacoes.length} operações em ${catalogo.modulos.length} módulo(s).`, '',
    '| operação | intenção | entra/sai | interfaces | custo | schema |', '|---|---|---|---|---:|---|',
    ...catalogo.operacoes.map((operacao) => `| \`${operacao.nome}\` | ${operacao.uso?.intencao ?? '—'} | ${operacao.artefatos.entra.map((item) => `\`${item}\``).join(', ') || '—'} → ${operacao.artefatos.sai.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.interfaces.entra.map((item) => `\`${item}\``).join(', ') || '—'} → ${operacao.interfaces.sai.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.custo} | \`${operacao.uso?.schema ?? '—'}\` |`),
    '', '## Como usar', '',
    'Consulte o catálogo para descobrir contratos disponíveis. Para argumentos, pré-condições, limites e exemplo executável, use `schemas-operacoes.json` ou `descrever_capacidade` no MCP. A validação de uma receita concreta continua sendo feita pelo executor e pelos gates.', '',
    'O arquivo `grafo-capacidades.json` é um **hipergrafo direcionado**: uma operação pode consumir e produzir o mesmo tipo de artefato. Por isso ele não finge ser um DAG; um DAG nessa projeção apagaria ciclos reais de transformação.',
  ];
  return `${linhas.join('\n')}\n`;
}
function indice() {
  return `# Artefatos gerados do catálogo procedural\n\n> Gerado por \`npm run catalogo:gerar\`; não edite à mão.\n\n- [Catálogo legível](CATALOGO-CAPACIDADES.md)\n- [Catálogo JSON](catalogo-capacidades.json)\n- [Schema do catálogo](catalogo-capacidades.schema.json)\n- [Contratos executáveis das operações](schemas-operacoes.json)\n- [Hipergrafo de capacidades](grafo-capacidades.json)\n- [Schema do hipergrafo](grafo-capacidades.schema.json)\n- [Schema de lacuna de capacidade](lacuna-capacidade.schema.json)\n\nO catálogo descreve capacidades registradas; a validação de receita concreta continua no executor.\n`;
}
const arquivos = new Map([
  ['catalogo-capacidades.json', `${JSON.stringify(catalogo, null, 2)}\n`],
  ['catalogo-capacidades.schema.json', `${JSON.stringify(esquemaCatalogo, null, 2)}\n`],
  ['schemas-operacoes.json', `${JSON.stringify(usosOperacoes, null, 2)}\n`],
  ['grafo-capacidades.json', `${JSON.stringify(grafo, null, 2)}\n`],
  ['grafo-capacidades.schema.json', `${JSON.stringify(esquemaGrafo, null, 2)}\n`],
  ['lacuna-capacidade.schema.json', `${JSON.stringify(esquemaLacuna, null, 2)}\n`],
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
