/* As skills `esboco-detalhado`, `laco-do-esboco` e `esbocar-opcoes` e o `PARE-E-ANALISE.md` dizem o fluxo, o nível de detalhe e a proibição de auditar por imagem
   com legenda numerada, sem citar objeto nenhum nas passagens do plano e do fluxo. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(`../../../${caminho}`, import.meta.url), 'utf8');
const skill = ler('.claude/skills/esboco-detalhado/SKILL.md');
const formato = ler('.claude/skills/esboco-detalhado/resumo-do-formato.md');
const menosJson = ler('.claude/skills/esboco-detalhado/escrever-menos-json.md');
const laco = ler('.claude/skills/laco-do-esboco/SKILL.md');
const esbocista = ler('.claude/agents/esbocista.md');
const opcoes = ler('.claude/skills/esbocar-opcoes/SKILL.md');
const pare = ler('docs/mecanifica/usar/PARE-E-ANALISE.md');

const secao = (texto, titulo) => {
  const i = texto.indexOf(`## ${titulo}`);
  expect(i).toBeGreaterThanOrEqual(0);
  const fim = texto.indexOf('\n## ', i + 3);
  return texto.slice(i, fim < 0 ? undefined : fim);
};
/* Palavras de objeto: as passagens do nível, das medidas e do fluxo não podem depender de um assunto. */
const OBJETOS = /\b(moto|garfo|guid[aã]o|roda|tanque|banco|carenagem|quadro|motor|bra[cç]o|ombro|casa|mancal|balancim|farol)\b/i;

describe('a skill esboco-detalhado', () => {
  it('o Pare e planeje fixa o nível de detalhe e as medidas nomeadas com origem, sem citar objeto', () => {
    const p = skill.slice(skill.indexOf('O nível de detalhe que a pessoa pediu'), skill.indexOf('Como cada peça será detalhada'));
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
    expect(f).toMatch(/nesse Marco a skill .{0,60}laco-do-esboco.{0,60} despacha/);
    for (const termo of ['--referencia', '--medidas-da-referencia', '--envelope', 'crítico visual cego']) expect(pare, termo).toContain(termo);
    expect(pare).not.toMatch(/--referencia[^.]*\b(moto|garfo|roda|tanque|banco)\b/i);
  });

  it('proíbe auditar por imagem com legenda numerada, na skill e no Pare e analise', () => {
    expect(skill).toContain('Não audite um esboço por imagem com legenda numerada');
    expect(opcoes).toContain('esboco-detalhado');
    expect(pare).toContain('É proibido auditar um esboço por imagem com legenda numerada');
    expect(skill).toContain('--achado <n>');
    expect(pare).toContain('--achado <n>');
  });

  it('traz o resumo compacto do formato com os campos e os tipos', () => {
    expect(skill).toContain('resumo-do-formato.md');
    for (const t of ['caixa', 'cilindro', 'anel', 'cone', 'esfera', 'extrusao', 'loft', 'revolucao', 'tubo']) expect(formato).toContain(`\`${t}\``);
    for (const c of ['juntas', 'plano', 'nivel', 'medidas', 'contrato', 'quis dizer']) expect(formato).toContain(c);
  });

  it('manda listar as partes que o objeto precisa ter antes de modelar, sem citar objeto, e ensina estilos, simetria, perfis e --editar', () => {
    const p = skill.slice(skill.indexOf('plano.pecas'), skill.indexOf('Havendo foto, o arquivo dela'));
    for (const termo of ['plano.pecas', 'conhecimento que você tem do objeto', 'obrigatoria', 'classe `peca`']) expect(p, termo).toContain(termo);
    expect(p).not.toMatch(OBJETOS);
    expect(pare).toContain('plano.pecas');
    expect(pare).toContain('a partir do conhecimento do objeto');
    expect(skill).toContain('escrever-menos-json.md');
    for (const termo of ['estilos', 'unidades', 'simetrico', '`lado: "E"`', '"gerar": "estrela"', '"gerar": "arco"', '"gerar": "circulo"', '"gerar": "polar"', '--editar', '--remover', '--adicionar']) expect(menosJson, termo).toContain(termo);
    expect(skill).toContain('--unidade <unidade>');
    expect(skill).toContain('substitui');
  });
});

describe('a skill laco-do-esboco e o agente esbocista', () => {
  it('descreve os dois modos de condução, sem citar objeto', () => {
    const s = secao(laco, 'Os dois modos de condução');
    expect(s).not.toMatch(OBJETOS);
    expect(s).toContain('--modo <objeto|por-unidade>');
    expect(s).toContain('modo `objeto`');
    expect(s).toContain('modo `por-unidade`');
    expect(s).toContain('fatia 9');
  });

  it('descreve o brief por unidade, a nota de passagem e a reprovação no modo novo, sem citar objeto', () => {
    expect(laco).not.toMatch(OBJETOS);
    expect(laco).toContain('--condutor <arquivo> --historico');
    expect(laco).toMatch(/--nota-de-passagem <unidade>\s+--texto <texto>/);
    expect(laco).toContain('o porquê das escolhas');
    expect(laco).toContain('não descreve o que foi feito');
    expect(laco).toMatch(/refaça a mesma unidade com um\s+esbocista novo/);
  });

  it('o agente esbocista aceita brief de objeto ou unidade e grava nota de passagem, sem citar objeto', () => {
    expect(esbocista).not.toMatch(OBJETOS);
    expect(esbocista).toContain('--condutor <arquivo> --historico');
    expect(esbocista).toMatch(/--nota-de-passagem <unidade>\s+--texto <texto>/);
    expect(esbocista).toContain('porquê das escolhas');
    expect(esbocista).toContain('sem relatar o que foi feito');
  });
});

