import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import {
  PONTOS_DA_ESCALA, comoCLI, disporPrancha, escalaDaVista, extensaoNaImagem, fundoDaCaixa, lerPedido, lerRegiao, lerRegua, lerVistas,
  passoDaRegua, porVista, prancharReferencia,
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
        expect(pedido).toMatchObject({ projecao: 'ortografica', capturarEmMemoria: true, selecionadas: ['bloco'], modo: 'isolar', focar: true });
        return {
          ok: true,
          resultado: {
            vistas: [{ projecaoMm: { pixels: [[0, 0], [0, 0], [0, -200], [200, 0]], quadro: [640, 360] } }],
            capturas: [{ nome: 'direita', largura: 640, altura: 360, dados: modelo }],
          },
        };
      };
      const saida = join(pasta, 'p.png');
      const r = await prancharReferencia({ peca: 'teste', foto, regua: '0,0,100,0=100', parte: 'bloco', saida }, { olhar });
      const lido = JSON.parse(readFileSync(r.json, 'utf8'));
      expect(lido.linhas[0].modelo.extensaoMm).toEqual([150, 50]);
      expect(lido.linhas[0].foto.extensaoMm).toEqual([150, 50]);
      const png = PNG.sync.read(readFileSync(saida));
      expect(png.width).toBe(lido.largura);
      expect(png.height).toBe(lido.altura);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 60_000);
});
