/* textura.test.js — material por parte, arquivo .mtl, usemtl, coordenadas vt em mapeamento planar e recusas. */
import { describe, expect, it } from 'vitest';
import { ErroExportacaoObj, exportarObj, validarTexturas } from '../src/index.js';

const pontosCubo = [
  [0, 0, 0], [0.02, 0, 0], [0.02, 0.03, 0], [0, 0.03, 0],
  [0, 0, 0.04], [0.02, 0, 0.04], [0.02, 0.03, 0.04], [0, 0.03, 0.04],
];
const triangulosCubo = [
  [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
  [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
];

function cuboComMaterial(material = 'madeira') {
  const V = new Map(pontosCubo.map((p, i) => [i, p]));
  const F = new Map(triangulosCubo.map((t, i) => [i, { id: i, vs: t, parte: 'cubo', material }]));
  return { V, F };
}

const TEXTURAS = { madeira: { arquivo: 'madeira.png', metrosPorTile: 0.5 } };

describe('material e textura no OBJ', () => {
  it('escreve mtllib, usemtl e f com coordenada de textura quando há texturas', async () => {
    const out = await exportarObj({ nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: TEXTURAS });

    expect(out.texto).toContain('mtllib cubo.mtl');
    expect(out.texto).toContain('usemtl madeira');
    expect(out.texto).toMatch(/f \d+\/\d+\/\d+ \d+\/\d+\/\d+ \d+\/\d+\/\d+/);
    expect(out.diagnostico.texturizado).toBe(true);
    expect(out.diagnostico.totalTriangulos).toBe(12);
  });

  it('gera o .mtl com newmtl, Kd e map_Kd apontando para o arquivo da textura', async () => {
    const out = await exportarObj({ nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: TEXTURAS });

    expect(out.nomeMtl).toBe('cubo.mtl');
    expect(out.mtl).toContain('newmtl madeira');
    expect(out.mtl).toContain('Kd 1 1 1');
    expect(out.mtl).toContain('map_Kd madeira.png');
    expect(out.materiais).toEqual([{ material: 'madeira', arquivo: 'madeira.png', metrosPorTile: 0.5 }]);
  });

  it('calcula u,v pelo plano do eixo dominante em metros divididos por metrosPorTile', async () => {
    // Face com normal em z: o plano é o xy. Vértices (0,0), (0.02,0.03) e (0.02,0) em metros, com tile de 0,5 m.
    const out = await exportarObj({ nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: TEXTURAS });
    const vts = out.texto.split('\n').filter((l) => l.startsWith('vt '));

    expect(vts[0]).toBe('vt 0 0');
    expect(vts[1]).toBe('vt 0.04 0.06');
    expect(vts[2]).toBe('vt 0.04 0');
  });

  it('projeta no plano yz quando o eixo dominante da normal é x', async () => {
    const V = new Map([[0, [0.02, 0, 0]], [1, [0.02, 0.03, 0]], [2, [0.02, 0, 0.04]]]);
    const F = new Map([[0, { id: 0, vs: [0, 1, 2], parte: 'lateral', material: 'madeira' }]]);

    const out = await exportarObj({ nome: 'lateral', neutro: { V, F }, unidade: 'm', texturas: TEXTURAS });
    const vts = out.texto.split('\n').filter((l) => l.startsWith('vt '));

    // y e z em metros divididos por 0,5: (0,0), (0.06,0), (0,0.08)
    expect(vts).toEqual(['vt 0 0', 'vt 0.06 0', 'vt 0 0.08']);
  });

  it('separa o uso de material por parte com usemtl dentro de cada objeto', async () => {
    const base = cuboComMaterial('madeira');
    const topo = cuboComMaterial('metal');
    const V = new Map([...base.V, ...[...topo.V].map(([id, p]) => [id + 100, [p[0], p[1], p[2] + 1]])]);
    const F = new Map([
      ...base.F,
      ...[...topo.F].map(([id, f]) => [id + 100, { ...f, id: id + 100, vs: f.vs.map((v) => v + 100), parte: 'topo' }]),
    ]);

    const out = await exportarObj({
      nome: 'conjunto',
      neutro: { V, F },
      unidade: 'm',
      texturas: { ...TEXTURAS, metal: { arquivo: 'metal.png', metrosPorTile: 1 } },
    });

    expect(out.texto).toContain('o cubo');
    expect(out.texto).toContain('o topo');
    expect(out.texto).toContain('usemtl madeira');
    expect(out.texto).toContain('usemtl metal');
    expect(out.mtl).toContain('newmtl metal');
  });

  it('nomeia o .mtl pela opção nomeMtl quando o chamador pede', async () => {
    const out = await exportarObj({
      nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: TEXTURAS, nomeMtl: 'caixa.mtl',
    });

    expect(out.texto).toContain('mtllib caixa.mtl');
    expect(out.nomeMtl).toBe('caixa.mtl');
  });

  it('trata texturas vazias como ausentes, sem .mtl', async () => {
    const out = await exportarObj({ nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: {} });

    expect(out.mtl).toBeNull();
    expect(out.texto).not.toContain('mtllib');
    expect(out.diagnostico.texturizado).toBe(false);
  });

  it('recusa face cujo material não tem textura declarada', async () => {
    await expect(exportarObj({
      nome: 'cubo', neutro: cuboComMaterial('aco'), unidade: 'm', texturas: TEXTURAS,
    })).rejects.toMatchObject({ codigo: 'material-sem-textura' });
  });

  it('recusa face sem material quando há texturas pedidas', async () => {
    const neutro = cuboComMaterial();
    neutro.F.get(0).material = undefined;

    await expect(exportarObj({ nome: 'cubo', neutro, unidade: 'm', texturas: TEXTURAS }))
      .rejects.toMatchObject({ codigo: 'face-sem-material' });
  });
});

describe('validação das texturas', () => {
  it('aceita a forma { material: { arquivo, metrosPorTile } } e devolve um Map ordenado', () => {
    const mapa = validarTexturas({ metal: { arquivo: 'metal.png', metrosPorTile: 1 }, madeira: { arquivo: 'madeira.jpg', metrosPorTile: 0.5 } });

    expect([...mapa.keys()]).toEqual(['madeira', 'metal']);
    expect(mapa.get('madeira')).toEqual({ material: 'madeira', arquivo: 'madeira.jpg', metrosPorTile: 0.5 });
  });

  it('recusa metrosPorTile que não é positivo e finito', () => {
    expect(() => validarTexturas({ madeira: { arquivo: 'm.png', metrosPorTile: 0 } })).toThrowError(ErroExportacaoObj);
    expect(() => validarTexturas({ madeira: { arquivo: 'm.png', metrosPorTile: Infinity } })).toThrowError(/metrosPorTile/);
  });

  it('recusa arquivo com pasta, extensão não suportada ou nome de material com espaço', () => {
    expect(() => validarTexturas({ madeira: { arquivo: '../m.png', metrosPorTile: 1 } })).toThrowError(/sem pasta/);
    expect(() => validarTexturas({ madeira: { arquivo: 'm.gif', metrosPorTile: 1 } })).toThrowError(/sem pasta/);
    expect(() => validarTexturas({ 'madeira clara': { arquivo: 'm.png', metrosPorTile: 1 } })).toThrowError(/Nome de material/);
  });

  it('recusa nomeMtl que não termina em .mtl ou leva pasta', async () => {
    await expect(exportarObj({ nome: 'cubo', neutro: cuboComMaterial(), unidade: 'm', texturas: TEXTURAS, nomeMtl: 'a/b.mtl' }))
      .rejects.toMatchObject({ codigo: 'nome-mtl-invalido' });
  });
});
