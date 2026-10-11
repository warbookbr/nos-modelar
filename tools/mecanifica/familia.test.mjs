/* familia.test.mjs — o comando `npm run familia -- aprovar <id>` e o gate `familias:check`. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { TUBO_DE_PROVA } from '../fixtures/familia-chamavel/familia.js';
import { criarCaixaOca } from '../fixtures/familia-com-casca/familia.js';
import { aprovarFamilia } from './aprovacao-da-familia.mjs';
import { conferirEntradas, pastasNaoRegistradas, principal } from './familia.mjs';
import { REPO } from './resolver-caminho-receita.mjs';

const raizes = [];
const temporaria = () => { const raiz = mkdtempSync(join(tmpdir(), 'familias-')); raizes.push(raiz); return raiz; };
afterAll(() => { for (const raiz of raizes) rmSync(raiz, { recursive: true, force: true }); });

const saidaEmMemoria = () => {
  const linhas = { log: [], error: [] };
  return { linhas, log: (t) => linhas.log.push(t), error: (t) => linhas.error.push(t) };
};
function pastaAprovada(familia) {
  const pasta = join(temporaria(), familia.contrato.id);
  mkdirSync(pasta);
  writeFileSync(join(pasta, 'familia.json'), JSON.stringify(familia.contrato));
  expect(aprovarFamilia(familia, { pasta, data: '2026-10-11' }).aprovada).toBe(true);
  return pasta;
}

describe('familias:check', () => {
  it('sem família registrada passa dizendo isso', () => {
    const saida = saidaEmMemoria();
    expect(conferirEntradas([], {}, saida)).toBe(0);
    expect(saida.linhas.log).toEqual(['familias:check ok — nenhuma família registrada em procedural/familias (FAMILIAS está vazia); nada a conferir.']);
  });

  it('passa com a família aprovada e cita quantas conferiu', () => {
    const saida = saidaEmMemoria();
    expect(conferirEntradas([{ familia: TUBO_DE_PROVA, pasta: pastaAprovada(TUBO_DE_PROVA) }], {}, saida)).toBe(0);
    expect(saida.linhas.log[0]).toMatch(/familias:check ok — 1 família\(s\)/);
  });

  it('reprova a família sem aprovação, a de geometria alterada (dizendo o ponto) e a pasta não registrada', () => {
    const alterada = { ...TUBO_DE_PROVA, derivar: (p) => { const d = TUBO_DE_PROVA.derivar(p); return p.comprimento === 20 ? { ...d, argumentos: { ...d.argumentos, raio: d.argumentos.raio * 2 } } : d; } };
    const saida = saidaEmMemoria();
    const codigo = conferirEntradas(
      [{ familia: alterada, pasta: pastaAprovada(TUBO_DE_PROVA) }, { familia: criarCaixaOca(), pasta: join(temporaria(), 'caixa-oca-de-prova') }],
      { naoRegistradas: ['sem-registro'] },
      saida,
    );
    expect(codigo).toBe(1);
    const texto = saida.linhas.error.join('\n');
    expect(texto).toMatch(/familias:check FALHOU — 3 família\(s\)/);
    expect(texto).toMatch(/\[minimo\] geometria-mudou: a geometria do ponto 'minimo' mudou desde a aprovação/);
    expect(texto).not.toMatch(/\[maximo\]/);
    expect(texto).toMatch(/caixa-oca-de-prova[\s\S]*sem-aprovacao/);
    expect(texto).toMatch(/sem-registro[\s\S]*pasta-nao-registrada/);
  });

  it('acha a pasta com familia.json que não está no registro', () => {
    const raiz = temporaria();
    for (const nome of ['registrada', 'esquecida']) { mkdirSync(join(raiz, nome)); writeFileSync(join(raiz, nome, 'familia.json'), '{}'); }
    mkdirSync(join(raiz, 'sem-contrato'));
    expect(pastasNaoRegistradas(['registrada'], raiz)).toEqual(['esquecida']);
  });

  it('o comando do repositório passa com o registro de hoje', () => {
    const r = spawnSync(process.execPath, ['tools/mecanifica/familia.mjs', 'conferir'], { cwd: REPO, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^familias:check ok — /);
  });
});

describe('npm run familia -- aprovar', () => {
  const rodar = (...args) => spawnSync(process.execPath, ['tools/mecanifica/familia.mjs', ...args], { cwd: REPO, encoding: 'utf8' });
  const modulo = '--familias=tools/fixtures/familia-com-porta/familias.mjs';

  it('aprova a família do módulo apontado e imprime o hash dos três pontos', () => {
    const r = rodar('aprovar', 'bucha-de-prova', modulo, '--sem-gravar');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/familia bucha-de-prova: aprovada na camada mecânica — 3 pontos, 8 sondas da varredura \(1 recusadas por restrição declarada\)/);
    expect(r.stdout).toMatch(/minimo: sha256:[0-9a-f]{64}/);
    expect(r.stdout).toMatch(/nada gravado \(--sem-gravar\)/);
  });

  it('--json devolve o resultado inteiro', () => {
    const r = rodar('aprovar', 'bucha-de-prova', modulo, '--sem-gravar', '--json');
    const resultado = JSON.parse(r.stdout);
    expect(resultado).toMatchObject({ aprovada: true, familia: 'bucha-de-prova', gravada: false });
    expect(resultado.pontos.medio.portas).toEqual(['assento']);
  });

  it('família desconhecida e comando desconhecido saem com 2 e dizem o que existe', () => {
    const desconhecida = rodar('aprovar', 'roda', modulo);
    expect(desconhecida.status).toBe(2);
    expect(desconhecida.stderr).toMatch(/a família 'roda' não está registrada. Registradas: bucha-de-prova/);
    expect(rodar('aprovar').stderr).toMatch(/falta o id da família/);
    expect(rodar('inventar').status).toBe(2);
  });

  it('o gate reprova a família do módulo que ainda não foi aprovada', () => {
    const r = rodar('conferir', modulo);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/bucha-de-prova[\s\S]*sem-aprovacao/);
  });

  it('a função devolve o código de saída e escreve só na saída recebida', async () => {
    const saida = saidaEmMemoria();
    expect(await principal(['aprovar', 'bucha-de-prova', modulo, '--sem-gravar'], saida)).toBe(0);
    expect(saida.linhas.log.join('\n')).toMatch(/aprovada na camada mecânica/);
    expect(saida.linhas.error).toEqual([]);
  });
});
