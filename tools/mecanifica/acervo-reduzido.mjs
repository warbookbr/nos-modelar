/* acervo-reduzido.mjs — monta um acervo de três peças pequenas sob `tmp/`.
 *
 * O diagnóstico do acervo REAL custa a soma de todas as peças (cada parâmetro da
 * TABELA reconstrói a peça inteira) e cresce a cada peça nova. Os testes que
 * provam o ENCANAMENTO da varredura — a conta inteira bate com a de cada alvo, a
 * porta MCP devolve o que a CLI devolve — não medem a forma de peça alguma, e por
 * isso varrem este acervo reduzido pela opção `raiz` de `parametrosReutilizavel`.
 * O custo deles deixa de depender de quantas peças o acervo real tem; o acervo
 * real continua conferido, inteiro, por `tools/mecanifica/acervo-real.test.mjs`.
 *
 * A raiz tem a estrutura do repositório: as receitas moram nas pastas de
 * `PASTAS_BUSCA`. A `peca-de-prova` é copiada do repositório; as outras duas são
 * escritas aqui. */
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO } from './resolver-caminho-receita.mjs';

const MINIMA = `
export const receita = {
  meta: { nome: 'Acervo Reduzido Mínima', versao: '1.0.0' },
  PARAMS: { corpo: { larg: 0.2, alt: 0.1 }, decorativo: 0.05, coord: [1, 2] },
  MATERIAIS: { aco: { cor: '#888888' } },
  get PASSOS() {
    const { larg, alt } = this.PARAMS.corpo;
    return [
      ['cubo', { origemId: 1, larg, alt, prof: 0.1, em: [0, 0, 0] }],
      ['parte', { nome: 'corpo', sel: { tudo: true } }],
      ['material', { usa: 'aco', sel: { grupo: 'corpo' } }],
    ];
  },
};
export default receita;
`;

const CURTA = `
export const receita = {
  meta: { nome: 'Acervo Reduzido Curta', versao: '1.0.0' },
  PARAMS: { base: { larg: 0.3, alt: 0.05 }, topo: 0.04, enfeite: 9 },
  MATERIAIS: { aco: { cor: '#888888' } },
  get PASSOS() {
    const { larg, alt } = this.PARAMS.base;
    return [
      ['cubo', { origemId: 1, larg, alt, prof: 0.2, em: [0, alt / 2, 0] }],
      ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: larg / 2, alt: this.PARAMS.topo, prof: 0.1, em: [0, alt + this.PARAMS.topo / 2, 0] }],
      ['parte', { nome: 'topo', sel: { origem: { op: 'cubo', id: 2 } } }],
      ['material', { usa: 'aco', sel: { grupo: 'base' } }],
      ['material', { usa: 'aco', sel: { grupo: 'topo' } }],
    ];
  },
};
export default receita;
`;

/** Devolve a raiz relativa ao repositório (a forma que `raiz` aceita) e a absoluta, para apagar. */
export function montarAcervoReduzido() {
  mkdirSync(resolve(REPO, 'tmp'), { recursive: true });
  const absoluta = mkdtempSync(resolve(REPO, 'tmp', 'acervo-reduzido-'));
  const pecas = resolve(absoluta, 'procedural/pecas');
  const prova = resolve(absoluta, 'tools/fixtures/acervo/peca-de-prova');
  mkdirSync(pecas, { recursive: true });
  mkdirSync(prova, { recursive: true });
  writeFileSync(resolve(pecas, 'minima.js'), MINIMA, 'utf8');
  writeFileSync(resolve(pecas, 'curta.js'), CURTA, 'utf8');
  copyFileSync(resolve(REPO, 'tools/fixtures/acervo/peca-de-prova/receita.js'), resolve(prova, 'receita.js'));
  return { absoluta, raiz: absoluta.slice(REPO.length + 1).replace(/\\/g, '/') };
}
