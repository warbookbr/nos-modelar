/* origem-dos-contornos.test.mjs — o contorno diz de onde veio a imagem, e a guarda do acervo reprova o que não diz. Os casos estão em
   tools/fixtures/origem-dos-contornos/, um por pasta, com uma imagem cinza de 4 x 4 px desenhada por código. */
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contornosSemOrigem, motivoDaOrigem } from './origem-dos-contornos.mjs';
import { origemDaImagem } from '../contorno-da-imagem.mjs';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const FIXTURE = join(REPO, 'tools/fixtures/origem-dos-contornos');

describe('a origem da imagem do contorno', () => {
  it('reprova o contorno só com hash, o caminho que não existe, o hash que não confere e a declaração sem motivo', () => {
    const achados = Object.fromEntries(contornosSemOrigem({ raiz: FIXTURE }).map(({ arquivo, motivo }) => [arquivo.split('/').at(-2), motivo]));
    expect(Object.keys(achados).sort()).toEqual(['caminho-ausente', 'fora-sem-motivo', 'hash-errado', 'so-hash']);
    expect(achados['so-hash']).toMatch(/não diz de onde veio a imagem.*--fora-do-repositorio/);
    expect(achados['caminho-ausente']).toContain("'vista-que-saiu.png' não existe");
    expect(achados['hash-errado']).toContain('a imagem mudou depois do contorno');
    expect(achados['fora-sem-motivo']).toContain('não diz o motivo');
  });

  it('o caminho que sai do repositório e o encerrada que não é booleano são recusados', () => {
    const arquivo = join(FIXTURE, 'com-caminho/vista.contornos.json');
    expect(motivoDaOrigem({ imagem: { caminho: '../../../../../fora.png', sha256: 'x' } }, arquivo)).toContain('sai do repositório');
    expect(motivoDaOrigem({ imagem: { foraDoRepositorio: { motivo: 'foto de terceiro', encerrada: 'sim' } } }, arquivo)).toContain('encerrada vale "sim"');
  });

  it('o acervo de hoje diz a origem de todo contorno', () => {
    expect(contornosSemOrigem()).toEqual([]);
  });
});

describe('o que npm run contorno grava sobre a imagem', () => {
  it('a imagem do repositório sai com o caminho relativo à pasta do contorno', () => {
    const imagem = join(REPO, 'procedural/pecas/x/referencias/lado.png');
    expect(origemDaImagem(imagem, join(REPO, 'procedural/pecas/x/referencias/lado.contornos.json'))).toEqual({ caminho: 'lado.png' });
    expect(origemDaImagem(imagem, join(REPO, 'procedural/pecas/x/saida/lado.contornos.json'))).toEqual({ caminho: '../referencias/lado.png' });
  });

  it('a imagem de fora do repositório ou de referencias/locais/ pede o motivo, e com ele grava a declaração', () => {
    expect(() => origemDaImagem('/tmp/foto.png', '/tmp/foto.contornos.json')).toThrow(/fica fora do repositório.*--fora-do-repositorio="<motivo>"/);
    expect(() => origemDaImagem(join(REPO, 'procedural/pecas/x/referencias/locais/foto.png'), join(REPO, 'procedural/pecas/x/referencias/foto.contornos.json'))).toThrow(/referencias\/locais/);
    expect(() => origemDaImagem('/tmp/foto.png', '/tmp/foto.contornos.json', { foraDoRepositorio: '' })).toThrow(/veio sem motivo/);
    expect(origemDaImagem('/tmp/foto.png', '/tmp/foto.contornos.json', { foraDoRepositorio: ' foto com marca ' }))
      .toEqual({ foraDoRepositorio: { motivo: 'foto com marca', encerrada: false } });
  });
});
