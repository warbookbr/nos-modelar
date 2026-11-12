/* regularidade-da-crista.test.mjs — a régua da regularidade de uma crista ao longo dela (plano de conferência, fatia 6).
 *
 * O caso é o do furgão realista: o gancho no canto de cima da coluna do para-brisa, que a `vinco-oculto` não acusa porque dá a média da cadeia inteira. A
 * fixture da coluna (`tools/fixtures/vinco-da-coluna/coluna-do-furgao.json`, da fatia 1) basta: a régua acha nela o nó, com a posição e os números. A
 * régua tem de ficar calada numa crista sem defeito: a crista transversal de trás do mesmo furgão (`crista-regular-do-furgao.json`, 2070,9 mm, 64
 * arestas) e uma crista sintética reta, que com um gancho de um só vértice passa a ser acusada, para provar a sensibilidade sem depender do furgão. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { imagemDoAchado, lerArgumentos, regularidadeDaSuperficie, textoDoAchado } from './regularidade-da-crista.mjs';
import { ErroDoModelo } from './modelo-aberto.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const fixture = (nome) => {
  const bruto = JSON.parse(readFileSync(join(AQUI, '../fixtures/vinco-da-coluna', nome), 'utf8'));
  return { ...bruto, partes: bruto.partes.map((p) => new Set(p)), gaiola: { vertices: [] }, nomeDe: () => null };
};

/* uma crista sintética: N estações a 10 mm uma da outra ao longo de z, cada uma com três vértices (esquerda, cume, direita), e as faces entre estações
   vizinhas em dois quadriláteros; a aresta do cume tem o diedro `diedro` graus. `gancho` desvia o cume das últimas estações de lado, `salto` muda o diedro da
   estação indicada. Em metro, como a superfície de verdade. */
function cristaSintetica({ estacoes = 30, diedro = 20, gancho = null, salto = null } = {}) {
  const vertices = []; const faces = [];
  const meia = Math.tan(((diedro / 2) * Math.PI) / 180);
  const alturaDe = (i) => (salto && i === salto.estacao ? Math.tan(((salto.diedro / 2) * Math.PI) / 180) : meia);
  for (let i = 0; i < estacoes; i += 1) {
    const z = i * 0.01;
    const lado = gancho && i >= gancho.de ? (i - gancho.de + 1) * gancho.passo : 0;
    const h = alturaDe(i) * 0.03;
    vertices.push([-0.03 + lado, 0, z], [lado, h, z], [0.03 + lado, 0, z]);
  }
  for (let i = 0; i + 1 < estacoes; i += 1) {
    const a = 3 * i; const b = 3 * (i + 1);
    faces.push([a, a + 1, b + 1, b], [a + 1, a + 2, b + 2, b + 1]);
  }
  return { vertices, faces, vincos: [], partes: vertices.map(() => new Set(['chapa'])), gaiola: { vertices: [] }, nomeDe: () => null };
}

describe('a régua da regularidade da crista: o nó da coluna do furgão', () => {
  const sup = fixture('coluna-do-furgao.json');
  const r = regularidadeDaSuperficie(sup);
  const lacuna = r.achados.find((a) => a.tipo === 'lacuna'); const virada = r.achados.find((a) => a.tipo === 'virada');
  const diedros = r.achados.filter((a) => a.tipo === 'diedro');

  it('a vizinhança tem as duas cadeias da fatia 1, e a régua acusa três coisas no gancho, a lacuna primeiro', () => {
    expect(r.cadeias.map((c) => [c.comprimentoMm, c.arestas])).toEqual([[830.6, 53], [272.8, 12]]);
    expect(r.achados.map((a) => a.tipo)).toEqual(['lacuna', 'virada', 'diedro']);
  });

  it('a lacuna: a coluna acaba a 39,1 mm da cadeia do canto, com 32 mm de lado, em [909,1; 2146,4; 1242,2] mm', () => {
    expect(lacuna).toMatchObject({ parte: 'carroceria', valor: 39.1, posicaoMm: [909.1, 2146.4, 1242.2], pontaMm: [910.1, 2130.5, 1253.6], outraPontaMm: [908.1, 2162.3, 1230.9], cadeias: [0, 1] });
    expect(lacuna.desvioDeLadoMm).toBeGreaterThan(30); expect(lacuna.desvioDeLadoMm).toBeLessThan(34);
    expect(lacuna.anguloEntreCadeiasGraus).toBeGreaterThan(60);
    expect(lacuna.vizinhanca).toBeGreaterThan(10); expect(lacuna.vizinhanca).toBeLessThan(25); // as arestas das pontas, para ler a lacuna em arestas
  });

  it('a virada: a direção da crista muda 64,1 graus em 15 mm no último vértice da coluna, contra 10 graus nas vizinhas, em [896,4; 2125,3; 1267] mm', () => {
    expect(virada).toMatchObject({ parte: 'carroceria', valor: 64.1, posicaoMm: [896.4, 2125.3, 1267], cadeia: 0 });
    expect(virada.vizinhanca).toBeLessThan(virada.valor / 3);
    expect(virada.sMm).toBeLessThan(25); // perto da ponta do gancho, que é a primeira da cadeia
  });

  it('o salto do diedro: uma aresta de 31,5 graus contra 25,9 nas vizinhas, a 49 mm da ponta do gancho; o resto da coluna, de 14 a 26 graus, e a cadeia do canto não são acusados', () => {
    expect(diedros).toHaveLength(1);
    expect(diedros[0]).toMatchObject({ cadeia: 0, valor: 31.5, vizinhanca: 25.9, arestas: 1, posicaoMm: [899.4, 2102.6, 1283.5] });
    expect(diedros[0].sMm).toBeGreaterThan(40); expect(diedros[0].sMm).toBeLessThan(60);
    /* a crista afina nas pontas (o diedro cai de 14 a 20 graus nas últimas arestas de toda cadeia), e isso não é acusado */
    expect(r.cadeias[1].achados).toEqual([]);
  });

  it('a régua olha a cadeia inteira mesmo quando a região de antes a aceitava: ela não conhece a aceitação', () => {
    /* a `vinco-oculto` separa o aceito do resto; esta régua mede a cadeia e deixa a decisão de a feição ser desenho à pessoa */
    expect(r.cadeias).toHaveLength(2);
    expect(r.opcoes).toMatchObject({ janelaMm: 15, saltoDiedroGraus: 4, viradaMinimaGraus: 30, lacunaMaximaMm: 60 });
  });

  it('o texto diz posição, valor e vizinhança, e que a régua só aponta o lugar', () => {
    const t = textoDoAchado(virada);
    expect(t).toContain('[896.4; 2125.3; 1267] mm');
    expect(t).toContain('64,1 graus');
    expect(t).toContain('10,1 nas vizinhas');
    expect(t).toContain('a régua só aponta o lugar');
    expect(textoDoAchado(lacuna)).toContain('39,1 mm de outra cadeia');
    expect(textoDoAchado(diedros[0])).toContain('graus de diedro contra');
  });

  it('a mesma superfície dá o mesmo resultado (determinismo)', () => {
    const outra = regularidadeDaSuperficie(fixture('coluna-do-furgao.json'));
    expect(JSON.stringify(outra.achados)).toBe(JSON.stringify(r.achados));
  });

  it('a vista de perto só da chapa em volta do achado: caixa de 120 mm de cada lado, as duas cadeias em vermelho e o ponto em amarelo', () => {
    const im = imagemDoAchado(sup, r.cadeias, lacuna, { largura: 300, raioMm: 120 });
    expect(im.imagem.largura).toBe(300);
    expect(im.mmPorPx).toBeGreaterThan(240 / 300); expect(im.mmPorPx).toBeLessThan(240 * Math.sqrt(3) / 300); // a caixa projetada de lado a lado, na câmera de fora
    expect(im.faces).toBeGreaterThan(100);
    let vermelho = 0; let amarelo = 0;
    for (let i = 0; i < im.imagem.dados.length; i += 3) {
      const [a, b, c] = [im.imagem.dados[i], im.imagem.dados[i + 1], im.imagem.dados[i + 2]];
      if (a === 220 && b === 30 && c === 30) vermelho += 1;
      if (a === 255 && b === 215 && c === 0) amarelo += 1;
    }
    expect(vermelho).toBeGreaterThan(200); expect(amarelo).toBeGreaterThan(20);
    /* o mesmo achado com a vista de lado pedida: a câmera muda, a caixa não */
    const lateral = imagemDoAchado(sup, r.cadeias, lacuna, { vista: 'direita', largura: 300, raioMm: 120 });
    expect(lateral.direcao).toEqual([1, 0, 0]);
    expect(() => imagemDoAchado(sup, r.cadeias, { ...lacuna, posicaoMm: [9000, 9000, 9000] }, { largura: 300 })).toThrow(ErroDoModelo);
  });
});

describe('a régua fica calada na crista sem defeito', () => {
  it('a crista transversal de trás do furgão, 2070,9 mm e 64 arestas, não tem achado nenhum', () => {
    const r = regularidadeDaSuperficie(fixture('crista-regular-do-furgao.json'));
    expect(r.cadeias).toHaveLength(1);
    expect(r.cadeias[0]).toMatchObject({ comprimentoMm: 2070.9, arestas: 64 });
    expect(r.cadeias[0].diedroGraus.min).toBeGreaterThan(16); expect(r.cadeias[0].diedroGraus.max).toBeLessThan(26);
    expect(r.achados).toEqual([]);
  });

  it('a crista sintética reta e de diedro constante: uma cadeia, nenhum achado', () => {
    const r = regularidadeDaSuperficie(cristaSintetica());
    expect(r.cadeias).toHaveLength(1);
    expect(r.cadeias[0]).toMatchObject({ arestas: 29, comprimentoMm: 290, diedroGraus: { min: 20, max: 20 } });
    expect(r.achados).toEqual([]);
  });

  it('a mesma crista com o cume desviado de lado nas três últimas estações acusa a virada e diz onde', () => {
    const r = regularidadeDaSuperficie(cristaSintetica({ gancho: { de: 27, passo: 0.012 } }));
    const virada = r.achados.find((a) => a.tipo === 'virada');
    expect(virada).toBeDefined();
    expect(virada.valor).toBeGreaterThanOrEqual(30);
    expect(virada.vizinhanca).toBeLessThan(5);
    expect(virada.posicaoMm[2]).toBeGreaterThan(250); // no fim da crista, em z, onde o desvio começa
  });

  it('a mesma crista com um diedro de 32 graus numa estação acusa o salto do diedro, com a vizinhança de 20', () => {
    const r = regularidadeDaSuperficie(cristaSintetica({ salto: { estacao: 15, diedro: 32 } }));
    const d = r.achados.filter((a) => a.tipo === 'diedro');
    expect(d.length).toBeGreaterThan(0);
    expect(d[0].vizinhanca).toBe(20);
    expect(d[0].valor).toBeGreaterThan(24);
    expect(d[0].posicaoMm[2]).toBeGreaterThan(130); expect(d[0].posicaoMm[2]).toBeLessThan(180);
  });
});

describe('a linha de comando', () => {
  it('lê os argumentos e recusa o que não conhece', () => {
    const a = lerArgumentos(['furgao-realista', '--ate-subdivisao=1', '--imagem=x.png', '--achado=2', '--raio=80', '--virada=25', '--lacuna=40', '--completo']);
    expect(a).toMatchObject({ alvo: 'furgao-realista', ateSubdivisao: 1, imagem: 'x.png', achado: 2, raio: 80, completo: true, opcoes: { viradaMinimaGraus: 25, lacunaMaximaMm: 40 } });
    expect(() => lerArgumentos([])).toThrow(/falta a peça/);
    expect(() => lerArgumentos(['p', '--ate-passo=1', '--ate-subdivisao=1'])).toThrow(/um só/);
    expect(() => lerArgumentos(['p', '--nada=1'])).toThrow(/desconhecido/);
    expect(() => lerArgumentos(['p', '--achado=0'])).toThrow(/inteiro/);
  });

  it('roda numa receita pequena pelo nome: sem subdivisão não há cadeia, e a CLI diz que a régua mede a superfície de subdivisão', async () => {
    const { executar } = await import('./regularidade-da-crista.mjs');
    const r = await executar(['peca-de-prova']);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^receita peca-de-prova/);
    expect(r.stdout).toContain('a régua aponta onde olhar');
    const esb = join(mkdtempSync(join(tmpdir(), 'crista-')), 'e.esboco.json');
    writeFileSync(esb, JSON.stringify({ opcoes: [{ titulo: 'x', formas: [{ id: 'b', op: 'cubo', args: { larg: 10, alt: 10, prof: 10 }, centro: [0, 0, 0] }] }] }));
    const e = await executar([esb]);
    expect(e.codigo).toBe(2); expect(e.stderr).toMatch(/receita de peça/);
  });
});
