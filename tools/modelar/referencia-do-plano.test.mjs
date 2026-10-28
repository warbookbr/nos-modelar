/* referencia-do-plano.test.mjs — `descrever-peca` confere logo no começo que cada caminho de `PLANO.referencias` existe.

   O ATRITO. O `alvo.md` ausente só era recusado pela `vistas:critica`, depois de a forma estar pronta, e a mensagem chamava de
   imagem um arquivo de texto. Agora `descrever-peca` recusa antes de executar a receita, nomeando o caminho, e a mensagem das duas
   ferramentas é a mesma e não diz "imagem". A peça entregue já carregada (sem pasta para resolver caminho relativo) e a execução
   com `--sem-veredito` não são conferidas. */
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { mensagemDeReferenciasAusentes, referenciasDoPlano } from './referencias-do-plano.mjs';

const PASTA = 'tools/fixtures/referencia-do-plano';

describe('descrever-peca confere PLANO.referencias antes de executar', () => {
  it('recusa a peça de ensaio sem o alvo.md, com o caminho na mensagem e sem chamá-lo de imagem', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ausente/receita.js` });
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain('REFERÊNCIA DO PLANO AUSENTE');
    expect(r.stderr).toContain('referencias/alvo.md');
    expect(r.stderr).not.toMatch(/imagem que não existe/);
    expect(r.stdout).toBe('');
  });

  it('aceita a mesma peça com o alvo.md na pasta, e o veredito segue', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/presente/receita.js` });
    expect(r.stderr).not.toContain('REFERÊNCIA DO PLANO AUSENTE');
    expect(r.ok).toBe(true);
  });

  it('--sem-veredito não confere a referência', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ausente/receita.js`, semVeredito: true });
    expect(r.stderr).not.toContain('REFERÊNCIA DO PLANO AUSENTE');
  });
});

describe('a mensagem das referências ausentes', () => {
  it('conta no singular e no plural, lista os caminhos e diz que a lista aceita texto e andaime', () => {
    expect(mensagemDeReferenciasAusentes(['a/alvo.md'])).toMatch(/^PLANO\.referencias cita um arquivo que não existe: a\/alvo\.md\./);
    const varias = mensagemDeReferenciasAusentes(['a.png', 'b.md']);
    expect(varias).toMatch(/cita 2 arquivos que não existem: a\.png, b\.md\./);
    expect(varias).toMatch(/alvo\.md/);
    expect(varias).not.toMatch(/imagem que não existe/);
  });

  it('referenciasDoPlano separa o texto que existe das imagens e dos ausentes', () => {
    const existe = (c) => c.endsWith('alvo.md') || c.endsWith('vista.png');
    const r = referenciasDoPlano({ referencias: ['x/vista.png', 'x/alvo.md', 'x/falta.png'] }, { raiz: '/repo', existe });
    expect(r.imagens).toEqual(['/repo/x/vista.png']);
    expect(r.ignoradas).toEqual(['x/alvo.md']);
    expect(r.ausentes).toEqual(['x/falta.png']);
  });
});
