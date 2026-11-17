/* Testes da prancha modelo e foto (régua, região, plano, pedido, montagem no navegador) e da cópia de parte repetida da bancada. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { ajustarCamera, lerCopia } from './olhar-bancada.mjs';
import {
  PONTOS_DA_ESCALA, comoCLI, disporPrancha, eixosDaVista, escalaDaVista, extensaoNaImagem, fundoDaCaixa, lerPedido, lerRegiao, lerRegua, lerVistas,
  passoDaRegua, porVista, prancharReferencia, caixaDoContornoSvg, lerPranchaDesenhada,
  aoReferencialDaPeca, disporContorno, pontoDoContorno, prancharContorno, projetorDaVista, vistaNaPeca,
  TRACEJADO_DO_ENCONTRO, encontrosDoAnel, ladosDaCaixaNoEncontro, ladosEmTexto, trechosDoAnel,
} from './prancha-de-referencia.mjs';

const REPO = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
mkdirSync(join(REPO, 'tmp'), { recursive: true });

/* Uma imagem RGBA lisa com um retângulo de outra cor: a extensão esperada é o retângulo. */
function imagem(largura, altura, fundo, caixa, cor) {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const dentro = x >= caixa[0] && x < caixa[2] && y >= caixa[1] && y < caixa[3];
      png.data.set([...(dentro ? cor : fundo), 255], (y * largura + x) * 4);
    }
  }
  return png;
}

describe('régua, região e vistas', () => {
  it('lê a régua por comprimento e por dois pontos', () => {
    expect(lerRegua('649=670')).toMatchObject({ px: 649, mm: 670 });
    const r = lerRegua('1162,738,1811,738=670');
    expect(r.px).toBe(649);
    expect(r.pxPorMm).toBeCloseTo(649 / 670, 9);
    expect(lerRegua('0,0,30,40=10').px).toBe(50);
  });
  it('recusa régua sem mm, com mm nulo ou com três números, dizendo a forma', () => {
    expect(() => lerRegua('649')).toThrow(/<px>=<mm>/);
    expect(() => lerRegua('649=0')).toThrow(/maior que zero/);
    expect(() => lerRegua('1,2,3=10')).toThrow(/3 número/);
    expect(() => lerRegua('5,5,5,5=10')).toThrow(/px precisa ser maior/);
  });
  it('lê a região em qualquer ordem de cantos, e auto como nula', () => {
    expect(lerRegiao('870,240,560,110')).toEqual([560, 110, 870, 240]);
    expect(lerRegiao('auto')).toBeNull();
    expect(() => lerRegiao('1,2,3')).toThrow(/x0,y0,x1,y1/);
    expect(() => lerRegiao('10,10,11,40')).toThrow(/2 px/);
  });
  it('dá um valor por vista, ou o mesmo a todas, e recusa contagem diferente', () => {
    expect(porVista('a.jpg', ['direita', 'frontal'], 'foto')).toEqual(['a.jpg', 'a.jpg']);
    expect(porVista('a.jpg;b.webp', ['direita', 'frontal'], 'foto')).toEqual(['a.jpg', 'b.webp']);
    expect(() => porVista('a;b;c', ['direita', 'frontal'], 'foto')).toThrow(/3 valores.*2/);
  });
  it('aceita só vistas ortográficas de eixo', () => {
    expect(lerVistas('direita,frontal')).toEqual(['direita', 'frontal']);
    expect(() => lerVistas('isometrica')).toThrow(/ortográfica de eixo/);
    expect(() => lerVistas('direita,direita')).toThrow(/repete/);
  });
});

describe('escala do modelo pela projeção da bancada', () => {
  it('é o comprimento projetado dos eixos do plano, na largura da imagem gravada', () => {
    /* a vista direita do selim, como a bancada devolveu em 2026-11-16: x some, y e z projetam 236,35 px por 100 mm no quadro de 1280 */
    const projecao = { pixels: [[195.92, 2557.93], [195.92, 2557.93], [195.92, 2321.57], [-40.43, 2557.93]], quadro: [1280, 720] };
    expect(escalaDaVista(projecao, 1280)).toBeCloseTo(2.3636, 3);
    expect(escalaDaVista(projecao, 1920)).toBeCloseTo(2.3636 * 1.5, 3);
  });
  it('recusa a vista em que os eixos não projetam dois iguais e um nulo', () => {
    const iso = { pixels: [[0, 0], [70, 40], [0, -80], [-70, 40]], quadro: [1280, 720] };
    expect(() => escalaDaVista(iso, 1280)).toThrow(/não é ortográfica de eixo/);
  });
  it('projeta a origem e 100 mm em cada eixo', () => {
    expect(PONTOS_DA_ESCALA).toEqual([[0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 100]]);
  });
});

describe('fundo e extensão', () => {
  it('acham o retângulo sobre o fundo liso, dentro da caixa pedida', () => {
    const png = imagem(40, 30, [240, 240, 238], [10, 5, 25, 20], [20, 20, 20]);
    expect(fundoDaCaixa(png.data, 40, [0, 0, 40, 30])).toEqual([240, 240, 238]);
    expect(extensaoNaImagem(png.data, 40, [0, 0, 40, 30], [240, 240, 238], 24)).toEqual([10, 5, 25, 20]);
    expect(extensaoNaImagem(png.data, 40, [0, 0, 15, 30], [240, 240, 238], 24)).toEqual([10, 5, 15, 20]);
    expect(extensaoNaImagem(png.data, 40, [30, 0, 40, 30], [240, 240, 238], 24)).toBeNull();
  });
});

describe('o plano da prancha', () => {
  const linha = (espelhar = false) => ({
    vista: 'direita',
    modelo: { largura: 1000, altura: 500, extensao: [100, 100, 400, 200], pxPorMm: 2 },
    foto: { nome: 'f.jpg', largura: 800, altura: 600, regiao: null, extensao: [50, 60, 200, 110], pxPorMm: 1, espelhar, regua: { px: 100, mm: 100 } },
  });
  it('põe as duas metades na mesma escala e relata as extensões em mm', () => {
    const p = disporPrancha({ titulo: 't', linhas: [linha()] });
    expect(p.linhas[0].modelo.extensaoMm).toEqual([150, 50]);
    expect(p.linhas[0].foto.extensaoMm).toEqual([150, 50]);
    const imagens = p.operacoes.filter((o) => o.tipo === 'imagem');
    /* o mesmo tamanho em mm sai com o mesmo tamanho em px: as duas extensões têm 150 por 50 mm, e os recortes têm a mesma folga */
    expect(imagens[0].destino[2]).toBe(imagens[1].destino[2]);
    expect(imagens[0].destino[3]).toBe(imagens[1].destino[3]);
    expect(imagens[0].destino[3]).toBeLessThanOrEqual(460);
  });
  it('espelha só a foto pedida, e sobreposto alinha pelo centro das extensões', () => {
    const p = disporPrancha({ titulo: 't', linhas: [linha(true)], disposicao: 'sobreposto' });
    const [foto, modelo] = p.operacoes.filter((o) => o.tipo === 'imagem');
    expect(foto.espelhar).toBe(true);
    expect(modelo.alfa).toBeLessThan(1);
    const centro = (d) => [d[0] + d[2] / 2, d[1] + d[3] / 2];
    expect(Math.abs(centro(foto.destino)[0] - centro(modelo.destino)[0])).toBeLessThanOrEqual(1);
  });
  it('recusa a disposição que não existe e a vista sem a parte', () => {
    expect(() => disporPrancha({ titulo: 't', linhas: [linha()], disposicao: 'grade' })).toThrow(/lado ou sobreposto/);
    const vazia = linha();
    vazia.modelo.extensao = null;
    expect(() => disporPrancha({ titulo: 't', linhas: [vazia] })).toThrow(/só com fundo/);
  });
  it('escolhe o passo da régua na série 1-2-5', () => {
    expect(passoDaRegua(3.43)).toBe(10);
    expect(passoDaRegua(1.73)).toBe(20);
    expect(passoDaRegua(0.2)).toBe(200);
  });
});

describe('o pedido', () => {
  it('confere o pedido antes de abrir a bancada e recusa saída fora do repositório', () => {
    const pasta = mkdtempSync(join(REPO, 'tmp', 'prancha-'));
    try {
      const foto = join(pasta, 'f.png');
      writeFileSync(foto, PNG.sync.write(imagem(4, 4, [255, 255, 255], [0, 0, 0, 0], [0, 0, 0])));
      expect(() => lerPedido({ peca: 'x', foto, regua: '10=10', saida: '../fora.png' })).toThrow(/fora do repositório/);
      expect(() => lerPedido({ peca: 'x', foto, regua: '10=10', espelhar: 'frontal' })).toThrow(/não está em --vistas/);
      expect(() => lerPedido({ peca: 'x', foto })).toThrow(/falta --regua/);
      expect(lerPedido({ peca: 'x', foto, regua: '10=10', parte: 'selim' }).arquivo).toMatch(/tools\/bancadas\/out\/prancha-x-selim-direita\.png$/);
      const comCopia = lerPedido({ peca: 'x', foto, regua: '10=10', parte: 'pedais', copia: 'x-,z+' });
      expect(comCopia.copia).toBe('x-,z+');
      expect(comCopia.arquivo).toMatch(/prancha-x-pedais-copia-xmenos-zmais-direita\.png$/);
      expect(() => lerPedido({ peca: 'x', foto, regua: '10=10', copia: 'x-' })).toThrow(/--parte/);
      expect(() => lerPedido({ peca: 'x', foto, regua: '10=10', parte: 'pedais', copia: 'esquerdo' })).toThrow(/x\+, x-/);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
  it('responde a --ajuda e recusa opção desconhecida', async () => {
    expect((await comoCLI(['--ajuda'])).stdout).toMatch(/--regua=<px>=<mm>/);
    const r = await comoCLI(['x', '--escala=2']);
    expect(r.codigo).not.toBe(0);
    expect(r.stderr).toMatch(/escala/);
  });
});

describe('a prancha montada no navegador', () => {
  it('mede a extensão na página e grava o PNG e o JSON, com a captura da bancada simulada', async () => {
    const pasta = mkdtempSync(join(REPO, 'tmp', 'prancha-'));
    try {
      const foto = join(pasta, 'foto.png');
      /* foto: 300 por 100 mm a 1 px/mm, um retângulo de 150 por 50 mm */
      writeFileSync(foto, PNG.sync.write(imagem(300, 100, [255, 255, 255], [40, 30, 190, 80], [30, 30, 30])));
      /* modelo: o mesmo retângulo a 2 px/mm, sobre o fundo da bancada */
      const modelo = PNG.sync.write(imagem(640, 360, [241, 243, 242], [100, 80, 400, 180], [20, 20, 20]));
      const olhar = async (pedido) => {
        expect(pedido).toMatchObject({ projecao: 'ortografica', capturarEmMemoria: true, selecionadas: ['bloco'], modo: 'isolar', focar: true, copia: 'x-' });
        return {
          ok: true,
          resultado: {
            vistas: [{ projecaoMm: { pixels: [[0, 0], [0, 0], [0, -200], [-200, 0]], quadro: [640, 360] }, copia: { caixaMm: [[-1, 0, 0], [0, 1, 1]] } }],
            capturas: [{ nome: 'direita', largura: 640, altura: 360, dados: modelo }],
          },
        };
      };
      const saida = join(pasta, 'p.png');
      const r = await prancharReferencia({ peca: 'teste', foto, regua: '0,0,100,0=100', parte: 'bloco', copia: 'x-', saida }, { olhar });
      const lido = JSON.parse(readFileSync(r.json, 'utf8'));
      expect(lido.linhas[0].modelo.extensaoMm).toEqual([150, 50]);
      expect(lido.linhas[0].foto.extensaoMm).toEqual([150, 50]);
      expect(lido).toMatchObject({ copia: 'x-', caixaDaCopiaMm: [[-1, 0, 0], [0, 1, 1]] });
      const png = PNG.sync.read(readFileSync(saida));
      expect(png.width).toBe(lido.largura);
      expect(png.height).toBe(lido.altura);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60_000);
});

/* PARA ONDE CADA EIXO CAI NA IMAGEM (fatia 7 do plano). A forma é assimétrica: um corpo de 150 por 50 mm com o nariz de 30 por 20 mm na
   frente, em +z. A projeção é a da vista direita da bancada (olho em +x, y para cima): +z vai para a esquerda da imagem, e o nariz com
   ela. A frase de lado da prancha tem de deixar ver isso sem abrir a imagem. */
describe('os eixos do modelo na prancha', () => {
  /* a origem no centro do quadro de 640 por 360, a 2 px/mm: 100 mm em +y sobem 200 px e 100 mm em +z vão 200 px para a esquerda */
  const DIREITA = { pixels: [[320, 180], [320, 180], [320, -20], [120, 180]], quadro: [640, 360] };

  it('a frase da vista direita diz que +z, a frente da forma, fica à esquerda, e confere com a projeção da câmera', () => {
    const eixos = eixosDaVista('direita', DIREITA);
    expect(eixos.frase).toBe('olha de +x; +y fica em cima, +z fica à esquerda');
    expect(eixos.medidos).toEqual({ '+x': null, '+y': 'fica em cima', '+z': 'fica à esquerda' });
    /* a mesma forma vista da esquerda tem a frente à direita */
    expect(eixosDaVista('esquerda', { ...DIREITA, pixels: [[320, 180], [320, 180], [320, -20], [520, 180]] }).frase).toBe('olha de -x; +y fica em cima, +z fica à direita');
  });

  it('recusa a captura que não projeta como a frase diz, em vez de escrever o lado errado na prancha', () => {
    const espelhada = { ...DIREITA, pixels: [[320, 180], [320, 180], [320, -20], [520, 180]] };
    expect(() => eixosDaVista('direita', espelhada)).toThrow(/não projeta como a frase de lado diz.*\+z fica à direita na captura/);
  });

  it('a prancha e o JSON levam a frase, e o nariz da forma está do lado que ela diz', async () => {
    const pasta = mkdtempSync(join(REPO, 'tmp', 'prancha-eixos-'));
    try {
      /* o modelo: corpo de z = -75 a +75 mm e y = 0 a 50 mm; o nariz de z = +75 a +105 mm e y = 15 a 35 mm, pelo projetor da vista */
      const projetar = projetorDaVista(DIREITA, 640);
      const caixaPx = (z0, z1, y0, y1) => { const a = projetar([0, y1, z1]); const b = projetar([0, y0, z0]); return [Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1])]; };
      const corpo = caixaPx(-75, 75, 0, 50);
      const nariz = caixaPx(75, 105, 15, 35);
      const png = imagem(640, 360, [241, 243, 242], corpo, [20, 20, 20]);
      for (let y = nariz[1]; y < nariz[3]; y++) for (let x = nariz[0]; x < nariz[2]; x++) png.data.set([20, 20, 20, 255], (y * 640 + x) * 4);
      const foto = join(pasta, 'foto.png');
      writeFileSync(foto, PNG.sync.write(imagem(300, 100, [255, 255, 255], [40, 30, 190, 80], [30, 30, 30])));
      const olhar = async () => ({ ok: true, resultado: { vistas: [{ projecaoMm: DIREITA }], capturas: [{ nome: 'direita', largura: 640, altura: 360, dados: PNG.sync.write(png) }] } });
      const r = await prancharReferencia({ peca: 'teste', foto, regua: '100=100', saida: join(pasta, 'p.png') }, { olhar });
      const lido = JSON.parse(readFileSync(r.json, 'utf8'));
      expect(lido.linhas[0].modelo.eixos.frase).toContain('+z fica à esquerda');
      /* o nariz, a frente em +z, está à esquerda do corpo na imagem, e a extensão do modelo começa nele */
      expect(nariz[2]).toBeLessThanOrEqual(corpo[0]);
      expect(lido.linhas[0].modelo.extensaoPx[0]).toBe(nariz[0]);
      expect(lido.linhas[0].modelo.extensaoMm).toEqual([180, 50]);
      const plano = disporPrancha({ titulo: 't', linhas: [{ vista: 'direita', modelo: { largura: 640, altura: 360, extensao: lido.linhas[0].modelo.extensaoPx, pxPorMm: 2, eixos: lido.linhas[0].modelo.eixos }, foto: { nome: 'f', largura: 300, altura: 100, regiao: null, extensao: [40, 30, 190, 80], pxPorMm: 1, espelhar: false, regua: { px: 100, mm: 100 } } }] });
      expect(plano.operacoes.find((o) => o.eixos)?.texto).toBe('eixos do modelo: olha de +x; +y fica em cima, +z fica à esquerda');
      const cli = await comoCLI(['teste', `--foto=${foto}`, '--regua=100=100', `--saida=${join(pasta, 'q.png')}`], { olhar, logger: () => {} });
      expect(cli.stdout).toContain('eixos do modelo: olha de +x; +y fica em cima, +z fica à esquerda');
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60_000);
});

/* A cópia de uma parte repetida (fatia 4 do plano): `--copia` da bancada, pela função que roda na página, sobre uma cena three.js de
   verdade em Node. Duas cópias de um bloco de 40 por 20 por 10 mm, em x = -100 e x = +100 mm, como os dois pedais. */
describe('a cópia de uma parte repetida na bancada', () => {
  afterEach(() => { delete globalThis.window; });
  const montar = () => {
    const scene = new THREE.Scene();
    const raiz = new THREE.Group();
    for (const x of [-0.1, 0.1]) {
      const malha = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.01), new THREE.MeshBasicMaterial());
      malha.position.set(x, 0.3, 0);
      malha.userData.faces = [];
      raiz.add(malha);
    }
    scene.add(raiz);
    const camera = new THREE.OrthographicCamera(-1.6, 1.6, 0.9, -0.9, 0.01, 100);
    camera.position.set(0, 0.3, 5);
    const target = new THREE.Vector3(0, 0.3, 0);
    camera.lookAt(target);
    const renderer = { clippingPlanes: [], domElement: { clientWidth: 1600, clientHeight: 900 } };
    globalThis.window = { __mecanificaBancada: { ambiente: () => ({ camera, scene, renderer, controls: { target, update() {}, minDistance: 0, maxDistance: 100 } }) } };
    return { camera, renderer, raiz };
  };

  it('lê um lado por eixo e recusa o que não é eixo e sinal, ou eixo repetido', () => {
    expect(lerCopia('x-')).toEqual([{ eixo: 'x', sinal: -1 }]);
    expect(lerCopia('x+, z-')).toEqual([{ eixo: 'x', sinal: 1 }, { eixo: 'z', sinal: -1 }]);
    expect(lerCopia(null)).toBeNull();
    expect(() => lerCopia('esquerdo')).toThrow(/x\+, x-/);
    expect(() => lerCopia('x+,x-')).toThrow(/repete eixo/);
  });

  it('desenha só a cópia do lado pedido e enquadra a câmera nela', () => {
    const { camera, renderer } = montar();
    const feito = ajustarCamera({ copia: lerCopia('x-'), enquadrar: true });
    expect(feito.erro).toBeUndefined();
    expect(feito.copia).toMatchObject({ lados: 'x-', centroMm: [0, 300, 0], caixaMm: [[-120, 290, -5], [-80, 310, 5]], vertices: 24, verticesAVista: 48 });
    /* o plano deixa de fora a cópia de x positivo (distância negativa) e mantém a de x negativo */
    const [plano] = renderer.clippingPlanes;
    const distancia = (x) => plano.normal.dot(new THREE.Vector3(x, 0.3, 0)) + plano.constant;
    expect(distancia(-0.1)).toBeGreaterThan(0);
    expect(distancia(0.1)).toBeLessThan(0);
    /* a cópia ocupa 92 % do quadro na largura e fica no centro dele */
    expect(feito.enquadrou.largura).toBeCloseTo(0.92, 2);
    const centro = new THREE.Vector3(-0.1, 0.3, 0).project(camera);
    expect(Math.abs(centro.x)).toBeLessThan(1e-6);
    expect(Math.abs(centro.y)).toBeLessThan(1e-6);
  });

  it('recusa quando não há geometria à vista para separar', () => {
    const { raiz } = montar();
    raiz.children.forEach((m) => { m.visible = false; });
    expect(ajustarCamera({ copia: lerCopia('x-'), enquadrar: true }).erro).toMatch(/geometria visível/);
  });
});

/* O contorno medido sobre o modelo (fatia 5): os pontos do contorno postos no quadro da vista pela projeção da câmera. */
describe('o contorno medido sobre a vista do modelo', () => {
  it('põe o (h, v) de cada vista no referencial, com o eixo do olho em zero', () => {
    expect(pontoDoContorno('frontal', [10, 20])).toEqual([10, 20, 0]);
    expect(pontoDoContorno('lateral', [10, 20])).toEqual([0, 20, 10]);
    expect(pontoDoContorno('superior', [10, 20])).toEqual([10, 0, -20]);
    expect(() => pontoDoContorno('isometrica', [0, 0])).toThrow(/frontal, lateral, superior/);
  });
  it('leva o ponto do mundo da montagem à peça pela inversa da pose, e gira o olho com ela', () => {
    const pose = { rotacao: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], deslocamento: [0.1, 0.2, 0] };
    /* o ponto (0, 0, 1) da peça vai a (1, 0, 0) girado, e a (101, 200, 0) mm no mundo */
    const p = aoReferencialDaPeca([101, 200, 0], pose);
    expect(p.map((c) => Math.round(c * 1e9) / 1e9)).toEqual([0, 0, 1]);
    expect(aoReferencialDaPeca([1, 2, 3], null)).toEqual([1, 2, 3]);
    expect(vistaNaPeca('frontal', pose)).toBe('esquerda');
    expect(vistaNaPeca('frontal', null)).toBe('frontal');
    expect(vistaNaPeca('frontal', { rotacao: [[0.6, 0, 0.8], [0, 1, 0], [-0.8, 0, 0.6]] })).toBeNull();
  });
  it('projeta pela afim dos quatro pontos da escala, na largura da imagem gravada', () => {
    const projetar = projetorDaVista({ pixels: [[320, 280], [520, 280], [320, 80], [320, 280]], quadro: [640, 360] }, 1280);
    expect(projetar([0, 0, 0])).toEqual([640, 560]);
    expect(projetar([50, 100, 7])).toEqual([840, 160]);
  });
  it('o painel cobre o contorno que passa do quadro, e a legenda mede extensão e canto em mm', () => {
    const plano = disporContorno({
      titulo: 't',
      linhas: [{ vista: 'frontal', rotulo: 'r', modelo: { largura: 640, altura: 360, extensao: [220, 80, 420, 280], pxPorMm: 2 }, aneis: [{ nome: 'silhueta', pontosPx: [[[200, 60], [700, 60], [700, 280], [200, 280]]] }] }],
    });
    expect(plano.linhas[0].contornos[0]).toMatchObject({ nome: 'silhueta', extensaoMm: [250, 110], cantoMenosModeloMm: [-10, 0] });
    expect(plano.linhas[0].modelo.extensaoMm).toEqual([100, 100]);
    const caminho = plano.operacoes.find((o) => o.tipo === 'caminho');
    const painel = caminho.recorte;
    for (const [x, y] of caminho.pontos) {
      expect(x).toBeGreaterThanOrEqual(painel[0]);
      expect(x).toBeLessThanOrEqual(painel[0] + painel[2]);
      expect(y).toBeGreaterThanOrEqual(painel[1]);
      expect(y).toBeLessThanOrEqual(painel[1] + painel[3]);
    }
    /* a imagem só ocupa a parte do painel que ela cobre: o contorno vai além da borda direita dela */
    const imagem = plano.operacoes.find((o) => o.tipo === 'imagem');
    expect(imagem.recorte[0] + imagem.recorte[2]).toBe(640);
    expect(imagem.destino[2]).toBeLessThan(caminho.recorte[2]);
  });
  it('desenha no navegador a linha onde o referencial a põe, com a captura da bancada simulada', async () => {
    const pasta = mkdtempSync(join(REPO, 'tmp', 'contorno-'));
    try {
      /* a vista frontal a 2 px/mm: a origem em (320, 280) e um bloco de x -50 a 50 e y 0 a 100 mm */
      const modelo = PNG.sync.write(imagem(640, 360, [241, 243, 242], [220, 80, 420, 280], [20, 20, 20]));
      const olhar = async (pedido) => {
        expect(pedido).toMatchObject({ vistas: ['frontal'], projecao: 'ortografica', capturarEmMemoria: true, enquadrar: true });
        return { ok: true, resultado: { vistas: [{ projecaoMm: { pixels: [[320, 280], [520, 280], [320, 80], [320, 280]], quadro: [640, 360] } }], capturas: [{ nome: 'frontal', largura: 640, altura: 360, dados: modelo }] } };
      };
      const quadrado = [[-50, 0, 0], [50, 0, 0], [50, 100, 0], [-50, 100, 0]];
      const arquivo = join(pasta, 'contorno.png');
      /* o lado de baixo do quadrado é encontro com outra região: a marca segue da entrada à prancha e ao JSON das medidas */
      const encontros = [[{ encontro: true, vizinha: 'cintura' }, ...[1, 2, 3].map(() => ({ encontro: false, vizinha: null }))]];
      const r = await prancharContorno({ peca: 'teste', arquivo, contornos: [{ vista: 'frontal', rotulo: 'o contorno frontal', aneis: [{ nome: 'ombro', pontosMm: [quadrado], encontros }] }] }, { olhar });
      const lido = JSON.parse(readFileSync(r.json, 'utf8'));
      expect(lido.linhas[0].contornos[0]).toMatchObject({ extensaoMm: [100, 100], cantoMenosModeloMm: [0, 0], encontro: { vizinhas: ['cintura'], comprimentoMm: 100, ladosDaCaixa: ['de baixo'] } });
      const png = PNG.sync.read(readFileSync(arquivo));
      expect([png.width, png.height]).toEqual([lido.largura, lido.altura]);
      /* a linha vermelha existe e cai sobre a borda do bloco */
      let vermelhos = 0;
      for (let k = 0; k < png.data.length; k += 4) if (png.data[k] > 180 && png.data[k + 1] < 90 && png.data[k + 2] < 70) vermelhos += 1;
      expect(vermelhos).toBeGreaterThan(400);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60_000);
});

/* O trecho de encontro: a região que divide fronteira com outra região do mapa não tem borda ali, e o crítico do ombro do braço robótico
   leu o pé dele, tapado pelo anel da cintura, como 33 mm acima do modelo. Um objeto 200 x 200 mm partido em cima e embaixo a y = 100. */
describe('o trecho do contorno que é encontro com outra região', () => {
  const silhueta = [[[-100, 0], [100, 0], [100, 200], [-100, 200]]];
  const cima = [[-100, 100], [100, 100], [100, 200], [-100, 200]];
  const baixo = [[[-100, 0], [100, 0], [100, 100], [-100, 100]]];

  it('classifica cada lado: o que encosta na outra região é encontro, com o nome dela, e o resto é silhueta', () => {
    const lados = encontrosDoAnel(cima, { silhueta, vizinhas: { baixo }, folgaMm: 4.7 });
    expect(lados).toEqual([{ encontro: true, vizinha: 'baixo' }, { encontro: false, vizinha: null }, { encontro: false, vizinha: null }, { encontro: false, vizinha: null }]);
    /* longe de toda região, o lado interno ainda é encontro, com o resto do objeto */
    expect(encontrosDoAnel(cima, { silhueta, vizinhas: {}, folgaMm: 4.7 })[0]).toEqual({ encontro: true, vizinha: null });
    /* a 2 mm da silhueta, dentro da folga, o lado conta como silhueta */
    expect(encontrosDoAnel([[-98, 100], [98, 100], [98, 198], [-98, 198]], { silhueta, vizinhas: { baixo }, folgaMm: 4.7 }).map((l) => l.encontro)).toEqual([true, false, false, false]);
  });

  it('parte o anel em trechos abertos pela classe, sem partir um trecho na volta', () => {
    const pontos = [[0, 0], [1, 0], [2, 0], [2, 1], [0, 1]];
    const e = (encontro) => ({ encontro, vizinha: null });
    const trechos = trechosDoAnel(pontos, [e(false), e(true), e(true), e(false), e(false)]);
    expect(trechos).toEqual([
      { encontro: true, fechado: false, pontos: [[1, 0], [2, 0], [2, 1]] },
      { encontro: false, fechado: false, pontos: [[2, 1], [0, 1], [0, 0], [1, 0]] },
    ]);
    expect(trechosDoAnel(pontos, null)).toEqual([{ encontro: false, fechado: true, pontos }]);
    expect(trechosDoAnel(pontos, pontos.map(() => e(true)))[0]).toMatchObject({ encontro: true, fechado: true });
  });

  it('diz que lado da caixa cai no encontro, pelo comprimento junto da borda', () => {
    const lados = encontrosDoAnel(cima, { silhueta, vizinhas: { baixo }, folgaMm: 4.7 });
    /* em px com y para baixo, o lado de baixo do anel (v = 100) é o de y maior */
    const px = cima.map(([h, v]) => [h, 200 - v]);
    expect(ladosDaCaixaNoEncontro([{ pontos: px, lados }], [-100, 0, 100, 100], 3)).toEqual(['de baixo']);
    expect(ladosDaCaixaNoEncontro([{ pontos: px, lados: null }], [-100, 0, 100, 100], 3)).toEqual([]);
    expect(ladosEmTexto(['de baixo'])).toBe('o lado de baixo da caixa cai no encontro e não mede a peça');
    expect(ladosEmTexto(['esquerdo', 'de baixo'])).toBe('os lados esquerdo e de baixo da caixa caem no encontro e não medem a peça');
  });

  it('a prancha desenha o encontro tracejado e a legenda diz com quem ele é e que lado não mede', () => {
    const lados = encontrosDoAnel(cima, { silhueta, vizinhas: { baixo }, folgaMm: 4.7 });
    const pontosPx = [cima.map(([h, v]) => [320 + 2 * h, 280 - 2 * v])];
    const plano = disporContorno({
      titulo: 't',
      linhas: [{ vista: 'frontal', rotulo: 'r', modelo: { largura: 640, altura: 360, extensao: [120, 80, 520, 280], pxPorMm: 2 }, aneis: [{ nome: 'cima', pontosPx, encontros: [lados] }] }],
    });
    const caminhos = plano.operacoes.filter((o) => o.tipo === 'caminho');
    expect(caminhos.map((c) => [Boolean(c.encontro), c.fechado, c.tracejado ?? null])).toEqual([[true, false, TRACEJADO_DO_ENCONTRO], [false, false, null]]);
    /* o trecho tracejado é o lado de v = 100 mm, a y = 80 px da imagem */
    expect(caminhos[0].pontos.length).toBe(2);
    expect(plano.linhas[0].contornos[0].encontro).toEqual({ vizinhas: ['baixo'], comprimentoMm: 200, ladosDaCaixa: ['de baixo'] });
    const textos = plano.operacoes.filter((o) => o.tipo === 'texto').map((o) => o.texto);
    expect(textos).toContain('  tracejado: 200 mm de encontro com baixo, não é borda da peça; o lado de baixo da caixa cai no encontro e não mede a peça');
    expect(textos.some((t) => t.includes('o trecho tracejado é encontro'))).toBe(true);
  });
});

describe('a prancha desenhada em mm (SVG)', () => {
  const FIXTURE = join(REPO, 'tools/fixtures/comparar-com-prancha/referencias/lateral.prancha.svg');

  it('a escala sai da caixa do contorno em px e da caixa em mm do relatório, e a régua e a região são do raster ampliado', () => {
    const r = lerPranchaDesenhada(FIXTURE);
    expect(r.vista).toBe('esquerda');
    expect(r.pxPorMm).toBeCloseTo(1.5, 9);
    expect(r.regua).toBe('600=400');
    expect(r.regiao.split(',').map(Number).every((n) => n >= 0)).toBe(true);
    expect(r.svg).toContain('width="900" height="660"');
    expect(r.svg).toContain('display: none');
    expect(r.larguraMm).toBe(400);
    expect(r.alturaMm).toBe(300);
  });

  it('recusa o relatório que não é da mesma rodada do desenho, dizendo as duas escalas', () => {
    const ler = (c) => (c.endsWith('.json') ? JSON.stringify({ relatorio: { porVista: { lateral: { caixa: { xMin: -200, xMax: 200, yMin: 0, yMax: 200 } } } } }) : readFileSync(c, 'utf8'));
    expect(() => lerPranchaDesenhada(FIXTURE, { ler })).toThrow(/não são da mesma rodada/);
  });

  it('recusa a prancha sem relatório ao lado e o nome que não diz o lado', () => {
    expect(() => lerPranchaDesenhada(FIXTURE, { existe: () => false })).toThrow(/falta lateral\.prancha\.relatorio\.json/);
    expect(() => lerPranchaDesenhada('/x/qualquer.prancha.svg')).toThrow(/<lado>\.prancha\.svg/);
  });

  it('lê a caixa do contorno e recusa o caminho com comando que ela não cobre', () => {
    expect(caixaDoContornoSvg('<path class="contorno" d="M 1 2 L 11 2 L 11 7 Z"/><path class="outra" d="M 500 500 L 600 600"/>')).toEqual([1, 2, 11, 7]);
    expect(() => caixaDoContornoSvg('<path class="contorno" d="M 1 2 C 3 4 5 6 7 8"/>')).toThrow(/além de M, L e Z/);
    expect(() => caixaDoContornoSvg('<path class="x" d="M 1 2"/>')).toThrow(/nenhum <path class="contorno">/);
  });
});
