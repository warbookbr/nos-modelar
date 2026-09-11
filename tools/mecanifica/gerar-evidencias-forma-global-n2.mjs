#!/usr/bin/env node
/* Gera o pacote reexecutável da prova N2 a partir de duas fontes versionadas.
   SVG/PNG são derivados; alvo e andaime continuam sendo a autoria.

   ESTA PROVA ESTÁ FECHADA E REPROVADA: G00 bloqueado, G01 e G02 reprovados.
   O pacote vive em `docs/mecanifica/historico/evidencias-n2-forma-global/` e o
   único leitor dele é o relatório N2, que também é histórico.

   O `--check` foi aposentado em 2026-09-11. Ele comparava o manifesto com a
   pasta e acusava dezessete arquivos divergentes desde agosto, porque os SVG e
   PNG derivados nunca foram versionados — e ninguém viu, porque o comando não
   estava na lista de gates. Régua vermelha que ninguém roda não protege nada e
   ensina que vermelho é normal. O gerador continua aqui: quem precisar do
   pacote reexecuta e obtém tudo, inclusive as vistas. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { criarServicoAutoria3DNativa } from '../../prototipos/procedural/v3/servicos/fluxo-autoria.js';

const raiz = process.cwd();
const pastaFixture = path.join(raiz, 'tools', 'mecanifica', 'fixtures', 'autoria-n2');
const pastaSaida = path.join(raiz, 'docs', 'mecanifica', 'historico', 'evidencias-n2-forma-global');
const conferir = process.argv.includes('--check');
const gerarPng = process.argv.includes('--png');
const lerJson = (nome) => JSON.parse(readFileSync(path.join(pastaFixture, nome), 'utf8'));
const json = (valor) => `${JSON.stringify(valor, null, 2)}\n`;
const sha = (conteudo) => `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;

const servico = criarServicoAutoria3DNativa(), forma = servico.formaGlobal;
const alvo = forma.normalizarAlvo(lerJson('alvo-veiculo-compacto.json'));
const andaime = forma.normalizarAndaime(lerJson('andaime-veiculo-compacto.json'));
const avaliacaoAlvo = forma.avaliarAlvo(alvo, null);
const blocagem = forma.compilar(alvo, andaime), avaliacao = forma.avaliar(alvo, blocagem, avaliacaoAlvo);
const decisao = forma.decidir(avaliacao, null, null);

const arquivos = new Map([
  ['alvo.json', json(alvo)], ['andaime.json', json(andaime)], ['blocagem.json', json(blocagem)],
  ['avaliacao-g00.json', json(avaliacaoAlvo)], ['avaliacao-g01.json', json(avaliacao)],
  ['decisao-g02-pendente.json', json(decisao)],
  ['prova-anterior-reprovada.json', json({
    formato: 'mecanifica.registro-reprovacao-forma-global@1', objeto: 'andaime-veiculo-compacto-n2-blocagem',
    commit: 'b71da61', decisaoUsuario: 'reprovar', motivo: 'alvo-e-blocagem-fracos; leitura dependia das rodas e as massas eram caixas sobrepostas',
    consequencia: 'não autoriza G02 nem abertura de N3; preservada no histórico Git',
  })],
]);
for (const vista of ['isometrica', 'frontal', 'direita', 'superior']) {
  arquivos.set(`cego-${vista}.svg`, forma.renderizarVista(alvo, blocagem, vista, { mostrarAlvo: false, exporSemantica: false }));
  arquivos.set(`comparacao-${vista}.svg`, forma.renderizarVista(alvo, blocagem, vista, { mostrarAlvo: true }));
  if (vista !== 'isometrica') arquivos.set(`alvo-${vista}.svg`, forma.renderizarVista(alvo, blocagem, vista, { mostrarAlvo: true, mostrarModelo: false, exporSemantica: false }));
}
arquivos.set('painel-cego.svg', forma.renderizarPainel(alvo, blocagem, { mostrarAlvo: false, exporSemantica: false }));
arquivos.set('painel-comparacao.svg', forma.renderizarPainel(alvo, blocagem, { mostrarAlvo: true }));
arquivos.set('pacote-critica.json', json({
  formato: 'mecanifica.pacote-critica-forma-global@2', consulta: 'consulta-cega-n2-02',
  contexto: 'vistas-neutras-sem-identidade-do-alvo',
  fases: [
    { id: 'reconhecimento-cego', vistas: ['cego-isometrica.svg', 'cego-frontal.svg', 'cego-direita.svg', 'cego-superior.svg'] },
    { id: 'adequacao-ao-alvo', vistas: ['comparacao-frontal.svg', 'comparacao-direita.svg', 'comparacao-superior.svg'] },
  ],
  criterios: alvo.rubrica.criterios,
  instrucao: 'julgue todos os critérios; a segunda fase só abre depois do rótulo cego; qualquer reprovação ou dúvida impede reconhecimento',
}));
arquivos.set('pacote-critica-alvo.json', json({
  formato: 'mecanifica.pacote-critica-alvo-forma-global@1', consulta: 'consulta-alvo-n2-02',
  contexto: 'alvo-e-rubrica-sem-blocagem', alvo: alvo.id, categoriaEsperada: alvo.rubrica.categoriaEsperada,
  vistas: ['alvo-frontal.svg', 'alvo-direita.svg', 'alvo-superior.svg'], criterios: alvo.rubrica.criterios,
  instrucao: 'avalie se o próprio alvo tem nível suficiente para orientar a blocagem; não consulte nem receba a blocagem',
}));
const manifesto = {
  formato: 'mecanifica.evidencias-forma-global@1', objetivo: alvo.objetivo, blocagem: blocagem.id,
  estadoG00: avaliacaoAlvo.estado, estadoG01: avaliacao.estado, estadoG02: decisao.gates.g02,
  arquivos: [...arquivos.entries()].map(([nome, conteudo]) => ({ nome, hash: sha(conteudo) })),
};
arquivos.set('manifesto.json', json(manifesto));

if (conferir) {
  const divergentes = [...arquivos.entries()].filter(([nome, conteudo]) => !existsSync(path.join(pastaSaida, nome)) || readFileSync(path.join(pastaSaida, nome), 'utf8') !== conteudo).map(([nome]) => nome);
  if (divergentes.length) {
    console.error(`autoria:n2:evidencias divergentes: ${divergentes.join(', ')}`); process.exit(1);
  }
  console.log(`autoria:n2:evidencias ok — ${arquivos.size} artefatos textuais em dia; G00 ${avaliacaoAlvo.estado}; G01 ${avaliacao.estado}; G02 ${decisao.gates.g02}.`);
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

console.log(JSON.stringify({ pastaSaida, g00: avaliacaoAlvo.estado, g01: avaliacao.estado, g02: decisao.gates.g02, estatisticas: blocagem.estatisticas, vistas: avaliacao.vistas }, null, 2));
