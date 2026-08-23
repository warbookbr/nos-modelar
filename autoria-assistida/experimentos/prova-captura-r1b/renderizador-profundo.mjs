/* Captura privada R1B: rasterização ortográfica com z-buffer, fora do núcleo. */
import { encodePng } from '../../../tools/bancadas/bench/pngwrite.mjs';

const produto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtrair = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruzar = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unitario = (v) => {
  const tamanho = Math.hypot(...v);
  if (!Number.isFinite(tamanho) || tamanho < 1e-9) throw new Error('vetor de câmera degenerado');
  return v.map((n) => n / tamanho);
};
const limitar = (n) => Math.max(0, Math.min(255, Math.round(n)));

export const CAMERAS = Object.freeze({
  lateral: { olhar: [1, 0, 0], acima: [0, 1, 0] },
  frontal: { olhar: [0, 0, 1], acima: [0, 1, 0] },
  superior: { olhar: [0, 1, 0], acima: [0, 0, -1] },
  isometrica: { olhar: unitario([0.72, 0.46, 0.52]), acima: [0, 1, 0] },
});

function baseDaCamera(camera) {
  const olhar = unitario(camera.olhar);
  const u = unitario(cruzar(camera.acima, olhar));
  return { olhar, u, v: cruzar(olhar, u) };
}

function verticesDaFace(face) {
  return Array.isArray(face) ? face : face.vs;
}

function corDaRegiao(nome = 'sem-regiao') {
  let hash = 2166136261;
  for (const letra of nome) hash = Math.imul(hash ^ letra.charCodeAt(0), 16777619);
  return [(hash >>> 16) & 255, (hash >>> 8) & 255, hash & 255];
}

function assinaturaTexto(texto) {
  let hash = 2166136261;
  for (const letra of texto) hash = Math.imul(hash ^ letra.charCodeAt(0), 16777619);
  return `r1b-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function assinaturaDaMalha(malha) {
  const vertices = [...malha.V.entries()].map(([id, p]) => `${id}:${p.join(',')}`).sort();
  const faces = [...malha.F.entries()].map(([id, face]) => `${id}:${verticesDaFace(face).join(',')}:${face.parte ?? ''}`).sort();
  return assinaturaTexto([...vertices, ...faces].join('|'));
}

function preparar(malha, camera) {
  const base = baseDaCamera(camera);
  const faces = [...malha.F.values()].map((face, ordem) => {
    const ids = verticesDaFace(face);
    if (!Array.isArray(ids) || ids.length < 3) throw new Error('face precisa de ao menos três vértices');
    const pontos = ids.map((id) => {
      const p = malha.V.get(id);
      if (!p) throw new Error(`vértice ausente: ${id}`);
      return p;
    });
    const normal = unitario(cruzar(subtrair(pontos[1], pontos[0]), subtrair(pontos[2], pontos[0])));
    return {
      face, ordem, normal, pontos,
      projetados: pontos.map((p) => [produto(p, base.u), produto(p, base.v), produto(p, base.olhar)]),
    };
  });
  if (faces.length === 0) throw new Error('captura sem faces');
  const xs = faces.flatMap((face) => face.projetados.map((p) => p[0]));
  const ys = faces.flatMap((face) => face.projetados.map((p) => p[1]));
  const dx = Math.max(...xs) - Math.min(...xs);
  const dy = Math.max(...ys) - Math.min(...ys);
  if (dx < 1e-9 || dy < 1e-9) throw new Error('captura degenerada: projeção sem área');
  return { faces, base, limites: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) } };
}

function coordenadaDeTela(p, limites, largura, altura, margem) {
  const escala = Math.min(
    (largura - margem * 2) / (limites.maxX - limites.minX),
    (altura - margem * 2) / (limites.maxY - limites.minY),
  );
  return [margem + (p[0] - limites.minX) * escala, altura - margem - (p[1] - limites.minY) * escala, p[2]];
}

function quadroDeclarado(quadro, limites) {
  if (!quadro) return { ...limites, calibrado: false };
  const { minU, maxU, minV, maxV } = quadro;
  if (![minU, maxU, minV, maxV].every(Number.isFinite) || maxU <= minU || maxV <= minV) throw new Error('quadro ortográfico inválido');
  return { minX: minU, maxX: maxU, minY: minV, maxY: maxV, calibrado: true };
}

function peso(a, b, p) {
  return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
}

function linha(pixels, largura, altura, a, b, cor) {
  const passos = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let passo = 0; passo <= passos; passo += 1) {
    const x = Math.round(a[0] + (b[0] - a[0]) * passo / passos);
    const y = Math.round(a[1] + (b[1] - a[1]) * passo / passos);
    if (x < 0 || y < 0 || x >= largura || y >= altura) continue;
    const i = (y * largura + x) * 3;
    pixels[i] = cor[0]; pixels[i + 1] = cor[1]; pixels[i + 2] = cor[2];
  }
}

/** Retorna buffers puros para que testes possam provar a visibilidade sem ler PNG. */
export function capturar(malha, {
  camera = CAMERAS.isometrica,
  vista = 'livre',
  quadro,
  geometria = 'nao-declarada',
  espelhada = false,
  finalidade = 'inspecao',
  largura = 320,
  altura = 240,
  margem = 12,
  fundo = [244, 243, 239],
  luz = unitario([0.4, 0.8, 0.5]),
} = {}) {
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 32 || altura < 32) throw new Error('dimensão de captura inválida');
  const { faces, base, limites } = preparar(malha, camera);
  const enquadramento = quadroDeclarado(quadro, limites);
  const tamanho = largura * altura;
  const superficie = new Uint8Array(tamanho * 3).fill(0);
  const normais = new Uint8Array(tamanho * 3).fill(0);
  const identidade = new Uint8Array(tamanho * 3).fill(0);
  const wireframe = new Uint8Array(tamanho * 3).fill(0);
  const profundidade = new Float64Array(tamanho).fill(-Infinity);
  for (let i = 0; i < tamanho; i += 1) {
    superficie.set(fundo, i * 3); normais.set(fundo, i * 3); identidade.set(fundo, i * 3); wireframe.set(fundo, i * 3);
  }
  const visiveis = new Set();
  const telaPorFace = [];
  for (const item of faces) {
    const tela = item.projetados.map((p) => coordenadaDeTela(p, enquadramento, largura, altura, margem));
    telaPorFace.push(tela);
    /* Superfície é leitura da forma sob um único material. O código de região
       pertence exclusivamente à modalidade identidade; misturá-los transforma
       fronteira semântica em falsa quebra de superfície. */
    const baseCor = [108, 136, 164];
    const corIdentidade = corDaRegiao(item.face.parte);
    const lambert = Math.max(0.16, produto(item.normal, luz) * 0.72 + 0.28);
    const normalCor = item.normal.map((n) => limitar((n * 0.5 + 0.5) * 255));
    for (let k = 1; k < tela.length - 1; k += 1) {
      const a = tela[0], b = tela[k], c = tela[k + 1];
      const area = peso(a, b, c);
      if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const maxX = Math.min(largura - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const maxY = Math.min(altura - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
        const p = [x + 0.5, y + 0.5];
        const wa = peso(b, c, p) / area, wb = peso(c, a, p) / area, wc = peso(a, b, p) / area;
        if (wa < -1e-9 || wb < -1e-9 || wc < -1e-9) continue;
        const z = wa * a[2] + wb * b[2] + wc * c[2];
        const indice = y * largura + x;
        if (z <= profundidade[indice]) continue;
        profundidade[indice] = z; visiveis.add(item.ordem);
        const i = indice * 3;
        superficie[i] = limitar(baseCor[0] * lambert); superficie[i + 1] = limitar(baseCor[1] * lambert); superficie[i + 2] = limitar(baseCor[2] * lambert);
        normais.set(normalCor, i); identidade.set(corIdentidade, i);
      }
    }
  }
  for (let indice = 0; indice < tamanho; indice += 1) if (profundidade[indice] > -Infinity) {
    const i = indice * 3; const valor = profundidade[indice];
    /* Preserva z numérico e grava uma modalidade visual normalizada em seguida. */
    wireframe.set(superficie.subarray(i, i + 3), i);
    profundidade[indice] = valor;
  }
  for (const tela of telaPorFace) for (let i = 0; i < tela.length; i += 1) linha(wireframe, largura, altura, tela[i], tela[(i + 1) % tela.length], [28, 41, 54]);
  let minZ = Infinity, maxZ = -Infinity, pixelsVisiveis = 0;
  for (const z of profundidade) if (z > -Infinity) {
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); pixelsVisiveis += 1;
  }
  const intervalo = Math.max(1e-9, maxZ - minZ);
  const profundidadeVisual = new Uint8Array(tamanho * 3).fill(0);
  for (let i = 0; i < tamanho; i += 1) if (profundidade[i] > -Infinity) {
    const tom = limitar((profundidade[i] - minZ) / intervalo * 255);
    profundidadeVisual[i * 3] = tom; profundidadeVisual[i * 3 + 1] = tom; profundidadeVisual[i * 3 + 2] = tom;
  }
  return {
    largura, altura, camera: {
      vista, olhar: [...base.olhar], acima: [...camera.acima],
      quadro: enquadramento.calibrado ? { minU: enquadramento.minX, maxU: enquadramento.maxX, minV: enquadramento.minY, maxV: enquadramento.maxY } : null,
      assinatura: assinaturaTexto(`${vista}:${base.olhar.join(',')}:${camera.acima.join(',')}:${JSON.stringify(quadro ?? null)}`),
    },
    assinaturaMalha: assinaturaDaMalha(malha),
    declaracao: { geometria, espelhada: Boolean(espelhada), finalidade },
    superficie, normais, identidade, wireframe, profundidade, profundidadeVisual,
    cobertura: pixelsVisiveis / tamanho, facesVisiveis: [...visiveis].sort((a, b) => a - b),
  };
}

export function capturarVistas(malha, opcoes = {}) {
  return Object.fromEntries(['frontal', 'lateral', 'superior'].map((vista) => [vista,
    capturar(malha, { ...opcoes, vista, camera: CAMERAS[vista] }),
  ]));
}

/* Máscara é derivada do z-buffer, não de cor, normal ou ordem de faces.
   Assim ela representa exatamente a área visível da mesma captura validada. */
export function mascaraDaSilhueta(captura) {
  if (!captura?.profundidade || !Number.isInteger(captura.largura) || !Number.isInteger(captura.altura)) throw new Error('captura sem profundidade para silhueta');
  return Uint8Array.from(captura.profundidade, (z) => z > -Infinity ? 255 : 0);
}

export function pngsDaCaptura(captura) {
  const comum = { W: captura.largura, H: captura.altura, ch: 3 };
  const modalidades = Object.fromEntries(['superficie', 'normais', 'identidade', 'wireframe', 'profundidadeVisual']
    .map((nome) => [nome === 'profundidadeVisual' ? 'profundidade' : nome, encodePng({ ...comum, pixels: Buffer.from(captura[nome]) })]));
  const mascara = mascaraDaSilhueta(captura); const pixels = new Uint8Array(captura.largura * captura.altura * 3);
  for (let i = 0; i < mascara.length; i += 1) pixels.fill(mascara[i], i * 3, i * 3 + 3);
  modalidades.silhueta = encodePng({ ...comum, pixels: Buffer.from(pixels) });
  return modalidades;
}

export function validarCaptura(captura, { coberturaMinima = 0.01, exigirDeclaracao = true, exigirCameraCalibrada = true } = {}) {
  if (!Number.isFinite(captura.cobertura) || captura.cobertura < coberturaMinima) throw new Error('captura sem cobertura suficiente');
  if (captura.facesVisiveis.length === 0) throw new Error('captura sem face visível');
  const z = [...captura.profundidade].filter((valor) => valor > -Infinity);
  if (z.length === 0 || !z.every(Number.isFinite)) throw new Error('captura sem profundidade válida');
  if (!captura.camera?.assinatura || !captura.assinaturaMalha) throw new Error('captura sem assinatura de câmera ou malha');
  if (exigirCameraCalibrada && !captura.camera?.quadro) throw new Error('captura sem quadro ortográfico calibrado');
  if (exigirDeclaracao && !['inteira', 'meia-peca'].includes(captura.declaracao?.geometria)) throw new Error('captura sem escopo de geometria declarado');
  if (captura.declaracao?.finalidade === 'conjunto'
    && captura.declaracao.geometria === 'meia-peca'
    && !captura.declaracao.espelhada) throw new Error('cobertura parcial não pode provar o conjunto');
  return true;
}

/** Impede que três PNGs isolados de fontes diferentes sejam apresentados como conjunto. */
export function validarPacoteDeVistas(vistas, { finalidade = 'conjunto', coberturaMinima = 0.01 } = {}) {
  const obrigatorias = ['frontal', 'lateral', 'superior'];
  if (Object.keys(vistas).sort().join(',') !== obrigatorias.join(',')) throw new Error('pacote precisa de frontal, lateral e superior');
  const capturas = obrigatorias.map((vista) => vistas[vista]);
  const assinaturas = new Set(capturas.map((captura) => captura.assinaturaMalha));
  if (assinaturas.size !== 1) throw new Error('vistas não representam a mesma malha');
  for (const vista of obrigatorias) {
    const captura = vistas[vista];
    if (captura.camera?.vista !== vista) throw new Error(`câmera declarada não corresponde à vista ${vista}`);
    if (captura.declaracao?.finalidade !== finalidade) throw new Error(`finalidade inválida na vista ${vista}`);
    validarCaptura(captura, { coberturaMinima });
  }
  return true;
}
