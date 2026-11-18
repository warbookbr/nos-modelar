/* regravar-ajustes-de-curva.test.mjs — o ajuste de curva lisa guardado refaz a mesma curva, a impressão que não confere faz o ajuste na hora e diz o que mudou, o dado
 * guardado malformado recusa, o comando regrava o dado de uma receita, também quando ela recusa na importação, e o dado guardado de cada receita do acervo que declara
 * ajustes é o que os ajustes de agora dão (o caso lento do arquivo: refaz os ajustes de cada uma).
 *
 * A receita de prova é escrita numa pasta temporária (o comando grava ao lado da receita, e a prova não escreve no repositório): um arco de círculo, que o ajuste resolve
 * em milissegundos, com o raio no texto para a prova mudar a entrada. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ajustarCurvaLisa, curvaLisaDoGuardado, curvaLisaGuardada, impressaoDoAjuste } from '../../procedural/nucleo/ajuste-de-curva-lisa.js';
import { REPO } from './resolver-caminho-receita.mjs';

const NUCLEO = pathToFileURL(join(REPO, 'procedural/nucleo/ajuste-de-curva-lisa.js')).href;
const COMANDO = join(REPO, 'tools/modelar/regravar-ajustes-de-curva.mjs');
const arco = (raio, n = 40) => Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * 1.2; return [raio * Math.sin(t), raio * (1 - Math.cos(t))]; });
const OPCOES = { tolerancia: 1, maximoDeClotoides: 4 };

describe('o ajuste guardado, no núcleo', () => {
  const pontos = arco(500);
  const aj = ajustarCurvaLisa(pontos, OPCOES);
  const guardados = JSON.parse(JSON.stringify({ arco: { impressao: impressaoDoAjuste(pontos, OPCOES), curva: aj.guardado } }));
  const pedir = (extra) => curvaLisaDoGuardado({ nome: 'arco', pontos, opcoes: OPCOES, guardados, ...extra });

  it('refaz a mesma curva, número por número, depois de passar por JSON', () => {
    expect(aj.cabe).toBe(true);
    const c = pedir();
    expect(c.doGuardado).toBe(true);
    expect(c.cabe).toBe(true);
    expect(c.comprimento).toBe(aj.comprimento);
    expect(c.inicio).toEqual(aj.inicio);
    expect(c.rumo).toBe(aj.rumo);
    expect(c.joelhos).toEqual(aj.joelhos);
    expect(c.clotoides).toEqual(aj.clotoides);
    for (let s = 0; s <= aj.comprimento; s += 7.3) expect(c.ponto(s)).toEqual(aj.ponto(s));
    expect(c.amostrar(11)).toEqual(aj.amostrar(11));
  });

  it('a impressão não muda com o último bit de um ponto, e muda com um milésimo', () => {
    const a = impressaoDoAjuste(pontos, OPCOES);
    expect(impressaoDoAjuste(pontos.map(([u, v]) => [u + 1e-10, v]), OPCOES)).toEqual(a);
    expect(impressaoDoAjuste(pontos.map(([u, v], i) => [u, i === 7 ? v + 0.001 : v]), OPCOES).soma).not.toBe(a.soma);
    expect(a.opcoes).toEqual({ tolerancia: 1, maximoDeClotoides: 4, duros: [], eixos: [0, 1] });
    expect(() => impressaoDoAjuste([[0, NaN]], OPCOES)).toThrow(/a impressão espera a lista de pontos do ajuste/);
  });

  it('ajusta na hora quando a impressão não confere, e diz o que mudou', () => {
    const mexidos = pontos.map(([u, v], i) => [u, i === 3 ? v + 0.5 : v]);
    const valor = pedir({ pontos: mexidos });
    expect(valor.doGuardado).toBe(false);
    expect(valor.mudou).toHaveLength(1);
    expect(valor.mudou[0]).toMatch(/os 40 pontos mudaram de valor/);
    /* é o ajuste da entrada de agora, e não a curva guardada */
    const direto = ajustarCurvaLisa(mexidos, OPCOES);
    expect(valor.cabe).toBe(direto.cabe);
    expect(valor.guardado).toEqual(direto.guardado);
    expect(valor.guardado).not.toEqual(aj.guardado);
    expect(pedir({ pontos: pontos.slice(0, 30) }).mudou[0]).toMatch(/os pontos eram 40 e agora são 30/);
    expect(pedir({ opcoes: { ...OPCOES, tolerancia: 2 } }).mudou[0]).toMatch(/a opção tolerancia era 1 e agora é 2/);
    const outra = pedir({ nome: 'outra' });
    expect(outra.mudou[0]).toMatch(/não há ajuste guardado com este nome/);
    expect(outra.guardado).toEqual(aj.guardado);
  });

  it('recusa o dado guardado que não é uma curva', () => {
    expect(() => curvaLisaGuardada({ ...aj.guardado, joelhos: [{ f: 0, k: 0 }] })).toThrow(/o ajuste guardado espera \{ inicio: \[u, v\], rumo, comprimento, joelhos/);
    expect(() => curvaLisaGuardada(null)).toThrow(/o ajuste guardado espera/);
    /* a impressão confere e a curva guardada está estragada: recusa, e não ajusta calado por cima */
    expect(() => pedir({ guardados: { arco: { impressao: guardados.arco.impressao, curva: { ...guardados.arco.curva, comprimento: -1 } } } })).toThrow(/o ajuste guardado espera/);
  });
});

describe('regravar-ajustes-de-curva, o comando', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'regravar-ajustes-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  const receita = join(pasta, 'receita.js'); const dado = join(pasta, 'ajustes.js');
  const escrever = (raio) => writeFileSync(receita, `import { curvaLisaDoGuardado } from '${NUCLEO}';
import GUARDADOS from './ajustes.js';
const pontos = () => Array.from({ length: 40 }, (_, i) => { const t = (i / 39) * 1.2; return [${raio} * Math.sin(t), ${raio} * (1 - Math.cos(t))]; });
const pedidos = () => [{ nome: 'arco', pontos: pontos(), opcoes: { tolerancia: 1, maximoDeClotoides: 4 } }];
export const AJUSTES_DE_CURVA = { arquivo: 'ajustes.js', pedidos };
let curva;
try { curva = curvaLisaDoGuardado({ ...pedidos()[0], guardados: GUARDADOS }); } catch (e) { e.ajustesDeCurva = { arquivo: 'ajustes.js', pedidos: pedidos() }; throw e; }
if (!curva.doGuardado) console.warn('ajustado na hora: ' + curva.mudou.join('; '));
export const COMPRIMENTO = curva.comprimento;
`);
  const rodar = (...args) => spawnSync(process.execPath, [COMANDO, ...args], { encoding: 'utf8', cwd: REPO });
  const importar = () => spawnSync(process.execPath, ['-e', `import(${JSON.stringify(pathToFileURL(receita).href)}).then((m) => console.log(m.COMPRIMENTO))`], { encoding: 'utf8' });

  it('responde a --ajuda e recusa o uso sem receita e a receita sem ajustes declarados', () => {
    const ajuda = rodar('--ajuda');
    expect(ajuda.status).toBe(0);
    expect(ajuda.stdout).toMatch(/AJUSTES_DE_CURVA = \{ arquivo, pedidos \}/);
    const sem = rodar();
    expect(sem.status).toBe(2);
    expect(sem.stderr).toMatch(/falta a receita/);
    const muda = join(pasta, 'muda.js'); writeFileSync(muda, 'export const TABELA = {};\n');
    const r = rodar(muda);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/não exporta AJUSTES_DE_CURVA/);
    const quebrada = join(pasta, 'quebrada.js'); writeFileSync(quebrada, "throw new Error('outra coisa');\n");
    const q = rodar(quebrada);
    expect(q.status).toBe(2);
    expect(q.stderr).toMatch(/a recusa não é de ajuste guardado: outra coisa/);
    const fora = join(pasta, 'fora.js'); writeFileSync(fora, "export const AJUSTES_DE_CURVA = { arquivo: '../fora.js', pedidos: () => [] };\n");
    expect(rodar(fora).stderr).toMatch(/AJUSTES_DE_CURVA\.arquivo espera o nome de um módulo \.js na pasta da receita/);
  });

  it('a receita sem dado ou de entrada mudada ajusta na hora e avisa, --conferir acusa e o comando regrava', () => {
    escrever(500); writeFileSync(dado, 'export default {};\n');
    const semDado = importar();
    expect(semDado.status, semDado.stderr).toBe(0);
    expect(semDado.stderr).toMatch(/ajustado na hora: não há ajuste guardado com este nome/);
    expect(rodar(receita, '--conferir').status).toBe(1);
    const gravou = rodar(receita);
    expect(gravou.status, gravou.stderr).toBe(0);
    expect(gravou.stdout).toMatch(/1 ajustes gravados em /);
    const texto = readFileSync(dado, 'utf8');
    expect(texto).toMatch(/ARQUIVO GERADO/);
    const importou = importar();
    expect(importou.status, importou.stderr).toBe(0);
    expect(importou.stderr).toBe('');
    expect(Number(importou.stdout)).toBeGreaterThan(590);
    expect(Number(importou.stdout)).toBe(Number(semDado.stdout));
    expect(rodar(receita, '--conferir').status).toBe(0);
    expect(rodar(receita).stdout).toMatch(/nada mudou/);
    expect(readFileSync(dado, 'utf8')).toBe(texto);

    escrever(520);
    const mudada = importar();
    expect(mudada.status, mudada.stderr).toBe(0);
    expect(mudada.stderr).toMatch(/ajustado na hora: os 40 pontos mudaram de valor/);
    expect(Number(mudada.stdout)).toBeGreaterThan(Number(importou.stdout) + 20);
    const confere = rodar(receita, '--conferir');
    expect(confere.status).toBe(1);
    expect(confere.stderr).toMatch(/difere do que os ajustes de agora dão/);
    expect(readFileSync(dado, 'utf8')).toBe(texto);
    expect(rodar(receita).status).toBe(0);
    expect(readFileSync(dado, 'utf8')).not.toBe(texto);
    expect(importar().stderr).toBe('');
  });

  it('a receita de dado guardado malformado recusa na importação, e o comando regrava pelos pedidos da recusa', () => {
    escrever(500); expect(rodar(receita).status).toBe(0);
    const bom = readFileSync(dado, 'utf8');
    writeFileSync(dado, bom.replace(/"comprimento":[0-9.e+-]+/, '"comprimento":-1'));
    const recusada = importar();
    expect(recusada.status).not.toBe(0);
    expect(recusada.stderr).toMatch(/o ajuste guardado espera \{ inicio: \[u, v\], rumo, comprimento, joelhos/);
    const gravou = rodar(receita);
    expect(gravou.status, gravou.stderr).toBe(0);
    expect(gravou.stdout).toMatch(/os pedidos vieram da recusa/);
    expect(readFileSync(dado, 'utf8')).toBe(bom);
    expect(importar().status).toBe(0);
  });

  it('não grava quando um ajuste não cabe', () => {
    const naoCabe = join(pasta, 'nao-cabe.js');
    writeFileSync(naoCabe, "export const AJUSTES_DE_CURVA = { arquivo: 'dado-que-nao-cabe.js', pedidos: () => [{ nome: 'dente', pontos: Array.from({ length: 60 }, (_, i) => [i * 10, (i % 2) * 40]), opcoes: { tolerancia: 1, maximoDeClotoides: 1 } }] };\n");
    const r = rodar(naoCabe);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/1 ajuste\(s\) não cabem, e nada foi gravado/);
    expect(() => readFileSync(join(pasta, 'dado-que-nao-cabe.js'))).toThrow();
  });
});

describe('o dado guardado das receitas do acervo', () => {
  /* toda receita do acervo que declara AJUSTES_DE_CURVA, achada pelo texto (importar as 121 para perguntar custaria mais que a conferência) */
  const comAjustes = (pasta, achadas = []) => {
    for (const e of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = join(pasta, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'rodadas') comAjustes(caminho, achadas); } else if (e.name === 'receita.js' && /^export const AJUSTES_DE_CURVA\b/m.test(readFileSync(caminho, 'utf8'))) achadas.push(caminho);
    }
    return achadas;
  };

  it('é o que os ajustes de agora dão (--conferir), em cada receita que declara ajustes', () => {
    const receitas = comAjustes(join(REPO, 'procedural/pecas')).sort();
    expect(receitas.length).toBeGreaterThan(0);
    for (const receita of receitas) {
      const r = spawnSync(process.execPath, [COMANDO, receita, '--conferir'], { encoding: 'utf8', cwd: REPO });
      expect(r.status, `${receita}: o dado guardado envelheceu; regrave com \`node tools/modelar/regravar-ajustes-de-curva.mjs ${receita}\` e confira a malha\n${r.stdout}${r.stderr}`).toBe(0);
      /* importou sem ajustar na hora: nenhum aviso de dado vencido */
      expect(r.stderr).toBe('');
    }
  }, 240_000);
});
