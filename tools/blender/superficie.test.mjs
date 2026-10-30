/* superficie.test.mjs — as duas vistas de análise de superfície, a luz rasante (luz-rasante.py) e a curvatura da lataria
   (curvatura-da-lataria.py), sobre a chapa de prova com um amassado largo e raso plantado (chapa-com-amassado-de-prova.mjs).

   O que não precisa do Blender roda sempre: a chapa de prova (o amassado é só ele, o friso é objeto à parte) e as contas de
   superficie.py no python3 do sistema (a direção da luz, a curvatura de uma esfera nos dois enrolamentos, a borda sem dado, a faixa
   dos vincos e a escala sem ela, o contraste de uma região). O que precisa roda com MODELAR_BLENDER apontando o executável e se ignora sem ele: as duas vistas
   da chapa com o amassado e da chapa lisa, com o contraste da região do amassado medido nos PNG por uma conta independente da
   do script (aqui, em JavaScript), e a prova de que a curvatura só da lataria depende de dizer qual é a peça de borda. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { AMASSADO, CAIXA, FRISO, REGIAO_DE_CONTROLE, REGIAO_DO_AMASSADO, alturaDeFora, obj } from './chapa-com-amassado-de-prova.mjs';

const BLENDER = doAmbiente('BLENDER');
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const vertices = (texto, objeto) => {
  let atual = '';
  const out = [];
  for (const l of texto.split('\n')) {
    if (l.startsWith('o ')) atual = l.slice(2).trim();
    else if (l.startsWith('v ') && atual === objeto) out.push(l.split(' ').slice(1).map(Number));
  }
  return out;
};

describe('a chapa de prova do amassado', () => {
  const amassada = obj();
  const lisa = obj({ amassado: null });

  it('tem a chapa e o friso como objetos à parte, e o friso some quando não se pede', () => {
    expect(amassada.split('\n').filter((l) => l.startsWith('o '))).toEqual(['o chapa', 'o friso']);
    expect(obj({ friso: false }).split('\n').filter((l) => l.startsWith('o '))).toEqual(['o chapa']);
    expect(vertices(amassada, 'friso')).toHaveLength(vertices(lisa, 'friso').length);
  });

  it('a chapa amassada e a lisa só diferem dentro do raio do amassado, e no fundo plantado', () => {
    const a = vertices(amassada, 'chapa');
    const l = vertices(lisa, 'chapa');
    expect(a).toHaveLength(l.length);
    let maior = 0;
    let diferentes = 0;
    for (let i = 0; i < a.length; i++) {
      expect(a[i][0]).toBe(l[i][0]);
      expect(a[i][1]).toBe(l[i][1]);
      const d = l[i][2] - a[i][2];
      if (Math.abs(d) > 1e-6) {
        diferentes++;
        expect(Math.hypot(a[i][0] - AMASSADO.x, a[i][1] - AMASSADO.y)).toBeLessThan(AMASSADO.raio);
      }
      maior = Math.max(maior, d);
    }
    expect(diferentes).toBeGreaterThan(500);
    expect(maior).toBeCloseTo(AMASSADO.fundo, 6);
    // o amassado é raso para o tamanho: 1,2 mm em 160 mm, e a chapa lisa tem a flecha do abaulamento de 6 m
    expect(alturaDeFora(AMASSADO.x, AMASSADO.y, null) - alturaDeFora(AMASSADO.x, AMASSADO.y)).toBeCloseTo(AMASSADO.fundo, 9);
    expect(FRISO.y).toBeGreaterThan(AMASSADO.y + AMASSADO.raio + 0.1);
  });

  it('as regiões de prova ficam dentro da chapa, e a de controle longe do amassado', () => {
    const [x0, x1, y0, y1] = REGIAO_DE_CONTROLE;
    expect(x0).toBeGreaterThan(AMASSADO.x + AMASSADO.raio);
    expect(x1).toBeLessThan(1);
    expect(y1).toBeLessThan(FRISO.y - 0.1);
    expect(REGIAO_DO_AMASSADO[0]).toBeLessThan(AMASSADO.x - AMASSADO.raio);
    expect(y0).toBeGreaterThan(0.1);
    expect(CAIXA.split(',').map(Number)).toHaveLength(6);
  });
});

describe('superficie.py, sem o Blender', () => {
  const roda = (codigo) => {
    const r = spawnSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, ${JSON.stringify(AQUI)})\nimport numpy as np, superficie as S\n${codigo}`], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    return JSON.parse(r.stdout);
  };
  const esfera = `
r = 0.5; nu, nv = 96, 48
V = np.array([[r*np.sin(np.pi*j/nv)*np.cos(2*np.pi*i/nu), r*np.cos(np.pi*j/nv), r*np.sin(np.pi*j/nv)*np.sin(2*np.pi*i/nu)] for j in range(1, nv) for i in range(nu)])
F = []
for j in range(nv-2):
    for i in range(nu):
        a, b, c, d = j*nu+i, j*nu+(i+1)%nu, (j+1)*nu+(i+1)%nu, (j+1)*nu+i
        F += [[a, b, c], [a, c, d]]
F = np.array(F)
n = np.cross(V[F[:,1]]-V[F[:,0]], V[F[:,2]]-V[F[:,0]])
if (np.einsum('ij,ij->i', n, V[F].mean(1)) < 0).mean() > 0.5: F = F[:, ::-1]
`;

  it('a luz rasante é unitária, vai para dentro da cena e passa a `rasante` graus do plano da imagem', () => {
    const m = roda(`
v = {'x_cam': [1,0,0], 'y_cam': [0,1,0], 'z_cam': [0,0,1]}
d = S.direcao_da_luz(v, 10, 30)
print(__import__('json').dumps({'norma': float(np.linalg.norm(d)), 'z': float(d[2]), 'plano': [float(d[0]), float(d[1])]}))`);
    expect(m.norma).toBeCloseTo(1, 12);
    expect(m.z).toBeCloseTo(-Math.sin((10 * Math.PI) / 180), 12);
    expect(Math.atan2(m.plano[1], m.plano[0]) * (180 / Math.PI)).toBeCloseTo(30, 9);
  });

  it('a curvatura média de uma esfera de raio 0,5 m é 2 1/m com sinal positivo, e troca de sinal com o enrolamento', () => {
    const m = roda(`${esfera}
H, ok = S.curvatura_media(V, F, 0.06)
H2, _ = S.curvatura_media(V, F[:, ::-1], 0.06)
meio = ok & (np.abs(V[:, 1]) < 0.25)
print(__import__('json').dumps({'fora': float(np.nanmean(H[meio])), 'dentro': float(np.nanmean(H2[meio])), 'espalhamento': float(np.nanmax(H[meio]) - np.nanmin(H[meio]))}))`);
    expect(m.fora).toBeCloseTo(2, 2);
    expect(m.dentro).toBeCloseTo(-2, 2);
    expect(m.espalhamento).toBeLessThan(0.01);
  });

  it('a lataria a menos do raio da borda livre sai sem dado, e a de dentro não', () => {
    const m = roda(`
n = 41; x = np.linspace(0, 0.4, n)
V = np.array([[xi, yi, 0.0] for yi in x for xi in x])
F = []
for j in range(n-1):
    for i in range(n-1):
        a, b, c, d = j*n+i, j*n+i+1, (j+1)*n+i+1, (j+1)*n+i
        F += [[a, b, c], [a, c, d]]
F = np.array(F)
H, ok = S.curvatura_media(V, F, 0.05)
dist = np.minimum.reduce([V[:, 0], V[:, 1], 0.4 - V[:, 0], 0.4 - V[:, 1]])
print(__import__('json').dumps({'sem_dado_dentro': int((~ok[dist > 0.05 + 1e-9]).sum()), 'com_dado_na_borda': int(ok[dist < 0.05 - 1e-9].sum()),
  'maximo': float(np.nanmax(np.abs(H))), 'cor_do_zero': S.cor_divergente(np.array([0.0]), 1.0)[0].tolist()}))`);
    expect(m.sem_dado_dentro).toBe(0);
    expect(m.com_dado_na_borda).toBe(0);
    expect(m.maximo).toBeLessThan(1e-9);
    expect(m.cor_do_zero).toEqual([1, 1, 1]);
  });

  it('a faixa dos vincos é a lataria a menos da largura de um segmento, e a escala sem ela não vê a dobra', () => {
    const m = roda(`
n = 81; x = np.linspace(0, 0.4, n)
V = np.array([[xi, 0.0, zi] for zi in x for xi in x])
seg = [[[0.05, 0, 0.2], [0.35, 0, 0.2]], [[0.35, 0, 0.2], [0.35, 0, 0.3]]]
faixa = S.faixa_dos_vincos(V, seg, 0.03)
def dist(p):
    d = []
    for a, b in np.array(seg):
        t = np.clip(np.dot(p - a, b - a) / np.dot(b - a, b - a), 0, 1)
        d.append(np.linalg.norm(p - a - t * (b - a)))
    return min(d)
exata = np.array([dist(p) for p in V])
erradas = faixa != (exata < 0.03)
H = np.where(faixa, 9.0, 0.5) + 0.01 * np.arange(len(V)) / len(V)
H[:5] = np.nan
print(__import__('json').dumps({'na_faixa': int(faixa.sum()), 'erradas': int(erradas.sum()), 'perto_da_borda': float(np.abs(exata[erradas] - 0.03).max()) if erradas.any() else 0.0,
  'com': S.escala_da_curvatura(H, 99, 0.1), 'sem': S.escala_da_curvatura(H, 99, 0.1, fora=faixa),
  'vazia': int(S.faixa_dos_vincos(V, np.zeros((0, 2, 3)), 0.03).sum())}))`);
    expect(m.na_faixa).toBeGreaterThan(500);
    // o segmento é amostrado a um décimo da largura: só erra junto da borda da faixa, por menos de 0,2 % dela
    expect(m.perto_da_borda).toBeLessThan(0.03 * 0.002);
    expect(m.com).toBeGreaterThan(9);
    expect(m.sem).toBeLessThan(0.52);
    expect(m.sem).toBeGreaterThan(0.5);
    expect(m.vazia).toBe(0);
  });

  it('o contraste tira o plano: um degradê liso dá zero, e uma mancha rasa dá o desvio dela sobre a média', () => {
    const m = roda(`
yy, xx = np.mgrid[0:200, 0:300]
liso = 0.3 + 0.2 * xx / 300 + 0.05 * yy / 200
mancha = liso + 0.04 * np.exp(-(((xx - 150) ** 2 + (yy - 100) ** 2) / 800.0))
r = (20, 20, 280, 180)
print(__import__('json').dumps({'liso': S.contraste_na_regiao(liso, r), 'mancha': S.contraste_na_regiao(mancha, r)}))`);
    expect(m.liso.contraste).toBeLessThan(1e-4);
    expect(m.liso.desvio).toBeGreaterThan(0.03);
    expect(m.mancha.contraste).toBeGreaterThan(0.01);
    expect(m.mancha.contraste).toBeLessThan(0.06);
  });
});

// a conta independente do contraste: o desvio do resíduo do plano ajustado, sobre a média da luminância (0,2126 R + 0,7152 G + 0,0722 B)
function contraste(png, [x0, y0, x1, y1]) {
  const L = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      L.push([x - x0, y - y0, 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]]);
    }
  }
  const n = L.length;
  const mx = L.reduce((s, p) => s + p[0], 0) / n;
  const my = L.reduce((s, p) => s + p[1], 0) / n;
  const ml = L.reduce((s, p) => s + p[2], 0) / n;
  let sxx = 0, sxy = 0, syy = 0, sxl = 0, syl = 0;
  for (const [x, y, l] of L) {
    sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; sxl += (x - mx) * (l - ml); syl += (y - my) * (l - ml);
  }
  const det = sxx * syy - sxy * sxy;
  const bx = (sxl * syy - syl * sxy) / det;
  const by = (syl * sxx - sxl * sxy) / det;
  const res = L.map(([x, y, l]) => l - ml - bx * (x - mx) - by * (y - my));
  return Math.sqrt(res.reduce((s, r) => s + r * r, 0) / n) / ml;
}

// o pixel do ponto (x, y, z) da chapa na vista, pela câmera que o script gravou
function pixel(cam, p) {
  const d = p.map((v, k) => v - cam.centro[k]);
  const dot = (a) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return [Math.round(cam.W / 2 + (dot(cam.x_cam) / cam.escala) * cam.W), Math.round(cam.H / 2 - (dot(cam.y_cam) / cam.escala) * cam.W)];
}
function retangulo(cam, [xa, xb, ya, yb, za, zb]) {
  const cantos = [];
  for (const x of [xa, xb]) for (const y of [ya, yb]) for (const z of [za, zb]) cantos.push(pixel(cam, [x, y, z]));
  const xs = cantos.map((c) => c[0]);
  const ys = cantos.map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
const lerPng = (caminho) => PNG.sync.read(readFileSync(caminho));
const croma = (png, [x, y]) => {
  const i = (y * png.width + x) * 4;
  return Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) - Math.min(png.data[i], png.data[i + 1], png.data[i + 2]);
};

describe.skipIf(!BLENDER)('as vistas de superfície no Blender', () => {
  let dir;
  const p = (nome) => join(dir, nome);
  const blender = (script, args) => {
    const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, script), '--', ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
    if (r.status !== 0) throw new Error(`${script} saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
    return r.stdout;
  };
  const comum = ['--vista', 'frente', '--resolucao', '1000x750', '--regiao', REGIAO_DO_AMASSADO.join(',')];

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'superficie-'));
    writeFileSync(p('amassada.obj'), obj());
    writeFileSync(p('lisa.obj'), obj({ amassado: null }));
  }, 60000);
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('a luz rasante mostra o amassado e não mostra a chapa lisa, e a referência sai lado a lado sob a mesma luz', { timeout: 300000 }, () => {
    blender('luz-rasante.py', ['--malha', p('amassada.obj'), '--referencia', p('lisa.obj'), '--saida', p('r-'), '--azimutes', '30', ...comum]);
    const j = JSON.parse(readFileSync(p('r-rasante.json'), 'utf8'));
    expect(j.imagens).toHaveLength(1);
    const cam = j.camera.frente;
    const malha = lerPng(p('r-frente-rasante-az30.png'));
    const ref = lerPng(p('r-frente-rasante-az30-referencia.png'));
    const noAmassado = retangulo(cam, REGIAO_DO_AMASSADO);
    const noControle = retangulo(cam, REGIAO_DE_CONTROLE);
    const amassado = contraste(malha, noAmassado);
    const lisa = contraste(ref, noAmassado);
    const controle = contraste(malha, noControle);
    // o amassado de 1,2 mm em 160 mm dá alguns por cento, contra décimos de por cento da chapa lisa, na mesma região
    expect(amassado).toBeGreaterThan(0.012);
    expect(lisa).toBeLessThan(0.006);
    expect(controle).toBeLessThan(0.006);
    expect(amassado / lisa).toBeGreaterThan(4);
    // a conta do script e a daqui concordam, e o contraste da referência sai no mesmo arquivo
    expect(j.imagens[0].contraste.contraste).toBeCloseTo(amassado, 2);
    expect(j.imagens[0].contraste_referencia.contraste).toBeCloseTo(lisa, 2);
    expect(existsSync(p('r-frente-rasante-az30-lado-a-lado.png'))).toBe(true);
    expect(lerPng(p('r-frente-rasante-az30-lado-a-lado.png')).width).toBeGreaterThan(2 * 0.8 * malha.width);
    // a luz é mesmo rasante e o fundo é preto: sem luz de ambiente, o canto da imagem não recebe nada
    expect(j.rasante_graus).toBe(10);
    expect(malha.data[0]).toBe(0);
  });

  it('a curvatura da lataria mostra o amassado e não a chapa lisa, com a peça de borda e a borda da chapa sem cor', { timeout: 300000 }, () => {
    blender('curvatura-da-lataria.py', ['--malha', p('amassada.obj'), '--borda', 'friso', '--saida', p('ca-'), ...comum]);
    blender('curvatura-da-lataria.py', ['--malha', p('lisa.obj'), '--borda', 'friso', '--saida', p('cl-'), ...comum]);
    const a = JSON.parse(readFileSync(p('ca-curvatura.json'), 'utf8'));
    const l = JSON.parse(readFileSync(p('cl-curvatura.json'), 'utf8'));
    const cam = a.camera.frente;
    const png = lerPng(p('ca-frente-curvatura.png'));
    const nitida = contraste(png, retangulo(cam, REGIAO_DO_AMASSADO));
    const lisa = contraste(lerPng(p('cl-frente-curvatura.png')), retangulo(cam, REGIAO_DO_AMASSADO));
    expect(nitida).toBeGreaterThan(0.1);
    expect(lisa).toBeLessThan(0.01);
    expect(nitida / lisa).toBeGreaterThan(20);
    expect(a.imagens[0].contraste.contraste).toBeCloseTo(nitida, 2);
    expect(a.vertices_de_borda).toBeGreaterThan(1000);
    // a escala é a da lataria: da ordem da curvatura do amassado (0,75 1/m no centro), e não a do friso (250 1/m)
    expect(a.escala_1_m).toBeGreaterThan(0.2);
    expect(a.escala_1_m).toBeLessThan(1);
    expect(l.escala_1_m).toBe(0.1);
    // o friso e a faixa junto da borda da chapa saem sem cor; o centro do amassado sai azul
    const noFriso = pixel(cam, [0.5, FRISO.y, 0.007]);
    expect(croma(png, noFriso)).toBeLessThanOrEqual(1);
    expect(croma(png, pixel(cam, [0.01, 0.3, 0]))).toBeLessThanOrEqual(1);
    const centro = pixel(cam, [AMASSADO.x, AMASSADO.y, 0]);
    const i = (centro[1] * png.width + centro[0]) * 4;
    expect(png.data[i + 2] - png.data[i]).toBeGreaterThan(80);
    expect(a.imagens[0].legenda && existsSync(a.imagens[0].legenda)).toBe(true);
  });

  it('sem dizer qual é a peça de borda, o friso estica a escala e o amassado some', { timeout: 300000 }, () => {
    blender('curvatura-da-lataria.py', ['--malha', p('amassada.obj'), '--saida', p('cs-'), ...comum]);
    const s = JSON.parse(readFileSync(p('cs-curvatura.json'), 'utf8'));
    expect(s.escala_1_m).toBeGreaterThan(10);
    expect(s.imagens[0].contraste.contraste).toBeLessThan(0.01);
    expect(s.vertices_de_borda).toBe(0);
  });

  it('recusa a peça de borda que o OBJ não tem, e diz quais ele tem', { timeout: 120000 }, () => {
    const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, 'curvatura-da-lataria.py'), '--', '--malha', p('amassada.obj'), '--borda', 'calha', '--saida', p('x-')],
      { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("['calha']");
    expect(r.stderr).toContain("['chapa', 'friso']");
  });
});
