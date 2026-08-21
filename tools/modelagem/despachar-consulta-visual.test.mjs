import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { despacharConsultaVisual } from './despachar-consulta-visual.mjs';
import { FORMATO_ACEITE_VISUAL_REGIONAL } from './aceite-visual-regional.mjs';

const assinaturaModelo = `sha256:${'a'.repeat(64)}`; const assinaturaBriefing = `sha256:${'b'.repeat(64)}`;
const opcoes = { assinaturaModelo, assinaturaBriefing, rejeicoesObrigatorias: ['arco'], recortesObrigatorios: ['arco-dianteiro'] };
const hash = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;
function prova(raiz, id) { const texto = `${id}-imagem`; writeFileSync(join(raiz, `${id}.svg`), texto); return { hash: hash(texto), localizador: `repo://${id}.svg` }; }
function consulta(raiz, papel) { return { papel, proposito: papel === 'modelador' ? 'comparar' : 'revisar', regiao: 'arco-dianteiro', entradas: ['alvo', 'modelo', 'comparacao-regional'].map((classe) => ({ id: `${papel}-${classe}`, classe, escopo: 'recorte-interno', vista: 'lateral', evidencia: prova(raiz, `${papel}-${classe}`) })) }; }
function preparacao(raiz) { return { formato: FORMATO_ACEITE_VISUAL_REGIONAL, versao: 2, assinaturaModelo, assinaturaBriefing, consultas: [consulta(raiz, 'modelador'), consulta(raiz, 'critico-visual-independente')], rejeicoes: [{ id: 'arco', resultado: 'reprova', evidencias: ['modelador-comparacao-regional'] }] }; }

it('entrega somente os três arquivos declarados ao revisor', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'despacho-')); const destino = join(raiz, 'despacho');
  try {
    writeFileSync(join(raiz, 'segredo.txt'), 'não entregar');
    const aceite = preparacao(raiz);
    const resultado = despacharConsultaVisual({ aceite, opcoes, papel: 'critico-visual-independente', regiao: 'arco-dianteiro', raizRepositorio: raiz, destino });
    expect(readdirSync(destino).sort()).toEqual(['critico-visual-independente-alvo.svg', 'critico-visual-independente-comparacao-regional.svg', 'critico-visual-independente-modelo.svg', 'manifesto.json']);
    expect(resultado.manifesto.entradas).toHaveLength(3);
    expect(existsSync(join(destino, 'segredo.txt'))).toBe(false);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

it('recusa despacho quando a evidência declarada mudou', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'despacho-')); const destino = join(raiz, 'despacho');
  try {
    const aceite = preparacao(raiz);
    writeFileSync(join(raiz, 'critico-visual-independente-modelo.svg'), 'adulterado');
    expect(() => despacharConsultaVisual({ aceite, opcoes, papel: 'critico-visual-independente', regiao: 'arco-dianteiro', raizRepositorio: raiz, destino })).toThrow(/hash diverge/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
