/* exportar-obj.test.mjs — suíte de testes da CLI de exportação OBJ. */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  carregarModuloTextura,
  exportarArquivoObj,
  parseArgs,
  REPO,
  sementeDe,
} from './exportar-obj.mjs';

describe('CLI exportar-obj', () => {
  const saidaTeste = resolve(REPO, 'exportacoes/obj/teste_cli_cubo.obj');
  const receitaCandidata = resolve(REPO, 'tools/mecanifica/fixtures/fixture-cubo.js');

  afterEach(() => {
    if (existsSync(saidaTeste)) {
      unlinkSync(saidaTeste);
    }
  });

  it('adota unidade m e escala 1 por padrão no parse de argumentos', () => {
    const opcoes = parseArgs(['--arquivo=receita.js']);
    expect(opcoes.unidade).toBe('m');
    expect(opcoes.escala).toBe(1);
  });

  it('faz parse correto dos argumentos da linha de comando', () => {
    const opcoes = parseArgs([
      '--arquivo=procedural/pecas/_modelo.js',
      '--saida=exportacoes/obj/saida.obj',
      '--unidade=cm',
      '--sobrescrever',
    ]);

    expect(opcoes.arquivo).toBe('procedural/pecas/_modelo.js');
    expect(opcoes.saida).toBe('exportacoes/obj/saida.obj');
    expect(opcoes.unidade).toBe('cm');
    expect(opcoes.escala).toBe(100);
    expect(opcoes.sobrescrever).toBe(true);
  });

  it('permite validação sem gravar em disco', async () => {
    const res = await exportarArquivoObj({
      arquivo: receitaCandidata,
      somenteValidar: true,
    });

    expect(res.somenteValidar).toBe(true);
    expect(res.diagnostico.valido).toBe(true);
    expect(res.diagnostico.corpos.length).toBeGreaterThan(0);
  });

  it('exporta arquivo .obj físico no destino especificado', async () => {
    const res = await exportarArquivoObj({
      arquivo: receitaCandidata,
      saida: saidaTeste,
      unidade: 'mm',
      sobrescrever: true,
    });

    expect(existsSync(saidaTeste)).toBe(true);
    expect(res.tamanhoBytes).toBeGreaterThan(0);

    const conteudo = readFileSync(saidaTeste, 'utf8');
    expect(conteudo).toContain('# Mecanifica Wavefront OBJ Exporter');
    expect(conteudo).toContain('o ');
    expect(conteudo).toContain('v ');
    expect(conteudo).toContain('f ');
  });

  it('recusa sobrescrever sem a flag --sobrescrever', async () => {
    await exportarArquivoObj({
      arquivo: receitaCandidata,
      saida: saidaTeste,
      sobrescrever: true,
    });

    await expect(
      exportarArquivoObj({
        arquivo: receitaCandidata,
        saida: saidaTeste,
        sobrescrever: false,
      }),
    ).rejects.toThrowError(/Arquivo de destino já existe/);
  });
});

describe('CLI exportar-obj com --com-textura', () => {
  const receitaMaterial = resolve(REPO, 'tools/mecanifica/fixtures/fixture-cubo-material.js');
  const moduloFalso = {
    gerarTextura: (material, { px }) => ({ largura: px, altura: px, rgba: new Uint8Array(4), metrosPorTile: 0.5, material }),
    texturaParaPng: () => new Uint8Array([137, 80, 78, 71]),
  };
  let pasta;

  afterEach(() => {
    if (pasta) rmSync(pasta, { recursive: true, force: true });
    pasta = null;
  });

  it('liga a flag no parse e recusa com mensagem clara quando o módulo de textura não existe', async () => {
    expect(parseArgs(['--arquivo=x.js', '--com-textura']).comTextura).toBe(true);
    await expect(carregarModuloTextura(resolve(REPO, 'modulos/inexistente/src/index.js')))
      .rejects.toThrowError(/módulo de textura não existe/);
  });

  it('semente é determinística e muda com o nome', () => {
    expect(sementeDe('caixa:madeira')).toBe(sementeDe('caixa:madeira'));
    expect(sementeDe('caixa:madeira')).not.toBe(sementeDe('caixa:metal'));
  });

  it('grava o .obj, o .mtl e a imagem na mesma pasta, com mtllib e map_Kd casando', async () => {
    pasta = mkdtempSync(join(tmpdir(), 'exportar-obj-'));
    const saida = join(pasta, 'caixa.obj');

    const res = await exportarArquivoObj({
      arquivo: receitaMaterial,
      saida,
      unidade: 'm',
      comTextura: true,
      moduloTextura: moduloFalso,
    });

    const obj = readFileSync(saida, 'utf8');
    const mtl = readFileSync(join(pasta, 'caixa.mtl'), 'utf8');
    expect(obj).toContain('mtllib caixa.mtl');
    expect(obj).toContain('usemtl madeira');
    expect(mtl).toContain('newmtl madeira');
    expect(mtl).toContain('map_Kd caixa_madeira.png');
    expect(existsSync(join(pasta, 'caixa_madeira.png'))).toBe(true);
    expect(res.arquivosTextura).toHaveLength(2);
  });

  it('recusa sobrescrever a imagem existente sem --sobrescrever', async () => {
    pasta = mkdtempSync(join(tmpdir(), 'exportar-obj-'));
    const saida = join(pasta, 'caixa.obj');
    writeFileSync(join(pasta, 'caixa_madeira.png'), 'antigo');

    await expect(exportarArquivoObj({
      arquivo: receitaMaterial, saida, unidade: 'm', comTextura: true, moduloTextura: moduloFalso,
    })).rejects.toThrowError(/Arquivo de destino já existe/);
    expect(existsSync(saida)).toBe(false);
  });

  it('sem a flag, não grava .mtl nem imagem', async () => {
    pasta = mkdtempSync(join(tmpdir(), 'exportar-obj-'));
    const saida = join(pasta, 'caixa.obj');

    await exportarArquivoObj({ arquivo: receitaMaterial, saida, unidade: 'm' });

    expect(readFileSync(saida, 'utf8')).not.toContain('mtllib');
    expect(existsSync(join(pasta, 'caixa.mtl'))).toBe(false);
    expect(readdirSync(pasta)).toEqual(['caixa.obj']);
  });
});
