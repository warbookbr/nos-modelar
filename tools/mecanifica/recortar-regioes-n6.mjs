/* Deriva referências regionais N6 sem reinterpretar a imagem aprovada. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../bancadas/bench/pngstats.mjs';
import { encodePng } from '../bancadas/bench/pngwrite.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pasta = path.join(raiz, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo');
const hash = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

const recortes = [
  { id: 'dianteira-frontal', regiao: 'dianteira-capô-paralamas', vista: 'frontal', origem: 'vistas/frontal.png', x: 10, y: 170, largura: 420, altura: 220, pergunta: 'nariz, faróis, entradas, arcos e largura estão integrados?' },
  { id: 'dianteira-lateral', regiao: 'dianteira-capô-paralamas', vista: 'lateral-direita', origem: 'vistas/lateral-direita.png', x: 0, y: 170, largura: 270, altura: 230, pergunta: 'nariz, balanço e arco dianteiro preservam a postura?' },
  { id: 'cabine-lateral', regiao: 'cabine-cintura', vista: 'lateral-direita', origem: 'vistas/lateral-direita.png', x: 155, y: 105, largura: 310, altura: 240, pergunta: 'para-brisa, teto, coluna e cintura são uma transição contínua?' },
  { id: 'cabine-superior', regiao: 'cabine-cintura', vista: 'superior', origem: 'vistas/superior.png', x: 145, y: 65, largura: 405, altura: 300, pergunta: 'a cabine ocupa a planta corretamente e se liga aos ombros?' },
  { id: 'lateral-entrada', regiao: 'lateral-entrada', vista: 'lateral-direita', origem: 'vistas/lateral-direita.png', x: 305, y: 180, largura: 185, altura: 190, pergunta: 'porta, soleira e entrada lateral pertencem à mesma pele?' },
  { id: 'lateral-perspectiva', regiao: 'lateral-entrada', vista: 'perspectiva-frontal-direita', origem: 'vistas/perspectiva-frontal-direita.png', x: 270, y: 125, largura: 430, altura: 295, pergunta: 'a leitura lateral continua integrada em profundidade?' },
  { id: 'traseira', regiao: 'ombros-deck-traseiro', vista: 'traseira', origem: 'vistas/traseira.png', x: 12, y: 180, largura: 396, altura: 220, pergunta: 'ombros, lanternas, difusor e saídas distinguem a traseira?' },
  { id: 'ombros-deck-superior', regiao: 'ombros-deck-traseiro', vista: 'superior', origem: 'vistas/superior.png', x: 360, y: 175, largura: 350, altura: 285, pergunta: 'ombros, deck ventilado e largura traseira fecham a planta?' },
];
const sobreposicoes = [
  { entre: ['dianteira-capô-paralamas', 'cabine-cintura'], vista: 'lateral-direita', recortes: ['dianteira-lateral', 'cabine-lateral'], pergunta: 'a passagem capô-para-brisa não cria degrau, vão ou mudança de escala?' },
  { entre: ['cabine-cintura', 'lateral-entrada'], vista: 'lateral-direita', recortes: ['cabine-lateral', 'lateral-entrada'], pergunta: 'coluna, porta, soleira e entrada mantêm a mesma pele?' },
  { entre: ['lateral-entrada', 'ombros-deck-traseiro'], vista: 'perspectiva-frontal-direita', recortes: ['lateral-perspectiva', 'ombros-deck-superior'], pergunta: 'a tomada lateral termina nos ombros sem peça anexada ou transição abrupta?' },
];

function cortar(imagem, item) {
  const { W, H, ch, pixels } = imagem;
  if (item.x < 0 || item.y < 0 || item.x + item.largura > W || item.y + item.altura > H) throw new Error(`recorte fora da vista: ${item.id}`);
  const rgb = Buffer.alloc(item.largura * item.altura * 3);
  for (let linha = 0; linha < item.altura; linha += 1) for (let coluna = 0; coluna < item.largura; coluna += 1) {
    const origemPx = ((item.y + linha) * W + item.x + coluna) * ch;
    pixels.copy(rgb, (linha * item.largura + coluna) * 3, origemPx, origemPx + 3);
  }
  return encodePng({ W: item.largura, H: item.altura, ch: 3, pixels: rgb });
}

export function recortarRegioesN6() {
  const manifestoAlvo = JSON.parse(readFileSync(path.join(pasta, 'manifesto.json'), 'utf8'));
  const porArquivo = new Map(manifestoAlvo.vistas.map((vista) => [vista.arquivo, vista]));
  const destino = path.join(pasta, 'regioes'); mkdirSync(destino, { recursive: true });
  const saidas = recortes.map((item) => {
    const caminho = path.join(pasta, item.origem);
    if (!existsSync(caminho)) throw new Error(`vista de origem ausente: ${item.origem}`);
    const fonte = readFileSync(caminho), declarada = porArquivo.get(item.origem);
    if (!declarada || hash(fonte) !== declarada.sha256) throw new Error(`origem sem vínculo N6 válido: ${item.origem}`);
    const png = cortar(decodePng(fonte), item), arquivo = `regioes/${item.id}.png`;
    writeFileSync(path.join(pasta, arquivo), png);
    return { ...item, arquivo, dimensoes: [item.largura, item.altura], sha256Origem: hash(fonte), sha256: hash(png) };
  });
  const manifesto = {
    formato: 'mecanifica.alvo-visual-n6-regioes@1',
    regra: 'recorte é referência local da mesma carroceria, não peça 3D independente; cada edição regional regressa as vistas completas',
    origem: 'manifesto.json',
    recortes: saidas,
    sobreposicoes,
  };
  writeFileSync(path.join(destino, 'manifesto-regioes.json'), `${JSON.stringify(manifesto, null, 2)}\n`);
  return manifesto;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(recortarRegioesN6(), null, 2));
