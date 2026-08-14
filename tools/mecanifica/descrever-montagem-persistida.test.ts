/* Prova a CLI confinada que descreve montagem persistida arbitrária em JSON. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = resolve(REPO, 'tools/mecanifica/descrever-montagem-persistida.mjs');
const MONTAGENS = resolve(REPO, 'tools/mecanifica/fixtures/montagens-persistidas');
const PECAS = resolve(REPO, 'pecas-resolvidas');
const temporarios: string[] = [];

function correr(args: string[]) {
  try {
    return { stdout: execFileSync('node', [CLI, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), stderr: '', codigo: 0 };
  } catch (erro: any) {
    return { stdout: erro.stdout ?? '', stderr: erro.stderr ?? '', codigo: erro.status };
  }
}

function temporario() {
  const raiz = mkdtempSync(join(tmpdir(), 'mecanifica-contexto-'));
  temporarios.push(raiz);
  const montagens = join(raiz, 'montagens');
  const pecas = join(raiz, 'pecas');
  mkdirSync(montagens);
  mkdirSync(pecas);
  return { raiz, montagens, pecas };
}

function montagemComPeca(ref: string) {
  return { formato: 'mecanifica.montagem', versao: 1, id: 'raiz', instancias: [{ id: 'alvo', alvo: { tipo: 'peca', ref } }] };
}

afterEach(() => {
  for (const caminho of temporarios.splice(0)) rmSync(caminho, { recursive: true, force: true });
});

describe('descrever:montagem:persistida — R03', () => {
  it('escreve somente JSON canônico no stdout para montagem arbitrária', () => {
    const resultado = correr([
      `--arquivo=${join(MONTAGENS, 'v2-relacoes-reais.json')}`,
      `--raiz-montagens=${MONTAGENS}`,
      `--raiz-pecas=${PECAS}`,
    ]);

    expect(resultado.codigo).toBe(0);
    expect(resultado.stderr).toBe('');
    const contexto = JSON.parse(resultado.stdout);
    expect(contexto).toMatchObject({ formato: 'mecanifica.contexto-montagem', totais: { pecas: 2, montagens: 1 } });
    expect(resultado.stdout).not.toContain(REPO);
  });

  it('transporta caminho, profundidade e relacionados sem regra duplicada', () => {
    const resultado = correr([
      `--arquivo=${join(MONTAGENS, 'v2-relacoes-reais.json')}`,
      `--raiz-montagens=${MONTAGENS}`,
      `--raiz-pecas=${PECAS}`,
      '--caminho=conjunto-freio',
      '--profundidade=1',
      '--incluir-relacionados',
    ]);
    const contexto = JSON.parse(resultado.stdout);

    expect(resultado.codigo).toBe(0);
    expect(contexto.consulta).toMatchObject({ caminho: ['conjunto-freio'], profundidade: 1, incluirRelacionados: true });
    expect(contexto.instancias.map((item: any) => item.caminho.join('/'))).toEqual([
      'conjunto-freio', 'conjunto-freio/freio', 'roda',
    ]);
  });

  it('recusa opção ausente e JSON inválido com diagnóstico somente no stderr', () => {
    const semRaiz = correr([`--arquivo=${join(MONTAGENS, 'v2-relacoes-reais.json')}`, `--raiz-pecas=${PECAS}`]);
    expect(semRaiz).toMatchObject({ codigo: 1, stdout: '' });
    expect(JSON.parse(semRaiz.stderr.replace(/^descrever-montagem-persistida: /, '')).erro).toMatchObject({ codigo: 'opcao-obrigatoria' });

    const temp = temporario();
    const arquivo = join(temp.montagens, 'quebrada.json');
    writeFileSync(arquivo, '{');
    const invalida = correr([`--arquivo=${arquivo}`, `--raiz-montagens=${temp.montagens}`, `--raiz-pecas=${temp.pecas}`]);
    expect(invalida).toMatchObject({ codigo: 1, stdout: '' });
    expect(invalida.stderr).toContain('json-invalido');
  });

  it('recusa traversal e referência ausente sem produzir contexto parcial', () => {
    const temp = temporario();
    const traversal = join(temp.montagens, 'traversal.json');
    writeFileSync(traversal, JSON.stringify(montagemComPeca('../fora')));
    const fora = correr([`--arquivo=${traversal}`, `--raiz-montagens=${temp.montagens}`, `--raiz-pecas=${temp.pecas}`]);
    expect(fora).toMatchObject({ codigo: 1, stdout: '' });
    expect(fora.stderr).toContain('não fica estritamente dentro');

    const ausente = join(temp.montagens, 'ausente.json');
    writeFileSync(ausente, JSON.stringify(montagemComPeca('inexistente')));
    const naoAchou = correr([`--arquivo=${ausente}`, `--raiz-montagens=${temp.montagens}`, `--raiz-pecas=${temp.pecas}`]);
    expect(naoAchou).toMatchObject({ codigo: 1, stdout: '' });
    expect(naoAchou.stderr).toContain('referencia-ausente');
    expect(naoAchou.stderr).toContain('arquivo solicitado não pôde ser lido');
    expect(naoAchou.stderr).not.toContain(temp.raiz);
  });

  it('recusa symlink final mesmo quando aponta para arquivo legível', () => {
    const temp = temporario();
    const raiz = join(temp.montagens, 'symlink.json');
    const externo = join(temp.raiz, 'externo.json');
    writeFileSync(raiz, JSON.stringify(montagemComPeca('atalho')));
    writeFileSync(externo, '{}');
    try {
      symlinkSync(externo, join(temp.pecas, 'atalho.json'));
    } catch (erro: any) {
      if (erro?.code === 'EPERM' || erro?.code === 'EACCES') return;
      throw erro;
    }
    const resultado = correr([`--arquivo=${raiz}`, `--raiz-montagens=${temp.montagens}`, `--raiz-pecas=${temp.pecas}`]);
    expect(resultado).toMatchObject({ codigo: 1, stdout: '' });
    expect(resultado.stderr).toMatch(/vínculo simbólico|reparse point/);
  });
});
