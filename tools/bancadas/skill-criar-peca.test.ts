/* skill-criar-peca.test.ts — a skill de autoria é MEDIDA contra o núcleo, não
   revisada no olho. Duas afirmações da `.claude/skills/criar-peca/SKILL.md`
   custam peça errada quando envelhecem em silêncio, e as duas já envelheceram:

   (1) QUEM ACEITA `sel`. A skill dizia "Sete ops de geometria só aceitam ID
       LITERAL, nenhuma aceita `sel`" e incluía `apagaFace` na lista. O núcleo
       implementa o ramo `sel` de `apagaFace` desde o O-14 — e `apagaFace` é a
       ÚNICA op que remove face, isto é, a única forma de abrir um vão. A IA que
       seguisse o manual escreveria `['apagaFace', { face: 4003 }]` e persistiria
       id posicional, a referência que o `CLAUDE.md` proíbe, num caso em que o
       caminho semântico existe. O gate `id-cru:check` não pega: `face` é forma
       SINGULAR, declarada fora de escopo.

   (2) O SINAL DA ROTAÇÃO. A skill dava a fórmula `p' = pivo + R_eixo(graus)·
       (p−pivo)` e nada sobre o SENTIDO. Toda primitiva de revolução nasce em
       torno de Y e toda peça mecânica de eixo horizontal precisa levá-la para X;
       sem o sinal, ou se chuta com 50% de chance de espelhar o conjunto, ou se
       reabre o núcleo (A-2 do ATRITOS-AUTORIA: uma das 4 decisões que custaram
       ≈500 linhas de leitura). É o erro que a FOTO não denuncia — um freio
       espelhado parece um freio — e que o `descrever` também não denuncia,
       porque a saída de uma peça espelhada em x continua simétrica e plausível.

   O método dos dois blocos é o mesmo: MEDIR no núcleo (executar a op e olhar o
   neutro) e cobrar da prosa. Doc que discorda do código quebra o teste. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error — núcleo legado em JavaScript.
import { nucleo, OPERACOES_COM_ORIGEM } from '../../prototipos/fps/v3/motor/oficina.js';

const SKILL = join(import.meta.dirname, '../../.claude/skills/criar-peca/SKILL.md');
const texto = readFileSync(SKILL, 'utf8');
const AUDITORIA = readFileSync(join(import.meta.dirname, '../../.claude/skills/auditar-peca/SKILL.md'), 'utf8');
const PACKAGE = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8')) as { scripts: Record<string, string> };

/* ---------------------------------------------------------------------------
   Bloco 1 — quem aceita `sel`, medido op por op.
--------------------------------------------------------------------------- */

/* As ops de edição/skinning que o manual trata como "endereçadas por id". Cada
   uma recebe a MESMA seleção semântica válida (uma face nominal de um cubo com
   `origemId`) e NENHUM id literal. Se a op resolver `sel`, o neutro muda e não
   sobra órfão; se não resolver, o argumento de id vem `undefined` e ela grita. */
const SONDAS: Record<string, Record<string, unknown>> = {
  moveV: { d: [0, 0.1, 0] },
  moveF: { d: [0, 0.1, 0] },
  moveA: { d: [0, 0.1, 0] },
  vira: {},
  apagaFace: {},
  extruda: { dist: 0.3 },
  mescla: { para: 0 },
  pesar: { peso: 1 },
};
const SEL = { origem: { op: 'cubo', id: 1, face: 'topo' } };

function foto(neutro: any) {
  return JSON.stringify({
    V: [...neutro.V].sort((a: any, b: any) => a[0] - b[0]),
    F: [...neutro.F].map(([id, f]: any) => [id, f.vs]).sort((a: any, b: any) => a[0] - b[0]),
  });
}
/* Uma op ACEITA `sel` quando, citada SÓ com `sel`, ela muda a malha sem gritar. */
function aceitaSel(op: string) {
  const base = [['cubo', { origemId: 1, lado: 1 }]];
  const semOp = nucleo(base, {}, {});
  const comOp = nucleo([...base, [op, { ...SONDAS[op], sel: SEL }]], {}, {});
  return comOp.orfaos.length === 0 && foto(semOp) !== foto(comOp);
}

/* O parágrafo (bloco entre linhas em branco) que carrega a afirmação. */
function paragrafoCom(marca: string) {
  const p = texto.split(/\n\s*\n/).filter((b) => b.includes(marca));
  expect(p.length, `esperava UM parágrafo com ${JSON.stringify(marca)} no SKILL.md, achei ${p.length}`).toBe(1);
  return p[0];
}
/* A linha da tabela de vocabulário daquela op (`| \`op\` | args | nota |`). */
function linhaDaTabela(op: string) {
  const linha = texto.split('\n').filter((l) => new RegExp(`^\\|\\s*\`${op}\``).test(l));
  expect(linha.length, `esperava UMA linha de tabela para \`${op}\` no SKILL.md`).toBe(1);
  return linha[0];
}

describe('SKILL criar-peca x núcleo — quem aceita `sel`', () => {
  const medido = Object.fromEntries(Object.keys(SONDAS).map((op) => [op, aceitaSel(op)]));

  it('a medição bate com o núcleo lido à mão (âncora da própria sonda)', () => {
    // se esta expectativa cair, é o NÚCLEO que mudou — reveja a skill de novo.
    expect(medido).toEqual({
      moveV: false, moveF: false, moveA: false, vira: false,
      apagaFace: true, extruda: false, mescla: false, pesar: false,
    });
  });

  it('o parágrafo do "só ID LITERAL" lista EXATAMENTE as ops que não aceitam `sel`', () => {
    const paragrafo = paragrafoCom('ID LITERAL');
    const citadas = new Set([...paragrafo.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1])
      .filter((n) => Object.hasOwn(SONDAS, n)));
    const esperado = new Set(Object.keys(SONDAS).filter((op) => !medido[op]));
    expect([...citadas].sort()).toEqual([...esperado].sort());
  });

  it('toda op que ACEITA `sel` mostra `sel` na própria linha da tabela', () => {
    for (const op of Object.keys(SONDAS)) {
      if (!medido[op]) continue;
      expect(linhaDaTabela(op), `\`${op}\` aceita sel no núcleo mas a tabela da skill não diz`).toMatch(/`sel/);
    }
  });

  it('`apagaFace` documenta a forma SEMÂNTICA, não só o id posicional', () => {
    expect(medido.apagaFace).toBe(true);
    const linha = linhaDaTabela('apagaFace');
    // a nota precisa ensinar a forma `sel: {...}` e o contrato de UMA face só
    expect(linha).toMatch(/sel:\s*\{/);
    expect(linha).toMatch(/exatamente uma face|uma face só|UMA face/i);
  });
});

describe('skills ativas x fluxo Mecanifica', () => {
  it('não transforma paleta em requisito', () => {
    expect(AUDITORIA).toMatch(/paleta não é gate atual/i);
    expect(AUDITORIA).not.toMatch(/Resurrect64.*(?:obrigat|exig|gate)/i);
    expect(AUDITORIA).not.toMatch(/distancia-paleta.*(?:rode|gate|obrigat|exig)/i);
  });

  it('não exige colisão legada em toda peça', () => {
    expect(texto).toMatch(/meta\.colisao[\s\S]{0,180}compatibilidade opcionais/i);
    expect(texto).not.toMatch(/meta\.colisao.*(?:obrigat|exig|deve exportar)/i);
    expect(AUDITORIA).toMatch(/não exige `meta\.colisao`, `colisaoDe`/i);
  });

  it('não cita comandos removidos como parte do fluxo', () => {
    for (const skill of [SKILL, join(import.meta.dirname, '../../.claude/skills/auditar-peca/SKILL.md')]) {
      const conteudo = readFileSync(skill, 'utf8');
      expect(conteudo).not.toMatch(/npm run (auditar|bench)\b/);
    }
    expect(PACKAGE.scripts.auditar).toBeUndefined();
    expect(PACKAGE.scripts.bench).toBeUndefined();
  });
});

describe('SKILL criar-peca x núcleo — operações que publicam origem', () => {
  const marca = /<!-- operacoes-com-origem: ([^>]+) -->/;

  it('a lista documental é derivada do contrato que o núcleo resolve', () => {
    const encontrado = texto.match(marca);
    expect(encontrado, 'o SKILL.md precisa expor a marca canônica de operações com origem').not.toBeNull();
    const documentadas = encontrado![1].split(',').map((op) => op.trim()).filter(Boolean).sort();
    expect(documentadas).toEqual([...OPERACOES_COM_ORIGEM]);
  });

  it('não preserva a instrução antiga de que geradores atuais ignoram origem ou curva', () => {
    expect(texto).not.toMatch(/dois dos quatro que PUBLICAM `origem`/);
    expect(texto).not.toMatch(/origemId aqui é ignorado em silêncio/);
    expect(texto).not.toMatch(/alça de curva reservada/);
  });

  it('declara a bancada como laço visual oficial e rebaixa o render herdado a diagnóstico', () => {
    expect(texto).toMatch(/laço oficial/i);
    expect(texto).toMatch(/npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior/);
    expect(texto).toMatch(/`npm run peca` e `porteiro` permanecem[\s\S]{0,100}diagnóstico/i);
  });
});

/* ---------------------------------------------------------------------------
   Bloco 2 — o sinal da rotação, medido e cobrado da tabela.
--------------------------------------------------------------------------- */

const EIXOS: Record<string, [number, number, number]> = {
  '+X': [1, 0, 0], '-X': [-1, 0, 0],
  '+Y': [0, 1, 0], '-Y': [0, -1, 0],
  '+Z': [0, 0, 1], '-Z': [0, 0, -1],
};

/* Marca unitária: um `cubo` de lado 1 tem centroide exato em [0, 0.5, 0]; o
   `transladar` o põe na ponta do eixo pedido. Rotação é linear em torno do
   pivô, então o centroide dos vértices girados é o centroide girado — medida
   exata, sem depender de qual id é qual. */
function paraOnde(eixo: string, graus: number, de: [number, number, number]) {
  const neutro = nucleo([
    ['cubo', { lado: 1 }],
    ['transladar', { d: [de[0], de[1] - 0.5, de[2]] }],
    ['rotaciona', { eixo, graus, pivo: [0, 0, 0] }],
  ], {}, {});
  expect(neutro.orfaos).toEqual([]);
  let c = [0, 0, 0];
  for (const p of neutro.V.values()) c = [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
  const n = neutro.V.size;
  return c.map((v) => Number((v / n).toFixed(6)) + 0);   // `+ 0` mata o −0
}

/* Lê a tabela `| eixo | graus | leva | para |` da seção do sentido da rotação. */
function tabelaDoSentido() {
  const linhas = texto.split('\n');
  const cabecalho = linhas.findIndex((l) => /^\|\s*eixo\s*\|\s*`graus`\s*\|\s*leva\s*\|\s*para\s*\|/.test(l));
  expect(cabecalho, 'o SKILL.md não tem a tabela do SENTIDO da rotação (| eixo | `graus` | leva | para |)').toBeGreaterThan(-1);
  const linhasDaTabela: { eixo: string; graus: number; de: string; para: string }[] = [];
  for (let i = cabecalho + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.startsWith('|')) break;
    if (l.startsWith('|---')) continue;
    const c = l.split('|').map((x) => x.trim().replace(/`/g, ''));
    linhasDaTabela.push({ eixo: c[1], graus: Number(c[2]), de: c[3], para: c[4] });
  }
  return linhasDaTabela;
}

describe('SKILL criar-peca x núcleo — o SENTIDO da rotação', () => {
  it('o núcleo é destro nos três eixos (medido, não deduzido)', () => {
    // ciclo destro X→Y→Z→X: +graus leva o eixo seguinte para o próximo
    expect(paraOnde('x', 90, EIXOS['+Y'])).toEqual([0, 0, 1]);    // +Y → +Z
    expect(paraOnde('y', 90, EIXOS['+Z'])).toEqual([1, 0, 0]);    // +Z → +X
    expect(paraOnde('z', 90, EIXOS['+X'])).toEqual([0, 1, 0]);    // +X → +Y
  });

  it('o caso canônico: `rotaciona z -90` leva +Y (eixo da revolução) para +X', () => {
    // é o passo que põe disco/cubo/pistão no eixo da roda em `freio-disco.js`;
    // errar o sinal espelha o conjunto inteiro sem a foto acusar nada.
    expect(paraOnde('z', -90, EIXOS['+Y'])).toEqual([1, 0, 0]);
    expect(paraOnde('z', 90, EIXOS['+Y'])).toEqual([-1, 0, 0]);
  });

  it('a tabela do sentido na skill cobre os 3 eixos × ±90 e bate com a medição', () => {
    const tabela = tabelaDoSentido();
    expect(tabela.map((l) => `${l.eixo}${l.graus > 0 ? '+' : ''}${l.graus}`).sort())
      .toEqual(['x+90', 'x-90', 'y+90', 'y-90', 'z+90', 'z-90'].sort());
    for (const { eixo, graus, de, para } of tabela) {
      expect(EIXOS[de], `eixo de origem '${de}' malformado na tabela`).toBeDefined();
      expect(EIXOS[para], `eixo de destino '${para}' malformado na tabela`).toBeDefined();
      expect(paraOnde(eixo, graus, EIXOS[de]), `a skill diz que \`rotaciona ${eixo} ${graus}\` leva ${de} para ${para}`)
        .toEqual(EIXOS[para]);
    }
  });
});
