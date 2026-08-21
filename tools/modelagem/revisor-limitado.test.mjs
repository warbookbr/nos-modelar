import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { despacharConsultaVisual } from './despachar-consulta-visual.mjs';
import { FORMATO_ACEITE_VISUAL_REGIONAL } from './aceite-visual-regional.mjs';
import { executarRevisorLimitado } from './revisor-limitado.mjs';

const assinaturaModelo = `sha256:${'a'.repeat(64)}`; const assinaturaBriefing = `sha256:${'b'.repeat(64)}`;
const opcoes = { assinaturaModelo, assinaturaBriefing, rejeicoesObrigatorias: ['arco'], recortesObrigatorios: ['arco-dianteiro'] };
const hash = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;
function prova(raiz, id) { const texto = `${id}-imagem`; writeFileSync(join(raiz, `${id}.svg`), texto); return { hash: hash(texto), localizador: `repo://${id}.svg` }; }
function consulta(raiz, papel) { return { papel, proposito: papel === 'modelador' ? 'comparar' : 'revisar', regiao: 'arco-dianteiro', entradas: ['alvo', 'modelo', 'comparacao-regional'].map((classe) => ({ id: `${papel}-${classe}`, classe, escopo: 'recorte-interno', vista: 'lateral', evidencia: prova(raiz, `${papel}-${classe}`) })) }; }

it('revisor limitado lê todas as evidências e não consegue ler segredo externo', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'revisor-limitado-')); const despacho = join(raiz, 'despacho'); const segredo = join(raiz, 'segredo.txt');
  try {
    writeFileSync(segredo, 'fora do despacho');
    const aceite = { formato: FORMATO_ACEITE_VISUAL_REGIONAL, versao: 2, assinaturaModelo, assinaturaBriefing, consultas: [consulta(raiz, 'modelador'), consulta(raiz, 'critico-visual-independente')], rejeicoes: [{ id: 'arco', resultado: 'reprova', evidencias: ['modelador-comparacao-regional'] }] };
    despacharConsultaVisual({ aceite, opcoes, papel: 'critico-visual-independente', regiao: 'arco-dianteiro', raizRepositorio: raiz, destino: despacho });
    const resultado = executarRevisorLimitado({ despacho, arquivoProibido: segredo });
    expect(resultado.acessoExterno).toBe(false);
    expect(resultado.entregues).toHaveLength(3);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
