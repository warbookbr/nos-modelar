/* referencia-local.test.mjs — a imagem de estudo mora em `referencias/locais/`, que o git ignora. Quando ela falta (outra máquina, CI)
   as ferramentas avisam uma vez e seguem; a referência fora de `locais/` que falta continua reprovando. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ehReferenciaLocal } from '../../src/autoria/plano-de-modelagem.js';
import { imagensDaPeca } from '../../src/bancada/referencias/imagens-da-peca.js';
import { referenciasAusentes } from './guardas/guarda-acervo.mjs';
import { avisarReferenciasLocaisAusentes, referenciasDoPlano } from './referencias-do-plano.mjs';

const REPO = join(import.meta.dirname, '../..');

describe('referência local', () => {
  it('reconhece só o que está em referencias/locais/', () => {
    expect(ehReferenciaLocal('referencias/locais/foto.jpg')).toBe(true);
    expect(ehReferenciaLocal('procedural/pecas/pedal/referencias/locais/foto.jpg')).toBe(true);
    expect(ehReferenciaLocal('referencias/sobreposicao.jpg')).toBe(false);
    expect(ehReferenciaLocal('locais/foto.jpg')).toBe(false);
  });

  it('o git ignora um arquivo em procedural/pecas/<peça>/referencias/locais/', () => {
    const caminho = 'procedural/pecas/peca-qualquer/referencias/locais/estudo.jpg';
    const saida = execFileSync('git', ['check-ignore', '-v', caminho], { cwd: REPO, encoding: 'utf8' });
    expect(saida).toContain('referencias/locais/');
    const naoLocal = () => execFileSync('git', ['check-ignore', 'procedural/pecas/peca-qualquer/referencias/sobreposicao.jpg'], { cwd: REPO, stdio: 'pipe' });
    expect(naoLocal).toThrow();
    expect(execFileSync('git', ['ls-files', 'procedural/pecas/*/referencias/locais/*'], { cwd: REPO, encoding: 'utf8' })).toBe('');
  });

  it('referenciasDoPlano: a local ausente sai em locaisAusentes, a outra continua em ausentes, e a local presente é usada', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'ref-local-'));
    try {
      const pasta = join(raiz, 'procedural/pecas/pedal');
      mkdirSync(join(pasta, 'referencias/locais'), { recursive: true });
      writeFileSync(join(pasta, 'referencias/locais/presente.jpg'), 'x');
      const plano = { referencias: ['referencias/locais/presente.jpg', 'referencias/locais/ausente.jpg', 'referencias/falta.png'] };
      const r = referenciasDoPlano(plano, { pastaDaReceita: pasta, raiz });
      expect(r.imagens).toEqual([join(pasta, 'referencias/locais/presente.jpg')]);
      expect(r.locaisAusentes).toEqual(['referencias/locais/ausente.jpg']);
      expect(r.ausentes).toEqual(['referencias/falta.png']);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('o aviso sai uma vez por caminho, com o texto combinado', () => {
    const linhas = [];
    const escrever = (l) => linhas.push(l);
    avisarReferenciasLocaisAusentes(['referencias/locais/unica-do-teste.jpg'], escrever);
    avisarReferenciasLocaisAusentes(['referencias/locais/unica-do-teste.jpg'], escrever);
    expect(linhas).toEqual(['referência local ausente nesta máquina: referencias/locais/unica-do-teste.jpg\n']);
  });

  it('a guarda do acervo não reprova a local ausente e reprova a outra', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'ref-local-'));
    try {
      mkdirSync(join(raiz, 'procedural/pecas/pedal'), { recursive: true });
      writeFileSync(join(raiz, 'procedural/pecas/pedal/receita.js'), 'export default { PASSOS: [] };\n');
      const plano = { referencias: ['referencias/locais/ausente.jpg', 'referencias/falta.png'] };
      expect(referenciasAusentes('pedal', plano, { raiz })).toEqual(['referencias/falta.png']);
      expect(referenciasAusentes('pedal', plano, { raiz, locais: true })).toEqual(['referencias/locais/ausente.jpg']);
      writeFileSync(join(raiz, 'procedural/pecas/pedal/receita.js'), 'export default { PASSOS: [] };\n');
      expect(existsSync(join(raiz, 'procedural/pecas/pedal/receita.js'))).toBe(true);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('a bancada indexa a imagem de locais/ pela chave que a receita declara', () => {
    const entradas = { '../../../procedural/pecas/pedal/referencias/locais/foto.jpg': '/u/foto.jpg' };
    expect(imagensDaPeca('pedal', entradas).get('referencias/locais/foto.jpg')).toBe('/u/foto.jpg');
  });
});
