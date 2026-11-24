/* exportacao.test.mjs — cada perfil das famílias polia-e-correia, engrenagem e cremalheira sai em STEP facetado e em OBJ
 * pelos exportadores do projeto, com a tolerância de 0,01 mm que a família fixador usa (a padrão, aplicada antes da escala,
 * recusa face menor que 1 mm² em qualquer peça pequena; o item está no backlog). */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarArquivoObj } from '../../modelar/exportar-obj.mjs';

const registro = criarRegistroDeFamilias();
const TOLERANCIA = 0.00001;

describe('exportação das famílias de transmissão', () => {
  for (const familia of ['polia-e-correia', 'engrenagem', 'cremalheira']) {
    const F = registro.obter(familia);
    for (const perfil of Object.keys(F.contrato.perfis)) {
      it(`${familia} ${perfil} sai em STEP e em OBJ`, async () => {
        const receita = { meta: { nome: `${familia}-${perfil}` }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'p', { perfil })]; } };
        const neutro = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
        const step = await exportarCad({ neutro, nome: `${familia}-${perfil}`, formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: TOLERANCIA });
        expect(step.bytes.length).toBeGreaterThan(1000);
        await expect(exportarArquivoObj({ carregada: { receita, nome: `${familia}-${perfil}`, neutro }, somenteValidar: true, tolerancia: TOLERANCIA })).resolves.toBeDefined();
      });
    }
  }
});
