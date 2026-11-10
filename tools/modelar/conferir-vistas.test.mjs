/* conferir-vistas.test.mjs — a rodada de conferência sobre uma cena sintética, sem navegador: dois cubos de cores diferentes lado a
   lado, uma referência em PNG com as mesmas duas cores e a divisa deslocada, a config e a rodada com --sem-captura. */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerArquivoDeEsboco, montarOpcoes } from './esboco-nucleo.mjs';
import { imagem, paraPng } from './leitura-por-regioes.mjs';
import { executar } from './conferir-vistas.mjs';

const LARANJA = [226, 100, 30]; const CINZA = [107, 112, 116];
const pasta = mkdtempSync(join(tmpdir(), 'conferir-vistas-'));
const esboco = join(pasta, 'dois.esboco.json');
/* os cubos: "esq" de x = -100 a 0 mm e "dir" de 0 a 100, com 100 mm de altura; na vista frontal o laranja fica à esquerda */
writeFileSync(esboco, JSON.stringify({ opcoes: [{ titulo: 'dois cubos', formas: [
  { id: 'esq', op: 'cubo', args: { larg: 100, alt: 100, prof: 40 }, centro: [-50, 0, 0] },
  { id: 'dir', op: 'cubo', args: { larg: 100, alt: 100, prof: 40 }, centro: [50, 0, 0] }] }] }));
/* a referência: 220 x 120 px, o objeto na caixa 10,10,210,110, o laranja até x = 10 + divisa (a do modelo está em 100) */
function referencia(nome, divisa) {
  const im = imagem(220, 120);
  for (let y = 10; y < 110; y += 1) for (let x = 10; x < 210; x += 1) im.dados.set(x < 10 + divisa ? LARANJA : CINZA, (y * 220 + x) * 3);
  writeFileSync(join(pasta, nome), paraPng(im));
}
referencia('ref.png', 120);
referencia('ref-igual.png', 100);
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

describe('conferir vistas', () => {
  it('monta a opção uma vez, grava os arquivos de cada vista e põe em primeiro a região da divisa deslocada', async () => {
    const { conta, deps } = contando();
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-igual.png', caixaRef: [10, 10, 210, 110], grade: [2, 2] } } };
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

  it('a saída é igual a cada execução', async () => {
    const ler = (dir) => Object.fromEntries(readdirSync(dir, { recursive: true }).sort().filter((f) => /\.(png|json|md)$/.test(f)).map((f) => [f, readFileSync(join(dir, f)).toString('base64')]));
    await rodar('repetida'); const um = ler(join(pasta, 'repetida'));
    await rodar('repetida'); const dois = ler(join(pasta, 'repetida'));
    expect(Object.keys(um).length).toBeGreaterThan(10);
    expect(dois).toEqual(um);
  });

  it('filtra as vistas e repassa o registro à leitura da vista', async () => {
    const dupla = { ...CONFIG, vistas: { ...CONFIG.vistas, traseira: { referencia: 'ref-igual.png', caixaRef: [10, 10, 210, 110] } } };
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
    await recusa('r-parte', { ...CONFIG, partes: { ...CONFIG.partes, capo: 'laranja' } }, 'partes.capo: a opção não tem esta parte; as partes dela são esq, dir');
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
});
