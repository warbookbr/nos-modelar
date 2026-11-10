/* conferir-vistas.test.mjs — a rodada de conferência sobre uma cena sintética, sem navegador: dois cubos de cores diferentes lado a
   lado, uma referência em PNG com as mesmas duas cores e a divisa deslocada, a config e a rodada, com a captura pela vista rápida (o
   padrão) e sem captura. */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerArquivoDeEsboco, montarOpcoes } from './esboco-nucleo.mjs';
import { dePng, imagem, paraPng } from './leitura-por-regioes.mjs';
import { espelharImagem, executar, girarImagem } from './conferir-vistas.mjs';

const LARANJA = [226, 100, 30]; const CINZA = [107, 112, 116];
const pasta = mkdtempSync(join(tmpdir(), 'conferir-vistas-'));
const esboco = join(pasta, 'dois.esboco.json');
/* os cubos: "esq" de x = -100 a 0 mm e "dir" de 0 a 100, com 100 mm de altura; na vista frontal o laranja fica à esquerda */
writeFileSync(esboco, JSON.stringify({ opcoes: [{ titulo: 'dois cubos', formas: [
  { id: 'esq', op: 'cubo', args: { larg: 100, alt: 100, prof: 40 }, centro: [-50, 0, 0] },
  { id: 'dir', op: 'cubo', args: { larg: 100, alt: 100, prof: 40 }, centro: [50, 0, 0] }] }] }));
/* a referência: 220 x 120 px, o objeto na caixa 10,10,210,110, o laranja até x = 10 + divisa (a do modelo está em 100) */
function referencia(nome, divisa, [antes, depois] = [LARANJA, CINZA]) {
  const im = imagem(220, 120);
  for (let y = 10; y < 110; y += 1) for (let x = 10; x < 210; x += 1) im.dados.set(x < 10 + divisa ? antes : depois, (y * 220 + x) * 3);
  writeFileSync(join(pasta, nome), paraPng(im));
}
referencia('ref.png', 120);
/* de trás o laranja fica à direita */
referencia('ref-tras.png', 100, [CINZA, LARANJA]);
const CONFIG = {
  objeto: 'dois blocos', cores: { laranja: '#e2641e', cinza: '#6b7074' }, partes: { esq: 'laranja', dir: 'cinza' },
  dentro: { esq: 'dir' }, vistasDaSobra: ['superior'], toleranciaDaSobraMm: 3, largura: 200,
  vistas: { frontal: { referencia: 'ref.png', caixaRef: [10, 10, 210, 110], ignorar: [[10, 100, 30, 110]], fora: 'o chão', grade: [4, 3], visto: 'de frente' } },
};
const config = (nome, c) => { const arq = join(pasta, nome); writeFileSync(arq, JSON.stringify(c)); return arq; };
/* a montagem contada: a mesma do esboco:nucleo, com um contador */
function contando() {
  const conta = { montagens: 0 };
  return { conta, deps: { lerArquivoDeEsboco, montarOpcoes: (...a) => { conta.montagens += 1; return montarOpcoes(...a); } } };
}
const rodar = (saida, cfg = CONFIG, extra = [], deps = undefined) => executar([esboco, `--config=${config(`${saida}.json`, cfg)}`, `--saida=${join(pasta, saida)}`, '--sem-captura', ...extra], deps);
/* a rodada com o padrão; a captura pela bancada, se fosse chamada, derrubaria o teste */
const semNavegador = () => { const conta = { bancada: 0 }; return { conta, deps: { lerArquivoDeEsboco, montarOpcoes, capturarLadoALado: () => { conta.bancada += 1; throw new Error('o navegador não pode ser chamado'); } } }; };
const rodarPadrao = (saida, cfg = CONFIG, extra = [], deps = semNavegador().deps) => executar([esboco, `--config=${config(`${saida}.json`, cfg)}`, `--saida=${join(pasta, saida)}`, ...extra], deps);
const lerArvore = (dir) => Object.fromEntries(readdirSync(dir, { recursive: true }).sort().filter((f) => /\.(png|json|md)$/.test(f)).map((f) => [f, readFileSync(join(dir, f)).toString('base64')]));
const TRES = ['frente-direita', 'frente-esquerda', 'tras-direita', 'tras-esquerda'];

describe('conferir vistas', () => {
  it('monta a opção uma vez, grava os arquivos de cada vista e põe em primeiro a região da divisa deslocada', async () => {
    const { conta, deps } = contando();
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-tras.png', caixaRef: [10, 10, 210, 110], grade: [2, 2] } } };
    const r = await rodar('rodada', dupla, [], deps);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(conta.montagens).toBe(1);
    for (const v of ['frontal', 'traseira']) {
      const dir = join(pasta, 'rodada', v);
      for (const f of ['linhas.png', 'casamento.json', 'casamento.png', 'indice.png', 'folha-01.png', 'pedido.md', 'leitura.json']) expect(existsSync(join(dir, f)), `${v}/${f}`).toBe(true);
      expect(existsSync(join(dir, 'captura.png'))).toBe(false);
    }
    const resumo = JSON.parse(readFileSync(join(pasta, 'rodada', 'resumo.json'), 'utf8'));
    expect(resumo.formato).toBe('modelar.conferir-vistas@1');
    const frontal = resumo.vistas.frontal;
    /* a faixa trocada fica entre x = 100 e 120 do raster, na terceira coluna da grade */
    expect(['A3', 'B3', 'C3']).toContain(frontal.regioes[0].nome);
    expect(frontal.regioes[0].troca.pares[0]).toMatchObject({ referencia: 'laranja', modelo: 'cinza' });
    for (let i = 1; i < frontal.regioes.length; i += 1) expect(frontal.regioes[i - 1].nota).toBeGreaterThanOrEqual(frontal.regioes[i].nota);
    expect(frontal.regioes.every((x) => x.nota > 0)).toBe(true);
    expect(frontal.ordem).toHaveLength(12);
    expect(frontal.proporcao).toEqual({ referencia: 0.5, modelo: 0.5 });
    expect(frontal.captura).toMatchObject({ feita: false });
    expect(resumo.vistas.traseira.regioes).toEqual([]);
    /* o resumo para quem conduz traz os mesmos números, e o pedido a ordem sem os números */
    const md = readFileSync(join(pasta, 'rodada', 'resumo.md'), 'utf8');
    expect(md).toContain(`- ${frontal.regioes[0].nome}, nota ${frontal.regioes[0].nota.toFixed(2)}.`);
    expect(md).toContain('sem o rascunho com luz');
    expect(md).toContain(join(pasta, 'rodada', 'frontal', 'casamento.png'));
    const pedido = readFileSync(join(pasta, 'rodada', 'frontal', 'pedido.md'), 'utf8');
    expect(pedido).toContain(`Ordem sugerida para ler as regiões, da que a medida acha mais diferente da referência para a que acha menos: ${frontal.ordem.join(', ')}.`);
    expect(pedido).toContain('dois blocos, vista de frente'); expect(pedido).toContain('o chão');
    expect(pedido).not.toMatch(/nota \d/);
    expect(r.stdout).toContain(`vista frontal: sem captura`);
    expect(r.stdout).toContain(`as três regiões de maior nota: ${frontal.regioes.slice(0, 3).map((x) => `${x.nome} ${x.nota.toFixed(2)}`).join(', ')}`);
  });

  it('mede a sobra do par declarado e grava o desenho só do par que passa da tolerância', async () => {
    const r = await rodar('sobra', { ...CONFIG, dentro: { esq: ['dir'], dir: 'esq' }, vistasDaSobra: ['superior', 'frontal'], toleranciaDaSobraMm: 3 });
    expect(r.codigo).toBe(0);
    const { sobras } = JSON.parse(readFileSync(join(pasta, 'sobra', 'resumo.json'), 'utf8'));
    expect(sobras).toHaveLength(4);
    for (const s of sobras) { expect(s.maxMm).toBeCloseTo(100, 0); expect(s.passa).toBe(true); expect(existsSync(join(pasta, 'sobra', s.arquivo))).toBe(true); }
    const folga = await rodar('sobra-folga', { ...CONFIG, toleranciaDaSobraMm: 150 });
    expect(folga.codigo).toBe(0);
    const resumo = JSON.parse(readFileSync(join(pasta, 'sobra-folga', 'resumo.json'), 'utf8'));
    expect(resumo.sobras).toEqual([{ vista: 'superior', contida: 'esq', continente: 'dir', maxMm: resumo.sobras[0].maxMm, areaMm2: resumo.sobras[0].areaMm2, passa: false }]);
    expect(existsSync(join(pasta, 'sobra-folga', 'sobra'))).toBe(false);
  });

  it('a saída é igual a cada execução, com o padrão e sem captura', async () => {
    await rodarPadrao('repetida'); const um = lerArvore(join(pasta, 'repetida'));
    await rodarPadrao('repetida'); const dois = lerArvore(join(pasta, 'repetida'));
    expect(Object.keys(um)).toContain('frontal/captura.png'); expect(Object.keys(um)).toContain('tres-quartos/tras-esquerda.png');
    expect(dois).toEqual(um);
    await rodar('repetida-sem'); const tres = lerArvore(join(pasta, 'repetida-sem'));
    await rodar('repetida-sem'); expect(lerArvore(join(pasta, 'repetida-sem'))).toEqual(tres);
    expect(Object.keys(tres).length).toBeGreaterThan(10);
  });

  it('por padrão tira a captura de cada vista da vista rápida, sem navegador, e a leitura a aceita', async () => {
    const { conta, deps } = semNavegador();
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-tras.png', caixaRef: [10, 10, 210, 110], grade: [2, 2] } } };
    const r = await rodarPadrao('rapida', dupla, [], deps);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(conta.bancada).toBe(0);
    const resumo = JSON.parse(readFileSync(join(pasta, 'rapida', 'resumo.json'), 'utf8'));
    expect(resumo.captura).toBe('rapida');
    const md = readFileSync(join(pasta, 'rapida', 'resumo.md'), 'utf8');
    for (const v of ['frontal', 'traseira']) {
      const dir = join(pasta, 'rapida', v);
      const captura = dePng(readFileSync(join(dir, 'captura.png')));
      const linhas = dePng(readFileSync(join(dir, 'linhas.png')));
      expect(captura.largura).toBe(CONFIG.largura);
      expect(Buffer.from(captura.dados).equals(Buffer.from(linhas.dados))).toBe(false);
      expect(resumo.vistas[v].captura).toEqual({ feita: true, origem: 'rapida', arquivo: `${v}/captura.png` });
      /* a leitura leu a captura, e não o desenho das linhas, e achou nela o objeto com a proporção dos cubos (100 por 200 mm) */
      const leitura = JSON.parse(readFileSync(join(dir, 'leitura.json'), 'utf8'));
      expect(leitura.captura).toBe(`${v}/captura.png`);
      expect(leitura.proporcao.rascunho).toBeCloseTo(0.5, 1);
      expect(readFileSync(join(dir, 'pedido.md'), 'utf8')).not.toContain('não houve captura com luz');
      expect(md).toContain(`O rascunho com luz está em ${join(dir, 'captura.png')}; ele saiu da vista rápida`);
    }
    expect(md).not.toContain('sem o rascunho com luz');
    expect(r.stdout).toContain('vista frontal: com captura (rapida)');
    expect(r.stdout).toMatch(/tempo: \d+\.\d s, dos quais \d+\.\d s de montagem/);
  });

  it('grava as quatro vistas de três quartos e as cita no resumo, e "tresQuartos": false as desliga', async () => {
    expect((await rodarPadrao('tres')).codigo).toBe(0);
    const md = readFileSync(join(pasta, 'tres', 'resumo.md'), 'utf8');
    const resumo = JSON.parse(readFileSync(join(pasta, 'tres', 'resumo.json'), 'utf8'));
    expect(resumo.tresQuartos.map((t) => t.nome)).toEqual(TRES);
    expect(md).toContain('só aparece na vista vizinha');
    const imagens = TRES.map((n) => { const arq = join(pasta, 'tres', 'tres-quartos', `${n}.png`); expect(md).toContain(arq); return readFileSync(arq).toString('base64'); });
    /* de frente pela direita e de trás pela esquerda os dois cubos trocam de lado: as quatro imagens são diferentes */
    expect(new Set(imagens).size).toBe(4);
    expect((await rodarPadrao('tres-nao', { ...CONFIG, tresQuartos: false })).codigo).toBe(0);
    expect(existsSync(join(pasta, 'tres-nao', 'tres-quartos'))).toBe(false);
    expect(readFileSync(join(pasta, 'tres-nao', 'resumo.md'), 'utf8')).not.toContain('Três quartos');
    expect(JSON.parse(readFileSync(join(pasta, 'tres-nao', 'resumo.json'), 'utf8')).tresQuartos).toEqual([]);
    const ruim = await rodarPadrao('tres-ruim', { ...CONFIG, tresQuartos: 'sim' });
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toContain('tresQuartos: espera true ou false');
  });

  it('--captura=nenhuma e --sem-captura dão o mesmo, e valor ruim de --captura é recusado', async () => {
    const cfg = config('nenhuma.json', CONFIG); const saida = join(pasta, 'nenhuma');
    expect((await executar([esboco, `--config=${cfg}`, `--saida=${saida}`, '--captura=nenhuma'])).codigo).toBe(0);
    const um = lerArvore(saida);
    expect(Object.keys(um).some((f) => f.endsWith('captura.png'))).toBe(false);
    expect((await executar([esboco, `--config=${cfg}`, `--saida=${saida}`, '--sem-captura'])).codigo).toBe(0);
    expect(lerArvore(saida)).toEqual(um);
    expect(JSON.parse(readFileSync(join(saida, 'resumo.json'), 'utf8')).vistas.frontal.captura).toEqual({ feita: false, motivo: 'a rodada pediu --captura=nenhuma' });
    const ruim = await executar([esboco, `--config=${cfg}`, `--saida=${saida}`, '--captura=chromium']);
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toContain('--captura espera rapida, bancada, nenhuma e veio "chromium"');
    expect((await executar([esboco, `--config=${cfg}`, `--saida=${saida}`, '--captura=rapida', '--sem-captura'])).codigo).toBe(2);
  });

  it('filtra as vistas e repassa o registro à leitura da vista', async () => {
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-tras.png', caixaRef: [10, 10, 210, 110] } } };
    expect((await rodar('filtro', dupla, ['--vistas=traseira'])).codigo).toBe(0);
    expect(existsSync(join(pasta, 'filtro', 'traseira', 'pedido.md'))).toBe(true);
    expect(existsSync(join(pasta, 'filtro', 'frontal'))).toBe(false);
    const nomes = JSON.parse(readFileSync(join(pasta, 'filtro', 'traseira', 'leitura.json'), 'utf8')).regioes.map((x) => x.nome);
    const respostas = join(pasta, 'respostas.json');
    writeFileSync(respostas, JSON.stringify({ regioes: Object.fromEntries(nomes.map((n) => [n, { igual: true }])) }));
    const reg = await executar([`--saida=${join(pasta, 'filtro')}`, `--registrar=traseira:${respostas}`]);
    expect(reg.codigo).toBe(0); expect(reg.stdout).toContain(`rodada 1: ${nomes.length} regiões iguais`);
    expect(existsSync(join(pasta, 'filtro', 'traseira', 'rodadas', 'rodada-01.json'))).toBe(true);
    writeFileSync(respostas, JSON.stringify({ regioes: {} }));
    expect((await executar([`--saida=${join(pasta, 'filtro')}`, `--registrar=traseira:${respostas}`])).codigo).toBe(1);
    expect((await executar([`--saida=${join(pasta, 'filtro')}`, `--registrar=frontal:${respostas}`])).codigo).toBe(2);
    expect((await rodar('filtro2', dupla, ['--vistas=superior'])).stderr).toContain('--vistas: a vista "superior" não está na config');
  });

  it('recusa a config com o campo e o motivo, com código 2', async () => {
    const recusa = async (nome, cfg, trecho) => {
      const r = await rodar(nome, cfg);
      expect(r.codigo, nome).toBe(2); expect(r.stderr, nome).toContain(trecho);
    };
    const vista = CONFIG.vistas.frontal;
    await recusa('r-vista', { ...CONFIG, vistas: { lateral: vista } }, 'vistas.lateral: a vista "lateral" não existe na bancada');
    await recusa('r-parte', { ...CONFIG, partes: { ...CONFIG.partes, capo: 'laranja' } }, 'partes: a opção montada não tem a parte capo, que a config declara; as partes da opção são esq, dir');
    await recusa('r-sem-classe', { ...CONFIG, partes: { esq: 'laranja' } }, 'partes: falta a classe de dir');
    await recusa('r-classe', { ...CONFIG, partes: { esq: 'laranja', dir: 'verde' } }, 'partes.dir: a classe "verde" não está em cores (laranja, cinza)');
    await recusa('r-referencia', { ...CONFIG, vistas: { frontal: { ...vista, referencia: 'nao-tem.png' } } }, 'vistas.frontal.referencia:');
    await recusa('r-caixa', { ...CONFIG, vistas: { frontal: { ...vista, caixaRef: [10, 10, 300, 110] } } }, 'vistas.frontal.caixaRef: 10,10,300,110 está fora da imagem de 220 x 120 px');
    await recusa('r-dentro', { ...CONFIG, dentro: { esq: 'capo' } }, 'dentro.esq: a parte "capo" não existe na opção');
    await recusa('r-cor', { ...CONFIG, cores: { laranja: 'laranja' } }, 'cores:');
    await recusa('r-sobra', { ...CONFIG, vistasDaSobra: ['cima'] }, 'vistasDaSobra: a vista "cima" não existe');
    /* várias recusas saem juntas */
    const varias = await rodar('r-varias', { ...CONFIG, vistasDaSobra: ['cima'], vistas: { frontal: { ...vista, grade: [0, 3] } } });
    expect(varias.stderr).toContain('vistasDaSobra'); expect(varias.stderr).toContain('vistas.frontal.grade');
    expect((await executar([esboco, `--saida=${pasta}`])).codigo).toBe(2);
    expect((await executar([esboco, `--config=${join(pasta, 'nao-tem.json')}`, `--saida=${pasta}`])).codigo).toBe(2);
    expect((await rodar('r-opcao', CONFIG, ['--opcao=2'])).stderr).toContain('o esboço tem 1 opções');
    expect((await executar(['--ajuda'])).stdout).toContain('npm run conferir:vistas');
  });

  it('a referência deitada com "girar": 90 dá o mesmo casamento e a mesma leitura que a mesma referência em pé', async () => {
    /* a deitada é a ref.png girada 90 graus no sentido anti-horário, montada aqui pixel a pixel: (x, y) da deitada é (219 - y, x) da em pé */
    const emPe = dePng(readFileSync(join(pasta, 'ref.png')));
    const deitada = imagem(emPe.altura, emPe.largura);
    for (let y = 0; y < deitada.altura; y += 1) for (let x = 0; x < deitada.largura; x += 1) {
      const i = (x * emPe.largura + (emPe.largura - 1 - y)) * 3; deitada.dados.set(emPe.dados.subarray(i, i + 3), (y * deitada.largura + x) * 3);
    }
    writeFileSync(join(pasta, 'ref-deitada.png'), paraPng(deitada));
    expect(Buffer.from(girarImagem(deitada, 90).dados).equals(Buffer.from(emPe.dados))).toBe(true);
    expect(Buffer.from(girarImagem(girarImagem(girarImagem(deitada, 180), 270), 0).dados).equals(Buffer.from(emPe.dados))).toBe(true);
    const girada = { ...CONFIG, vistas: { frontal: { ...CONFIG.vistas.frontal, referencia: 'ref-deitada.png', girar: 90 } } };
    expect((await rodarPadrao('em-pe')).codigo).toBe(0);
    const r = await rodarPadrao('girada', girada);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    const um = JSON.parse(readFileSync(join(pasta, 'em-pe', 'resumo.json'), 'utf8')).vistas.frontal;
    const dois = JSON.parse(readFileSync(join(pasta, 'girada', 'resumo.json'), 'utf8')).vistas.frontal;
    expect(dois.giro).toEqual({ girar: 90, espelhar: false }); expect(um.giro).toBeUndefined();
    for (const k of ['proporcao', 'ordem', 'regioes', 'ignoradas']) expect(dois[k], k).toEqual(um[k]);
    expect(dois.regioes.length).toBeGreaterThan(0);
    const semRef = (arq) => { const j = JSON.parse(readFileSync(arq, 'utf8')); delete j.referencia; return j; };
    for (const f of ['casamento.json', 'leitura.json']) expect(semRef(join(pasta, 'girada', 'frontal', f)), f).toEqual(semRef(join(pasta, 'em-pe', 'frontal', f)));
    for (const f of ['casamento.png', 'indice.png', 'folha-01.png']) expect(readFileSync(join(pasta, 'girada', 'frontal', f)).equals(readFileSync(join(pasta, 'em-pe', 'frontal', f))), f).toBe(true);
    expect(readFileSync(join(pasta, 'girada', 'resumo.md'), 'utf8')).toContain('A referência ref-deitada.png foi girada 90 graus no sentido horário antes da medida');
    expect(readFileSync(join(pasta, 'em-pe', 'resumo.md'), 'utf8')).not.toContain('graus no sentido horário');
  });

  it('"espelhar" troca os lados da referência, e giro ou espelho fora da lista é recusado com o campo e o motivo', async () => {
    const im = dePng(readFileSync(join(pasta, 'ref-tras.png')));
    const espelho = espelharImagem(im);
    expect([...espelho.dados.subarray((50 * 220 + 20) * 3, (50 * 220 + 20) * 3 + 3)]).toEqual(LARANJA);
    expect([...im.dados.subarray((50 * 220 + 20) * 3, (50 * 220 + 20) * 3 + 3)]).toEqual(CINZA);
    /* de frente o laranja fica à esquerda: a referência de trás, com o laranja à direita, não casa, e espelhada casa inteira */
    const tras = { referencia: 'ref-tras.png', caixaRef: [10, 10, 210, 110], grade: [2, 2] };
    expect((await rodar('sem-espelho', { ...CONFIG, vistas: { frontal: tras } })).codigo).toBe(0);
    expect(JSON.parse(readFileSync(join(pasta, 'sem-espelho', 'resumo.json'), 'utf8')).vistas.frontal.regioes.length).toBeGreaterThan(0);
    expect((await rodar('espelho', { ...CONFIG, vistas: { frontal: { ...tras, espelhar: true } } })).codigo).toBe(0);
    const v = JSON.parse(readFileSync(join(pasta, 'espelho', 'resumo.json'), 'utf8')).vistas.frontal;
    expect(v.regioes).toEqual([]); expect(v.giro).toEqual({ girar: 0, espelhar: true });
    expect(readFileSync(join(pasta, 'espelho', 'resumo.md'), 'utf8')).toContain('foi espelhada na horizontal antes da medida');
    const vista = CONFIG.vistas.frontal;
    for (const [nome, extra, trecho] of [
      ['r-girar', { girar: 45 }, 'vistas.frontal.girar: espera 0, 90, 180, 270 (graus no sentido horário) e veio 45'],
      ['r-girar-texto', { girar: '90' }, 'vistas.frontal.girar: espera 0, 90, 180, 270 (graus no sentido horário) e veio "90"'],
      ['r-espelhar', { espelhar: 'sim' }, 'vistas.frontal.espelhar: espera true ou false e veio "sim"'],
      /* a caixa vale na imagem girada: de pé a caixa cabe, deitada (120 x 220 px) ela sai da imagem */
      ['r-caixa-girada', { girar: 90 }, 'vistas.frontal.caixaRef: 10,10,210,110 está fora da imagem de 120 x 220 px (já girada 90 graus no sentido horário)'],
    ]) {
      const r = await rodar(nome, { ...CONFIG, vistas: { frontal: { ...vista, ...extra } } });
      expect(r.codigo, nome).toBe(2); expect(r.stderr, nome).toContain(trecho);
    }
  });

  it('a parte que a config declara e a opção montada não tem é recusada com as que faltam e as da opção, e o contrário também', async () => {
    /* o piso e o tapete que um comentário mal fechado engoliu: declarados na config, ausentes da opção */
    const sumiu = await rodar('r-sumiu', { ...CONFIG, partes: { ...CONFIG.partes, piso: 'cinza', tapete: 'laranja' } });
    expect(sumiu.codigo).toBe(2);
    expect(sumiu.stderr).toContain('partes: a opção montada não tem as partes piso, tapete, que a config declara; as partes da opção são esq, dir');
    expect(existsSync(join(pasta, 'r-sumiu', 'resumo.md'))).toBe(false);
    /* a parte da opção sem classe na config */
    const semClasse = await rodar('r-sem-classe-2', { ...CONFIG, partes: { dir: 'cinza' }, dentro: undefined });
    expect(semClasse.codigo).toBe(2); expect(semClasse.stderr).toContain('partes: falta a classe de esq');
    /* os dois sentidos juntos saem na mesma recusa */
    const ambos = await rodar('r-ambos', { ...CONFIG, partes: { esq: 'laranja', piso: 'cinza' }, dentro: undefined });
    expect(ambos.stderr).toContain('não tem a parte piso'); expect(ambos.stderr).toContain('falta a classe de dir');
  });

  it('diz que a rodada seguinte usa a mesma pasta, e --rodadas-de leva as rodadas a uma pasta nova, onde a seguinte sai com o número 02', async () => {
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-tras.png', caixaRef: [10, 10, 210, 110] } } };
    expect((await rodar('primeira', dupla, ['--vistas=traseira'])).codigo).toBe(0);
    const md = readFileSync(join(pasta, 'primeira', 'resumo.md'), 'utf8');
    const frase = `A rodada seguinte usa a mesma pasta (${join(pasta, 'primeira')}): as imagens são regravadas e rodadas/ de cada vista se acumula`;
    expect(md.split(frase).length - 1).toBe(2);
    expect(md.trimEnd().split('\n').at(-1)).toContain(frase);
    const nomes = JSON.parse(readFileSync(join(pasta, 'primeira', 'traseira', 'leitura.json'), 'utf8')).regioes.map((x) => x.nome);
    const respostas = join(pasta, 'respostas-rodadas.json');
    writeFileSync(respostas, JSON.stringify({ regioes: Object.fromEntries(nomes.map((n) => [n, { igual: true }])) }));
    expect((await executar([`--saida=${join(pasta, 'primeira')}`, `--registrar=traseira:${respostas}`])).stdout).toContain('rodada 1:');
    /* a pasta nova sem --rodadas-de recomeça em 01; com ela, a seguinte é a 02 */
    expect((await rodar('nova-sem', dupla, ['--vistas=traseira'])).codigo).toBe(0);
    expect((await executar([`--saida=${join(pasta, 'nova-sem')}`, `--registrar=traseira:${respostas}`])).stdout).toContain('rodada 1:');
    const r = await rodar('nova', dupla, ['--vistas=traseira', `--rodadas-de=${join(pasta, 'primeira')}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(readFileSync(join(pasta, 'nova', 'traseira', 'rodadas', 'rodada-01.json')).equals(readFileSync(join(pasta, 'primeira', 'traseira', 'rodadas', 'rodada-01.json')))).toBe(true);
    const resumo = JSON.parse(readFileSync(join(pasta, 'nova', 'resumo.json'), 'utf8'));
    expect(resumo.rodadasDe).toEqual({ pasta: join(pasta, 'primeira'), copiadas: [{ vista: 'traseira', rodadas: 1 }] });
    expect(readFileSync(join(pasta, 'nova', 'resumo.md'), 'utf8')).toContain(`As rodadas registradas vieram de ${join(pasta, 'primeira')}: 1 da vista traseira.`);
    const seguinte = await executar([`--saida=${join(pasta, 'nova')}`, `--registrar=traseira:${respostas}`]);
    expect(seguinte.codigo).toBe(0); expect(seguinte.stdout).toContain('rodada 2:');
    expect(existsSync(join(pasta, 'nova', 'traseira', 'rodadas', 'rodada-02.json'))).toBe(true);
    /* a pasta que já tem rodadas não recebe as da outra, e a pasta que não existe é recusada */
    expect((await rodar('nova', dupla, ['--vistas=traseira', `--rodadas-de=${join(pasta, 'nova-sem')}`])).codigo).toBe(0);
    expect(readdirSync(join(pasta, 'nova', 'traseira', 'rodadas')).sort()).toEqual(['rodada-01.json', 'rodada-02.json']);
    expect(JSON.parse(readFileSync(join(pasta, 'nova', 'resumo.json'), 'utf8')).rodadasDe.copiadas).toEqual([]);
    const ruim = await rodar('nova-ruim', dupla, [`--rodadas-de=${join(pasta, 'nao-tem')}`]);
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toContain('--rodadas-de: a pasta');
  });
});
