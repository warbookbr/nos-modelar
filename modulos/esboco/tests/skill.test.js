/* A skill `esbocar-opcoes` e o `PARE-E-ANALISE.md` dizem o fluxo, o nível de detalhe e a proibição de auditar por imagem
   com legenda numerada, sem citar objeto nenhum nas passagens do plano e do fluxo. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(`../../../${caminho}`, import.meta.url), 'utf8');
const skill = ler('.claude/skills/esbocar-opcoes/SKILL.md');
const pare = ler('docs/mecanifica/usar/PARE-E-ANALISE.md');

const secao = (texto, titulo) => {
  const i = texto.indexOf(`## ${titulo}`);
  expect(i).toBeGreaterThanOrEqual(0);
  const fim = texto.indexOf('\n## ', i + 3);
  return texto.slice(i, fim < 0 ? undefined : fim);
};
/* Palavras de objeto: as passagens do nível, das medidas e do fluxo não podem depender de um assunto. */
const OBJETOS = /\b(moto|garfo|guid[aã]o|roda|tanque|banco|carenagem|quadro|motor|bra[cç]o|ombro|casa|mancal|balancim|farol)\b/i;

describe('a skill esbocar-opcoes', () => {
  it('o Pare e planeje fixa o nível de detalhe e as medidas nomeadas com origem, sem citar objeto', () => {
    const p = skill.slice(skill.indexOf('O nível de detalhe que a pessoa pediu'), skill.indexOf('Quais peças serão esboçadas'));
    expect(p).toContain('plano.nivel');
    for (const nivel of ['esquematico', 'medio', 'detalhado']) expect(p).toContain(nivel);
    for (const campo of ['plano.medidas', '`ficha`, `foto` ou `ia`', 'plano.contrato', '`tocam`, `livres`, `simetricas`']) expect(p).toContain(campo);
    expect(p).toMatch(/O nível decide quanto se planeja e quanto se confere/);
    expect(p).not.toMatch(OBJETOS);
  });

  it('descreve o fluxo na ordem e o Condutor, sem citar objeto', () => {
    const f = secao(skill, 'O fluxo de um esboço grande');
    expect(f).not.toMatch(OBJETOS);
    const ordem = ['Primeiro o contrato', 'medidas da referência', 'por subsistema', 'a montagem do conjunto', 'Conferência da maquete', 'crítico sem contexto', 'à pessoa'];
    let ultimo = -1;
    for (const passo of ordem) {
      const i = f.indexOf(passo);
      expect(i, passo).toBeGreaterThan(ultimo);
      ultimo = i;
    }
    expect(f).toContain('--condutor');
    expect(f).toContain('--proximo');
    expect(f).toContain('A cada 25% do custo estimado');
    expect(f).toMatch(/motivo de pelo menos 15 caracteres/);
  });

  it('manda conferir contra a referência quando há foto e despachar o crítico visual cego no Marco, sem citar objeto', () => {
    const f = secao(skill, 'O fluxo de um esboço grande');
    for (const termo of ['--medidas-da-referencia', 'origem: "referencia"', '--referencia', 'plano.referencia', '--envelope', 'plano.envelope', 'agente `critico-visual` cego', 'sem o JSON, o plano nem o histórico']) expect(f, termo).toContain(termo);
    expect(f).toMatch(/nesse Marco esta skill despacha/);
    for (const termo of ['--referencia', '--medidas-da-referencia', '--envelope', 'crítico visual cego']) expect(pare, termo).toContain(termo);
    expect(pare).not.toMatch(/--referencia[^.]*\b(moto|garfo|roda|tanque|banco)\b/i);
  });

  it('proíbe auditar por imagem com legenda numerada, na skill e no Pare e analise', () => {
    expect(skill).toContain('Não audite um esboço por imagem com legenda numerada');
    expect(pare).toContain('É proibido auditar um esboço por imagem com legenda numerada');
    expect(skill).toContain('--achado <n>');
    expect(pare).toContain('--achado <n>');
  });

  it('traz o resumo compacto do formato com os campos e os tipos', () => {
    const r = secao(skill, 'Resumo do formato');
    for (const t of ['caixa', 'cilindro', 'anel', 'cone', 'esfera', 'extrusao', 'loft', 'revolucao', 'tubo']) expect(r).toContain(`\`${t}\``);
    for (const c of ['juntas', 'plano', 'nivel', 'medidas', 'contrato', 'quis dizer']) expect(r).toContain(c);
  });
});
