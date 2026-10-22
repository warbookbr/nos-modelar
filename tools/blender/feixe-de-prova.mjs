/* feixe-de-prova.mjs — a forma desenhada por código com que se prova a conferência das linhas 3D contra os cortes
   (linhas-pelos-cortes.test.mjs): um prisma de seção em zigue-zague, extrudado em z de 100 a 900 mm, com tampa plana em z =
   900 mm, e o pacote cego dele, sem Blender, desenhado pelo imagens.py como em pacote-de-prova.mjs.

   Os vincos são as arestas do prisma ao longo de z, uma por vértice da seção, e o contorno da tampa. Dois pares de vincos
   (A1 e B1, A2 e B2) ficam 8 mm um do outro em x e 30 mm em y: na vista de topo as duas linhas de cada par estão a 8 mm, e a
   terceira vista (frente, o contorno da tampa) não as separa quando a tolerância do casamento passa de 8 mm, que é o que o
   traço grosso e fundido de um feixe de linhas faz no pacote real (a tolerância sai de três vezes o erro de leitura). No
   primeiro par as duas linhas aparecem nas três vistas; no segundo, B2 fica escondida na vista de topo, como a aresta sob um
   beiral. Daí os dois defeitos de casamento: o primeiro par fica ambíguo (quatro curvas, duas falsas), e no segundo a linha
   de lado de B2 só encontra o traço de A2 no topo e vira uma curva falsa, com x de A2 e y de B2, a 7,7 mm da chapa. O corte
   transversal mostra a pele no plano e separa as curvas. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { H, W, amostrar, cameras, paraPixel, py } from './pacote-de-prova.mjs';

export const Z0 = 0.1;
export const Z1 = 0.9;
/** Os vértices da seção, em metro (x, y), no sentido anti-horário; cada um é um vinco ao longo de z. */
export const SECAO = {
  base_esquerda: [0.04, 0.004], base_direita: [0.43, 0.044], quina: [0.4, 0.11], A1: [0.3, 0.17], B1: [0.308, 0.2], A2: [0.19, 0.29],
  B2: [0.198, 0.32], topo_esquerda: [0.11, 0.38],
};
export const VERTICES = Object.keys(SECAO);
/** A vista de topo não vê B2, escondida sob o beiral. */
const ESCONDIDA_NO_TOPO = new Set(['B2']);
export const CORTES = [{ nome: 'z300', eixo: 'z', valor: 0.3, eixos_uv: ['x', 'y'] }, { nome: 'z700', eixo: 'z', valor: 0.7, eixos_uv: ['x', 'y'] }];

/** Os vincos ao longo de z, em metro, de cada vértice. */
export const vincosAoLongoDeZ = () => VERTICES.map((nome) => ({ nome, pontos: [[...SECAO[nome], Z0], [...SECAO[nome], Z1]] }));
/** O contorno exato da seção, em mm (o de qualquer corte transversal, porque o prisma é reto). */
export const contornoDaSecao = () => ({ fechada: true, pontos: VERTICES.map((n) => SECAO[n].map((v) => v * 1000)) });

/** Grava em <dir>/pacote o pacote do feixe: pacote.json sem simetria, os dois cortes e as vistas de linhas com a grade. */
export function montarPacoteDoFeixe(dir) {
  const p = (...n) => join(dir, ...n);
  const cams = cameras();
  mkdirSync(p('pacote', 'vistas'), { recursive: true });
  mkdirSync(p('pacote', 'cortes'), { recursive: true });
  writeFileSync(p('pacote', 'pacote.json'), JSON.stringify({ simetria_x: false }));
  const anel = VERTICES.map((n) => [...SECAO[n]]);
  writeFileSync(p('cortes.json'), JSON.stringify({ simetria_x: false, cortes: CORTES.map((c) => ({ ...c, cadeias: [[...anel, anel[0]]] })) }));
  py('imagens.py', ['cortes', p('cortes.json'), p('pacote', 'cortes')]);
  writeFileSync(p('pacote', 'vistas', 'camera.json'), JSON.stringify(cams));
  const tampa = [...VERTICES, VERTICES[0]].map((n) => [...SECAO[n], Z1]);
  for (const [nome, c] of Object.entries(cams)) {
    const feicao = [];
    const desenhar = (pontos) => feicao.push(pontos.slice(1).flatMap((b, i) => amostrar([pontos[i], b]).slice(i ? 1 : 0)).map((q) => paraPixel(c, q)));
    desenhar(tampa);
    // as arestas ao longo de z são ponto na vista de frente e não entram nela
    if (nome !== 'frente') for (const v of vincosAoLongoDeZ()) if (!(nome === 'topo' && ESCONDIDA_NO_TOPO.has(v.nome))) desenhar(v.pontos);
    writeFileSync(p(`linhas-${nome}.json`), JSON.stringify({ W, H, linhas: { feicao, corte: [] } }));
    py('imagens.py', ['linhas', p(`linhas-${nome}.json`), p('pacote', 'vistas', `${nome}-linhas.png`)]);
  }
  const branco = Object.keys(cams).flatMap((n) => ['cinza', 'zebra'].map((t) => p('pacote', 'vistas', `${n}-${t}.png`)));
  spawnSync('python3', ['-I', '-c', `from PIL import Image\nimport sys\nfor a in sys.argv[1:]: Image.new('RGB', (${W}, ${H}), 'white').save(a)`, ...branco]);
  py('imagens.py', ['grade', p('pacote', 'vistas', 'camera.json'), p('pacote', 'vistas') + '/']);
  return cams;
}
