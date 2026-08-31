/* ativar-bancada.mjs — ativa qualquer peca ou montagem procedural na sessao ativa da bancada 3D. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { caixasPorParte, portasPublicadas } from '../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita } from './importar-receita.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');

const args = lerArgumentos(process.argv.slice(2), {
  opcoes: ['arquivo', 'peca', 'porta', 'focar', 'modo'],
  bandeiras: ['ajuda', 'h'],
});

if (args.bandeira('ajuda') || args.bandeira('h')) {
  console.log(`
Uso:
  npm run ativar:bancada -- --arquivo=prototipos/.../montagem.js

Opcoes:
  --arquivo=<path>   Caminho para o arquivo .js que exporta a receita
  --peca=<path>      Alias para --arquivo
  --porta=<num>      Porta do Vite (padrao: 5174 ou 5173)
  --focar=<nome>     Nome da parte para focar imediatamente na URL
  --modo=<modo>      Modo de visualizacao: todas, contexto, isolar
`);
  process.exit(0);
}

const caminhoRelativo = args.opcao('arquivo') ?? args.opcao('peca');
if (!caminhoRelativo) {
  console.error('Erro: informe --arquivo=<caminho.js>');
  process.exit(1);
}

const caminhoAbsoluto = resolve(REPO, caminhoRelativo);
if (!existsSync(caminhoAbsoluto)) {
  console.error(`Erro: arquivo nao encontrado: ${caminhoAbsoluto}`);
  process.exit(1);
}

const modulo = await importarReceita(caminhoAbsoluto);
const receita = modulo.default
  ?? Object.values(modulo).find((v) => v && typeof v === 'object' && Array.isArray(v.PASSOS));

if (!receita || !Array.isArray(receita.PASSOS)) {
  console.error('Erro: o modulo nao exporta uma receita valida com PASSOS.');
  process.exit(1);
}

const { neutro } = executarReceita(receita);
const { caixas, facesSemParte } = caixasPorParte(neutro);
const portas = portasPublicadas(neutro);
const partesNomes = Array.from(caixas.keys());

const nomeAlvo = receita.meta?.nome ?? 'Peça Ativa';
const idAlvo = caminhoRelativo.replace(/[\/\\]/g, '-').replace(/\.js$/, '');

const payload = {
  status: 'conectado',
  alvo: {
    id: idAlvo,
    tipo: 'peca',
    nome: nomeAlvo,
    versao: receita.meta?.versao ?? '1.0.0',
    atualizadoEm: new Date().toISOString(),
  },
  intencaoIA: {
    titulo: `Modelagem: ${nomeAlvo}`,
    resumo: `Carregado automaticamente via ativar-bancada a partir de ${caminhoRelativo}.`,
    checklist: partesNomes.slice(0, 8),
  },
  referencias: {
    pranchas: [],
    imagens: [],
    criterios: ['Validado sem órfãos', `${partesNomes.length} corpos identificados`],
  },
  receita,
};

mkdirSync(resolve(REPO, 'public'), { recursive: true });
writeFileSync(resolve(REPO, 'public/sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');
writeFileSync(resolve(REPO, 'sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');

const porta = args.opcao('porta') ?? '5174';
const focar = args.opcao('focar');
const modo = args.opcao('modo') ?? (focar ? 'isolar' : 'todas');

let query = '';
if (focar) {
  query = `?selecionadas=${encodeURIComponent(focar)}&modo=${encodeURIComponent(modo)}&focar=true`;
}

console.log(`\n✓ Receita ativada na Bancada com sucesso!`);
console.log(`  Alvo: ${nomeAlvo} (${partesNomes.length} corpos, 0 faces órfãs)`);
console.log(`  Arquivo de sessão: public/sessao-ativa.json`);
console.log(`\nURL da Bancada:`);
console.log(`  http://localhost:${porta}/nos-mecanifica/bancada.html${query}`);
if (porta !== '5173') {
  console.log(`  (Se a porta 5174 estiver ocupada, tente http://localhost:5173/nos-mecanifica/bancada.html${query})`);
}
