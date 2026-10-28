/* linhas-pelos-cortes.test.mjs — `ler-linhas --3d` confere cada curva 3D contra os cortes do pacote: onde a curva atravessa o
   plano de um corte, o ponto dela tem de cair perto do contorno daquele corte, e a que fica longe é recusada, com o motivo.

   A prova usa o feixe desenhado por código de feixe-de-prova.mjs, sem nenhum dado de referência. Dois pares de vincos ficam
   8 mm um do outro em x, e a terceira vista não os separa quando a tolerância do casamento passa de 8 mm, como no pacote
   real, em que o traço grosso de um feixe de linhas leva a tolerância a 10 mm. Sem os cortes, o primeiro par fica ambíguo
   (quatro curvas, duas falsas, e nenhuma entra), e no segundo, em que B2 não se vê de cima, a vista de lado de B2 só acha o
   traço de A2 e entra uma curva falsa com x de A2 e y de B2. Com os cortes, a curva falsa cai na conferência e, sem ela, o
   primeiro par casa as duas verdadeiras. Só precisa de python3 com Pillow e numpy. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { distancias } from './distancias-de-prova.mjs';
import { SECAO, VERTICES, Z0, Z1, contornoDaSecao, montarPacoteDoFeixe } from './feixe-de-prova.mjs';
import { py, temPillow } from './pacote-de-prova.mjs';
import { doAmbiente } from '../ambiente.mjs';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const mm = (v) => v.map((x) => x * 1000);
const TOLERANCIA_DO_CASAMENTO = 9;
/* as curvas verdadeiras: uma aresta ao longo de z por vértice e o contorno da tampa, em mm */
const AO_LONGO_DE_Z = VERTICES.map((nome) => ({ nome, fechada: false, pontos: [[...mm(SECAO[nome]), Z0 * 1000], [...mm(SECAO[nome]), Z1 * 1000]] }));
const TAMPA = { fechada: true, pontos: VERTICES.map((n) => [...mm(SECAO[n]), Z1 * 1000]) };
const VERDADEIRAS = [...AO_LONGO_DE_Z, TAMPA];
const desvio = (l) => Math.max(...distancias(l.pontos_mm.filter((_, k) => k % 10 === 0), VERDADEIRAS));
/* a curva ao longo de z com o x de um vértice e o y de outro */
const aoLongoDeZEm = (x, y) => (l) => l.pontos_mm.every(([a, b]) => Math.abs(a - x) < 2 && Math.abs(b - y) < 2);
const FALSA = aoLongoDeZEm(mm(SECAO.A2)[0], mm(SECAO.B2)[1]);

describe.skipIf(!temPillow)('conferência das linhas 3D contra os cortes, no feixe desenhado por código', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  const lidos = {};
  const ler = (saida, ...extra) => {
    py('ler-linhas.py', ['--pacote', p('pacote'), '--3d', '--tolerancia-mm', String(TOLERANCIA_DO_CASAMENTO), ...extra, '--saida', p(saida)]);
    return JSON.parse(readFileSync(p(saida), 'utf8')).linhas_3d;
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'linhas-pelos-cortes-'));
    montarPacoteDoFeixe(dir);
    lidos.sem = ler('sem.json', '--sem-cortes');
    lidos.com = ler('com.json');
    lidos.fixa = ler('fixa.json', '--tolerancia-corte-mm', '5');
  }, 120000);
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('o corte mostra a pele a poucos milímetros do ponto da curva falsa, que a terceira vista deixa passar', () => {
    const contorno = contornoDaSecao();
    const [d] = distancias([[mm(SECAO.A2)[0], mm(SECAO.B2)[1]]], [contorno]);
    // a curva falsa está a mais que o dobro da tolerância mínima da conferência, e a menos que a tolerância do casamento
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(TOLERANCIA_DO_CASAMENTO);
  });

  it('sem a conferência, o feixe deixa entrar a curva falsa e perde as duas verdadeiras do primeiro par', () => {
    expect(lidos.sem.conferencia_dos_cortes).toEqual({ conferida: false, motivo: 'desligada por --sem-cortes' });
    expect(lidos.sem.polilinhas_3d.filter(FALSA)).toHaveLength(1);
    expect(lidos.sem.polilinhas_3d.filter(FALSA)[0].confianca).toBe('media');
    expect(Math.max(...lidos.sem.polilinhas_3d.filter(FALSA).map(desvio))).toBeGreaterThan(4);
    for (const nome of ['A1', 'B1']) {
      const [x, y] = mm(SECAO[nome]);
      expect(lidos.sem.polilinhas_3d.filter(aoLongoDeZEm(x, y)), nome).toHaveLength(0);
    }
    expect(lidos.sem.ambiguas).toBeGreaterThan(0);
  });

  it('com a conferência, a curva falsa é recusada com o motivo e as verdadeiras ficam, e o primeiro par casa', () => {
    const r = lidos.com;
    expect(r.conferencia_dos_cortes).toMatchObject({ conferida: true, cortes: ['z300', 'z700'], no_casamento: true, recusadas: { alta: 0, media: 1 } });
    expect(r.polilinhas_3d.filter(FALSA)).toHaveLength(0);
    expect(r.recusadas_pelos_cortes).toHaveLength(1);
    const [f] = r.recusadas_pelos_cortes;
    expect(FALSA({ pontos_mm: f.pontos_mm })).toBe(true);
    expect(f).toMatchObject({ confianca: 'media', corte: 'z300' });
    expect(f.distancia_mm).toBeGreaterThan(4);
    expect(f.distancia_mm).toBeGreaterThan(f.tolerancia_mm);
    expect(f.motivo).toMatch(/^atravessa o corte z300 em \[189\.\d, 319\.\d, 300\.0\] a 4\.\d mm do contorno, e a tolerância é 2\.0 mm$/);
    // todas as curvas que ficam estão sobre uma aresta da forma, e cada vértice, menos B2, que o topo não vê, tem a sua
    for (const l of r.polilinhas_3d) expect(desvio(l), JSON.stringify(l.pontos_mm[0])).toBeLessThan(1.5);
    for (const nome of VERTICES.filter((n) => n !== 'B2')) {
      const achadas = r.polilinhas_3d.filter(aoLongoDeZEm(...mm(SECAO[nome])));
      expect(achadas, nome).toHaveLength(1);
      expect(achadas[0].confianca, nome).toBe('alta');
      expect(achadas[0].cortes.travessias, nome).toBe(2);
      expect(achadas[0].cortes.distancia_maxima_mm, nome).toBeLessThan(1);
    }
    expect(r.polilinhas_3d.filter(aoLongoDeZEm(...mm(SECAO.B2)))).toHaveLength(0);
    // a curva que não atravessa corte (o contorno da tampa) fica sem conferência, e a saída conta quantas
    const sem = r.polilinhas_3d.filter((l) => l.cortes.travessias === 0);
    expect(sem.length).toBeGreaterThan(0);
    expect(r.conferencia_dos_cortes.sem_corte).toBe(sem.length);
    for (const l of sem) expect(l.pontos_mm.every(([, , z]) => Math.abs(z - 900) < 1.5)).toBe(true);
  });

  it('o corte tira do casamento o par falso, de modo que o parceiro verdadeiro, que ele deixava ambíguo, entra', () => {
    for (const nome of ['A1', 'B1']) {
      const achadas = lidos.com.polilinhas_3d.filter(aoLongoDeZEm(...mm(SECAO[nome])));
      expect(achadas, nome).toHaveLength(1);
      expect(achadas[0].confianca).toBe('alta');
    }
    expect(lidos.com.ambiguas).toBeLessThan(lidos.sem.ambiguas);
    // A2 era 'media' porque o topo dele tinha dois parceiros, e agora tem um
    expect(lidos.com.polilinhas_3d.find(aoLongoDeZEm(...mm(SECAO.A2))).confianca).toBe('alta');
    expect(lidos.sem.polilinhas_3d.find(aoLongoDeZEm(...mm(SECAO.A2))).confianca).toBe('media');
  });

  it('a tolerância do corte se fixa: a 5 mm a curva falsa, a 4,4 mm do contorno, fica', () => {
    expect(lidos.fixa.recusadas_pelos_cortes).toEqual([]);
    expect(lidos.fixa.polilinhas_3d.filter(FALSA)).toHaveLength(1);
    expect(lidos.fixa.polilinhas_3d.filter(FALSA)[0].cortes).toMatchObject({ travessias: 2, tolerancia_mm: 5 });
  });

  it('a curva amostrada exatamente no plano do corte não perde a travessia, e a do lado x < 0 confere pelo corte de meia forma', () => {
    // a curva do pacote sai a cada 1 mm em coordenadas inteiras, e a do pilar do sexto teste tinha uma amostra em z = 800
    // exato; com o sinal estrito, a travessia sumia e a curva ficava sem conferência. Aqui a curva P cruza z = 300 numa
    // amostra, e a curva M, em x < 0, cruza x = -150 numa amostra: o corte em x = 150 só existe em x > 0, e a simetria o aplica
    // à imagem espelhada de M
    const codigo = [
      'import sys, json; sys.path.insert(0, sys.argv[1])', 'import leitura as L',
      'cortes = L.preparar_cortes([',
      " {'corte': 'z', 'eixo': 'z', 'valor_mm': 300.0, 'eixos_uv': ['x', 'y'], 'erro_mm': 0.3, 'moldura_mm': [[-100, -100], [500, 500]],",
      "  'polilinhas': [{'fechada': False, 'pontos_mm': [[0, 0], [100, 0], [100, 100]]}]},",
      " {'corte': 'x', 'eixo': 'x', 'valor_mm': 150.0, 'eixos_uv': ['z', 'y'], 'erro_mm': 0.3, 'moldura_mm': [[0, -100], [1000, 500]],",
      "  'polilinhas': [{'fechada': False, 'pontos_mm': [[0, 50], [1000, 50]]}]}])",
      'P = [[100.0, 50.0, 200.0 + k] for k in range(200)]',
      'M = [[-100.0 - k, 50.0, 200.0 + 2 * k] for k in range(100)]',
      "print(json.dumps({'P': L.travessias_dos_cortes(P, cortes, True), 'M': L.travessias_dos_cortes(M, cortes, True), 'M_sem_simetria': L.travessias_dos_cortes(M, cortes, False)}))",
    ].join('\n');
    const r = spawnSync('python3', ['-I', '-c', codigo, AQUI], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    const t = JSON.parse(r.stdout);
    // z = 300 cai na amostra k = 100, e o ponto (100, 50) está sobre o contorno do corte; x = 100 nunca cruza x = 150
    expect(t.P).toEqual([{ corte: 'z', ponto_mm: [100, 50, 300], distancia_mm: 0, erro_corte_mm: 0.3 }]);
    // M cruza z = 300 em x = -150, que a moldura do corte em z não mostra, e vale a imagem espelhada, a 50 mm do contorno; e
    // cruza x = -150, onde o corte em x = 150 vale pelo espelho, com o ponto sobre o contorno
    expect(t.M).toEqual([
      { corte: 'z', ponto_mm: [-150, 50, 300], distancia_mm: 50, erro_corte_mm: 0.3 },
      { corte: 'x', ponto_mm: [-150, 50, 300], distancia_mm: 0, erro_corte_mm: 0.3 },
    ]);
    // sem a simetria, M não tem como ser conferida: o ponto cai fora da moldura do corte em z, e o plano x = 150 não a corta
    expect(t.M_sem_simetria).toEqual([]);
  });

  it('sem cortes no pacote, a saída diz que as curvas não foram conferidas', () => {
    rmSync(p('pacote', 'cortes'), { recursive: true, force: true });
    const r = ler('sem-cortes-no-pacote.json');
    expect(r.conferencia_dos_cortes).toEqual({ conferida: false, motivo: 'o pacote não tem cortes' });
    expect(r.polilinhas_3d.filter(FALSA)).toHaveLength(1);
  });
});
