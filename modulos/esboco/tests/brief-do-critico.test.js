/* O processo do crítico do esboço depois do avião (atritos 9, 11, 12, 20, 21, 25, 29, 31 e 33): o brief da unidade, do Marco e do
   objeto vai para `brief.md` e se reimprime com `--brief`; diz de que lado cada vista olha; leva as vistas de outros lados que a
   unidade pede, sem sobrescrever as quatro; enquadra a unidade com as vizinhas em cinza e sem a nota do objeto; traz a
   referência do `plano.referencia`, inteira ou recortada. Cada medida é de pixel, de arquivo ou de texto, e não do olho. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { avancar, criarEstado } from '../src/condutor.js';
import { briefArquivo, briefDoCritico, briefDoMarco, briefDoObjeto, condutorArquivo, esbocoIsolado, lerArgumentos, PERGUNTAS_DO_CRITICO, variante, vistasArquivo } from '../../../tools/mecanifica/esboco.mjs';
import { linhasDasPerguntas } from '../../../src/autoria/perguntas-do-critico.js';
import { calibracaoDoContorno, caixaNaImagem, FIM_DO_BRIEF, gravarBrief, MARCA_DO_BRIEF, pngDoContorno, recortarPng, referenciaDoBrief } from '../../../tools/mecanifica/esboco-brief.mjs';
import { desenharEsboco } from '../src/index.js';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const medida = (nome, valor, mede) => ({ nome, valor, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede });
const NOTA = 'Maquete do objeto inteiro, com a proa em z 0';

/* nove caixas em fila (unidade "fila"), uma de ponta (unidade "ponta") e um chão de 2 m (unidade "base") que toca todas: a fila
   isolada é um décimo da largura do chão, que entra em cinza como vizinha e, sem o enquadramento da unidade, encolhia a fila */
const objeto = (extra = {}) => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida('a', 40, 'alturaTotal'), medida('b', 2000, 'larguraTotal'), medida('c', 2000, 'larguraTotal'), medida('d', 2000, 'larguraTotal'), medida('e', 2000, 'larguraTotal')], contrato: { tocam: [['c0', 'c1']] }, orientacao: { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' } },
  unidades: { fila: { funcao: 'fileira de caixas encostadas que faz o corpo do objeto' }, base: { funcao: 'chão largo sob a fileira' } },
  opcoes: [{ titulo: 'T', nota: NOTA, formas: [...Array.from({ length: 9 }, (_, i) => caixa(`c${i}`, [10 + 20 * i, 10, 0], { unidade: 'fila' })), caixa('p', [190, 10, 0], { unidade: 'ponta' }), caixa('chao', [100, -10, 0], { unidade: 'base', largura: 2000 })] }],
  ...extra,
});
const naDetalhe = (e) => { let s = criarEstado(e, 'x.esboco.json'); for (let i = 0; i < 3; i++) { const r = avancar(e, s); expect(r.ok).toBe(true); s = r.estado; } expect(s.atual).toBe('detalhe-por-unidade'); return s; };
/* o esboço vai com o campo que o teste testa; o estado do Condutor nasce do esboço sem a referência, que o Portão exigiria carregar */
const gravar = (e, { aoLado = (pasta) => void pasta, final = e } = {}) => {
  const pasta = mkdtempSync(join(tmpdir(), 'brief-'));
  const arquivo = join(pasta, 'g.esboco.json');
  writeFileSync(`${arquivo}.condutor.json`, JSON.stringify(naDetalhe(e), null, 2));
  aoLado(pasta);
  writeFileSync(arquivo, JSON.stringify(final, null, 2));
  return { pasta, arquivo };
};
const lerPng = (c) => PNG.sync.read(readFileSync(c));
const sha = (b) => createHash('sha256').update(b).digest('hex');

/* a faixa da imagem em que fica o desenho: o título está nos 10% de cima e a barra de escala nos 8% de baixo */
const faixa = (png) => [Math.round(png.height * 0.12), Math.round(png.height * 0.9)];

/* o retângulo mínimo da tinta escura (os traços do desenho, pretos) na faixa do desenho: [x0, y0, x1, y1] */
const caixaDaTinta = (png) => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const [de, ate] = faixa(png);
  for (let y = de; y < ate; y++) {
    for (let x = 0; x < png.width; x++) {
      const k = (y * png.width + x) * 4;
      if (png.data[k] < 90 && png.data[k + 1] < 90 && png.data[k + 2] < 90) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
  }
  return [x0, y0, x1, y1];
};

/* a máscara do que não é branco na faixa do desenho: Set de "x,y" */
const mascara = (png) => {
  const m = new Set();
  const [de, ate] = faixa(png);
  for (let y = de; y < ate; y++) for (let x = 0; x < png.width; x++) { const k = (y * png.width + x) * 4; if (png.data[k] < 250 || png.data[k + 1] < 250 || png.data[k + 2] < 250) m.add(`${x},${y}`); }
  return m;
};

/* a imagem de referência do teste: 200 x 100 px, cinza claro com um retângulo escuro em x 40..79 e y 40..59; o contorno em mm
   é h = 10 * px - 500 e v = 500 - 10 * py (v para cima), de modo que a origem do esboço cai no meio da imagem */
const referenciaDeTeste = (pasta, { dentroDe = '' } = {}) => {
  const img = new PNG({ width: 200, height: 100 });
  img.data.fill(235);
  for (let y = 40; y < 60; y++) for (let x = 40; x < 80; x++) { const k = (y * 200 + x) * 4; img.data[k] = 20; img.data[k + 1] = 20; img.data[k + 2] = 20; }
  for (let k = 3; k < img.data.length; k += 4) img.data[k] = 255;
  const png = PNG.sync.write(img);
  const pastaDoPng = dentroDe ? join(pasta, dentroDe) : pasta;
  mkdirSync(pastaDoPng, { recursive: true });
  writeFileSync(join(pastaDoPng, 'ref.png'), png);
  const px = [[40, 40], [79, 40], [79, 59], [40, 59]];
  writeFileSync(join(pasta, 'ref.contornos.json'), JSON.stringify({ formato: 'mecanifica.contornos@1', mmPorPx: 10, imagem: { sha256: sha(png), largura: 200, altura: 100 }, silhueta: { contornoPx: px, contornoMm: px.map(([x, y]) => [10 * x - 500, 500 - 10 * y]) }, regioes: {} }));
  return join(pastaDoPng, 'ref.png');
};

describe('brief.md: o brief gravado ao lado das imagens', () => {
  it('gravarBrief guarda o texto entre as marcas, que é o que o crítico recebe', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'brief-'));
    const destino = gravarBrief(pasta, ['linha do despacho', MARCA_DO_BRIEF, 'Objeto: x', FIM_DO_BRIEF]);
    expect(destino).toBe(join(pasta, 'brief.md'));
    expect(readFileSync(destino, 'utf8')).toBe(`${MARCA_DO_BRIEF}\nObjeto: x\n${FIM_DO_BRIEF}\n`);
  });

  it('a unidade grava brief.md na pasta das imagens, igual ao texto impresso entre as marcas, e a tela diz onde', async () => {
    const { pasta, arquivo } = gravar(objeto());
    const b = await briefDoCritico(arquivo, 'fila', { saida: join(pasta, 'critico') });
    expect(b.brief).toBe(join(pasta, 'critico', 'brief.md'));
    const gravado = readFileSync(b.brief, 'utf8');
    const linhas = b.texto.split('\n');
    expect(gravado).toBe(`${linhas.slice(linhas.indexOf(MARCA_DO_BRIEF), linhas.lastIndexOf(FIM_DO_BRIEF) + 1).join('\n')}\n`);
    expect(b.texto).toContain(`também fica em ${b.brief}; --brief fila o imprime e o regrava`);
    expect(gravado.startsWith(`${MARCA_DO_BRIEF}\nFunção da unidade: fileira de caixas`)).toBe(true);
    expect(gravado.endsWith(`${FIM_DO_BRIEF}\n`)).toBe(true);
    /* o brief que sai na tela termina como sempre terminou */
    expect(b.texto.endsWith(`${FIM_DO_BRIEF}\n`)).toBe(true);
  }, 120000);

  it('--brief reimprime e regrava o brief de uma unidade com brief, e recusa a que não tem, a que não existe e o Marco não registrado', async () => {
    const { pasta, arquivo } = gravar(objeto());
    const saida = join(pasta, 'de-novo');
    const r = await briefArquivo(arquivo, 'fila', { saida });
    expect(existsSync(join(saida, 'brief.md'))).toBe(true);
    expect(r.texto).toContain('crítico por unidade: a unidade fila (9 formas)');
    await expect(briefArquivo(arquivo, 'ponta', {})).rejects.toThrow(/--brief: a unidade "ponta" tem 1 forma e só a unidade com mais de 8 passa pelo crítico \(unidades com brief: fila\)/);
    await expect(briefArquivo(arquivo, 'nada', {})).rejects.toThrow(/--brief: "nada" não é um Marco .* o objeto \(objeto\) nem uma unidade \(unidades: fila, ponta, base\)/);
    await expect(briefArquivo(arquivo, 'marco-50', {})).rejects.toThrow(/o Marco de 50% não está registrado/);
    expect(lerArgumentos([arquivo, '--brief', 'marco-25']).valor('--brief')).toBe('marco-25');
  }, 120000);

  it('o Marco já registrado se reimprime: --brief marco-N grava brief.md com as vistas gerais, o relato por unidade e a referência', async () => {
    const { pasta, arquivo } = gravar(objeto(), { final: objeto() });
    for (const u of ['fila', 'ponta']) condutorArquivo(arquivo, { feito: u });
    const estado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
    expect((estado.marcos ?? []).length).toBeGreaterThan(0);
    const limiar = estado.marcos[0].limiar;
    const saida = join(pasta, 'marco');
    const m = await briefArquivo(arquivo, `marco-${limiar}`, { saida });
    const gravado = readFileSync(join(saida, 'brief.md'), 'utf8');
    expect(gravado.startsWith(MARCA_DO_BRIEF)).toBe(true);
    expect(gravado).toContain('Imagens gerais do objeto (as quatro vistas, sem legenda):');
    expect(gravado).toContain('De que lado cada vista olha');
    expect(gravado).toMatch(/Responda, olhando só as imagens:/);
    expect(m.texto).toContain(`--brief marco-${limiar} o imprime e o regrava`);
    expect(m.brief).toBe(join(saida, 'brief.md'));
  }, 240000);

  it('o objeto grava brief.md, e o brief direto (briefDoMarco) o grava também', async () => {
    const { pasta, arquivo } = gravar(objeto());
    const o = await briefDoObjeto(arquivo, { saida: join(pasta, 'objeto') });
    expect(readFileSync(o.brief, 'utf8')).toBe(`${o.texto.slice(o.texto.indexOf(MARCA_DO_BRIEF))}`);
    expect(o.texto).toContain('--brief objeto o imprime e o regrava');
    await expect(briefDoMarco(arquivo, 25, { saida: join(pasta, 'm') })).rejects.toThrow(/o Marco de 25% não está registrado/);
  }, 120000);
});

describe('o brief diz de que lado cada vista olha', () => {
  it('com `plano.orientacao`, nas palavras do objeto; sem ele, só o eixo', async () => {
    const com = gravar(objeto());
    const b = await briefDoCritico(com.arquivo, 'fila', { saida: join(com.pasta, 'c') });
    expect(b.texto).toContain('frontal: olha de +z e vê a cauda; a proa (-z) fica longe do olho, atrás do objeto');
    expect(b.texto).toContain('lateral: olha de +x e vê o lado direito; a proa (-z) fica à direita da imagem');
    expect(b.texto).toMatch(/As quatro vistas de sempre só olham dos lados positivos .*-z \(a proa\)/);
    const sem = objeto();
    delete sem.plano.orientacao;
    const s = gravar(sem);
    const c = await briefDoCritico(s.arquivo, 'fila', { saida: join(s.pasta, 'c') });
    expect(c.texto).toContain('frontal: olha de +z; +x fica à direita, +y fica em cima');
    expect(c.texto).not.toContain('a proa');
    /* o texto vem antes das perguntas e depois das imagens */
    expect(c.texto.indexOf('De que lado cada vista olha')).toBeGreaterThan(c.texto.indexOf('Imagens (as quatro vistas'));
    expect(c.texto.indexOf('De que lado cada vista olha')).toBeLessThan(c.texto.indexOf('Responda, olhando só as imagens:'));
  }, 240000);

  it('sem referência nem vistas a mais, o resto do brief é o de antes, linha a linha: só o bloco dos lados é novo', async () => {
    const sem = objeto();
    delete sem.plano.orientacao;
    const { pasta, arquivo } = gravar(sem);
    const b = await briefDoCritico(arquivo, 'fila', { saida: join(pasta, 'c') });
    expect(b.texto).not.toContain('Referência (o alvo');
    expect(b.texto).not.toContain('Imagens a mais');
    const linhas = b.texto.split('\n');
    const i = linhas.findIndex((l) => l.startsWith('De que lado cada vista olha'));
    const j = linhas.findIndex((l) => l.startsWith('Ligações da unidade em texto'));
    /* o bloco novo: o título, as quatro vistas e o que elas não olham */
    expect(j - i).toBe(6);
    const resto = [...linhas.slice(0, i), ...linhas.slice(j)].join('\n');
    expect(resto).toContain('Imagens (as quatro vistas da unidade isolada, sem legenda; as peças em contorno claro são de outras unidades e só mostram onde esta se prende, não as julgue):');
    expect(resto).toContain('Peças em cinza (de outras unidades, só mostram onde esta se prende; as imagens seguem sem legenda):');
    expect(resto).toContain(`Responda, olhando só as imagens:\n${linhasDasPerguntas(PERGUNTAS_DO_CRITICO, []).join('\n')}\n${FIM_DO_BRIEF}\n`);
  }, 120000);
});

describe('as vistas de outros lados da unidade, sem sobrescrever as quatro', () => {
  const comVistas = () => objeto({ unidades: { fila: { funcao: 'fileira de caixas encostadas que faz o corpo do objeto', vistas: ['frontal-oposta', 'inferior'] }, base: { funcao: 'chão largo sob a fileira' } } });

  it('a unidade que as pede ganha as imagens a mais, no brief e na pasta, e as quatro seguem iguais', async () => {
    const sem = gravar(objeto());
    const antes = await briefDoCritico(sem.arquivo, 'fila', { saida: join(sem.pasta, 'c') });
    const { pasta, arquivo } = gravar(comVistas());
    const b = await briefDoCritico(arquivo, 'fila', { saida: join(pasta, 'c') });
    expect(b.destinos).toHaveLength(6);
    for (const v of ['isometrica', 'frontal', 'lateral', 'superior', 'frontal-oposta', 'inferior']) expect(existsSync(join(pasta, 'c', `g-unidade-fila-${v}.png`)), v).toBe(true);
    expect(b.texto).toContain('Imagens a mais, de lados que as quatro não olham (a unidade as pede em "vistas"');
    expect(b.texto).toContain(`  frontal-oposta: ${join(pasta, 'c', 'g-unidade-fila-frontal-oposta.png')}`);
    expect(b.texto).toContain('frontal-oposta: olha de -z e vê a proa; a proa (-z) fica voltada para o olho');
    expect(b.texto).toContain('inferior: olha de -y e vê o lado de baixo');
    expect(b.texto).toMatch(/-x \(o lado esquerdo\) continua sem vista, só nos cortes/);
    /* as quatro de sempre são as mesmas pixel a pixel (a unidade sem `vistas` não muda) */
    for (const v of ['isometrica', 'frontal', 'lateral', 'superior']) {
      expect(readFileSync(join(pasta, 'c', `g-unidade-fila-${v}.png`)).equals(readFileSync(join(sem.pasta, 'c', `g-unidade-fila-${v}.png`))), v).toBe(true);
    }
    expect(antes.texto).not.toContain('Imagens a mais');
  }, 300000);

  it('a imagem extra é a vista oposta: a silhueta da frontal-oposta é a da frontal espelhada, e a da frontal não é simétrica sozinha', async () => {
    const { arquivo, pasta } = gravar(comVistas());
    const r = await vistasArquivo(arquivo, { unidade: 'fila', vistas: ['frontal', 'frontal-oposta'], largura: 600, saida: join(pasta, 'v') });
    const [a, b] = r.destinos.map((d) => lerPng(d));
    expect(a.width).toBe(b.width);
    const ma = mascara(a);
    const mb = mascara(b);
    const espelho = (m, w) => new Set([...m].map((k) => { const [x, y] = k.split(','); return `${w - 1 - Number(x)},${y}`; }));
    const diferentes = (m, n) => [...m].filter((k) => !n.has(k)).length;
    /* a ponta (cinza) fica à direita da fila na frontal e à esquerda na oposta: o espelho de uma é a outra, com folga de borda */
    expect(diferentes(mb, espelho(ma, a.width)) / mb.size).toBeLessThan(0.02);
    /* e a frontal sozinha não é simétrica: a ponta só aparece de um lado (se fosse, a prova não provaria nada) */
    expect(diferentes(ma, espelho(ma, a.width)) / ma.size).toBeGreaterThan(0.02);
  }, 120000);

  it('--vista aceita as de outros lados; --nivel-zero as recusa; a que não existe lista as válidas', async () => {
    const { arquivo, pasta } = gravar(objeto());
    const r = await vistasArquivo(arquivo, { vista: 'inferior', saida: join(pasta, 'v') });
    expect(r.destinos[0]).toMatch(/g-inferior\.png$/);
    await expect(vistasArquivo(arquivo, { vista: 'inferior', nivelZero: true })).rejects.toThrow(/--nivel-zero desenha a blocagem nas quatro vistas de sempre; inferior/);
    await expect(vistasArquivo(arquivo, { vista: 'de-baixo' })).rejects.toThrow(/vista 'de-baixo' desconhecida \(isometrica, frontal, lateral, superior, frontal-oposta, lateral-oposta, inferior\)/);
  }, 120000);

  it('uma imagem extra da unidade com outro enquadramento (largura ou sem vizinhas) não sobrescreve a vista do brief (a lateral extra da empenagem)', async () => {
    const { arquivo, pasta } = gravar(objeto());
    const saida = join(pasta, 'c');
    const b = await briefDoCritico(arquivo, 'fila', { saida });
    const lateralDoBrief = readFileSync(join(saida, 'g-unidade-fila-lateral.png'));
    const larga = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'lateral', largura: 1600, saida });
    const semVizinhos = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'lateral', largura: 1100, vizinhos: false, saida });
    expect(larga.destinos[0]).toMatch(/g-unidade-fila-1600px-lateral\.png$/);
    expect(semVizinhos.destinos[0]).toMatch(/g-unidade-fila-sem-vizinhos-lateral\.png$/);
    expect(existsSync(larga.destinos[0]) && existsSync(semVizinhos.destinos[0])).toBe(true);
    /* as imagens existem e são diferentes, e a lateral que o brief gravou continua como estava, com o nome de sempre */
    expect(readFileSync(semVizinhos.destinos[0]).equals(lateralDoBrief)).toBe(false);
    expect(readFileSync(larga.destinos[0]).equals(lateralDoBrief)).toBe(false);
    expect(readFileSync(join(saida, 'g-unidade-fila-lateral.png')).equals(lateralDoBrief)).toBe(true);
    expect(b.texto).toContain('g-unidade-fila-lateral.png');
    /* a largura do brief (1100) e o padrão com vizinhas não ganham sufixo, e o brief sem vizinhas (--feito --sem-vizinhos) lista o nome novo */
    const igual = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'lateral', largura: 1100, saida });
    expect(igual.destinos[0]).toMatch(/g-unidade-fila-lateral\.png$/);
    const sem = await briefDoCritico(arquivo, 'fila', { saida, vizinhos: false });
    expect(sem.texto).toContain('g-unidade-fila-sem-vizinhos-lateral.png');
    expect(sem.texto).not.toContain('g-unidade-fila-lateral.png');
    expect(readFileSync(join(saida, 'g-unidade-fila-lateral.png')).equals(lateralDoBrief)).toBe(true);
  }, 300000);
});

describe('a vista da unidade enquadra a unidade e não leva a nota do objeto', () => {
  it('o enquadramento fecha nas formas da unidade quando há vizinha em cinza: a unidade ocupa a imagem, e não um décimo dela', async () => {
    const { arquivo, pasta } = gravar(objeto());
    const bruto = JSON.parse(readFileSync(arquivo, 'utf8'));
    const estado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
    const com = esbocoIsolado(bruto, estado, 'fila', true);
    const sem = esbocoIsolado(bruto, estado, 'fila', false);
    expect(com.idsVizinhos).toContain('chao');
    expect(com.isolado.enquadrar).toEqual({ formas: ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], aviso: false });
    expect(sem.isolado.enquadrar).toBeUndefined();
    /* a escala (px por mm) da vista com a vizinha fica perto da sem vizinha, e sem o enquadramento seria 10 vezes menor */
    const escala = (esboco) => desenharEsboco(variante({ ...esboco, ladosPorEscala: true }, { vista: 'frontal', legendas: false, centros: false })).escala;
    const semEnquadre = escala({ ...com.isolado, enquadrar: undefined });
    expect(escala(com.isolado) / semEnquadre).toBeGreaterThan(6);
    expect(escala(com.isolado) / escala(sem.isolado)).toBeGreaterThan(0.4);
    /* o PNG: o desenho cabe em 45% da largura (o resto é reserva de legenda), e a tinta da unidade (traço preto) ocupa mais da metade disso, onde com o chão de 2 m inteiro no quadro ocuparia 4% da largura */
    const r = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'frontal', largura: 1100, saida: join(pasta, 'v') });
    const [x0, , x1] = caixaDaTinta(lerPng(r.destinos[0]));
    expect((x1 - x0) / 1100).toBeGreaterThan(0.25);
    /* e a unidade sem o enquadramento (o chão inteiro no quadro) ocuparia bem menos: a mesma medida na imagem da vista sem vizinhas, que enquadra a unidade, é a de referência */
    const so = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'frontal', largura: 1100, vizinhos: false, saida: join(pasta, 'v') });
    const [s0, , s1] = caixaDaTinta(lerPng(so.destinos[0]));
    /* a margem de 15% de cada lado do enquadramento deixa a fila com 180/234 = 77% do quadro da unidade sozinha */
    expect((x1 - x0) / (s1 - s0)).toBeGreaterThan(0.7);
  }, 180000);

  it('sem vizinha o quadro é o de antes, e `--zoom-forma` manda sobre o enquadramento da unidade', () => {
    const { arquivo } = gravar(objeto());
    const bruto = JSON.parse(readFileSync(arquivo, 'utf8'));
    const estado = JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8'));
    expect(esbocoIsolado(bruto, estado, 'fila', false).isolado.enquadrar).toBeUndefined();
    expect(esbocoIsolado(bruto, estado, 'fila', true, { zoomForma: { formas: 'c0', margem: 10 } }).isolado.enquadrar).toEqual({ formas: 'c0', margem: 10 });
  });

  it('a nota da opção sai do desenho da unidade (o título fica) e continua no do objeto inteiro', async () => {
    const { arquivo, pasta } = gravar(objeto());
    const r = await vistasArquivo(arquivo, { unidade: 'fila', vista: 'frontal', largura: 600, saida: join(pasta, 'v') });
    expect(r.svgs[0]).not.toContain(NOTA);
    expect(r.svgs[0]).toContain('>T<');
    const inteiro = await vistasArquivo(arquivo, { vista: 'frontal', largura: 600, saida: join(pasta, 'w') });
    expect(inteiro.svgs[0]).toContain(NOTA);
    /* o `ocultar` declarado na opção vence o da raiz, e a nota sai do mesmo jeito */
    const e = objeto();
    e.opcoes[0].ocultar = ['legendas'];
    const g = gravar(e);
    const u = await vistasArquivo(g.arquivo, { unidade: 'fila', vista: 'frontal', largura: 600, saida: join(g.pasta, 'v') });
    expect(u.svgs[0]).not.toContain(NOTA);
  }, 180000);
});

describe('a referência no brief', () => {
  const entrada = (extra = {}) => ({ arquivo: 'ref.contornos.json', vista: 'superior', tolerancia: 100000, iou_min: 0.001, ...extra });
  const comReferencia = (extra = {}, opcoesDoPng = {}) => {
    const e = objeto();
    const { pasta, arquivo } = gravar(e, { aoLado: (p) => referenciaDeTeste(p, opcoesDoPng), final: { ...e, plano: { ...e.plano, referencia: [entrada(extra)] } } });
    return { pasta, arquivo };
  };

  it('caixaNaImagem: a caixa da unidade em mm vira o retângulo em pixel, com a margem do enquadramento e o deslocamento', () => {
    const calibracao = { ah: 10, bh: -500, av: -10, bv: 500 };
    const caixa0 = { min: [0, 0, -10], max: [180, 20, 10] };
    /* superior: h = x e v = -z; margem = 15% de 180 = 27 mm; h de -27 a 207 e v de -37 a 37 */
    expect(caixaNaImagem({ caixa: caixa0, vista: 'superior', calibracao, largura: 200, altura: 100 })).toEqual([47, 46, 71, 54]);
    /* o deslocamento soma à coordenada da referência: com x +100 a mesma caixa cai 10 px mais à esquerda na imagem */
    expect(caixaNaImagem({ caixa: caixa0, vista: 'superior', calibracao, deslocamento: { x: 100 }, largura: 200, altura: 100 })).toEqual([37, 46, 61, 54]);
    /* na superior somar z subtrai de v: com z +100 a caixa sobe 20 px na imagem (v maior e py menor) */
    expect(caixaNaImagem({ caixa: caixa0, vista: 'superior', calibracao, deslocamento: { z: 100 }, largura: 200, altura: 100 })).toEqual([47, 36, 71, 44]);
    /* lateral: h = z e v = y, a caixa de y 100 a 300 e z 200 a 600 */
    expect(caixaNaImagem({ caixa: { min: [0, 100, 200], max: [0, 300, 600] }, vista: 'lateral', calibracao: { ah: 10, bh: 0, av: -10, bv: 1000 }, largura: 200, altura: 100 })).toEqual([14, 64, 66, 96]);
    /* fora da imagem */
    expect(caixaNaImagem({ caixa: { min: [9000, 0, 0], max: [9100, 10, 10] }, vista: 'superior', calibracao, largura: 200, altura: 100 })).toBeNull();
  });

  it('calibracaoDoContorno acha o px->mm do contorno, e recortarPng amplia o recorte', () => {
    const px = [[40, 40], [79, 40], [79, 59], [40, 59]];
    const c = calibracaoDoContorno({ silhueta: { contornoPx: px, contornoMm: px.map(([x, y]) => [10 * x - 500, 500 - 10 * y]) } });
    expect(c.ah).toBeCloseTo(10, 9); expect(c.bh).toBeCloseTo(-500, 6); expect(c.av).toBeCloseTo(-10, 9); expect(c.bv).toBeCloseTo(500, 6);
    expect(calibracaoDoContorno({ silhueta: {} })).toBeNull();
    const img = new PNG({ width: 4, height: 4 });
    for (let k = 0; k < 16; k++) { img.data[k * 4] = k < 8 ? 0 : 200; img.data[k * 4 + 1] = img.data[k * 4]; img.data[k * 4 + 2] = img.data[k * 4]; img.data[k * 4 + 3] = 255; }
    const r = recortarPng(img, [0, 0, 3, 3], 3);
    expect([r.width, r.height]).toEqual([12, 12]);
    expect(r.data[0]).toBe(0);
    expect(r.data[((11 * 12) + 11) * 4]).toBe(200);
  });

  it('pngDoContorno acha a imagem pelo hash que o contorno guarda, ao lado e em `referencias`, e devolve null sem ela', () => {
    const { pasta } = comReferencia();
    const json = JSON.parse(readFileSync(join(pasta, 'ref.contornos.json'), 'utf8'));
    expect(pngDoContorno(json, join(pasta, 'ref.contornos.json'), pasta)).toBe(join(pasta, 'ref.png'));
    const outra = comReferencia({}, { dentroDe: 'referencias' });
    const j = JSON.parse(readFileSync(join(outra.pasta, 'ref.contornos.json'), 'utf8'));
    expect(pngDoContorno(j, join(outra.pasta, 'ref.contornos.json'), outra.pasta)).toBe(join(outra.pasta, 'referencias', 'ref.png'));
    expect(pngDoContorno({ imagem: { sha256: 'x' } }, join(pasta, 'ref.contornos.json'), pasta)).toBeNull();
    expect(pngDoContorno({}, join(pasta, 'ref.contornos.json'), pasta)).toBeNull();
  });

  it('o brief da unidade traz a referência recortada em torno dela, dizendo que é o alvo, com o recorte em arquivo', async () => {
    const { pasta, arquivo } = comReferencia();
    const b = await briefDoCritico(arquivo, 'fila', { saida: join(pasta, 'c') });
    expect(b.texto).toMatch(/Referência \(o alvo da forma: a imagem que a pessoa escolheu.*aponte onde a silhueta ou a proporção se afastam dela .*recortadas em torno da unidade/);
    const destino = join(pasta, 'c', 'referencia-superior-fila.png');
    expect(b.texto).toContain(`  superior, recortada em torno da unidade: ${destino}`);
    expect(b.referencia).toEqual([destino]);
    /* [47, 46, 71, 54] em pixel, ampliado 8 vezes (o maior lado de 25 px chega a 200 px) */
    const r = lerPng(destino);
    expect([r.width, r.height]).toEqual([25 * 8, 9 * 8]);
    /* o retângulo escuro da imagem (x 40..79, y 40..59) cobre o canto esquerdo e o meio do recorte, que começa em x 47 e y 46 */
    expect(r.data[((4 * r.width) + 4) * 4]).toBeLessThan(60);
    /* a referência vem antes do bloco dos lados */
    expect(b.texto.indexOf('Referência (o alvo')).toBeLessThan(b.texto.indexOf('De que lado cada vista olha'));
  }, 120000);

  it('o brief do objeto e o do Marco trazem a imagem inteira, sem copiá-la', async () => {
    const { pasta, arquivo } = comReferencia();
    const o = await briefDoObjeto(arquivo, { saida: join(pasta, 'o') });
    expect(o.texto).toContain(`  superior, inteira: ${join(pasta, 'ref.png')}`);
    expect(o.referencia).toEqual([join(pasta, 'ref.png')]);
    expect(existsSync(join(pasta, 'o', 'referencia-superior.png'))).toBe(false);
  }, 120000);

  it('a imagem achada em `referencias`, o PNG declarado direto, o `recorte` declarado e a que não se acha', async () => {
    const dentro = comReferencia({}, { dentroDe: 'referencias' });
    const a = await briefDoObjeto(dentro.arquivo, { saida: join(dentro.pasta, 'o') });
    expect(a.texto).toContain(`  superior, inteira: ${join(dentro.pasta, 'referencias', 'ref.png')}`);
    const direto = comReferencia({ arquivo: 'ref.png', ancoras: 'x.json' });
    const b = await briefDoObjeto(direto.arquivo, { saida: join(direto.pasta, 'o') });
    expect(b.texto).toContain(`  superior, inteira: ${join(direto.pasta, 'ref.png')}`);
    const recortada = comReferencia({ arquivo: 'ref.png', ancoras: 'x.json', recorte: [30, 30, 99, 69] });
    const c = await briefDoObjeto(recortada.arquivo, { saida: join(recortada.pasta, 'o') });
    expect(c.texto).toContain(`  superior, recortada na área declarada em plano.referencia: ${join(recortada.pasta, 'o', 'referencia-superior.png')}`);
    const r = lerPng(join(recortada.pasta, 'o', 'referencia-superior.png'));
    expect([r.width, r.height]).toEqual([70, 40]);
    const sem = comReferencia();
    writeFileSync(join(sem.pasta, 'ref.png'), 'apagada');
    const d = await briefDoObjeto(sem.arquivo, { saida: join(sem.pasta, 'o') });
    expect(d.texto).toContain('superior: a imagem de "ref.contornos.json" não foi achada');
  }, 240000);

  it('sem `plano.referencia` o brief não ganha bloco nem arquivo de referência', () => {
    const { pasta, arquivo } = gravar(objeto());
    const r = referenciaDoBrief({ bruto: JSON.parse(readFileSync(arquivo, 'utf8')), base: pasta, pasta });
    expect(r).toEqual({ linhas: [], arquivos: [] });
  });

  it('a referência que não vale para a opção do brief fica de fora', () => {
    const e = objeto();
    e.plano.referencia = [{ arquivo: 'ref.contornos.json', vista: 'superior', opcoes: [2] }];
    const { pasta } = gravar(e);
    expect(referenciaDoBrief({ bruto: e, base: pasta, pasta }).linhas).toEqual([]);
  });
});
