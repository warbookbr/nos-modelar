/* adaptar-three.js — adaptador neutro do núcleo da Oficina para Three.js; não altera o formato persistido. */
import * as THREE from 'three';
import { chaveDoCantoLiso, normalLisaDoCanto } from '../../procedural/nucleo/liso-por-angulo.js';
import { normalizarMaterial, normalizarMateriais } from './material-da-receita.js';
import { coordenadasDeTextura, caixaDaParte, medidasDaProjecao } from './coordenada-de-textura.js';
import { gerarMapaDeFlocos, gerarMapasDoRelevo, metrosPorTileDoRelevo, METROS_POR_TILE_DOS_FLOCOS } from '../../modulos/textura/src/mapas.js';
import { triangularConvexa, triangularSemDegenerado } from '../../procedural/nucleo/triangulacao-face.js';

const COR_PADRAO = '#77817d';

/* IDS DE ORIGEM EM DUAS PALAVRAS DE 32 BITS. O id que o núcleo dá a vértice e
   face passa de 2^40 na faixa estendida de um passo (`idDoPasso`), e Float32 só
   guarda inteiro exato até 2^24: na carenagem de prova, as faces além da
   milésima do passo caíam todas no mesmo valor e o modo de edição não sabia
   qual delas o raio tinha acertado. Uint32 cabe na GPU, mas não cabe 2^40, e
   Float64 o three.js recusa enviar. Cada canto guarda então [alta, baixa], com
   id = alta·2^32 + baixa, exato até 2^53. A ordem é de propósito: quem ler
   só `getX` acha zero em todo id comum e erra alto, e não só nos ids grandes.
   Leia sempre por `idDeOrigem` ou `idsDeOrigem`. */
const PALAVRA = 2 ** 32;

function atributoDeIds(ids, nome) {
  const palavras = new Uint32Array(ids.length * 2);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!Number.isSafeInteger(id) || id < 0) throw new Error(`adaptarThree: ${nome} ${id} não é inteiro não negativo seguro`);
    const alta = Math.floor(id / PALAVRA);
    palavras[2 * i] = alta;
    palavras[2 * i + 1] = id - alta * PALAVRA;
  }
  return new THREE.Uint32BufferAttribute(palavras, 2);
}

/** O id de origem (`origemFace` ou `origemVertice`) do canto `indice`. */
export function idDeOrigem(atributo, indice) {
  return atributo.getX(indice) * PALAVRA + atributo.getY(indice);
}

/** Todos os ids de origem do atributo, um por canto, na ordem dos cantos. */
export function idsDeOrigem(atributo) {
  return Array.from({ length: atributo.count }, (_, i) => idDeOrigem(atributo, i));
}

const MATERIAL_SEM_DECLARACAO = normalizarMaterial('(sem declaração)');

/* O MATERIAL DA FACE sai do catálogo já NORMALIZADO (`normalizarMateriais`), que recusa campo desconhecido e dá os padrões; aqui
   viajam a cor, a aspereza, a metalicidade, o emissivo, a transparência e a opacidade, e `declarado` leva a declaração inteira para
   `criarMaterial`, que traduz verniz, transmissão, índice de refração e tom do vidro para o material físico (fatia 2 do plano de
   materiais realistas); flocos e relevo seguem guardados até a fatia 3. Os campos novos já entram na `chave` que agrupa as malhas,
   para duas declarações que diferem só no verniz não virarem a mesma malha; com todos nos padrões, a chave agrupa como antes. */
export function materialDaFace(face, catalogo) {
  const definicao = face.material && Object.hasOwn(catalogo, face.material) ? catalogo[face.material] : MATERIAL_SEM_DECLARACAO;
  const cor = definicao.cor ?? face.cor ?? COR_PADRAO;
  const transparente = definicao.mistura === 'transparente';
  return {
    chave: JSON.stringify([
      cor,
      definicao.aspereza,
      definicao.metalicidade,
      definicao.emissivo,
      transparente,
      definicao.opacidade,
      definicao.verniz,
      definicao.asperezaDoVerniz,
      definicao.transmissao,
      definicao.indiceDeRefracao,
      definicao.tomDoVidro,
      definicao.flocos,
      definicao.relevo,
    ]),
    cor,
    aspereza: definicao.aspereza,
    metalicidade: definicao.metalicidade,
    emissivo: definicao.emissivo,
    transparente,
    opacidade: definicao.opacidade,
    declarado: definicao,
  };
}

/* O MATERIAL FÍSICO só nasce quando a declaração traz algum campo físico novo fora do padrão: verniz, transmissão, tom do vidro ou
   índice de refração diferente do vidro comum (1,5). Sem eles o material é o `MeshStandardMaterial` de sempre, com as mesmas
   propriedades, e a cena das receitas de hoje não muda. `flocos` e `relevo` são da fatia 3 do plano e aqui só ficam guardados.
   O `tomDoVidro` é a cor que a luz toma ao atravessar 2 cm de vidro (a distância de atenuação), numa chapa de 1 cm de espessura
   de referência: o tom vale pela metade do caminho, o que dá o leve tom verde do vidro comum sem tingir a vista toda. */
export const ESPESSURA_DO_VIDRO = 0.01;
export const DISTANCIA_DE_ATENUACAO_DO_VIDRO = 0.02;

export function pedeMaterialFisico(declarado) {
  return Boolean(declarado) && (
    declarado.verniz > 0
    || declarado.transmissao > 0
    || declarado.tomDoVidro !== null
    || declarado.indiceDeRefracao !== 1.5
  );
}

/** As propriedades do `MeshPhysicalMaterial` que a declaração pede (campos do Three.js), sem criar o material. */
export function propriedadesFisicas(declarado) {
  const propriedades = {
    clearcoat: declarado.verniz,
    clearcoatRoughness: declarado.asperezaDoVerniz,
    transmission: declarado.transmissao,
    ior: declarado.indiceDeRefracao,
  };
  if (declarado.transmissao > 0 || declarado.tomDoVidro !== null) {
    propriedades.thickness = ESPESSURA_DO_VIDRO;
    propriedades.attenuationDistance = DISTANCIA_DE_ATENUACAO_DO_VIDRO;
    if (declarado.tomDoVidro !== null) propriedades.attenuationColor = new THREE.Color(declarado.tomDoVidro);
  }
  return propriedades;
}

/* OS MAPAS DO RELEVO E DOS FLOCOS (fatia 3). Só o material que declara `relevo` ou `flocos` ganha `uv`, `normalMap` e `roughnessMap`;
   os demais seguem sem coordenada de textura e sem mapa. A imagem vem do módulo de textura (`modulos/textura/src/mapas.js`), a
   coordenada de `coordenada-de-textura.js`, na convenção do glTF (v = 0 é a primeira linha da imagem; o `DataTexture` do Three.js
   também põe a primeira linha em v = 0). Sem `tangent` na geometria, o Three.js monta a base da normal pelas derivadas da uv, e
   para a uv do glTF o `y` da escala da normal troca de sinal, como o `GLTFLoader` faz. O tile é repetido (`RepeatWrapping`). */
const PX_DO_RELEVO = { prismas: 256, bandaDeRodagem: 384, letras: 1024, granulado: 256 };
const PX_DOS_FLOCOS = 256;
const SEMENTE_DOS_MAPAS = 1;
const cacheDeTexturas = new Map();

function texturaDeDados(rgba, largura, altura, repeticao) {
  const t = new THREE.DataTexture(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength), largura, altura, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeticao, repeticao);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** O material declara `relevo` ou `flocos`? */
export const pedeMapas = (declarado) => Boolean(declarado) && (Boolean(declarado.relevo) || declarado.flocos > 0);

/** Os mapas de um material: { metrosPorTile, normal, aspereza } (texturas; `normal` pode faltar), ou null sem `relevo` nem `flocos`. */
export function mapasDoMaterial(declarado, medidas = null) {
  if (!pedeMapas(declarado)) return null;
  const chave = JSON.stringify([declarado.relevo, declarado.flocos, medidas && [medidas.larguraM, medidas.comprimentoM]]);
  if (cacheDeTexturas.has(chave)) return cacheDeTexturas.get(chave);
  const saida = { metrosPorTile: 1, normal: null, aspereza: null };
  let tileDoRelevo = null;
  if (declarado.relevo) {
    const { tipo, escala, intensidade, desenho } = declarado.relevo;
    const m = gerarMapasDoRelevo({ tipo, escala, intensidade, desenho }, {
      px: PX_DO_RELEVO[tipo], semente: SEMENTE_DOS_MAPAS, comprimentoM: medidas?.comprimentoM, larguraM: medidas?.larguraM,
    });
    tileDoRelevo = m.metrosPorTile;
    saida.metrosPorTile = tileDoRelevo;
    saida.normal = texturaDeDados(m.normal, m.largura, m.altura, 1);
    saida.aspereza = texturaDeDados(m.aspereza, m.largura, m.altura, 1);
    saida.normal.userData = { mapa: 'normal' };
  }
  if (declarado.flocos > 0) {
    const f = gerarMapaDeFlocos(declarado.flocos, { px: PX_DOS_FLOCOS, semente: SEMENTE_DOS_MAPAS });
    if (tileDoRelevo === null) {
      saida.metrosPorTile = f.metrosPorTile;
      saida.aspereza = texturaDeDados(f.aspereza, f.largura, f.altura, 1);
    } else {
      /* relevo e flocos juntos: a aspereza dos flocos vale pelos dois, e o tile dos flocos entra na uv do relevo por repetição */
      saida.aspereza = texturaDeDados(f.aspereza, f.largura, f.altura, tileDoRelevo / f.metrosPorTile);
    }
  }
  cacheDeTexturas.set(chave, saida);
  return saida;
}

/** A projeção da uv do material: a do relevo (com as medidas da faixa que o leva, na banda e nas letras), ou a de caixa quando só há flocos. */
export function projecaoDoMaterial(declarado, posicoes, parte) {
  if (declarado.relevo) {
    const medidas = medidasDaProjecao(posicoes, declarado.relevo, parte);
    return { relevo: declarado.relevo, medidas, metrosPorTile: metrosPorTileDoRelevo(declarado.relevo.tipo, declarado.relevo.escala, medidas) };
  }
  return { relevo: { projecao: 'caixa', eixo: 'y' }, medidas: null, metrosPorTile: METROS_POR_TILE_DOS_FLOCOS };
}

function criarMaterial(info, medidas = null) {
  const emissivo = new THREE.Color(info.cor).multiplyScalar(Math.max(0, info.emissivo));
  const base = {
    color: info.cor,
    roughness: info.aspereza,
    metalness: info.metalicidade,
    emissive: emissivo,
    emissiveIntensity: info.emissivo > 0 ? 1 : 0,
    transparent: info.transparente,
    opacity: info.opacidade,
    side: THREE.DoubleSide,
  };
  const mapas = mapasDoMaterial(info.declarado, medidas);
  if (mapas) {
    if (mapas.normal) { base.normalMap = mapas.normal; base.normalScale = new THREE.Vector2(1, -1); }
    if (mapas.aspereza) base.roughnessMap = mapas.aspereza;
  }
  if (!pedeMaterialFisico(info.declarado)) return new THREE.MeshStandardMaterial(base);
  /* Com transmissão o vidro deixa passar a luz pelo próprio passe do renderizador: a opacidade e a mistura transparente
     dariam um vidro apagado em cima de um vidro que já transmite. */
  if (info.declarado.transmissao > 0) { base.transparent = false; base.opacity = 1; base.side = THREE.FrontSide; }
  return new THREE.MeshPhysicalMaterial({ ...base, ...propriedadesFisicas(info.declarado) });
}

/* normal do triângulo (a,b,c), NÃO normalizada: o módulo é o dobro da área, e é
   ele que dá o peso por área quando as normais se somam. Mesma convenção de
   winding do `normalDaFace` (Newell) do núcleo: (b−a) × (c−a). */
function normalDoTriangulo(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

function normalizar(n) {
  const m = Math.hypot(n[0], n[1], n[2]);
  return m > 1e-12 ? [n[0] / m, n[1] / m, n[2] / m] : null;
}

function pontosDaFace(face, vertices) {
  if (!Array.isArray(face.vs) || face.vs.length < 3) {
    throw new Error(`adaptarThree: face ${face.id} precisa de pelo menos 3 vértices`);
  }
  return face.vs.map((id) => {
    const ponto = vertices.get(id);
    if (!ponto) throw new Error(`adaptarThree: face ${face.id} referencia vértice ausente ${id}`);
    return ponto;
  });
}

/* normal do POLÍGONO por Newell — a mesma conta do `normalDaFace` do núcleo.
   Robusta para n-gon torto e para n-gon CÔNCAVO, onde a normal de um triângulo
   qualquer da face pode apontar para o lado errado. */
function normalDePoligono(pontos) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalizar([x, y, z]);
}

const cruz2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function dentroDoTriangulo(a, b, c, p) {
  const d1 = cruz2(a, b, p), d2 = cruz2(b, c, p), d3 = cruz2(c, a, p);
  return d1 >= 0 && d2 >= 0 && d3 >= 0;
}

/**
 * Triangulação de uma face por ORELHAS, no plano dela.
 *
 * POR QUE NÃO O LEQUE. O adaptador triangulava todo n-gon em leque a partir do
 * vértice 0. Leque só é válido em polígono CONVEXO. A borda do furo não é:
 * medido numa placa com um furo de 12 lados, 4 das 12 faces da borda são quads
 * CÔNCAVOS, e o leque produzia neles um triângulo de área NEGATIVA — normal
 * invertida, no plano da própria face. Com material `DoubleSide` isso não some,
 * vira uma cunha iluminada pelo lado errado encostada no contorno do furo. Era
 * metade da serrilha que se via na bancada, e não era problema de sombreado:
 * o leque também cobria área FORA do polígono e deixava o reflexo descoberto.
 *
 * Falha alto. Polígono que não fecha em orelhas (auto-interseção, contorno
 * degenerado) para a conversão com diagnóstico; nunca vira face faltando em
 * silêncio.
 */
const quad2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function triangularPoligono(pontos, normal, rotulo) {
  const n = pontos.length;
  if (n === 3) return [[0, 1, 2]];
  /* face convexa grande: subdivisão equilibrada em vez de orelhas em sequência,
     que num polígono convexo cortam sempre o mesmo canto e refazem o leque
     (dezenas de triângulos finos saindo de um vértice). */
  const equilibrada = triangularConvexa(pontos);
  if (equilibrada) return equilibrada;
  /* quadro 2D com (u, w, normal) destro: assim o contorno, que já é CCW em
     torno da normal, sai CCW em (u,w) e a área assinada é positiva. */
  const eixo = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalizar([
    eixo[1] * normal[2] - eixo[2] * normal[1],
    eixo[2] * normal[0] - eixo[0] * normal[2],
    eixo[0] * normal[1] - eixo[1] * normal[0],
  ]);
  if (!u) throw new Error(`adaptarThree: ${rotulo} não tem plano — a normal degenerou`);
  const w = [
    normal[1] * u[2] - normal[2] * u[1],
    normal[2] * u[0] - normal[0] * u[2],
    normal[0] * u[1] - normal[1] * u[0],
  ];
  const uv = pontos.map((p) => [p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]]);

  const restantes = uv.map((_, i) => i);
  const tris = [];
  const grau = new Array(n).fill(0);
  /* Face de 8 cantos ou mais: entre as orelhas livres corta a de melhor forma
     (soma dos lados ao quadrado sobre a área, ponderada pelos triângulos que os
     três cantos já têm). Cortar sempre a primeira orelha livre refaz o leque
     num polígono côncavo grande, como o pedaço de uma união. Face pequena
     continua cortando a primeira, o que mantém a malha de sempre. */
  const escolhe = n >= 8;
  let guarda = 2 * n;
  while (restantes.length > 3 && guarda-- > 0) {
    let cortou = -1, melhorNota = Infinity;
    for (let k = 0; k < restantes.length; k++) {
      const ia = restantes[(k + restantes.length - 1) % restantes.length];
      const ib = restantes[k];
      const ic = restantes[(k + 1) % restantes.length];
      const area = cruz2(uv[ia], uv[ib], uv[ic]);
      if (!(area > 1e-18)) continue;                       // reflexo ou colinear: não é orelha
      let livre = true;
      for (const j of restantes) {
        if (j === ia || j === ib || j === ic) continue;
        if (dentroDoTriangulo(uv[ia], uv[ib], uv[ic], uv[j])) { livre = false; break; }
      }
      if (!livre) continue;
      if (!escolhe) { cortou = k; break; }
      const q = (quad2(uv[ia], uv[ib]) + quad2(uv[ib], uv[ic]) + quad2(uv[ic], uv[ia])) / area;
      const nota = q * (1 + 0.25 * (grau[ia] + grau[ib] + grau[ic]));
      /* empate a menos de 1e-9 fica com a primeira orelha: a conta muda na última casa quando a peça é transladada */
      if (cortou < 0 || nota < melhorNota * (1 - 1e-9)) { cortou = k; melhorNota = nota; }
    }
    if (cortou < 0) {
      /* Contorno válido com cantos colineares seguidos (o vértice que a booleana ou o perfil deixam no meio de uma aresta):
         a conta acima recusa a orelha de cada vizinho, porque o canto colinear cai sobre a borda dela. A triangulação do
         núcleo trata a colinearidade (leque de outro canto, depois orelhas sem canto sobre a diagonal) e devolve null no
         contorno que de fato se cruza, que segue recusado. */
      const dele = triangularSemDegenerado(pontos);
      if (dele) return dele;
      throw new Error(`adaptarThree: ${rotulo} não fecha em orelhas (${n} cantos): contorno auto-interseccionado ou degenerado`);
    }
    const ia = restantes[(cortou + restantes.length - 1) % restantes.length];
    const ib = restantes[cortou];
    const ic = restantes[(cortou + 1) % restantes.length];
    tris.push([ia, ib, ic]);
    grau[ia]++; grau[ib]++; grau[ic]++;
    restantes.splice(cortou, 1);
  }
  if (restantes.length === 3) tris.push([restantes[0], restantes[1], restantes[2]]);
  return tris;
}

/** pontos + normal do plano + triangulação de cada face, calculados uma vez só. */
function prepararFaces(neutro) {
  const preparo = new Map();
  for (const face of neutro.F.values()) {
    const pontos = pontosDaFace(face, neutro.V);
    const normal = normalDePoligono(pontos);
    if (!normal) throw new Error(`adaptarThree: face ${face.id} é degenerada — os ${pontos.length} cantos não definem um plano`);
    preparo.set(face.id, { pontos, normal, tris: triangularPoligono(pontos, normal, `face ${face.id}`) });
  }
  return preparo;
}

/**
 * O mapa de normais SUAVES: uma normal por VÉRTICE do núcleo, somada por área
 * apenas sobre as faces marcadas `liso`.
 *
 * A regra tem duas metades e as duas importam. A primeira: `liso` é a única
 * fonte de suavização — face sem a marca continua chapada, byte por byte como
 * antes. A segunda: face chapada NÃO ENTRA na soma. É isso que impede a tampa
 * de um cilindro de entortar a normal da lateral, e é isso que dá à borda do
 * furo (chapada, coplanar com a face de entrada) uma quina limpa contra a
 * parede do furo (lisa) em vez de um borrão.
 *
 * A soma é do estado NEUTRO inteiro, antes do adaptador partir a peça em malhas
 * por parte e material: uma superfície lisa cortada por uma troca de material
 * continua lisa, sem costura na divisa.
 *
 * A soma é por CANTO: a chave é o vértice, ou o vértice e o setor dele quando
 * uma face lisa declara `quebras` (o vinco vivo da subdivisão), e a média não
 * passa por cima da quebra (`chaveDoCantoLiso`). Sem quebra a chave é o
 * próprio vértice, e a soma é a de antes.
 */
function normaisSuaves(neutro, preparo) {
  const soma = new Map();
  const porVertice = new Map();
  const chave = chaveDoCantoLiso(neutro.F.values());
  for (const face of neutro.F.values()) {
    if (!face.liso) continue;
    const { pontos, tris, normal: uFace } = preparo.get(face.id);
    const somaDaFace = new Map();
    for (const [ia, ib, ic] of tris) {
      const n = normalDoTriangulo(pontos[ia], pontos[ib], pontos[ic]);
      for (const k of [ia, ib, ic]) {
        const id = chave(face, face.vs[k]);
        const acc = soma.get(id);
        if (acc) { acc[0] += n[0]; acc[1] += n[1]; acc[2] += n[2]; } else soma.set(id, [n[0], n[1], n[2]]);
        const daFace = somaDaFace.get(id);
        if (daFace) { daFace[0] += n[0]; daFace[1] += n[1]; daFace[2] += n[2]; } else somaDaFace.set(id, [n[0], n[1], n[2]]);
      }
    }
    for (const [id, n] of somaDaFace) {
      if (!porVertice.has(id)) porVertice.set(id, []);
      porVertice.get(id).push({ u: uFace, n });
    }
  }
  const suaves = new Map();
  /* liso com ângulo: além da média global, guarda por vértice cada face lisa
     que o toca, para a média filtrada por ângulo em `triangularFace`. */
  suaves.porVertice = porVertice;
  suaves.chave = chave;
  for (const [id, acc] of soma) {
    const n = normalizar(acc);
    /* soma degenerada (normais opostas se cancelando) não vira normal nula
       silenciosa: o vértice fica de fora e cai na normal chapada da face. */
    if (n) suaves.set(id, n);
  }
  return suaves;
}

function triangularFace(face, preparo, destino, destinoNormais, destinoOrigens, destinoVertices, suaves) {
  const { pontos, normal, tris } = preparo.get(face.id);
  for (const cantos of tris) {
    /* a normal chapada do TRIÂNGULO, e não a do plano da face, para que um
       n-gon torto continue com o mesmo relevo de sempre. Só quando ela degenera
       (triângulo de área nula) o plano da face assume.

       Aqui NÃO existe uma conferência de sentido contra a normal do plano, e
       isso é medido: com ela, a mutação que devolve a triangulação ao leque
       SOBREVIVIA — o sentido era corrigido, a normal virada sumia, e o triângulo
       continuava cobrindo área fora do polígono. Guarda que conserta a aparência
       de uma geometria errada é o defeito silencioso que este arquivo veio
       consertar. Quem garante o sentido é a orelha. */
    const chapada = normalizar(normalDoTriangulo(pontos[cantos[0]], pontos[cantos[1]], pontos[cantos[2]])) ?? normal;
    for (const k of cantos) {
      destino.push(...pontos[k]);
      /* A origem acompanha somente a malha de cena. Ela permite que o modo de
         edição descubra qual face o raio acertou, mas nunca entra na receita
         nem no alvo que a bancada salva. */
      destinoOrigens.push(face.id);
      destinoVertices.push(face.vs[k]);
    }
    for (const k of cantos) {
      const suave = !face.liso ? null
        : typeof face.liso === 'number'
          ? normalLisaDoCanto(normal, face.liso, suaves.porVertice.get(suaves.chave(face, face.vs[k])) ?? [])
          : suaves.get(suaves.chave(face, face.vs[k]));
      destinoNormais.push(...(suave ?? chapada));
    }
  }
}

/**
 * Converte o estado neutro produzido por `nucleo()` em um grafo Three.js.
 * A identidade persistente vem de `face.parte`; UUIDs do Three.js nunca saem daqui.
 */
export function adaptarThree(neutro, { materiais = {}, nome = 'peca-procedural' } = {}) {
  if (!neutro?.V || !neutro?.F) throw new Error('adaptarThree: estado neutro inválido');
  if (neutro.orfaos?.length) {
    const resumo = neutro.orfaos.slice(0, 3).map((o) => `${o.op}: ${o.motivo}`).join('; ');
    throw new Error(`adaptarThree: peça contém ${neutro.orfaos.length} referência(s) inválida(s): ${resumo}`);
  }

  const raiz = new THREE.Group();
  raiz.name = nome;
  raiz.userData = { tipo: 'peca-procedural', nome };

  const catalogo = normalizarMateriais(materiais);
  const preparo = prepararFaces(neutro);
  const suaves = normaisSuaves(neutro, preparo);
  const grupos = new Map();
  const facesSemParte = [];
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (!face.parte) facesSemParte.push(face.id);
    const parte = face.parte || 'estrutura-sem-nome';
    const material = materialDaFace(face, catalogo);
    const chave = `${parte}\u0000${material.chave}`;
    let lote = grupos.get(chave);
    if (!lote) {
      lote = { parte, material, posicoes: [], normais: [], origens: [], vertices: [], faces: [] };
      grupos.set(chave, lote);
    }
    triangularFace(face, preparo, lote.posicoes, lote.normais, lote.origens, lote.vertices, suaves);
    lote.faces.push(face.id);
  }

  /* a caixa da parte inteira (todas as malhas dela), para a projeção cilíndrica de duas malhas da mesma parte coincidir */
  const posicoesDaParte = new Map();
  for (const lote of grupos.values()) {
    if (!pedeMapas(lote.material.declarado)) continue;
    if (!posicoesDaParte.has(lote.parte)) posicoesDaParte.set(lote.parte, []);
    posicoesDaParte.get(lote.parte).push(lote.posicoes);
  }

  const partes = new Map();
  for (const lote of grupos.values()) {
    let grupoParte = partes.get(lote.parte);
    if (!grupoParte) {
      grupoParte = new THREE.Group();
      grupoParte.name = lote.parte;
      grupoParte.userData = {
        tipo: 'parte-semantica',
        identidadeParte: lote.parte,
        paiSemantico: neutro.partes?.[lote.parte]?.pai ?? null,
        faces: [],
      };
      partes.set(lote.parte, grupoParte);
      raiz.add(grupoParte);
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(lote.posicoes, 3));
    /* as normais são POSTAS, não recalculadas: `computeVertexNormals()` numa
       geometria não indexada devolve sempre a normal chapada do triângulo, e era
       ela que jogava fora todo `liso` da peça. */
    geometria.setAttribute('normal', new THREE.Float32BufferAttribute(lote.normais, 3));
    geometria.setAttribute('origemFace', atributoDeIds(lote.origens, 'face'));
    /* Como a face, a origem do vértice só acompanha esta geometria de cena.
       Uma mesma coordenada pode ocorrer em diversos triângulos não indexados;
       este elo permite atualizá-los todos durante a prévia de edição. */
    geometria.setAttribute('origemVertice', atributoDeIds(lote.vertices, 'vértice'));
    let medidas = null;
    if (pedeMapas(lote.material.declarado)) {
      const eixo = lote.material.declarado.relevo?.eixo ?? 'y';
      const parteCaixa = caixaDaParte(posicoesDaParte.get(lote.parte).flat(), eixo);
      const proj = projecaoDoMaterial(lote.material.declarado, lote.posicoes, parteCaixa);
      const { relevo, metrosPorTile } = proj;
      medidas = proj.medidas;
      geometria.setAttribute('uv', new THREE.Float32BufferAttribute(coordenadasDeTextura(lote.posicoes, relevo, metrosPorTile, parteCaixa), 2));
    }
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();

    const malha = new THREE.Mesh(geometria, criarMaterial(lote.material, medidas));
    malha.name = `${lote.parte}:${grupoParte.children.length}`;
    malha.castShadow = true;
    malha.receiveShadow = true;
    malha.userData = {
      tipo: 'superficie',
      identidadeParte: lote.parte,
      faces: lote.faces.slice(),
    };
    grupoParte.userData.faces.push(...lote.faces);
    grupoParte.add(malha);
  }

  raiz.userData.partes = [...partes.keys()].sort();
  raiz.userData.hierarquia = raiz.userData.partes.map((nome) => ({
    nome,
    pai: neutro.partes?.[nome]?.pai ?? null,
  }));
  raiz.userData.diagnosticos = {
    facesSemParte: facesSemParte.slice(),
  };
  return {
    raiz,
    partes,
    diagnosticos: {
      facesSemParte,
      semanticaIntegra: facesSemParte.length === 0,
    },
    estatisticas: {
      verticesNeutros: neutro.V.size,
      facesNeutras: neutro.F.size,
      triangulos: [...grupos.values()].reduce((total, lote) => total + lote.posicoes.length / 9, 0),
      partes: partes.size,
      facesSemParte: facesSemParte.length,
    },
  };
}
