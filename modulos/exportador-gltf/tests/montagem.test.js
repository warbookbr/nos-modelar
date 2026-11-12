/* montagem.test.js — o glTF de uma montagem pequena, de fixture: três instâncias (a peça de prova duas vezes, uma delas girada 90° em y e
   deslocada, e a peça de todos os materiais; `tools/fixtures/montagem-de-prova/montagem.json`), cada uma um nó com o nome da instância e a pose na matriz. O arquivo é gravado, lido
   de volta dos bytes e conferido contra a caixa que o resolvedor dá, e passa pelo validador oficial. O braço real está em
   `tools/modelar/exportar-gltf-braco.test.mjs` (lento). */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import validator from 'gltf-validator';
import { exportarArquivoGltf, instanciasDaMontagem, REPO } from '../../../tools/modelar/exportar-gltf.mjs';
import { carregadoresDeReceitas } from '../../../tools/modelar/peca-com-parametros.mjs';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { exportarMontagemGltf, lerGlb } from '../src/index.js';
import receitaDeProva from '../../../tools/fixtures/acervo/peca-de-prova/receita.js';
import materiaisDeProva from '../../../tools/fixtures/acervo/materiais-de-prova/receita.js';
import { caixasDoArquivo, caixasDoResolvedor, desvioMm } from './caixas.js';

const CAMINHO = join(REPO, 'tools/fixtures/montagem-de-prova/montagem.json');
const pasta = mkdtempSync(join(tmpdir(), 'gltf-montagem-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

describe('exportador glTF: montagem de fixture', () => {
  it('cada instância vira um nó com o nome dela, e a caixa no arquivo bate com a do resolvedor em 0,01 mm', async () => {
    const destino = join(pasta, 'montagem.glb');
    await exportarArquivoGltf({ peca: CAMINHO, saida: destino });
    const bytes = readFileSync(destino);
    const resolvida = await resolverMontagemPersistida(JSON.parse(readFileSync(CAMINHO, 'utf8')), carregadoresDeReceitas({ 'peca-de-prova': receitaDeProva, 'materiais-de-prova': materiaisDeProva }));
    const noResolvedor = caixasDoResolvedor(instanciasDaMontagem(resolvida));
    const { json } = lerGlb(bytes);
    expect(json.nodes.map((n) => n.name)).toEqual(['direita', 'esquerda', 'materiais']);
    expect(json.scenes[0].name).toBe('montagem-de-prova');
    const noArquivo = caixasDoArquivo(bytes);
    expect([...noArquivo.keys()].sort()).toEqual([...noResolvedor.keys()].sort());
    for (const [nome, caixa] of noResolvedor) expect(desvioMm(noArquivo.get(nome), caixa), nome).toBeLessThan(0.01);
    /* a pose entrou: a instância girada e deslocada não está onde a da esquerda está */
    expect(desvioMm(noArquivo.get('direita'), noArquivo.get('esquerda'))).toBeGreaterThan(500);
    /* os materiais da peça de prova de materiais vieram junto */
    expect(json.materials.length).toBeGreaterThan(5);
    const v = await validator.validateBytes(bytes, { uri: 'montagem.glb', maxIssues: 0 });
    expect(v.issues.numErrors).toBe(0);
    /* o único aviso é o da tangente que o leitor gera para o relevo, que a peça de materiais já tem fora da montagem */
    expect(new Set(v.issues.messages.filter((m) => m.severity <= 1).map((m) => m.code))).toEqual(new Set(['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE']));
  });

  it('o material de mesmo nome e definição diferente em duas peças não se mistura', () => {
    const neutro = (material) => ({ V: new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [0, 1, 0]]]), F: new Map([[0, { id: 0, vs: [0, 1, 2], material }]]) });
    const pose = { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] };
    const { json } = exportarMontagemGltf({
      instancias: [
        { nome: 'um', neutro: neutro('tinta'), materiais: { tinta: { cor: '#ff0000' } }, pose },
        { nome: 'dois', neutro: neutro('tinta'), materiais: { tinta: { cor: '#0000ff' } }, pose },
        { nome: 'tres', neutro: neutro('tinta'), materiais: { tinta: { cor: '#ff0000' } }, pose },
      ],
    });
    expect(json.materials.map((m) => m.name)).toEqual(['tinta (dois)', 'tinta']);
    /* os nós saem por nome: dois, tres, um */
    expect(json.meshes.map((m) => m.primitives[0].material)).toEqual([0, 1, 1]);
  });
});
