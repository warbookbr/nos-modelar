import { expect, it } from 'vitest';
import { FORMATO_CONSULTA_VISUAL, validarConsultaVisual } from './consulta-visual.mjs';

const hash = 'a'.repeat(64);
const entrada = (classe, id) => ({ id, classe, regiao: 'arco-dianteiro', vista: 'lateral', arquivo: `repo://evidencias/${id}.svg`, sha256: hash });

it('aceita uma comparação regional com três imagens isoladas', () => {
  expect(validarConsultaVisual({ formato: FORMATO_CONSULTA_VISUAL, papel: 'modelador', proposito: 'comparar', regiao: 'arco-dianteiro', entradas: [entrada('alvo', 'alvo'), entrada('modelo', 'modelo'), entrada('comparacao-regional', 'comparacao')] }).valida).toBe(true);
});

it('recusa painel composto como única evidência', () => {
  expect(validarConsultaVisual({ formato: FORMATO_CONSULTA_VISUAL, papel: 'modelador', proposito: 'comparar', regiao: 'arco-dianteiro', entradas: [entrada('painel-composto', 'painel')] }).valida).toBe(false);
});

it('recusa revisor sem alvo e comparação da própria região', () => {
  expect(validarConsultaVisual({ formato: FORMATO_CONSULTA_VISUAL, papel: 'critico-visual-independente', proposito: 'revisar', regiao: 'arco-dianteiro', entradas: [entrada('modelo', 'modelo')] }).valida).toBe(false);
});
