/* Gera controles visuais sintéticos P0. Não representa produto, veículo ou humanoide aprovados. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pasta = resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0');
const hash = (conteudo) => `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;
const holdout = [
  'esfera-regular', 'toro-regular', 'patch-justo', 'prisma-cunha', 'bloco-filetado',
  'cilindro-oco', 'engrenagem-simples', 'flange', 'dobradica-integra', 'freio-disco',
  'eixo-acoplado', 'placa-adaptadora', 'conjunto-dianteiro', 'casco-capsula', 'casco-silhueta',
  'carroceria-loft', 'supercarro-desconexo', 'veiculo-rodas-soltas', 'humanoide-esquematico', 'humanoide-desconexo',
];
const calibracao = ['calibracao-circulo', 'calibracao-anel', 'calibracao-placa', 'calibracao-conjunto', 'calibracao-estrutura'];
const provas = [
  { tipo: 'decisivo', severidade: 'normal', respostaConhecida: 'A', pergunta: 'Qual alternativa preserva a relação contínua indicada nesta vista?', a: 'saudavel', b: 'sutil' },
  { tipo: 'decisivo', severidade: 'grosseiro', respostaConhecida: 'A', pergunta: 'Qual alternativa preserva um objeto único sem ruptura grosseira?', a: 'saudavel', b: 'grosseiro' },
  { tipo: 'empate', severidade: 'nao-aplicavel', respostaConhecida: 'empate', pergunta: 'Há diferença material verificável entre as alternativas nesta vista?', a: 'saudavel', b: 'saudavel' },
  { tipo: 'indeterminado', severidade: 'nao-aplicavel', respostaConhecida: 'indeterminado', pergunta: 'Há informação suficiente nesta vista única para preferir uma alternativa?', a: 'saudavel', b: 'incompativel' },
];
function pontos(indice, variante) {
  const lados = 5 + (indice % 4); const raio = 62 + (indice % 3) * 7;
  const base = Array.from({ length: lados }, (_, i) => {
    const angulo = -Math.PI / 2 + (i * Math.PI * 2) / lados;
    const dist = raio + ((indice + i) % 3) * 4;
    return [160 + Math.cos(angulo) * dist, 125 + Math.sin(angulo) * dist];
  });
  if (variante === 'sutil') base[1][0] += 18;
  if (variante === 'incompativel') return Array.from({ length: 3 }, (_, i) => [160 + Math.cos(-Math.PI / 2 + i * Math.PI * 2 / 3) * 72, 125 + Math.sin(-Math.PI / 2 + i * Math.PI * 2 / 3) * 72]);
  return base;
}
function poligono(pontos2d) { return pontos2d.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '); }
function figuraBase(base, indice) {
  const comum = 'fill="#254f7b" stroke="#071a2c" stroke-width="4"';
  if (base.includes('esfera') || base.includes('circulo')) return `<circle cx="160" cy="125" r="65" ${comum}/>`;
  if (base.includes('toro') || base.includes('anel') || base.includes('flange')) return `<circle cx="160" cy="125" r="70" ${comum}/><circle cx="160" cy="125" r="31" fill="#f1f4f5" stroke="#071a2c" stroke-width="4"/>`;
  if (base.includes('patch') || base.includes('placa')) return `<path d="M72 165 Q95 60 160 78 Q225 60 248 165 Q160 196 72 165Z" ${comum}/>`;
  if (base.includes('prisma') || base.includes('casco')) return `<polygon points="72,172 248,172 205,72 115,72" ${comum}/>`;
  if (base.includes('bloco')) return `<rect x="82" y="75" width="156" height="102" rx="22" ${comum}/>`;
  if (base.includes('cilindro') || base.includes('eixo')) return `<ellipse cx="160" cy="125" rx="78" ry="43" ${comum}/><path d="M82 125H238" stroke="#6fa8dc" stroke-width="10"/>`;
  if (base.includes('engrenagem')) return `<polygon points="${poligono(pontos(indice + 4, 'saudavel'))}" ${comum}/><circle cx="160" cy="125" r="23" fill="#f1f4f5" stroke="#071a2c" stroke-width="4"/>`;
  if (base.includes('dobradica')) return `<rect x="66" y="98" width="78" height="55" ${comum}/><rect x="176" y="98" width="78" height="55" ${comum}/><rect x="145" y="80" width="30" height="91" rx="15" ${comum}/>`;
  if (base.includes('freio')) return `<circle cx="160" cy="125" r="70" ${comum}/><circle cx="160" cy="125" r="25" fill="#f1f4f5" stroke="#071a2c" stroke-width="4"/><rect x="208" y="91" width="34" height="70" rx="10" fill="#6fa8dc" stroke="#071a2c" stroke-width="4"/>`;
  if (base.includes('conjunto')) return `<rect x="64" y="112" width="192" height="36" rx="12" ${comum}/><circle cx="108" cy="175" r="30" ${comum}/><circle cx="212" cy="175" r="30" ${comum}/>`;
  if (base.includes('veiculo') || base.includes('carroceria') || base.includes('supercarro')) return `<path d="M54 157 L82 157 L108 112 Q125 90 190 90 Q211 95 239 142 L267 151 L267 175 L54 175Z" ${comum}/><circle cx="105" cy="176" r="25" ${comum}/><circle cx="220" cy="176" r="25" ${comum}/><path d="M119 113 L144 99 H185 L210 142 H104Z" fill="#6fa8dc" stroke="#071a2c" stroke-width="4"/>`;
  if (base.includes('humanoide')) return `<circle cx="160" cy="54" r="23" ${comum}/><path d="M135 88 L185 88 L202 150 L180 156 L175 205 L145 205 L140 156 L118 150Z" ${comum}/><path d="M135 103 L94 139 M185 103 L226 139" stroke="#254f7b" stroke-width="22" stroke-linecap="round"/>`;
  return `<polygon points="${poligono(pontos(indice, 'saudavel'))}" ${comum}/>`;
}
function svg(base, indice, variante) {
  const figuraBruta = variante === 'incompativel' ? `<polygon points="${poligono(pontos(indice, variante))}" fill="#254f7b" stroke="#071a2c" stroke-width="4"/>` : figuraBase(base, indice);
  const escala = 1 + (indice % 7) / 250;
  const figura = `<g transform="translate(${(indice % 11) - 5} ${(indice % 5) - 2}) translate(160 125) scale(${escala.toFixed(3)}) translate(-160 -125)">${figuraBruta}</g>`;
  const defeito = variante === 'grosseiro'
    ? '<rect x="112" y="92" width="35" height="67" rx="5" fill="#f1f4f5"/><path d="M177 90 L218 157" stroke="#f1f4f5" stroke-width="18"/>'
    : variante === 'sutil' ? '<path d="M145 71 L160 91 L175 71" fill="none" stroke="#f1f4f5" stroke-width="8"/>' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="250" viewBox="0 0 320 250"><rect width="320" height="250" fill="#f1f4f5"/><path d="M0 125H320M160 0V250" stroke="#d5dde0" stroke-width="1"/>${figura}${defeito}</svg>\n`;
}
function escrever(arquivo, conteudo) {
  mkdirSync(dirname(arquivo), { recursive: true });
  const atual = (() => { try { return readFileSync(arquivo, 'utf8'); } catch { return null; } })();
  if (atual !== conteudo) writeFileSync(arquivo, conteudo);
}
function item(base, indiceBase, indiceProva, split, contador) {
  const prova = provas[indiceProva];
  const id = `${split}-${base}-${indiceProva + 1}`;
  const criarEvidencia = (papel, variante) => {
    const arquivo = `evidencias/i${String(contador).padStart(3, '0')}-${papel.toLowerCase()}.svg`;
    const conteudo = svg(base, indiceBase * 11 + indiceProva, variante);
    escrever(resolve(pasta, arquivo), conteudo);
    return { papel, arquivo, sha256: hash(conteudo) };
  };
  return {
    id, split, objeto: base, tipo: prova.tipo, severidade: prova.severidade, respostaConhecida: prova.respostaConhecida,
    vista: 'isometrica', pergunta: prova.pergunta,
    evidencias: [criarEvidencia('A', prova.a), criarEvidencia('B', prova.b)],
    apresentacoes: [{ ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }, { ordem: ['A', 'B'] }, { ordem: ['B', 'A'] }],
  };
}

export function gerarCorpusP0() {
  const itens = [];
  for (const [indiceBase, base] of holdout.entries()) for (let indiceProva = 0; indiceProva < provas.length; indiceProva += 1) {
    itens.push(item(base, indiceBase, indiceProva, 'holdout', itens.length + 1));
  }
  for (const [indiceBase, base] of calibracao.entries()) for (let indiceProva = 0; indiceProva < provas.length; indiceProva += 1) {
    itens.push(item(base, indiceBase + holdout.length, indiceProva, 'calibracao', itens.length + 1));
  }
  const manifesto = {
    formato: 'mecanifica.corpus-avaliacao-p0@1', estado: 'congelado',
    escopo: 'controles visuais sintéticos para calibrar repetibilidade; não demonstram qualidade automotiva ou humanoide',
    semente: 'p0-corpus-sintetico-01', itens,
  };
  escrever(resolve(pasta, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`);
  return manifesto;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(gerarCorpusP0(), null, 2));
