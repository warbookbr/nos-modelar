/* gerar-gltf.js — monta o JSON e o BIN do glTF 2.0 a partir da malha neutra e do catálogo de materiais da receita.
   Sem Three.js, sem disco, sem relógio nem acaso. A ordem de tudo (partes, primitivas, materiais, texturas) sai da ordem dos ids de
   face e dos nomes das partes, nunca da ordem de inserção de um mapa externo. */
import { PNG } from 'pngjs';
import { chaveDoCantoLiso, normalLisaDoCanto } from '../../../procedural/nucleo/liso-por-angulo.js';
import { normalizarMaterial, normalizarMateriais } from '../../../src/autoria/material-da-receita.js';
import { caixaDaParte, coordenadasDeTextura, medidasDaProjecao } from '../../../src/autoria/coordenada-de-textura.js';
import { gerarMapaDeFlocos, gerarMapasDoRelevo, metrosPorTileDoRelevo, METROS_POR_TILE_DOS_FLOCOS } from '../../textura/src/mapas.js';
import { srgbParaLinear } from '../../textura/src/cor.js';
import { validarMalhaObj } from '../../exportador-obj/src/validar-malha.js';
import { escreverGlb } from './glb.js';

export const GERADOR = 'Modelar exportador-gltf 1.0';
export const AMBIENTES = Object.freeze(['estudio', 'ceu']);

const COR_PADRAO = '#77817d';
const MATERIAL_SEM_DECLARACAO = normalizarMaterial('(sem declaração)');
/* Os mesmos números que a bancada usa (adaptar-three.js): a espessura de referência do vidro, a distância de atenuação, a
   resolução de cada mapa de relevo, a dos flocos e a semente. O arquivo e a bancada mostram o mesmo material. */
export const ESPESSURA_DO_VIDRO = 0.01;
export const DISTANCIA_DE_ATENUACAO_DO_VIDRO = 0.02;
const PX_DO_RELEVO = Object.freeze({ prismas: 256, bandaDeRodagem: 384, letras: 1024, granulado: 256, flanco: 2048 });
const PX_DOS_FLOCOS = 256;
const SEMENTE_DOS_MAPAS = 1;

const COMPONENTE_FLOAT = 5126;
const COMPONENTE_U32 = 5125;
const ALVO_VERTICES = 34962;
const ALVO_INDICES = 34963;

export class ErroExportacaoGltf extends Error {
  constructor(codigo, mensagem, detalhes = {}) {
    super(mensagem);
    this.name = 'ErroExportacaoGltf';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const arredonda = (v) => Math.round(v * 1e6) / 1e6;

function rgbLinear(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  return [0, 2, 4].map((i) => arredonda(srgbParaLinear(parseInt(h.slice(i, i + 2), 16))));
}

const pedeMapas = (def) => Boolean(def.relevo) || def.flocos > 0;

function normalizar(n) {
  const m = Math.hypot(n[0], n[1], n[2]);
  return m > 1e-12 ? [n[0] / m, n[1] / m, n[2] / m] : null;
}

/* normal do polígono por Newell, a mesma conta do adaptador da bancada */
function normalDePoligono(pontos) {
  let x = 0; let y = 0; let z = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const a = pontos[i]; const b = pontos[(i + 1) % pontos.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalizar([x, y, z]);
}

/* normal NÃO normalizada do triângulo (módulo = dobro da área, o peso da soma) */
function cruzDoTriangulo(a, b, c) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/* As normais suaves, como na bancada: só a face `liso` entra na soma, por canto (vértice, ou vértice e setor quando há `quebras`). */
function normaisSuaves(faces) {
  const chave = chaveDoCantoLiso(faces.map((f) => f.original));
  const soma = new Map();
  const porVertice = new Map();
  for (const f of faces) {
    if (!f.original.liso) continue;
    const daFace = new Map();
    for (const tri of f.triangulos) {
      const n = cruzDoTriangulo(...tri.map((id) => f.vertices.get(id)));
      for (const id of tri) {
        const k = chave(f.original, id);
        for (const alvo of [soma, daFace]) {
          const acc = alvo.get(k);
          if (acc) { acc[0] += n[0]; acc[1] += n[1]; acc[2] += n[2]; } else alvo.set(k, [n[0], n[1], n[2]]);
        }
      }
    }
    for (const [k, n] of daFace) {
      if (!porVertice.has(k)) porVertice.set(k, []);
      porVertice.get(k).push({ u: f.normal, n });
    }
  }
  const suaves = new Map();
  for (const [k, acc] of soma) {
    const n = normalizar(acc);
    if (n) suaves.set(k, n);
  }
  return { chave, suaves, porVertice };
}

/* A pose da montagem ({ rotacao 3x3, deslocamento }, em metro) como a matriz do nó: o glTF a quer em 16 números, por coluna. */
function matrizDoNo({ rotacao: r, deslocamento: d }) {
  const m = [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, d[0], d[1], d[2], 1].map(arredonda);
  /* a identidade não se declara (o validador a recusa como aviso) */
  return m.every((v, i) => v === (i % 5 === 0 ? 1 : 0)) ? null : m;
}

/* O pacote binário: cada pedaço alinhado em 4 bytes, na ordem em que é pedido. */
class Pacote {
  constructor() { this.pedacos = []; this.tamanho = 0; this.vistas = []; }

  adicionar(bytes, alvo) {
    const inicio = this.tamanho;
    this.pedacos.push(bytes);
    this.tamanho += bytes.length;
    const folga = (4 - (this.tamanho % 4)) % 4;
    if (folga) { this.pedacos.push(new Uint8Array(folga)); this.tamanho += folga; }
    const vista = { buffer: 0, byteOffset: inicio, byteLength: bytes.length };
    if (alvo) vista.target = alvo;
    this.vistas.push(vista);
    return this.vistas.length - 1;
  }

  juntar() {
    const saida = new Uint8Array(this.tamanho);
    let o = 0;
    for (const p of this.pedacos) { saida.set(p, o); o += p.length; }
    return saida;
  }
}

function bytesDe(tipado) {
  return new Uint8Array(tipado.buffer, tipado.byteOffset, tipado.byteLength);
}

function pngDe(rgba, largura, altura) {
  const png = new PNG({ width: largura, height: altura });
  png.data = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  return new Uint8Array(PNG.sync.write(png));
}

/* Os mapas de um material: { metrosPorTile, normal, aspereza } com { rgba, largura, altura } em cada um (null quando não há). Mesmas
   chamadas do adaptador da bancada, no mesmo px e na mesma semente. */
function mapasDoMaterial(def, medidas) {
  const saida = { metrosPorTile: 1, normal: null, aspereza: null, escalaDaAspereza: null };
  let tileDoRelevo = null;
  if (def.relevo) {
    const { tipo, escala, intensidade, desenho } = def.relevo;
    const m = gerarMapasDoRelevo({ tipo, escala, intensidade, desenho }, {
      px: PX_DO_RELEVO[tipo], semente: SEMENTE_DOS_MAPAS, comprimentoM: medidas?.comprimentoM, larguraM: medidas?.larguraM,
    });
    tileDoRelevo = m.metrosPorTile;
    saida.metrosPorTile = tileDoRelevo;
    saida.normal = { rgba: m.normal, largura: m.largura, altura: m.altura };
    saida.aspereza = { rgba: m.aspereza, largura: m.largura, altura: m.altura };
  }
  if (def.flocos > 0) {
    const f = gerarMapaDeFlocos(def.flocos, { px: PX_DOS_FLOCOS, semente: SEMENTE_DOS_MAPAS });
    saida.aspereza = { rgba: f.aspereza, largura: f.largura, altura: f.altura };
    if (tileDoRelevo === null) saida.metrosPorTile = f.metrosPorTile;
    else saida.escalaDaAspereza = tileDoRelevo / f.metrosPorTile;
  }
  return saida;
}

function projecaoDoMaterial(def, posicoes, parte) {
  if (def.relevo) {
    const medidas = medidasDaProjecao(posicoes, def.relevo, parte);
    return { relevo: def.relevo, medidas, metrosPorTile: metrosPorTileDoRelevo(def.relevo.tipo, def.relevo.escala, medidas) };
  }
  return { relevo: { projecao: 'caixa', eixo: 'y' }, medidas: null, metrosPorTile: METROS_POR_TILE_DOS_FLOCOS };
}

/**
 * @param {{nome?: string, neutro: object, materiais?: object, ambiente?: 'estudio'|'ceu'}} opcoes
 * @returns {{json: object, bin: Uint8Array, bytes: Uint8Array, diagnostico: object}}
 */
export function gerarGltf({ nome = 'peca', neutro, materiais = {}, ambiente = 'estudio', poses = null }) {
  if (!AMBIENTES.includes(ambiente)) {
    throw new ErroExportacaoGltf('ambiente-invalido', `Ambiente '${ambiente}' desconhecido. Aceitos: ${AMBIENTES.join(', ')}.`, { ambiente });
  }
  /* a mesma validação da malha do OBJ: face sem parte, vértice ausente e face sem área são recusados com o id */
  const malha = validarMalhaObj(neutro, { tolerancia: 0.001 });
  const catalogo = normalizarMateriais(materiais);
  const originais = [...neutro.F.entries()].map(([mapId, f]) => ({ ...f, id: f?.id ?? mapId }));
  const porId = new Map(originais.map((f) => [f.id, f]));
  const faces = malha.faces
    .map((f) => ({
      id: f.id, parte: f.parte, material: f.material, triangulos: f.triangulos, vertices: malha.vertices, original: porId.get(f.id),
    }))
    .sort((a, b) => a.id - b.id);
  for (const f of faces) f.normal = normalDePoligono(f.original.vs.map((id) => malha.vertices.get(id))) ?? [0, 1, 0];
  const { chave, suaves, porVertice } = normaisSuaves(faces);

  /* os lotes: uma primitiva por (parte, material, cor), na ordem do menor id de face */
  const lotes = new Map();
  for (const f of faces) {
    const nomeMaterial = f.material ?? '(sem declaração)';
    const def = f.material && Object.hasOwn(catalogo, f.material) ? catalogo[f.material] : MATERIAL_SEM_DECLARACAO;
    const cor = def.cor ?? f.original.cor ?? COR_PADRAO;
    const k = `${f.parte}\u0000${nomeMaterial}\u0000${cor}`;
    let lote = lotes.get(k);
    if (!lote) {
      lote = { parte: f.parte, nomeMaterial, def, cor, posicoes: [], normais: [], cantos: [] };
      lotes.set(k, lote);
    }
    for (const tri of f.triangulos) {
      const pts = tri.map((id) => malha.vertices.get(id));
      const chapada = normalizar(cruzDoTriangulo(...pts)) ?? f.normal;
      tri.forEach((id, i) => {
        const kc = chave(f.original, id);
        const suave = !f.original.liso ? null
          : typeof f.original.liso === 'number'
            ? normalLisaDoCanto(f.normal, f.original.liso, porVertice.get(kc) ?? [])
            : suaves.get(kc);
        lote.posicoes.push(...pts[i]);
        lote.normais.push(...(suave ?? chapada));
        lote.cantos.push(id);
      });
    }
  }

  /* a caixa da parte inteira, para a projeção cilíndrica de duas primitivas da mesma parte coincidir */
  const posicoesDaParte = new Map();
  for (const lote of lotes.values()) {
    if (!pedeMapas(lote.def)) continue;
    if (!posicoesDaParte.has(lote.parte)) posicoesDaParte.set(lote.parte, []);
    posicoesDaParte.get(lote.parte).push(lote.posicoes);
  }

  const nomesDasPartes = [...new Set(faces.map((f) => f.parte))].sort();
  const pacote = new Pacote();
  const accessors = [];
  const extensoes = new Set();
  const imagens = [];
  const imagemPorChave = new Map();
  const texturas = [];
  const materiaisGltf = [];
  const materialPorChave = new Map();
  const nomesDeMaterial = new Set();
  const meshes = [];
  const nodes = [];
  let totalTriangulos = 0;
  let totalVertices = 0;

  const imagem = (chaveDaImagem, gerar) => {
    if (imagemPorChave.has(chaveDaImagem)) return imagemPorChave.get(chaveDaImagem);
    const { rgba, largura, altura } = gerar();
    const vista = pacote.adicionar(pngDe(rgba, largura, altura));
    imagens.push({ bufferView: vista, mimeType: 'image/png' });
    texturas.push({ sampler: 0, source: imagens.length - 1 });
    imagemPorChave.set(chaveDaImagem, texturas.length - 1);
    return texturas.length - 1;
  };

  const materialGltf = (lote, medidas, mapasKey) => {
    const chaveDoMaterial = `${lote.nomeMaterial}\u0000${lote.cor}\u0000${mapasKey}`;
    if (materialPorChave.has(chaveDoMaterial)) return materialPorChave.get(chaveDoMaterial);
    const def = lote.def;
    const cor = rgbLinear(lote.cor);
    const transparente = def.mistura === 'transparente';
    const transmite = def.transmissao > 0;
    const m = {
      name: '',
      pbrMetallicRoughness: {
        baseColorFactor: [...cor, transparente && !transmite ? def.opacidade : 1],
        metallicFactor: def.metalicidade,
        roughnessFactor: def.aspereza,
      },
      /* a bancada usa as duas faces, e o vidro que transmite só a da frente */
      doubleSided: !transmite,
    };
    if (transparente && !transmite) m.alphaMode = 'BLEND';
    const exts = {};
    if (def.verniz > 0) {
      exts.KHR_materials_clearcoat = { clearcoatFactor: def.verniz, clearcoatRoughnessFactor: def.asperezaDoVerniz };
    }
    if (transmite) {
      exts.KHR_materials_transmission = { transmissionFactor: def.transmissao };
      exts.KHR_materials_volume = {
        thicknessFactor: ESPESSURA_DO_VIDRO,
        attenuationDistance: DISTANCIA_DE_ATENUACAO_DO_VIDRO,
        ...(def.tomDoVidro !== null ? { attenuationColor: rgbLinear(def.tomDoVidro) } : {}),
      };
    }
    if (transmite || def.indiceDeRefracao !== 1.5) exts.KHR_materials_ior = { ior: def.indiceDeRefracao };
    if (def.emissivo > 0) {
      /* emissivo até 1 vai no fator; acima de 1 o fator fica na cor e a força vai na extensão oficial */
      m.emissiveFactor = cor.map((c) => arredonda(c * Math.min(1, def.emissivo)));
      if (def.emissivo > 1) exts.KHR_materials_emissive_strength = { emissiveStrength: def.emissivo };
    }
    if (pedeMapas(def)) {
      const mapas = mapasDoMaterial(def, medidas);
      const chaveDosMapas = JSON.stringify([def.relevo, def.flocos, medidas && [medidas.larguraM, medidas.comprimentoM]]);
      if (mapas.normal) {
        m.normalTexture = { index: imagem(`normal:${chaveDosMapas}`, () => mapas.normal), texCoord: 0 };
      }
      if (mapas.aspereza) {
        const info = { index: imagem(`aspereza:${chaveDosMapas}`, () => mapas.aspereza), texCoord: 0 };
        /* relevo e flocos juntos: o tile dos flocos entra na uv do relevo por repetição, como na bancada */
        if (mapas.escalaDaAspereza !== null) {
          info.extensions = { KHR_texture_transform: { scale: [arredonda(mapas.escalaDaAspereza), arredonda(mapas.escalaDaAspereza)] } };
          extensoes.add('KHR_texture_transform');
        }
        m.pbrMetallicRoughness.metallicRoughnessTexture = info;
      }
    }
    if (Object.keys(exts).length) {
      m.extensions = exts;
      for (const e of Object.keys(exts)) extensoes.add(e);
    }
    let nomeFinal = lote.nomeMaterial;
    if (lote.cor !== (def.cor ?? COR_PADRAO)) nomeFinal = `${nomeFinal} ${lote.cor}`;
    if (nomesDeMaterial.has(nomeFinal)) nomeFinal = `${nomeFinal} (${lote.parte})`;
    for (let n = 2; nomesDeMaterial.has(nomeFinal); n += 1) nomeFinal = `${lote.nomeMaterial} (${lote.parte}) #${n}`;
    nomesDeMaterial.add(nomeFinal);
    m.name = nomeFinal;
    materiaisGltf.push(m);
    materialPorChave.set(chaveDoMaterial, materiaisGltf.length - 1);
    return materiaisGltf.length - 1;
  };

  const acessor = (tipado, tipo, componente, alvo, comLimites) => {
    const vista = pacote.adicionar(bytesDe(tipado), alvo);
    const n = tipo === 'SCALAR' ? 1 : tipo === 'VEC2' ? 2 : 3;
    const a = { bufferView: vista, componentType: componente, count: tipado.length / n, type: tipo };
    if (comLimites) {
      const min = new Array(n).fill(Infinity);
      const max = new Array(n).fill(-Infinity);
      for (let i = 0; i < tipado.length; i += 1) {
        min[i % n] = Math.min(min[i % n], tipado[i]);
        max[i % n] = Math.max(max[i % n], tipado[i]);
      }
      a.min = min; a.max = max;
    }
    accessors.push(a);
    return accessors.length - 1;
  };

  const lotesPorParte = new Map(nomesDasPartes.map((p) => [p, []]));
  for (const lote of lotes.values()) lotesPorParte.get(lote.parte).push(lote);

  for (const parte of nomesDasPartes) {
    const primitivas = [];
    for (const lote of lotesPorParte.get(parte)) {
      let uv = null;
      let medidas = null;
      let mapasKey = '';
      if (pedeMapas(lote.def)) {
        const eixo = lote.def.relevo?.eixo ?? 'y';
        const caixa = caixaDaParte(posicoesDaParte.get(lote.parte).flat(), eixo);
        const proj = projecaoDoMaterial(lote.def, lote.posicoes, caixa);
        medidas = proj.medidas;
        uv = coordenadasDeTextura(lote.posicoes, proj.relevo, proj.metrosPorTile, caixa);
        mapasKey = JSON.stringify([lote.def.relevo, lote.def.flocos, medidas && [medidas.larguraM, medidas.comprimentoM]]);
      }
      /* indexa os cantos iguais (mesmo vértice, normal e uv) para o arquivo não repetir o que a bancada repete */
      const posF = Float32Array.from(lote.posicoes);
      const norF = Float32Array.from(lote.normais);
      const indice = new Map();
      const indices = [];
      const ordem = [];
      for (let c = 0; c < lote.cantos.length; c += 1) {
        const k = `${lote.cantos[c]}|${norF[3 * c]}|${norF[3 * c + 1]}|${norF[3 * c + 2]}${uv ? `|${uv[2 * c]}|${uv[2 * c + 1]}` : ''}`;
        let i = indice.get(k);
        if (i === undefined) { i = ordem.length; indice.set(k, i); ordem.push(c); }
        indices.push(i);
      }
      const posicao = new Float32Array(ordem.length * 3);
      const normal = new Float32Array(ordem.length * 3);
      const coord = uv ? new Float32Array(ordem.length * 2) : null;
      ordem.forEach((c, i) => {
        posicao.set(posF.subarray(3 * c, 3 * c + 3), 3 * i);
        normal.set(norF.subarray(3 * c, 3 * c + 3), 3 * i);
        if (coord) coord.set(uv.subarray(2 * c, 2 * c + 2), 2 * i);
      });
      const atributos = {
        POSITION: acessor(posicao, 'VEC3', COMPONENTE_FLOAT, ALVO_VERTICES, true),
        NORMAL: acessor(normal, 'VEC3', COMPONENTE_FLOAT, ALVO_VERTICES, false),
      };
      if (coord) atributos.TEXCOORD_0 = acessor(coord, 'VEC2', COMPONENTE_FLOAT, ALVO_VERTICES, false);
      const idx = acessor(Uint32Array.from(indices), 'SCALAR', COMPONENTE_U32, ALVO_INDICES, false);
      primitivas.push({ attributes: atributos, indices: idx, material: materialGltf(lote, medidas, mapasKey), mode: 4 });
      totalTriangulos += indices.length / 3;
      totalVertices += ordem.length;
    }
    meshes.push({ name: parte, primitives: primitivas });
    const pai = neutro.partes?.[parte]?.pai ?? null;
    const pose = poses?.get(parte);
    nodes.push({
      name: parte,
      mesh: meshes.length - 1,
      ...(pose && matrizDoNo(pose) ? { matrix: matrizDoNo(pose) } : {}),
      ...(pai ? { extras: { pai } } : {}),
    });
  }

  const bin = pacote.juntar();
  const json = {
    asset: { version: '2.0', generator: GERADOR, extras: { unidade: 'm', eixoParaCima: 'y' } },
    scene: 0,
    scenes: [{ name: nome, nodes: nodes.map((_, i) => i), extras: { ambiente } }],
    nodes,
    meshes,
    materials: materiaisGltf,
    ...(texturas.length ? { textures: texturas, images: imagens, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] } : {}),
    accessors,
    bufferViews: pacote.vistas,
    buffers: [{ byteLength: bin.length }],
  };
  if (extensoes.size) json.extensionsUsed = [...extensoes].sort();

  const bytes = escreverGlb(json, bin);
  return {
    json,
    bin,
    bytes,
    diagnostico: {
      nome,
      ambiente,
      unidade: 'm',
      partes: nodes.length,
      primitivas: meshes.reduce((s, mesh) => s + mesh.primitives.length, 0),
      materiais: materiaisGltf.length,
      texturas: texturas.length,
      vertices: totalVertices,
      triangulos: totalTriangulos,
      extensoes: json.extensionsUsed ?? [],
      bytes: bytes.length,
    },
  };
}
