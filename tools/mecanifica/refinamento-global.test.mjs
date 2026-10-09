/* refinamento-global.test.mjs — de ponta a ponta: a receita que declara REFINA passa pelo veredito da peça e pela guarda
   do acervo. A mesma receita passa inteira, e é recusada com a parte deslocada para fora do envelope, com a porta movida e
   com uma parte sem volume. A receita sem REFINA não muda. */
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conferirAcervo } from './guardas/guarda-acervo.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { criarServicoAutoria3DNativa } from '../../procedural/servicos/fluxo-autoria.js';
import { receitaDoSuporte } from '../fixtures/refina-forma-global/suporte.js';

const PASTA = 'tools/fixtures/refina-forma-global';
const medir = (variante) => descreverPecaReutilizavel({ peca: `${PASTA}/${variante}/receita.js` });

describe('o veredito da peça confere o refinamento do andaime', () => {
  it('a receita que refina dentro do envelope e das portas passa', async () => {
    const r = await medir('ok');
    expect(r.stderr).toBe('');
    expect(r.ok).toBe(true);
    expect(r.resultado.refinamento).toMatchObject({ ok: true, andaime: 'suporte-andaime', achados: [] });
  });

  it('a parte deslocada para fora do envelope é recusada e a mensagem diz parte, volume e desvio', async () => {
    const r = await medir('parte-fora');
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain("a parte 'sapata' sai do envelope do volume 'sapata' em +x por 30 mm (tolerância 2 mm)");
    expect(r.resultado.refinamento.achados.map((a) => a.codigo)).toEqual(['parte-fora-do-envelope']);
  });

  it('a porta movida é recusada e a mensagem diz a porta, o campo e o desvio', async () => {
    const r = await medir('porta-movida');
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("a porta 'assento' não está onde o andaime a declarou");
    expect(r.stderr).toContain('centro[1]: o andaime declara 200 e a peça publica 205 (desvio 5 mm, tolerância 0.5 mm)');
    expect(r.resultado.refinamento.portas).toEqual([{ id: 'assento', estado: 'reprovada' }]);
  });

  it('a parte sem volume declarado é recusada', async () => {
    const r = await medir('parte-sem-volume');
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("a parte 'coluna' é entregue pela peça e não declara em REFINA qual volume do andaime");
  });

  it('sem --sem-veredito o refinamento não é conferido, e a execução diz isso', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/parte-fora/receita.js`, semVeredito: true });
    expect(r.stdout).toContain('VEREDITO DESLIGADO');
    expect(r.resultado.refinamento).toBeNull();
  });

  it('a peça entregue sem arquivo não resolve o caminho do andaime e diz isso', async () => {
    const modulo = receitaDoSuporte();
    const r = await descreverPecaReutilizavel({ peca: 'ok', modulo });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('REFINAMENTO DA FORMA GLOBAL INVÁLIDO');
    expect(r.stderr).toContain('caminho relativo à pasta da peça');
  });

  it('o andaime que não existe é recusado com o caminho procurado', async () => {
    const modulo = receitaDoSuporte();
    modulo.REFINA = { ...modulo.REFINA, andaime: '../nao-existe.json' };
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("REFINA.andaime '../nao-existe.json' não existe");
  });

  it('o andaime fora do repositório é recusado', async () => {
    const modulo = receitaDoSuporte();
    modulo.REFINA = { ...modulo.REFINA, andaime: '../../../../../../etc/andaime.json' };
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/ok/receita.js`, modulo });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('sai do repositório');
  });

  it('a receita sem REFINA não muda: o veredito não confere refinamento nenhum', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'braco-robotico/anel-cintura' });
    expect(r.ok).toBe(true);
    expect(r.resultado.refinamento).toBeNull();
  });
});

describe('a guarda do acervo roda o refinamento no caminho da receita', () => {
  const guarda = (variante) => conferirAcervo([`${PASTA}/${variante}/receita`]);

  it('aprova a receita que refina o andaime', async () => {
    const { reprovadas } = await guarda('ok');
    expect(reprovadas).toEqual([]);
  });

  it.each([
    ['parte-fora', /sai do envelope do volume 'sapata'/],
    ['porta-movida', /a porta 'assento' não está onde o andaime a declarou/],
    ['parte-sem-volume', /não declara em REFINA qual volume/],
  ])('reprova %s', async (variante, mensagem) => {
    const { reprovadas } = await guarda(variante);
    expect(reprovadas).toHaveLength(1);
    expect(reprovadas[0].motivo).toMatch(mensagem);
  });
});

describe('o andaime com portas é válido nos schemas', () => {
  it('publica o andaime com portas e recusa a porta de forma desconhecida', () => {
    const servico = criarServicoAutoria3DNativa();
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    Object.values(servico.schemas().contratos).forEach((schema) => ajv.addSchema(schema));
    const andaime = JSON.parse(readFileSync(new URL(`../../${PASTA}/andaime.json`, import.meta.url), 'utf8'));
    const normalizado = servico.formaGlobal.normalizarAndaime(andaime);
    expect(normalizado.portas.map(({ id }) => id)).toEqual(['assento']);
    expect(ajv.validate('mecanifica.andaime-global@2', normalizado), ajv.errorsText()).toBe(true);
    const ruim = { ...normalizado, portas: [{ id: 'assento', interface: { forma: 'rosca', papel: 'recebe' } }] };
    expect(ajv.validate('mecanifica.andaime-global@2', ruim)).toBe(false);
    const { portas, ...semPortas } = normalizado;
    expect(ajv.validate('mecanifica.andaime-global@2', semPortas), ajv.errorsText()).toBe(true);
  });
});
