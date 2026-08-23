#!/usr/bin/env node
/* Gera o pacote reexecutável da prova N2 a partir de duas fontes versionadas.
   SVG/PNG são derivados; alvo e andaime continuam sendo a autoria. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { criarServicoAutoria3DNativa } from '../../prototipos/procedural/v3/servicos/fluxo-autoria.js';

const raiz = process.cwd();
const pastaFixture = path.join(raiz, 'tools', 'mecanifica', 'fixtures', 'autoria-n2');
const pastaSaida = path.join(raiz, 'docs', 'mecanifica', 'evidencias', 'n2-forma-global');
const conferir = process.argv.includes('--check');
const gerarPng = process.argv.includes('--png');
const lerJson = (nome) => JSON.parse(readFileSync(path.join(pastaFixture, nome), 'utf8'));
const json = (valor) => `${JSON.stringify(valor, null, 2)}\n`;
const sha = (conteudo) => `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;

const servico = criarServicoAutoria3DNativa(), forma = servico.formaGlobal;
const alvo = forma.normalizarAlvo(lerJson('alvo-veiculo-compacto.json'));
const andaime = forma.normalizarAndaime(lerJson('andaime-veiculo-compacto.json'));
const blocagem = forma.compilar(alvo, andaime), avaliacao = forma.avaliar(alvo, blocagem);
const decisao = forma.decidir(avaliacao, null, null);

const arquivos = new Map([
  ['alvo.json', json(alvo)], ['andaime.json', json(andaime)], ['blocagem.json', json(blocagem)],
  ['avaliacao-g01.json', json(avaliacao)], ['decisao-g02-pendente.json', json(decisao)],
]);
for (const vista of ['isometrica', 'frontal', 'direita', 'superior']) {
  arquivos.set(`cego-${vista}.svg`, forma.renderizarVista(alvo, blocagem, vista, { mostrarAlvo: false, exporSemantica: false }));
  arquivos.set(`comparacao-${vista}.svg`, forma.renderizarVista(alvo, blocagem, vista, { mostrarAlvo: true }));
}
arquivos.set('painel-cego.svg', forma.renderizarPainel(alvo, blocagem, { mostrarAlvo: false, exporSemantica: false }));
arquivos.set('painel-comparacao.svg', forma.renderizarPainel(alvo, blocagem, { mostrarAlvo: true }));
arquivos.set('pacote-critica.json', json({
  formato: 'mecanifica.pacote-critica-forma-global@1', consulta: 'consulta-cega-n2-01',
  contexto: 'vistas-neutras-sem-identidade-do-alvo',
  vistas: ['cego-isometrica.svg', 'cego-frontal.svg', 'cego-direita.svg', 'cego-superior.svg'],
  comparacoes: ['comparacao-frontal.svg', 'comparacao-direita.svg', 'comparacao-superior.svg'],
  instrucao: 'registre o rótulo reconhecido, achados objetivos e estado reconhecida, reprovada ou inconclusiva sem consultar alvo, fonte, manifesto ou nomes internos',
}));
const manifesto = {
  formato: 'mecanifica.evidencias-forma-global@1', objetivo: alvo.objetivo, blocagem: blocagem.id,
  estadoG01: avaliacao.estado, estadoG02: decisao.gates.g02,
  arquivos: [...arquivos.entries()].map(([nome, conteudo]) => ({ nome, hash: sha(conteudo) })),
};
arquivos.set('manifesto.json', json(manifesto));

if (conferir) {
  const divergentes = [...arquivos.entries()].filter(([nome, conteudo]) => !existsSync(path.join(pastaSaida, nome)) || readFileSync(path.join(pastaSaida, nome), 'utf8') !== conteudo).map(([nome]) => nome);
  if (divergentes.length) {
    console.error(`autoria:n2:evidencias divergentes: ${divergentes.join(', ')}`); process.exit(1);
  }
  console.log(`autoria:n2:evidencias ok — ${arquivos.size} artefatos textuais em dia; G01 ${avaliacao.estado}; G02 ${decisao.gates.g02}.`);
  process.exit(0);
}

mkdirSync(pastaSaida, { recursive: true });
for (const [nome, conteudo] of arquivos) writeFileSync(path.join(pastaSaida, nome), conteudo);

if (gerarPng) {
  const { chromium } = await import('playwright');
  const navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  for (const nome of ['painel-cego.svg', 'painel-comparacao.svg', 'cego-isometrica.svg', 'cego-frontal.svg', 'cego-direita.svg', 'cego-superior.svg']) {
    await pagina.setContent(arquivos.get(nome));
    await pagina.locator('svg').screenshot({ path: path.join(pastaSaida, nome.replace('.svg', '.png')) });
  }
  await navegador.close();
}

console.log(JSON.stringify({ pastaSaida, g01: avaliacao.estado, g02: decisao.gates.g02, estatisticas: blocagem.estatisticas, vistas: avaliacao.vistas }, null, 2));
