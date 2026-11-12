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

  it('a vista só de contornos dá a sobra e a falta, deixa a parte fora da conta de fora da silhueta e conta a fenda à parte', async () => {
    /* quatro painéis em moldura com uma junta de 4 mm por 100 entre eles, e um fundo atrás que a referência não tem */
    const quadro = join(pasta, 'junta.esboco.json');
    writeFileSync(quadro, JSON.stringify({ opcoes: [{ titulo: 'junta', formas: [
      { id: 'esq', op: 'cubo', args: { larg: 98, alt: 100, prof: 20 }, centro: [-51, 0, 0] },
      { id: 'dir', op: 'cubo', args: { larg: 98, alt: 100, prof: 20 }, centro: [51, 0, 0] },
      { id: 'tampaCima', op: 'cubo', args: { larg: 200, alt: 10, prof: 20 }, centro: [0, 55, 0] },
      { id: 'tampaBaixo', op: 'cubo', args: { larg: 200, alt: 10, prof: 20 }, centro: [0, -55, 0] },
      { id: 'fundo', op: 'cubo', args: { larg: 200, alt: 120, prof: 20 }, centro: [0, 0, -60] }] }] }));
    writeFileSync(join(pasta, 'junta.contornos.json'), JSON.stringify({ formato: 'mecanifica.contornos@1', mmPorPx: 1, regioes: { tudo: { pedacos: [{ contornoMm: [[-100, -60], [100, -60], [100, 60], [-100, 60]] }] } } }));
    const vista = { contornos: 'junta.contornos.json', escala: 1, ancora: { contorno: [0, 0], modelo: [0, 0, 0] }, partes: { tudo: ['esq', 'dir', 'tampaCima', 'tampaBaixo'] } };
    const partes = { esq: 'laranja', dir: 'laranja', tampaCima: 'laranja', tampaBaixo: 'laranja', fundo: 'cinza' };
    const medir = async (nome, extra) => {
      const cfg = config(`${nome}.json`, { ...CONFIG, partes, dentro: {}, largura: 400, vistas: { frontal: { ...vista, ...extra } } });
      const r = await executar([quadro, `--config=${cfg}`, `--saida=${join(pasta, nome)}`, '--sem-captura']);
      return { r, v: r.codigo === 0 ? JSON.parse(readFileSync(join(pasta, nome, 'resumo.json'), 'utf8')).vistas.frontal : null };
    };
    /* com o fundo na conta, ele tapa a junta: nenhuma fenda, e nada sobra nem falta */
    const com = await medir('junta-com', {});
    expect(com.r.stderr).toBe(''); expect(com.r.codigo).toBe(0);
    expect(com.v.conjunto.fendas.estreitas).toEqual([]);
    expect(com.v.conjunto.sobraMm2).toBeLessThan(30); expect(com.v.conjunto.faltaMm2).toBeLessThan(30);
    /* fora da conta, a junta aparece como furo: uma fenda de 4 mm por 100 no meio, e a falta de 400 mm² */
    const fora = await medir('junta-fora', { foraDaConta: [{ partes: ['fundo'], motivo: 'o chassi não está na referência' }] });
    expect(fora.r.stderr).toBe(''); expect(fora.r.codigo).toBe(0);
    const c = fora.v.conjunto; const mm = fora.v.mmPorPx;
    expect(c.fendas.estreitas).toHaveLength(1);
    expect(c.fendas.estreitas[0].larguraMm).toBeGreaterThan(4 - 1.5 * mm); expect(c.fendas.estreitas[0].larguraMm).toBeLessThan(4 + 1.5 * mm);
    expect(Math.abs(c.fendas.estreitas[0].comprimentoMm - 100)).toBeLessThanOrEqual(2 * mm);
    expect(Math.abs(c.fendas.estreitas[0].em.x)).toBeLessThanOrEqual(2 * mm); expect(Math.abs(c.fendas.estreitas[0].em.y)).toBeLessThanOrEqual(2 * mm);
    expect(Math.abs(c.faltaMm2 - 400)).toBeLessThan(80); expect(c.sobraMm2).toBeLessThan(30);
    expect(Math.abs(c.faltaDaReferencia - 400 / 24000)).toBeLessThan(0.004);
    /* o afastamento mede só o contorno de fora: o furo de 4 mm não conta, e o contorno de fora casa com a referência */
    expect(c.afastamento.maior.mm).toBeLessThanOrEqual(2 * mm);
    expect(fora.v.foraDaConta).toEqual([{ partes: ['fundo'], motivo: 'o chassi não está na referência' }]);
    const md = readFileSync(join(pasta, 'junta-fora', 'resumo.md'), 'utf8');
    expect(md).toContain('Fora da conta, sem entrar na silhueta do modelo: fundo (o chassi não está na referência).');
    expect(md).toMatch(/sobra \d+ mm² \(\d+\.\d% da área da referência\) e falta \d+ mm² \(\d+\.\d% da área da referência\)/);
    expect(md).toContain('1 fenda(s) de até 20 mm na silhueta do modelo, por onde se vê o outro lado');
    expect(fora.r.stdout).toMatch(/sobra \d+\.\d% e falta \d+\.\d% da referência, 1 fenda\(s\)/);
    /* as recusas */
    for (const [nome, extra, trecho] of [
      ['rf-parte', { foraDaConta: [{ partes: ['nada'], motivo: 'x' }] }, 'vistas.frontal.foraDaConta: a parte "nada" não existe na opção'],
      ['rf-motivo', { foraDaConta: [{ partes: ['fundo'] }] }, 'vistas.frontal.foraDaConta[0].motivo'],
      ['rf-forma', { foraDaConta: 'fundo' }, 'vistas.frontal.foraDaConta: espera uma lista'],
      ['rf-dentro', { foraDaConta: [{ partes: ['esq'], motivo: 'x' }] }, 'a parte "esq" está em "partes" e fora da conta'],
      ['rf-fenda', { fendaMm: 0 }, 'vistas.frontal.fendaMm'],
    ]) {
      const x = await medir(nome, extra);
      expect(x.r.codigo, nome).toBe(2); expect(x.r.stderr, nome).toContain(trecho);
    }
  });

  it('a vista só de contornos mede a sobreposição, a caixa por lado e o maior afastamento por parte, sem casamento nem crítico', async () => {
    /* o arquivo de contornos na metade da escala do modelo: "a" é o cubo esq inteiro, "b" passa 20 mm do dir para a direita, e a
       sombra embaixo fica fora do conjunto */
    const ret = (x0, x1, y0, y1) => ({ contornoMm: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
    const arquivo = (espelho) => {
      const r = (x0, x1, y0, y1) => (espelho ? ret(-x1, -x0, y0, y1) : ret(x0, x1, y0, y1));
      return { formato: 'mecanifica.contornos@1', mmPorPx: 1, regioes: { a: { pedacos: [r(-50, 0, -25, 25)] }, b: { pedacos: [r(0, 60, -25, 25)] }, sombra: { pedacos: [r(-60, 70, -40, -26)] } } };
    };
    writeFileSync(join(pasta, 'dois.contornos.json'), JSON.stringify(arquivo(false)));
    writeFileSync(join(pasta, 'dois-espelho.contornos.json'), JSON.stringify(arquivo(true)));
    const vista = { contornos: 'dois.contornos.json', escala: 2, ancora: { contorno: [0, 0], modelo: [0, 0, 0] }, partes: { a: 'esq', b: ['dir'], 'a+b': ['esq', 'dir'] }, ignorarRegioes: ['sombra'] };
    const cfg = { ...CONFIG, vistas: { frontal: vista } };
    const { conta, deps } = contando();
    const r = await rodar('contornos', cfg, [], deps);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0); expect(conta.montagens).toBe(1);
    const dir = join(pasta, 'contornos', 'frontal');
    expect(existsSync(join(dir, 'contornos.png'))).toBe(true); expect(existsSync(join(dir, 'contornos.json'))).toBe(true);
    for (const f of ['casamento.json', 'pedido.md', 'leitura.json', 'captura.png']) expect(existsSync(join(dir, f)), f).toBe(false);
    const resumo = JSON.parse(readFileSync(join(pasta, 'contornos', 'resumo.json'), 'utf8'));
    const v = resumo.vistas.frontal;
    expect(v.tipo).toBe('contornos'); expect(v.eixos).toEqual({ horizontal: 'x', vertical: 'y' });
    const mm = v.mmPorPx;
    const { a, b } = v.partes;
    expect(a.sobreposicao).toBeGreaterThan(0.97);
    expect(Math.abs(b.sobreposicao - 100 / 120)).toBeLessThan(0.02);
    expect(Math.abs(v.conjunto.sobreposicao - 200 / 220)).toBeLessThan(0.02);
    /* a caixa da referência de b vai a x = 120 e a do modelo a 100: o modelo fica 20 mm aquém à direita, e o resto empata */
    expect(Math.abs(b.caixaReferencia.x[1] - 120)).toBeLessThanOrEqual(mm); expect(Math.abs(b.caixaModelo.x[1] - 100)).toBeLessThanOrEqual(mm);
    expect(Math.abs(b.lados.direita + 20)).toBeLessThanOrEqual(mm);
    for (const lado of ['esquerda', 'baixo', 'cima']) expect(Math.abs(b.lados[lado]), lado).toBeLessThanOrEqual(mm);
    /* o maior afastamento de b é de 20 mm nos dois sentidos: da borda direita da referência (x perto de 120) até o modelo, e da borda
       direita do modelo (x perto de 100, no meio da altura) até a da referência, que está a 20 mm à direita e em cima */
    expect(Math.abs(b.afastamento.maior.mm - 20)).toBeLessThanOrEqual(1.5 * mm);
    expect(Math.abs(b.afastamento.daReferencia.em.x - 120)).toBeLessThanOrEqual(1.5 * mm);
    expect(Math.abs(b.afastamento.doModelo.em.x - 100)).toBeLessThanOrEqual(1.5 * mm);
    expect(a.afastamento.maior.mm).toBeLessThanOrEqual(1.5 * mm);
    /* a entrada com "+" junta as partes do arquivo, e o conjunto deixa a sombra de fora */
    expect(v.partes['a+b'].sobreposicao).toBeCloseTo(v.conjunto.sobreposicao, 3);
    expect(Math.abs(v.conjunto.caixaReferencia.y[0] + 50)).toBeLessThanOrEqual(mm);
    const md = readFileSync(join(pasta, 'contornos', 'resumo.md'), 'utf8');
    expect(md).toContain('## Vista frontal, só de contornos'); expect(md).toContain('não há casamento, captura nem pedido ao crítico');
    expect(md).toContain('Fora do conjunto: sombra.');
    expect(md.indexOf('- b (número 2 no desenho; dir)')).toBeGreaterThan(-1);
    expect(md.indexOf('- b (')).toBeLessThan(md.indexOf('- a ('));
    expect(r.stdout).toContain('vista frontal: só de contornos; sobreposição do conjunto');
    /* o desenho tem a cor da classe do modelo, clareada, e as cores da paleta dos contornos */
    const im = dePng(readFileSync(join(dir, 'contornos.png')));
    const cores = new Set(); for (let i = 0; i < im.dados.length; i += 3) cores.add([...im.dados.subarray(i, i + 3)].join());
    expect(cores.has('0,90,255')).toBe(true); expect(cores.has('220,0,40')).toBe(true);
    /* o contorno desenhado olhando para o outro lado, com "espelhar", dá as mesmas medidas; e a rodada se repete igual */
    expect((await rodar('contornos-espelho', { ...CONFIG, vistas: { frontal: { ...vista, contornos: 'dois-espelho.contornos.json', espelhar: true } } })).codigo).toBe(0);
    const espelho = JSON.parse(readFileSync(join(pasta, 'contornos-espelho', 'resumo.json'), 'utf8')).vistas.frontal;
    expect(espelho.partes).toEqual(v.partes); expect(espelho.conjunto).toEqual(v.conjunto);
    const antes = lerArvore(join(pasta, 'contornos'));
    await rodar('contornos', cfg); expect(lerArvore(join(pasta, 'contornos'))).toEqual(antes);
    /* as recusas da vista de contornos */
    for (const [nome, extra, trecho] of [
      ['rc-ambos', { referencia: 'ref.png' }, 'vistas.frontal: tem "referencia" e "contornos"'],
      ['rc-arquivo', { contornos: 'nao-tem.contornos.json' }, 'vistas.frontal.contornos:'],
      ['rc-regiao', { partes: { c: 'esq' } }, 'vistas.frontal.partes.c: o arquivo não tem a parte "c" (a, b, sombra)'],
      ['rc-mais', { partes: { 'a+c': 'esq' } }, 'vistas.frontal.partes.a+c: o arquivo não tem a parte "c"'],
      ['rc-escala', { escala: 0 }, 'vistas.frontal.escala: espera um número maior que zero'],
      ['rc-ancora', { ancora: { contorno: [0, 0] } }, 'vistas.frontal.ancora:'],
      ['rc-caixa', { caixaRef: [0, 0, 10, 10] }, 'vistas.frontal.caixaRef: não vale numa vista só de contornos'],
      ['rc-ignorar', { ignorarRegioes: ['b'] }, 'a parte "b" está em "partes" e no ignorado'],
      ['rc-modelo', { partes: { a: 'capo' } }, 'vistas.frontal.partes.a: a parte "capo" não existe na opção'],
    ]) {
      const x = await rodar(nome, { ...CONFIG, vistas: { frontal: { ...vista, ...extra } } });
      expect(x.codigo, nome).toBe(2); expect(x.stderr, nome).toContain(trecho);
    }
  });

  it('a vista com "escalaVertical" é conferida com duas escalas e o resumo diz isso; sem o campo nada muda', async () => {
    expect((await rodar('uma-escala')).codigo).toBe(0);
    expect((await rodar('duas-escalas', { ...CONFIG, vistas: { frontal: { ...CONFIG.vistas.frontal, escalaVertical: 1 } } })).codigo).toBe(0);
    const um = JSON.parse(readFileSync(join(pasta, 'uma-escala', 'resumo.json'), 'utf8')).vistas.frontal;
    const dois = JSON.parse(readFileSync(join(pasta, 'duas-escalas', 'resumo.json'), 'utf8')).vistas.frontal;
    /* com fator 1 e a mesma proporção nas duas caixas, o quadro é o mesmo e a medida também */
    expect(dois.regioes).toEqual(um.regioes); expect(um.escalaVertical).toBeUndefined();
    expect(dois).toMatchObject({ escalaVertical: 1, proporcaoDaCaixaEmPx: 0.5 });
    expect(readFileSync(join(pasta, 'duas-escalas', 'resumo.md'), 'utf8')).toContain('A vista foi conferida com duas escalas');
    expect(readFileSync(join(pasta, 'uma-escala', 'resumo.md'), 'utf8')).not.toContain('duas escalas');
    /* fator 2: a referência de 100 px de altura vale 200 mm, e o modelo de 100 mm só cobre a metade de baixo dela */
    expect((await rodar('fator-2', { ...CONFIG, vistas: { frontal: { ...CONFIG.vistas.frontal, ignorar: [], escalaVertical: 2 } } })).codigo).toBe(0);
    const caso = JSON.parse(readFileSync(join(pasta, 'fator-2', 'frontal', 'casamento.json'), 'utf8'));
    expect(caso.quadroRef).toEqual([10, 60, 210, 110]); expect(caso.proporcao.referencia).toBeCloseTo(1, 6);
    const ruim = await rodar('r-escala', { ...CONFIG, vistas: { frontal: { ...CONFIG.vistas.frontal, escalaVertical: 0 } } });
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toContain('vistas.frontal.escalaVertical: espera um número maior que zero');
  });

  it('"dentro" em lista aceita o par em texto e o par com vistas próprias, medido só nelas', async () => {
    const r = await rodar('dentro-lista', { ...CONFIG, dentro: ['esq:dir', { par: 'dir:esq', vistas: ['frontal'] }], vistasDaSobra: ['superior'] });
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    const resumo = JSON.parse(readFileSync(join(pasta, 'dentro-lista', 'resumo.json'), 'utf8'));
    expect(resumo.sobras.map((x) => `${x.vista}:${x.contida}:${x.continente}`)).toEqual(['superior:esq:dir', 'frontal:dir:esq']);
    expect(readFileSync(join(pasta, 'dentro-lista', 'resumo.md'), 'utf8')).toContain('Pares com vistas próprias, medidos só nelas: dir em esq (frontal)');
    const ruim = await rodar('r-dentro-lista', { ...CONFIG, dentro: [{ par: 'dir:esq', vistas: ['cima'] }] });
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toContain('dentro.dir: a vista "cima" não existe na bancada');
    expect((await rodar('r-dentro-capo', { ...CONFIG, dentro: ['esq:capo'] })).stderr).toContain('dentro.esq: a parte "capo" não existe na opção');
  });
});
