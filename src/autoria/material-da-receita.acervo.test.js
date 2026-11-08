/* material-da-receita.acervo.test.js — a prova de que o normalizador não muda a cena de nenhuma receita do acervo.
 *
 * `materialDaFace` é a única tradução do material da receita para a cena do Three.js. Aqui ela é comparada, receita por receita,
 * com a CÓPIA CONGELADA da função de antes do normalizador (`materialDaFaceAntes`, escrita à mão e que não importa nada do
 * normalizador): cada material declarado, mais a face sem declaração, a face que cita nome que a receita não declara e a face
 * com cor própria. O material de cena sai igual (cor, aspereza, metalicidade, emissivo, transparência, opacidade e a chave que
 * agrupa as malhas), então a cena também. Receitas do acervo e peças de ensaio entram todas. */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { materialDaFace } from './adaptar-three.js';
import { normalizarMateriais } from './material-da-receita.js';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const COR_PADRAO = '#77817d';

/* A função de antes, como estava em adaptar-three.js na main de 2026-11-08. Não editar: ela é a referência. */
function materialDaFaceAntes(face, materiais) {
  const definicao = face.material ? materiais[face.material] ?? {} : {};
  const cor = definicao.cor ?? face.cor ?? COR_PADRAO;
  const transparente = definicao.mistura === 'transparente';
  return {
    chave: JSON.stringify([
      cor,
      definicao.aspereza ?? 0.68,
      definicao.metalicidade ?? 0.12,
      definicao.emissivo ?? 0,
      transparente,
      definicao.opacidade ?? (transparente ? 0.58 : 1),
    ]),
    cor,
    aspereza: definicao.aspereza ?? 0.68,
    metalicidade: definicao.metalicidade ?? 0.12,
    emissivo: definicao.emissivo ?? 0,
    transparente,
    opacidade: definicao.opacidade ?? (transparente ? 0.58 : 1),
  };
}

function arquivosJs(pasta) {
  const achados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivosJs(caminho));
    else if (entrada.name.endsWith('.js') && !entrada.name.endsWith('.test.js')) achados.push(caminho);
  }
  return achados.sort();
}

async function receitasComMateriais() {
  const achadas = [];
  for (const raiz of ['procedural/pecas', 'tools/fixtures/acervo']) {
    for (const arquivo of arquivosJs(join(REPO, raiz))) {
      const modulo = await import(pathToFileURL(arquivo).href);
      const materiais = modulo.MATERIAIS ?? modulo.default?.MATERIAIS;
      if (materiais && typeof materiais === 'object') achadas.push({ arquivo: arquivo.slice(REPO.length + 1), materiais });
    }
  }
  return achadas;
}

describe('o normalizador sobre o acervo', () => {
  it('aceita todas as receitas e traduz cada material como antes', async () => {
    const receitas = await receitasComMateriais();
    expect(receitas.length).toBeGreaterThan(90);
    let materiais = 0;
    let comparacoes = 0;
    for (const { arquivo, materiais: declarados } of receitas) {
      let catalogo;
      try { catalogo = normalizarMateriais(declarados); } catch (erro) { throw new Error(`${arquivo}: ${erro.message}`); }
      const nomes = Object.keys(declarados);
      const faces = [
        { id: 1 },
        { id: 2, cor: '#abcdef' },
        { id: 3, material: 'nome-que-a-receita-nao-declara' },
        ...nomes.flatMap((material) => [{ id: 4, material }, { id: 5, material, cor: '#fedcba' }]),
      ];
      for (const face of faces) {
        const { declarado, ...depois } = materialDaFace(face, catalogo);
        expect(depois, `${arquivo} / ${face.material ?? '(sem material)'}`).toEqual(materialDaFaceAntes(face, declarados));
        comparacoes += 1;
      }
      materiais += nomes.length;
    }
    expect(materiais).toBeGreaterThan(500);
    expect(comparacoes).toBeGreaterThan(1000);
  }, 120000);
});
