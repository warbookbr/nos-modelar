/* exportador-gltf.test.js — estrutura do glTF, extensões, TEXCOORD só com relevo, determinismo, unidade e o validador oficial. */
import { describe, expect, it } from 'vitest';
import validator from 'gltf-validator';
import { ErroExportacaoGltf, exportarGltf, lerGlb } from '../src/index.js';
import receitaDeProva, { MATERIAIS as MATERIAIS_DA_PROVA } from '../../../tools/fixtures/acervo/materiais-de-prova/receita.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { coordenadasDeTextura } from '../../../src/autoria/coordenada-de-textura.js';

/* um cubo de 0,2 x 0,1 x 0,05 m, parte 'caixa' */
function cubo(material, extra = {}) {
  const pts = [[0, 0, 0], [0.2, 0, 0], [0.2, 0.1, 0], [0, 0.1, 0], [0, 0, 0.05], [0.2, 0, 0.05], [0.2, 0.1, 0.05], [0, 0.1, 0.05]];
  const tris = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
  return {
    V: new Map(pts.map((p, i) => [i, p])),
    F: new Map(tris.map((t, i) => [i, { id: i, vs: t, parte: 'caixa', ...(material ? { material } : {}), ...extra }])),
  };
}

const lerAcessor = (r, i) => {
  const a = r.json.accessors[i];
  const v = r.json.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const Tipo = a.componentType === 5125 ? Uint32Array : Float32Array;
  return new Tipo(r.bin.buffer.slice(r.bin.byteOffset + v.byteOffset, r.bin.byteOffset + v.byteOffset + a.count * n * Tipo.BYTES_PER_ELEMENT));
};

describe('exportador glTF: estrutura', () => {
  it('escreve um .glb 2.0 válido, uma malha por parte com o nome dela, em metro e y para cima', () => {
    const r = exportarGltf({ nome: 'cubo', neutro: cubo('tinta'), materiais: { tinta: { cor: '#336699' } } });
    const { json } = lerGlb(r.bytes);
    expect(json.asset.version).toBe('2.0');
    expect(json.asset.extras).toEqual({ unidade: 'm', eixoParaCima: 'y' });
    expect(json.meshes.map((m) => m.name)).toEqual(['caixa']);
    expect(json.nodes[0]).toMatchObject({ name: 'caixa', mesh: 0 });
    expect(r.extensao).toBe('.glb');
    expect(r.diagnostico.triangulos).toBe(12);
    const posicao = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    /* a unidade: o cubo de 0,2 m de comprimento sai com 0,2, sem escala */
    expect(posicao.max[0] - posicao.min[0]).toBeCloseTo(0.2, 6);
    expect(posicao.max[1] - posicao.min[1]).toBeCloseTo(0.1, 6);
    expect(posicao.max[2] - posicao.min[2]).toBeCloseTo(0.05, 6);
    /* normal chapada: 4 cantos por face do cubo */
    expect(posicao.count).toBe(24);
  });

  it('põe o ambiente em extras da cena e recusa nome desconhecido', () => {
    expect(exportarGltf({ neutro: cubo() }).json.scenes[0].extras.ambiente).toBe('estudio');
    expect(exportarGltf({ neutro: cubo(), ambiente: 'ceu' }).json.scenes[0].extras.ambiente).toBe('ceu');
    expect(() => exportarGltf({ neutro: cubo(), ambiente: 'lua' })).toThrow(ErroExportacaoGltf);
  });

  it('recusa campo de material desconhecido com o nome do campo e face sem parte', () => {
    expect(() => exportarGltf({ neutro: cubo('t'), materiais: { t: { brilhoo: 1 } } })).toThrow(/brilhoo/);
    const n = cubo();
    n.F.get(0).parte = '';
    expect(() => exportarGltf({ neutro: n })).toThrow(/parte/);
  });

  it('uma primitiva por material dentro da parte, e duas partes viram duas malhas em ordem de nome', () => {
    const n = cubo('a');
    for (let i = 6; i < 12; i += 1) n.F.get(i).material = 'b';
    for (let i = 0; i < 2; i += 1) n.F.get(i).parte = 'alfa';
    const { json } = exportarGltf({ neutro: n, materiais: { a: { cor: '#ff0000' }, b: { cor: '#00ff00' } } });
    expect(json.meshes.map((m) => m.name)).toEqual(['alfa', 'caixa']);
    expect(json.meshes[1].primitives).toHaveLength(2);
    expect(json.materials.map((m) => m.name)).toEqual(['a', 'b']);
  });
});

describe('exportador glTF: materiais e extensões', () => {
  const mat = (def) => exportarGltf({ neutro: cubo('m'), materiais: { m: def } }).json;

  it('o material sem campo novo é só pbrMetallicRoughness, sem extensão nem textura', () => {
    const j = mat({ cor: '#808080', aspereza: 0.4, metalicidade: 0.2 });
    expect(j.materials[0].pbrMetallicRoughness).toMatchObject({ roughnessFactor: 0.4, metallicFactor: 0.2 });
    expect(j.materials[0].extensions).toBeUndefined();
    expect(j.extensionsUsed).toBeUndefined();
    expect(j.textures).toBeUndefined();
  });

  it('o verniz sai em KHR_materials_clearcoat', () => {
    const j = mat({ verniz: 0.8, asperezaDoVerniz: 0.1 });
    expect(j.materials[0].extensions.KHR_materials_clearcoat).toEqual({ clearcoatFactor: 0.8, clearcoatRoughnessFactor: 0.1 });
    expect(j.extensionsUsed).toEqual(['KHR_materials_clearcoat']);
  });

  it('o vidro sai com transmissão, volume (o tom) e índice de refração, e só a face da frente', () => {
    const j = mat({ mistura: 'transparente', opacidade: 0.25, transmissao: 1, indiceDeRefracao: 1.45, tomDoVidro: '#a8cdbd' });
    const m = j.materials[0];
    expect(m.extensions.KHR_materials_transmission).toEqual({ transmissionFactor: 1 });
    expect(m.extensions.KHR_materials_ior).toEqual({ ior: 1.45 });
    expect(m.extensions.KHR_materials_volume.attenuationColor).toHaveLength(3);
    expect(m.extensions.KHR_materials_volume.attenuationDistance).toBe(0.02);
    expect(m.doubleSided).toBe(false);
    /* com transmissão a opacidade não entra: o vidro já transmite */
    expect(m.alphaMode).toBeUndefined();
    expect(m.pbrMetallicRoughness.baseColorFactor[3]).toBe(1);
  });

  it('a transparência simples sai como alphaMode BLEND com a opacidade no alfa', () => {
    const m = mat({ mistura: 'transparente', opacidade: 0.4 }).materials[0];
    expect(m.alphaMode).toBe('BLEND');
    expect(m.pbrMetallicRoughness.baseColorFactor[3]).toBe(0.4);
    expect(m.doubleSided).toBe(true);
  });

  it('a cor sai em luz linear', () => {
    const [r, g, b] = mat({ cor: '#ffffff' }).materials[0].pbrMetallicRoughness.baseColorFactor;
    expect([r, g, b]).toEqual([1, 1, 1]);
    expect(mat({ cor: '#808080' }).materials[0].pbrMetallicRoughness.baseColorFactor[0]).toBeCloseTo(0.2159, 3);
  });
});

describe('exportador glTF: relevo, flocos e coordenada de textura', () => {
  it('sem relevo nem flocos não há TEXCOORD_0, e com relevo há, igual ao da bancada', () => {
    const liso = exportarGltf({ neutro: cubo('m'), materiais: { m: { cor: '#555555' } } });
    expect(liso.json.meshes[0].primitives[0].attributes.TEXCOORD_0).toBeUndefined();

    const relevo = { tipo: 'prismas', escala: 6, intensidade: 0.5 };
    const r = exportarGltf({ neutro: cubo('m'), materiais: { m: { relevo } } });
    const prim = r.json.meshes[0].primitives[0];
    expect(prim.attributes.TEXCOORD_0).toBeDefined();
    const mat = r.json.materials[prim.material];
    expect(mat.normalTexture.index).toBeGreaterThanOrEqual(0);
    expect(mat.pbrMetallicRoughness.metallicRoughnessTexture.index).toBeGreaterThanOrEqual(0);
    expect(r.json.images.every((i) => i.mimeType === 'image/png')).toBe(true);

    /* cada vértice do arquivo carrega a uv que a função da bancada dá ao canto dele */
    const pos = lerAcessor(r, prim.attributes.POSITION);
    const uv = lerAcessor(r, prim.attributes.TEXCOORD_0);
    const ind = lerAcessor(r, prim.indices);
    const tri = new Float32Array(ind.length * 3);
    ind.forEach((v, k) => tri.set(pos.subarray(3 * v, 3 * v + 3), 3 * k));
    const esperado = coordenadasDeTextura(tri, { projecao: 'caixa', eixo: 'y' }, 4 * 0.006);
    ind.forEach((v, k) => {
      expect(uv[2 * v]).toBeCloseTo(esperado[2 * k], 4);
      expect(uv[2 * v + 1]).toBeCloseTo(esperado[2 * k + 1], 4);
    });
  });

  it('o PNG embutido tem as cores da convenção: normal azulada, aspereza com R e B inteiros', async () => {
    const { PNG } = await import('pngjs');
    const r = exportarGltf({ neutro: cubo('m'), materiais: { m: { relevo: { tipo: 'granulado' } } } });
    const mat = r.json.materials[0];
    const png = (i) => {
      const v = r.json.bufferViews[r.json.images[r.json.textures[i].source].bufferView];
      return PNG.sync.read(Buffer.from(r.bin.subarray(v.byteOffset, v.byteOffset + v.byteLength)));
    };
    const n = png(mat.normalTexture.index);
    let b = 0;
    for (let p = 0; p < n.width * n.height; p += 1) b += n.data[p * 4 + 2];
    expect(b / (n.width * n.height)).toBeGreaterThan(200);
    const a = png(mat.pbrMetallicRoughness.metallicRoughnessTexture.index);
    expect([a.data[0], a.data[2], a.data[3]]).toEqual([255, 255, 255]);
  });

  it('flocos sem relevo dão uv e só a textura de aspereza; com relevo, a de flocos ganha KHR_texture_transform', () => {
    const f = exportarGltf({ neutro: cubo('m'), materiais: { m: { flocos: 0.5 } } });
    expect(f.json.meshes[0].primitives[0].attributes.TEXCOORD_0).toBeDefined();
    expect(f.json.materials[0].normalTexture).toBeUndefined();
    expect(f.json.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.extensions).toBeUndefined();

    const j = exportarGltf({ neutro: cubo('m'), materiais: { m: { flocos: 0.5, relevo: { tipo: 'granulado' } } } }).json;
    expect(j.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.extensions.KHR_texture_transform.scale[0]).toBeGreaterThan(0);
    expect(j.extensionsUsed).toContain('KHR_texture_transform');
  });
});

describe('exportador glTF: determinismo', () => {
  it('duas execuções da peça de prova dão os mesmos bytes', () => {
    const rodar = () => exportarGltf({ nome: 'prova', neutro: executarReceita(receitaDeProva).neutro, materiais: MATERIAIS_DA_PROVA });
    const a = rodar();
    const b = rodar();
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
    expect(a.bytes.length).toBeGreaterThan(100000);
  });
});

describe('exportador glTF: validador oficial', () => {
  it('a peça de prova passa sem erro, com o verniz, o vidro e o relevo declarados', async () => {
    const r = exportarGltf({ nome: 'prova', neutro: executarReceita(receitaDeProva).neutro, materiais: MATERIAIS_DA_PROVA, ambiente: 'ceu' });
    const v = await validator.validateBytes(r.bytes, { uri: 'prova.glb', maxIssues: 0 });
    expect(v.issues.numErrors).toBe(0);
    expect(r.json.extensionsUsed).toEqual(['KHR_materials_clearcoat', 'KHR_materials_ior', 'KHR_materials_transmission', 'KHR_materials_volume']);
    const comUv = r.json.meshes.flatMap((m) => m.primitives).filter((p) => p.attributes.TEXCOORD_0 !== undefined).length;
    expect(comUv).toBe(4);
  });

  it('um cubo com tudo declarado passa sem erro', async () => {
    const r = exportarGltf({
      neutro: cubo('m'),
      materiais: { m: { cor: '#445566', verniz: 1, transmissao: 0.5, indiceDeRefracao: 1.7, tomDoVidro: '#aabbcc', emissivo: 2, flocos: 0.4, relevo: { tipo: 'prismas' } } },
    });
    const v = await validator.validateBytes(r.bytes, { uri: 'cubo.glb', maxIssues: 0 });
    expect(v.issues.numErrors).toBe(0);
  });
});
