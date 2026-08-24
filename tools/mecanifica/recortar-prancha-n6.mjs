/* Recorta deterministicamente a prancha N6 aprovada; cada vista vira evidência própria. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../bancadas/bench/pngstats.mjs';
import { encodePng } from '../bancadas/bench/pngwrite.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pasta = path.join(raiz, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo');
const origem = path.join(pasta, 'prancha-origem.png');
const vistas = [
  { id: 'frontal', arquivo: 'vistas/frontal.png', x: 0, y: 0, largura: 440, altura: 464, papel: 'comparar largura, faróis, entradas frontais, para-brisa e arcos dianteiros' },
  { id: 'lateral-direita', arquivo: 'vistas/lateral-direita.png', x: 444, y: 0, largura: 668, altura: 464, papel: 'comparar postura, entre-eixos, cabine, entradas laterais e balanços' },
  { id: 'traseira', arquivo: 'vistas/traseira.png', x: 1116, y: 0, largura: 420, altura: 464, papel: 'comparar largura traseira, lanternas, difusor e saídas' },
  { id: 'superior', arquivo: 'vistas/superior.png', x: 0, y: 468, largura: 764, altura: 556, papel: 'comparar planta, cabine, ombros e deck traseiro' },
  { id: 'perspectiva-frontal-direita', arquivo: 'vistas/perspectiva-frontal-direita.png', x: 768, y: 468, largura: 768, altura: 556, papel: 'verificar integração entre as quatro ortográficas; não substitui nenhuma delas' },
];
const hash = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

function recortar({ pixels, W, H, ch }, retangulo) {
  const { x, y, largura, altura } = retangulo;
  if (x < 0 || y < 0 || x + largura > W || y + altura > H) throw new Error(`recorte fora da prancha: ${retangulo.id}`);
  const rgb = Buffer.alloc(largura * altura * 3);
  for (let linha = 0; linha < altura; linha += 1) {
    for (let coluna = 0; coluna < largura; coluna += 1) {
      const origemPx = ((y + linha) * W + x + coluna) * ch;
      const destinoPx = (linha * largura + coluna) * 3;
      pixels.copy(rgb, destinoPx, origemPx, origemPx + 3);
    }
  }
  return encodePng({ W: largura, H: altura, ch: 3, pixels: rgb });
}

export function recortarPranchaN6() {
  if (!existsSync(origem)) throw new Error('prancha N6 ausente');
  const imagem = decodePng(readFileSync(origem));
  if (imagem.W !== 1536 || imagem.H !== 1024) throw new Error(`dimensão inesperada da prancha N6: ${imagem.W}x${imagem.H}`);
  const arquivos = vistas.map((vista) => {
    const destino = path.join(pasta, vista.arquivo); mkdirSync(path.dirname(destino), { recursive: true });
    const png = recortar(imagem, vista); writeFileSync(destino, png);
    return { ...vista, sha256: hash(png) };
  });
  const manifesto = {
    formato: 'mecanifica.alvo-visual-n6@1',
    id: 'cupe-esportivo-n6-aprovado',
    origem: { tipo: 'prancha-gerada', ferramenta: 'imagegen', arquivo: 'prancha-origem.png', sha256: hash(readFileSync(origem)), dimensoes: [imagem.W, imagem.H] },
    aprovacaoUsuario: { estado: 'aprovada', data: '2026-08-24', decisao: 'direção visual aprovada para converter em pacote técnico N6' },
    regraDeUso: 'cada vista é aberta individualmente, em tamanho nativo, e comparada somente ao render de mesmo enquadramento; a prancha inteira é índice de coerência, não evidência de aceite',
    vistas: arquivos,
  };
  writeFileSync(path.join(pasta, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`);
  return manifesto;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(recortarPranchaN6(), null, 2));
