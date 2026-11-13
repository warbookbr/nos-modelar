#!/usr/bin/env node
/* Gera projeções publicáveis. O motor permanece puro; somente esta borda lê e escreve disco. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes } from '../../procedural/nucleo/entrada.js';
import { MANIFESTO as MANIFESTO_ARTICULACAO } from '../../procedural/extensoes/articulacao/manifesto.js';
import { implementar as implementarArticulacao } from '../../procedural/extensoes/articulacao/implementacao.js';
import { MANIFESTO as MANIFESTO_CASCA } from '../../procedural/extensoes/casca/manifesto.js';
import { implementar as implementarCasca } from '../../procedural/extensoes/casca/implementacao.js';
import { EXTENSAO as EXTENSAO_CHAPA_DOBRADA } from '../../procedural/extensoes/chapa-dobrada/index.js';
import { MANIFESTO as MANIFESTO_BARRAS } from '../../procedural/extensoes/estrutura-de-barras/manifesto.js';
import { implementar as implementarBarras } from '../../procedural/extensoes/estrutura-de-barras/implementacao.js';
import { MANIFESTO as MANIFESTO_PRISMA } from '../../procedural/extensoes/prisma-triangular/manifesto.js';
import { implementar as implementarPrisma } from '../../procedural/extensoes/prisma-triangular/implementacao.js';
import { catalogoDeCapacidades } from '../../procedural/nucleo/catalogo.js';
import { schemaDaLacunaCapacidade } from '../../procedural/nucleo/lacunas.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DESTINO = join(RAIZ, 'docs/modelar/gerado');
const catalogo = catalogoDeCapacidades(REGISTRO_OPERACOES);
/* As cinco extensões de procedural/extensoes/ só existem num registro montado por criarRegistroComExtensoes; o catálogo
   as traz numa lista própria (`extensoes`), marcadas como extensão e com a pasta do manifesto que a liga. `operacoes`
   continua sendo o registro base. */
const EXTENSOES = [
  [MANIFESTO_CASCA, implementarCasca, 'casca'],
  [EXTENSAO_CHAPA_DOBRADA.manifesto, EXTENSAO_CHAPA_DOBRADA.implementacao, 'chapa-dobrada'],
  [MANIFESTO_ARTICULACAO, implementarArticulacao, 'articulacao'],
  [MANIFESTO_BARRAS, implementarBarras, 'estrutura-de-barras'],
  [MANIFESTO_PRISMA, implementarPrisma, 'prisma-triangular'],
];
const registroComExtensoes = criarRegistroComExtensoes({
  registroBase: REGISTRO_OPERACOES, extensoes: EXTENSOES.map(([manifesto, implementacao]) => ({ manifesto, implementacao })),
});
const catalogoComExtensoes = catalogoDeCapacidades(registroComExtensoes);
const extensoes = EXTENSOES.map(([manifesto, , pasta]) => {
  const operacao = catalogoComExtensoes.operacoes.find((item) => item.id === manifesto.operacao.id);
  return {
    ...operacao, extensao: true,
    ligacao: {
      como: 'registro com extensões: criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto, implementacao }] }); a operação não existe em REGISTRO_OPERACOES',
      modulo: manifesto.id, manifesto: `procedural/extensoes/${pasta}/manifesto.js`,
    },
  };
}).sort((a, b) => (a.id < b.id ? -1 : 1));
const esquemaLacuna = schemaDaLacunaCapacidade();
const usosOperacoes = {
  formato: 'mecanifica.schemas-operacoes@1', assinatura: REGISTRO_OPERACOES.assinatura,
  total: REGISTRO_OPERACOES.listar().length,
  operacoes: REGISTRO_OPERACOES.listar().map(({ id, nome, uso }) => ({ id, nome, uso })),
  /* Escolha: as extensões entram aqui também, em lista própria, com o mesmo contrato de uso das 42 operações; `total`
     continua contando só o registro base. */
  assinaturaComExtensoes: registroComExtensoes.assinatura, totalExtensoes: extensoes.length,
  extensoes: extensoes.map(({ id, nome, uso, ligacao }) => ({ id, nome, uso, ligacao })),
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
const esquemaExtensaoCatalogo = {
  ...esquemaOperacaoCatalogo,
  required: [...esquemaOperacaoCatalogo.required, 'extensao', 'ligacao'],
  properties: {
    ...esquemaOperacaoCatalogo.properties, extensao: { const: true },
    ligacao: {
      type: 'object', required: ['como', 'modulo', 'manifesto'], additionalProperties: false,
      properties: { como: { type: 'string', minLength: 1 }, modulo: { type: 'string' }, manifesto: { type: 'string' } },
    },
  },
};
const esquemaCatalogo = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'mecanifica.catalogo-capacidades@1',
  type: 'object', required: ['formato', 'assinatura', 'modulos', 'operacoes', 'assinaturaComExtensoes', 'extensoes'], additionalProperties: false,
  properties: {
    formato: { const: 'mecanifica.catalogo-capacidades@1' }, assinatura: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    modulos: {
      type: 'array', items: {
        type: 'object', required: ['id', 'versao', 'requer', 'operacoes'], additionalProperties: false,
        properties: { id: { type: 'string' }, versao: { type: 'string' }, requer: { type: 'array', items: { type: 'object' } }, operacoes: { type: 'array', items: esquemaOperacaoCatalogo } },
      },
    },
    operacoes: { type: 'array', items: esquemaOperacaoCatalogo },
    assinaturaComExtensoes: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    extensoes: { type: 'array', items: esquemaExtensaoCatalogo },
  },
};
function markdown() {
  const linhas = [
    '# Catálogo de capacidades procedural', '',
    '> Gerado por `npm run catalogo:gerar`; não edite à mão. A fonte é o registro explícito do motor e as cinco extensões nativas.', '',
    `Assinatura do registro: \`${catalogo.assinatura}\`.`, '',
    `Há ${catalogo.operacoes.length} operações em ${catalogo.modulos.length} módulo(s).`, '',
    '| operação | intenção | entra/sai | interfaces | custo | schema |', '|---|---|---|---|---:|---|',
    ...linhasDaTabela(catalogo.operacoes),
    '', '## Extensões', '',
    `Há ${extensoes.length} extensões nativas em \`procedural/extensoes/\`. Elas não estão em \`REGISTRO_OPERACOES\`: só existem num registro montado por \`criarRegistroComExtensoes({ registroBase, extensoes })\`, e a receita que as usa precisa ser executada com esse registro. Assinatura do registro com extensões: \`${registroComExtensoes.assinatura}\`.`, '',
    '| extensão | intenção | entra/sai | interfaces | custo | schema | liga-se por |', '|---|---|---|---|---:|---|---|',
    ...linhasDaTabela(extensoes, (e) => ` \`${e.ligacao.manifesto}\` |`),
    '', '## Como usar', '',
    'Consulte o catálogo para descobrir contratos disponíveis. Para argumentos, pré-condições, limites e exemplo executável, use `schemas-operacoes.json` ou `descrever_capacidade` no MCP. A validação de uma receita concreta continua sendo feita pelo executor e pelos gates.',
  ];
  return `${linhas.join('\n')}\n`;
}
function linhasDaTabela(itens, extra = () => '') {
  return itens.map((operacao) => `| \`${operacao.nome}\` | ${operacao.uso?.intencao ?? '—'} | ${operacao.artefatos.entra.map((item) => `\`${item}\``).join(', ') || '—'} → ${operacao.artefatos.sai.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.interfaces.entra.map((item) => `\`${item}\``).join(', ') || '—'} → ${operacao.interfaces.sai.map((item) => `\`${item}\``).join(', ') || '—'} | ${operacao.custo} | \`${operacao.uso?.schema ?? '—'}\` |${extra(operacao)}`);
}
function indice() {
  return `# Artefatos gerados do catálogo procedural\n\n> Gerado por \`npm run catalogo:gerar\`; não edite à mão.\n\n- [Catálogo legível](CATALOGO-CAPACIDADES.md)\n- [Catálogo JSON](catalogo-capacidades.json)\n- [Schema do catálogo](catalogo-capacidades.schema.json)\n- [Contratos executáveis das operações](schemas-operacoes.json)\n- [Schema de lacuna de capacidade](lacuna-capacidade.schema.json)\n\nO catálogo descreve capacidades registradas; a validação de receita concreta continua no executor.\n`;
}
const arquivos = new Map([
  ['catalogo-capacidades.json', `${JSON.stringify({ ...catalogo, assinaturaComExtensoes: registroComExtensoes.assinatura, extensoes }, null, 2)}\n`],
  ['catalogo-capacidades.schema.json', `${JSON.stringify(esquemaCatalogo, null, 2)}\n`],
  ['schemas-operacoes.json', `${JSON.stringify(usosOperacoes, null, 2)}\n`],
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
  if (conferir) console.error(`gerado desatualizado: docs/modelar/gerado/${nome}`);
  else { mkdirSync(DESTINO, { recursive: true }); writeFileSync(arquivo, conteudo); console.log(`gerado: docs/modelar/gerado/${nome}`); }
}
if (conferir && divergente) process.exit(1);
