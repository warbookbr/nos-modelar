import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { orquestrarRevisaoRegional } from './orquestrar-revisao-regional.mjs';

it('só grava crítica depois de despacho e revisor limitado', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'orquestrar-')); const destino = join(raiz, 'despacho'); const ordem = [];
  try {
    const resultado = orquestrarRevisaoRegional({ aceite: { assinaturaModelo: `sha256:${'a'.repeat(64)}` }, opcoes: {}, papel: 'critico-visual-independente', regiao: 'arco-dianteiro', raizRepositorio: raiz, destino, arquivoProibido: join(raiz, 'segredo'), critica: { formato: 'mecanifica.achados-critica-visual', versao: 1, achados: [] }, despachar: () => { ordem.push('despacho'); mkdirSync(destino); return { destino, manifesto: { entradas: [] } }; }, executar: () => { ordem.push('revisor'); return { acessoExterno: false, entregues: [] }; } });
    expect(ordem).toEqual(['despacho', 'revisor']); expect(existsSync(resultado.arquivoCritica)).toBe(true);
    expect(resultado.aceiteComCritica.critica).toEqual({ assinaturaModelo: `sha256:${'a'.repeat(64)}`, evidencia: { hash: resultado.hashCritica, localizador: 'repo://despacho/critica-visual.json' }, papel: 'critico-visual-independente' });
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
