/* exportar-gltf-braco.test.mjs — LENTO (está em `TESTES_LENTOS`: resolve o braço inteiro, uns 15 s). Plano as partes do braço, fatia 2,
   gate 4: o braço montado exportado em .glb e o arquivo aberto de novo com cada parte na posição da montagem.
   O .glb é gravado, lido de volta dos bytes, e a caixa de cada nó (com a matriz dele) é conferida contra a caixa da mesma instância
   posicionada pelo resolvedor da montagem, dentro de 0,01 mm; o validador oficial de glTF roda no mesmo arquivo. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import validator from 'gltf-validator';
import { exportarMontagemGltf, lerGlb } from '../../modulos/exportador-gltf/src/index.js';
import { caixasDoArquivo, caixasDoResolvedor, desvioMm } from '../../modulos/exportador-gltf/tests/caixas.js';
import { REPO, instanciasDaMontagem, resolverMontagemDeArquivo } from './exportar-gltf.mjs';

const CAMINHO = join(REPO, 'procedural/pecas/braco-robotico/montagem.json');
const pasta = mkdtempSync(join(tmpdir(), 'gltf-braco-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

describe('exportar:gltf do braço montado', () => {
  it('o arquivo reaberto tem uma parte por instância, cada uma onde a montagem a põe (0,01 mm), e passa no validador', async () => {
    const resolvida = await resolverMontagemDeArquivo(CAMINHO);
    const puladas = [];
    const instancias = instanciasDaMontagem(resolvida, puladas);
    const destino = join(pasta, 'braco-robotico.glb');
    writeFileSync(destino, exportarMontagemGltf({ nome: resolvida.id, instancias }).bytes);

    const bytes = readFileSync(destino);
    const ids = JSON.parse(readFileSync(CAMINHO, 'utf8')).instancias.map((i) => i.id).sort();
    const { json } = lerGlb(bytes);
    expect(json.nodes.map((n) => n.name).sort()).toEqual(ids);
    expect(ids).toHaveLength(12);
    const noArquivo = caixasDoArquivo(bytes);
    const noResolvedor = caixasDoResolvedor(instancias);
    expect([...noArquivo.keys()].sort()).toEqual(ids);
    const linhas = [];
    for (const [nome, caixa] of noResolvedor) {
      const desvio = desvioMm(noArquivo.get(nome), caixa);
      linhas.push({ nome, desvio });
      expect(desvio, nome).toBeLessThan(0.01);
    }
    expect(linhas).toHaveLength(12);
    /* a posição entrou de fato: o anel da cintura está acima da base, não na origem das duas */
    expect(noArquivo.get('anelCintura').min[1]).toBeGreaterThan(noArquivo.get('base').min[1]);

    const v = await validator.validateBytes(bytes, { uri: 'braco-robotico.glb', maxIssues: 0 });
    expect(v.issues.numErrors).toBe(0);
    expect(v.issues.numWarnings).toBe(0);
  }, 90_000);
});
