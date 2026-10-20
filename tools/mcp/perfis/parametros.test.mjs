/* As duas ferramentas da varredura vistas pela porta MCP.
 *
 * Um agente que fala com o Mecanifica por MCP não roda `npm run`. Se a porta
 * não anunciar estas duas, ele continua alterando número no escuro — que é o
 * desperdício que elas cortam. Este arquivo prova que ela anuncia, que elas
 * respondem, e que não escrevem nada.
 *
 * `cadeira-de-madeira` não é mais alvo válido: era acervo publicado que o
 * commit `33fde6a6` moveu para `tools/fixtures/acervo/` em vez de apagar, e de
 * lá passou a aparecer na bancada como se fosse acervo real. Os testes abaixo
 * medem a PORTA MCP — que ela devolve a mesma estrutura que a CLI, que a
 * unidade anunciada bate com o número, que `mostrar` limita a estrutura e não
 * só o texto — e não a forma de nenhuma peça, então os alvos são as duas
 * menores receitas que reproduzem isso, escritas e escritas em disco só aqui,
 * sob `tmp/`, e apagadas ao final. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { criarFerramentasParametros } from './parametros.mjs';
import { parametrosReutilizavel } from '../../mecanifica/parametros-peca.mjs';
import { montarAcervoReduzido } from '../../mecanifica/acervo-reduzido.mjs';
import { REPO } from '../../mecanifica/resolver-caminho-receita.mjs';

const ferramentas = criarFerramentasParametros();
const pegar = (nome) => ferramentas.find((f) => f.nome === nome);

async function chamar(nome, entrada) {
  const f = pegar(nome);
  const executado = await f.executar(entrada);
  return { executado, estruturado: f.estruturar(executado), conteudo: f.conteudo(executado) };
}

/* Receita viva: um parâmetro compartilhado (`w`) recua seis pares
   `haste/hub` pelo mesmo tanto — encolher fecha os seis pares e o mínimo
   salta para um sétimo par (`trackA`/`trackB`), que também reage a `w` e a
   `esp`. Ver o mesmo desenho, com a mesma explicação, em
   `tools/mecanifica/varrer-peca.test.mjs`. */
const WREF = 0.040;
const ESPREF = 0.020;
const OFFSET = 0.017;
const N_FRAGEIS = 6;
const TRACKBASE = 0.050;

function fonteReceitaViva() {
  return `
export const receita = {
  meta: { nome: 'Fixture MCP Viva', versao: '1.0.0' },
  PARAMS: { w: ${WREF}, esp: ${ESPREF}, inerte: 0.300 },
  MATERIAIS: { aco: { cor: '#888888' } },
  get PASSOS() {
    const p = this.PARAMS;
    const WREF = ${WREF};
    const ESPREF = ${ESPREF};
    const OFFSET = ${OFFSET};
    const N = ${N_FRAGEIS};
    const TRACKBASE = ${TRACKBASE};
    const chain = p.inerte + p.inerte * 0.3 - p.inerte * 0.3;
    const ruido = chain - p.inerte;
    const acoplamento = (WREF - p.w) * 5 + ruido;
    const trackGap = TRACKBASE - (p.w - WREF) * 5 - (p.esp - ESPREF) * 5;
    const passos = [
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [-1, 0, 0] }],
      ['parte', { nome: 'trackA', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 0.02, alt: 0.02, prof: 0.02, em: [-1, 0.02 + trackGap, 0] }],
      ['parte', { nome: 'trackB', sel: { origem: { op: 'cubo', id: 2 } } }],
    ];
    let id = 10;
    for (let i = 0; i < N; i++) {
      passos.push(['cubo', { origemId: id, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1 * i, 0, 0] }]);
      passos.push(['parte', { nome: \`haste\${i}\`, sel: { origem: { op: 'cubo', id } } }]);
      id += 1;
      passos.push(['cubo', { origemId: id, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1 * i + 0.02 + OFFSET - acoplamento, 0, 0] }]);
      passos.push(['parte', { nome: \`hub\${i}\`, sel: { origem: { op: 'cubo', id } } }]);
      id += 1;
    }
    passos.push(['material', { usa: 'aco', sel: { grupo: 'trackA' } }]);
    passos.push(['material', { usa: 'aco', sel: { grupo: 'trackB' } }]);
    for (let i = 0; i < N; i++) {
      passos.push(['material', { usa: 'aco', sel: { grupo: \`haste\${i}\` } }]);
      passos.push(['material', { usa: 'aco', sel: { grupo: \`hub\${i}\` } }]);
    }
    return passos;
  },
};
export default receita;
`;
}

/* Receita "PASSOS literais": um par que interpenetra (p1/p2) e um par com
   folga limpa de 25 mm (trackA/trackB) — o mínimo para provar que a unidade
   anunciada bate com o número, nos dois critérios que convertem diferente. */
function fonteReceitaLiteral() {
  return `
export const receita = {
  meta: { nome: 'Fixture MCP Literal', versao: '1.0.0' },
  PARAMS: { dummy: 0.1 },
  MATERIAIS: { aco: { cor: '#888888' } },
  PASSOS: [
    ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [0, 0, 0] }],
    ['parte', { nome: 'p1', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['cubo', { origemId: 2, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.01, 0, 0] }],
    ['parte', { nome: 'p2', sel: { origem: { op: 'cubo', id: 2 } } }],
    ['cubo', { origemId: 3, larg: 0.02, alt: 0.02, prof: 0.02, em: [-1, 0, 0] }],
    ['parte', { nome: 'trackA', sel: { origem: { op: 'cubo', id: 3 } } }],
    ['cubo', { origemId: 4, larg: 0.02, alt: 0.02, prof: 0.02, em: [-1, 0.045, 0] }],
    ['parte', { nome: 'trackB', sel: { origem: { op: 'cubo', id: 4 } } }],
    ['material', { usa: 'aco', sel: { grupo: 'p1' } }],
    ['material', { usa: 'aco', sel: { grupo: 'p2' } }],
    ['material', { usa: 'aco', sel: { grupo: 'trackA' } }],
    ['material', { usa: 'aco', sel: { grupo: 'trackB' } }],
  ],
};
export default receita;
`;
}

mkdirSync(resolve(REPO, 'tmp'), { recursive: true });
const AREA = mkdtempSync(resolve(REPO, 'tmp', 'teste-mcp-parametros-'));
const CAMINHO_VIVA = resolve(AREA, 'viva.js');
const CAMINHO_LITERAL = resolve(AREA, 'literal.js');
writeFileSync(CAMINHO_VIVA, fonteReceitaViva(), 'utf8');
writeFileSync(CAMINHO_LITERAL, fonteReceitaLiteral(), 'utf8');
const VIVA = CAMINHO_VIVA.slice(REPO.length + 1).replace(/\\/g, '/');
const LITERAL = CAMINHO_LITERAL.slice(REPO.length + 1).replace(/\\/g, '/');

const REDUZIDO = montarAcervoReduzido();

afterAll(() => {
  rmSync(AREA, { recursive: true, force: true });
  rmSync(REDUZIDO.absoluta, { recursive: true, force: true });
});

describe('porta MCP da varredura', () => {
  it('anuncia as duas como somente leitura', () => {
    expect(ferramentas.map((f) => f.nome)).toEqual(['diagnosticar_parametros', 'varrer_parametros']);
    for (const f of ferramentas) {
      expect(f.anotacoes).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(f.inputSchema).toBeDefined();
      expect(f.outputSchema).toBeDefined();
    }
    /* A descrição precisa dizer que o custo existe: um agente que leia só
       "encontra o melhor valor" vai acreditar no melhor número. */
    expect(pegar('varrer_parametros').descricao).toMatch(/QUEBRA|pioraram|custo/);
    expect(pegar('diagnosticar_parametros').descricao).toMatch(/ANTES de alterar/);
  });

  it('diagnostica um alvo e o acervo, com a mesma resposta da CLI', async () => {
    const um = await chamar('diagnosticar_parametros', { alvo: VIVA });
    expect(um.estruturado.ok).toBe(true);
    expect(um.estruturado.resultado.totais).toEqual({ declarados: 3, vivos: 3, inertes: 0 });
    expect(um.estruturado.resultado.vivos).toContain('w');
    expect(um.conteudo[0].text).toContain(`PARÂMETROS DE ${VIVA}`);

    /* Acervo reduzido (3 peças pequenas, opção `raiz`): o teste prova o
       encanamento da porta e não pode custar o que o acervo real custa. O real
       inteiro é conferido uma vez, por `tools/mecanifica/acervo-real.test.mjs`. */
    const todos = await chamar('diagnosticar_parametros', { acervo: true, raiz: REDUZIDO.raiz });
    /* A porta MCP e a CLI leem a mesma varredura, então o total do acervo que
       uma devolve é o que a outra devolve na mesma árvore. O número não é
       escrito aqui: cada peça nova do acervo o muda, e `parametros-peca.test.mjs`
       prova que ele é a soma dos alvos que o acervo lista. */
    const cli = await parametrosReutilizavel({ acervo: true, raiz: REDUZIDO.raiz });
    expect(cli.ok).toBe(true);
    expect(cli.resultado.registros).toHaveLength(3);
    expect(todos.estruturado.resultado.totais).toEqual(cli.resultado.totais);
    expect(todos.estruturado.resultado.totais.declarados).toBeGreaterThan(0);
  }, 60_000);

  it('varre sensibilidade e devolve onde olhar', async () => {
    const r = await chamar('varrer_parametros', { alvo: VIVA, criterio: 'menor-folga' });
    expect(r.estruturado.ok).toBe(true);
    expect(r.estruturado.resultado.movem).toEqual(['w']);
    expect(r.estruturado.resultado.variantes).toBe(6);
    expect(r.estruturado.resultado.ondeOlhar.length).toBeGreaterThan(0);
    expect(r.conteudo[0].text).toContain('nada foi aplicado');
  }, 90_000);

  it('no lote, entrega o custo junto do número — não só o número', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: VIVA,
      criterio: 'folga:trackA,trackB',
      livres: ['w:0.040..0.060:11', 'esp:0.008..0.028:11'],
      objetivo: 'minimizar',
    });
    const primeiro = r.estruturado.resultado.candidatos[0];
    expect(primeiro.valor).toBeCloseTo(0, 1);
    expect(primeiro.custo.pioradas).toBeGreaterThan(5);
  }, 120_000);

  it('recusa entrada ambígua com ação, em vez de escolher sozinha', async () => {
    const semAlvo = await chamar('diagnosticar_parametros', {});
    expect(semAlvo.estruturado.ok).toBe(false);
    expect(semAlvo.estruturado.erro.acao).toContain('acervo:true');

    const semValor = await chamar('varrer_parametros', {
      alvo: VIVA,
      livres: ['w:0.040..0.050:3'],
      objetivo: 'alvo',
    });
    expect(semValor.estruturado.ok).toBe(false);
    expect(semValor.estruturado.erro.codigo).toBe('objetivo_incompleto');
  }, 60_000);

  it('rejeita campo desconhecido no schema em vez de ignorar em silêncio', () => {
    const schema = pegar('varrer_parametros').inputSchema;
    expect(schema.safeParse({ alvo: 'x', criterioo: 'menor-folga' }).success).toBe(false);
    expect(schema.safeParse({ alvo: 'x', delta: 1.5 }).success).toBe(false);
    expect(schema.safeParse({ alvo: 'x', livres: ['a:0..1:3'], objetivo: 'maximizar' }).success).toBe(true);
  });
});

describe('a estrutura não pode mentir onde o texto acerta', () => {
  it('devolve os números NA UNIDADE anunciada, não em metros crus', async () => {
    /* Achado ao chamar a porta como agente: `unidade: "mm"` ao lado de
       0.014142135623730944 metros. Quem lê o texto acerta; quem lê a estrutura
       erra por mil, e erra com confiança porque o campo promete milímetro. */
    const r = await chamar('varrer_parametros', {
      alvo: LITERAL,
      criterio: 'folga:trackA,trackB',
    });
    expect(r.estruturado.resultado.unidade).toBe('mm');
    expect(r.estruturado.resultado.base).toBeCloseTo(25, 1);
    expect(r.conteudo[0].text).toContain('25.00 mm');
  }, 90_000);

  it('critério que conta pares não é convertido', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: LITERAL,
      criterio: 'interpenetracoes',
    });
    expect(r.estruturado.resultado.unidade).toBe('par(es)');
    expect(r.estruturado.resultado.base).toBe(1);
  }, 90_000);

  it('honra `mostrar` na estrutura, não só no texto', async () => {
    const r = await chamar('varrer_parametros', {
      alvo: VIVA,
      criterio: 'menor-folga',
      livres: ['w:0.036..0.044:8'],
      objetivo: 'maximizar',
      mostrar: 3,
    });
    expect(r.estruturado.resultado.candidatos).toHaveLength(3);
  }, 90_000);
});
