/* material-da-receita.acervo.test.js — a prova de que o normalizador não muda a cena de nenhuma receita do acervo.
 *
 * `materialDaFace` é a única tradução do material da receita para a cena do Three.js. Aqui ela é comparada, receita por receita,
 * com a CÓPIA CONGELADA da função de antes do normalizador (`materialDaFaceAntes`, escrita à mão e que não importa nada do
 * normalizador): cada material declarado, mais a face sem declaração, a face que cita nome que a receita não declara e a face
 * com cor própria. O material de cena sai igual (cor, aspereza, metalicidade, emissivo, transparência, opacidade e a chave que
 * agrupa as malhas), então a cena também. Receitas do acervo, peças de ensaio e toda receita com `MATERIAIS` em `tools/fixtures/` entram todas. */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { materialDaFace } from './adaptar-three.js';
import { especificacaoDeTextura } from '../../tools/modelar/exportar-obj.mjs';
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

/* A especificação de textura de antes do normalizador, congelada (exportar-obj.mjs na main de 2026-11-08). */
function especificacaoAntes(nome, entrada = {}) {
  const { tipo: tipoDeclarado, cor, brilho, ...resto } = entrada;
  let tipo = tipoDeclarado;
  if (!tipo) {
    const n = nome.toLowerCase();
    tipo = /madeira|vime/.test(n) ? 'madeira' : /tecido|pano|estofado/.test(n) ? 'tecido' : /metal|inox|cromo|ferro|^aco/.test(n) ? 'metal' : 'liso';
  }
  let rgb = [128, 128, 128];
  if (typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor)) rgb = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
  const extras = {};
  for (const campo of ['desgaste', 'veio', 'borda', 'tabuas', 'ferrugem', 'manchas', 'rasgos', 'acabamento']) if (resto[campo] !== undefined) extras[campo] = resto[campo];
  if (brilho !== undefined) extras.brilho = brilho;
  return { tipo, cor: rgb, ...extras };
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
  for (const raiz of ['procedural/pecas', 'tools/fixtures']) {
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
      /* A chave agora inclui os campos novos, então o texto muda; o que não pode mudar é o agrupamento: duas faces têm a mesma chave
         nova se, e só se, tinham a mesma chave de antes somada aos campos novos. */
      const novaDaAntiga = new Map();
      const antigaDaNova = new Map();
      for (const face of faces) {
        const { declarado, chave, ...depois } = materialDaFace(face, catalogo);
        const { chave: chaveDeAntes, ...antes } = materialDaFaceAntes(face, declarados);
        /* Os campos que vieram com o normalizador (verniz, transmissão, relevo e os outros, do sétimo item da chave em diante) separam
           de propósito dois materiais que antes eram iguais, como o plástico granulado e o liso do furgão; o agrupamento de antes vale
           com eles somados à chave de antes. */
        const chaveAntes = JSON.stringify([...JSON.parse(chaveDeAntes), ...JSON.parse(chave).slice(6)]);
        expect(depois, `${arquivo} / ${face.material ?? '(sem material)'}`).toEqual(antes);
        expect(novaDaAntiga.get(chaveAntes) ?? chave, `${arquivo} agrupa diferente`).toBe(chave);
        expect(antigaDaNova.get(chave) ?? chaveAntes, `${arquivo} agrupa diferente`).toBe(chaveAntes);
        novaDaAntiga.set(chaveAntes, chave);
        antigaDaNova.set(chave, chaveAntes);
        comparacoes += 1;
      }
      for (const nome of nomes) {
        expect(especificacaoDeTextura(nome, declarados[nome]), `${arquivo} / ${nome} (textura)`).toEqual(especificacaoAntes(nome, declarados[nome]));
        comparacoes += 1;
      }
      materiais += nomes.length;
    }
    /* Piso de sanidade: a varredura achou receitas e comparou materiais. Não é contagem do acervo. Era 500 e reprovou em 2026-11-13
       com 492, quando as cópias antigas de receita das rodadas saíram: o número caía com arquivo repetido, e não com defeito. */
    expect(materiais).toBeGreaterThan(200);
    expect(comparacoes).toBeGreaterThan(500);
  }, 120000);
});
