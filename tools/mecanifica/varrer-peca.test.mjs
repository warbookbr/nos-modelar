/* Prova de R01: a varredura reproduz, sem dica nenhuma, o achado que motivou o
   plano — e nunca aplica o vencedor que encontra.

   As receitas usadas aqui não são o acervo antigo (`cadeira-de-madeira`,
   `prensa-hidraulica`): eram peças publicadas que voltaram a existir só como
   fixture depois do commit `33fde6a6`, e a bancada publicada passou a listá-
   -las como se fossem acervo real. Este teste mede ENCANAMENTO — se a
   varredura acha sozinha o parâmetro que move um critério, se ela soma o
   custo de interpenetração, se a grade respeita orçamento — e não a forma de
   nenhuma peça, então a entrada é a menor receita paramétrica que reproduz o
   mesmo tipo de achado (um parâmetro compartilhado que abre folga num ponto e
   fecha noutros seis ao mesmo tempo), escrita e escrita em disco só aqui, sob
   `tmp/`, e apagada ao final. Os números abaixo vêm de RODAR esta receita, não
   de inventar: mudou a receita, mude o número medindo de novo. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EPSILON_EFEITO,
  lerCriterio,
  lerLiberdade,
  partesMovidas,
  relacoesPioradas,
  sugerirEnquadramento,
  varrerLote,
  varrerSensibilidade,
} from '../../src/autoria/varrer-parametros.js';
import { varrerReutilizavel } from './varrer-peca.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

async function carregar(caminho) {
  return receitaDoModulo(await importarReceita(resolverCaminhoReceita(caminho, { raiz: REPO })));
}

/* Receita viva mínima: um parâmetro compartilhado (`w`) recua seis pares
   `haste/hub` pelo mesmo tanto (`acoplamento`) — encolher `w` fecha os seis
   pares (interpenetram) e, ao sumirem do conjunto medido, o mínimo passa a
   ser um sétimo par bem mais folgado (`trackA`/`trackB`), que também reage a
   `w` e a `esp`. `esp` sozinho nunca é o mínimo — fica sempre atrás dos seis
   pares — e por isso não move a sensibilidade padrão, só o critério de folga
   nomeada que mira `trackA`/`trackB` direto. `inerte` não entra em nenhuma
   posição: existe só para provar a porta do EPSILON_EFEITO, e o resíduo de
   ponto flutuante vem de somar e subtrair a MESMA fração por dois caminhos
   (`inerte*0.3` computado uma vez, cancelado depois), o mesmo mecanismo que
   fez `assento.altura` deslocar a menor folga da cadeira em 2,8e-14 m. */
const WREF = 0.040;
const ESPREF = 0.020;
const OFFSET = 0.017;
const N_FRAGEIS = 6;
const TRACKBASE = 0.050;

function fonteReceitaViva() {
  return `
export const receita = {
  meta: { nome: 'Fixture Varredura Viva', versao: '1.0.0' },
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

/* Receita "PASSOS literais": mesmo formato de uma peça montada à mão, sem
   nenhum número do PASSOS derivar de PARAMS — o caso que a varredura precisa
   reconhecer como "nada para sondar" e apontar para `npm run parametros`. */
function fonteReceitaLiteral() {
  return `
export const receita = {
  meta: { nome: 'Fixture Varredura Literal', versao: '1.0.0' },
  PARAMS: { comprimento: 0.2, altura: 0.05 },
  MATERIAIS: { aco: { cor: '#888888' } },
  PASSOS: [
    ['cubo', { origemId: 1, larg: 0.2, alt: 0.05, prof: 0.05, em: [0, 0, 0] }],
    ['parte', { nome: 'barra', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['cubo', { origemId: 2, larg: 0.02, alt: 0.1, prof: 0.02, em: [0.3, 0, 0] }],
    ['parte', { nome: 'pino', sel: { origem: { op: 'cubo', id: 2 } } }],
    ['material', { usa: 'aco', sel: { grupo: 'barra' } }],
    ['material', { usa: 'aco', sel: { grupo: 'pino' } }],
  ],
};
export default receita;
`;
}

const AQUI = dirname(fileURLToPath(import.meta.url));
mkdirSync(resolve(REPO, 'tmp'), { recursive: true });
const AREA = mkdtempSync(resolve(REPO, 'tmp', 'teste-varrer-peca-'));
const CAMINHO_VIVA = resolve(AREA, 'viva.js');
const CAMINHO_LITERAL = resolve(AREA, 'literal.js');
writeFileSync(CAMINHO_VIVA, fonteReceitaViva(), 'utf8');
writeFileSync(CAMINHO_LITERAL, fonteReceitaLiteral(), 'utf8');
const VIVA = relative(REPO, CAMINHO_VIVA).replace(/\\/g, '/');
const LITERAL = relative(REPO, CAMINHO_LITERAL).replace(/\\/g, '/');

beforeAll(() => {});
afterAll(() => {
  rmSync(AREA, { recursive: true, force: true });
});

describe('vocabulário de critério', () => {
  const descricao = {
    totais: { orfaos: 0, facesSemParte: 0, partes: 2 },
    partes: [
      { nome: 'a', min: [0, 0, 0], max: [1, 2, 3], dimensoes: [1, 2, 3] },
      { nome: 'b', min: [-1, 0, 0], max: [0, 1, 1], dimensoes: [1, 1, 1] },
    ],
    relacoes: [
      { a: 'a', b: 'b', tipo: 'folga', distancia: 0.004 },
      { a: 'a', b: 'c', tipo: 'interpenetra', distancia: 0 },
    ],
  };

  it('lê cada critério aceito', () => {
    expect(lerCriterio('menor-folga').avaliar(descricao)).toBe(0.004);
    expect(lerCriterio('interpenetracoes').avaliar(descricao)).toBe(1);
    expect(lerCriterio('contatos').avaliar(descricao)).toBe(0);
    expect(lerCriterio('folga:b,a').avaliar(descricao)).toBe(0.004);
    expect(lerCriterio('dimensao:a:y').avaliar(descricao)).toBe(2);
    expect(lerCriterio('envelope:x').avaliar(descricao)).toBe(2);
  });

  it('devolve null, não zero, quando a peça não tem do que o critério fala', () => {
    const semFolga = { ...descricao, relacoes: [] };
    expect(lerCriterio('menor-folga').avaliar(semFolga)).toBeNull();
    expect(lerCriterio('folga:a,b').avaliar(semFolga)).toBeNull();
    expect(lerCriterio('dimensao:inexistente:x').avaliar(descricao)).toBeNull();
  });

  it('recusa critério desconhecido dizendo quais existem', () => {
    expect(() => lerCriterio('folga-menor')).toThrow(/não existe.*menor-folga/s);
    expect(() => lerCriterio('folga:a')).toThrow(/duas partes/);
    expect(() => lerCriterio('dimensao:a:w')).toThrow(/x\|y\|z/);
  });
});

describe('liberdade de lote', () => {
  it('expande caminho:min..max:passos em valores igualmente espaçados', () => {
    const l = lerLiberdade('perna.secaoTopo:0.03..0.05:5');
    expect(l.caminho).toEqual(['perna', 'secaoTopo']);
    expect(l.valores.map((v) => Number(v.toFixed(4)))).toEqual([0.03, 0.035, 0.04, 0.045, 0.05]);
  });

  it('recusa faixa invertida, passos de menos e forma errada', () => {
    expect(() => lerLiberdade('a:0.05..0.03:4')).toThrow(/crescente/);
    expect(() => lerLiberdade('a:0.03..0.05:1')).toThrow(/≥ 2/);
    expect(() => lerLiberdade('a:0.03-0.05')).toThrow(/caminho:min\.\.max:passos/);
  });
});

describe('sensibilidade na receita viva', () => {
  it('encontra sozinho o único parâmetro que move a menor folga', async () => {
    const receita = await carregar(VIVA);
    const r = varrerSensibilidade(receita, { criterio: 'menor-folga' });

    const movem = r.efeitos.filter((e) => e.move).map((e) => e.caminho);
    expect(movem).toEqual(['w']);
    expect(r.variantes).toBe(6);

    /* O achado: encolher `w` fecha os seis pares frágeis (interpenetram) e o
       mínimo salta para o sétimo par, bem mais largo; engordar `w` só afasta
       um pouco o mínimo original, sem quebrar nada. */
    const [menor, maior] = r.efeitos.find((e) => e.caminho === 'w').sondas;
    expect(menor.deltaCriterio * 1000).toBeCloseTo(46.0, 1);
    expect(menor.deltaInterpenetracoes).toBe(6);
    expect(maior.deltaCriterio * 1000).toBeCloseTo(6.0, 1);
    expect(maior.deltaInterpenetracoes).toBe(0);
  }, 60_000);

  it('não conta ruído de ponto flutuante como efeito', async () => {
    const receita = await carregar(VIVA);
    const r = varrerSensibilidade(receita, { criterio: 'menor-folga' });
    const inerte = r.efeitos.find((e) => e.caminho === 'inerte');
    expect(inerte.move).toBe(false);
    const ruido = Math.max(...inerte.sondas.map((s) => Math.abs(s.deltaCriterio)));
    expect(ruido).toBeGreaterThan(0);
    expect(ruido).toBeLessThan(EPSILON_EFEITO);
  }, 60_000);

  it('recusa antes de rodar quando a varredura não cabe no orçamento', async () => {
    const receita = await carregar(VIVA);
    expect(() => varrerSensibilidade(receita, { orcamento: 2 })).toThrow(/6 variantes.*orçamento é 2/);
  }, 30_000);

  it('numa receita de PASSOS literais, diz que nada move e aponta o diagnóstico', async () => {
    const receita = await carregar(LITERAL);
    const r = varrerSensibilidade(receita, { criterio: 'envelope:y' });
    expect(r.efeitos.every((e) => !e.move)).toBe(true);
    const texto = (await varrerReutilizavel({ alvo: LITERAL, criterio: 'envelope:y' })).stdout;
    expect(texto).toContain('npm run parametros');
  }, 60_000);
});

describe('lote', () => {
  it('ordena por objetivo declarado e mostra o custo de cada candidato', async () => {
    const receita = await carregar(VIVA);
    const r = varrerLote(receita, {
      liberdades: ['w:0.036..0.044:8'],
      criterio: 'menor-folga',
      objetivo: { modo: 'maximizar' },
    });
    expect(r.variantes).toBe(8);
    expect(r.viaveis.length).toBe(8);
    expect(r.viaveis[0].valor).toBeGreaterThanOrEqual(r.viaveis[1].valor);
    /* O melhor número do lote custa seis interpenetrações; o segundo não custa
       nada. A ferramenta mostra os dois e não escolhe. */
    expect(r.viaveis[0].custo.interpenetracoes).toBe(6);
    expect(r.viaveis[1].custo.interpenetracoes).toBe(0);
  }, 60_000);

  it('sem objetivo declarado não ordena, e diz isso', async () => {
    const r = await varrerReutilizavel({
      alvo: VIVA,
      liberdades: ['w:0.036..0.044:4'],
    });
    expect(r.ok).toBe(true);
    expect(r.stdout).toContain('sem objetivo declarado');
  }, 60_000);

  it('recusa a grade que estoura o orçamento em vez de rodar por minutos', async () => {
    const receita = await carregar(VIVA);
    expect(() => varrerLote(receita, {
      liberdades: ['w:0.03..0.05:20', 'esp:0.01..0.03:20'],
      orcamento: 50,
    })).toThrow(/400 combinações.*orçamento é 50/);
  }, 30_000);
});

describe('o que a ferramenta NÃO faz', () => {
  it('não aplica vencedor, não toca a receita e diz isso na saída', async () => {
    const receita = await carregar(VIVA);
    const antes = JSON.stringify(receita.PARAMS);

    const sensibilidade = await varrerReutilizavel({ alvo: VIVA });
    const lote = await varrerReutilizavel({
      alvo: VIVA,
      liberdades: ['w:0.036..0.044:4'],
      objetivo: { modo: 'maximizar' },
    });

    expect(JSON.stringify(receita.PARAMS)).toBe(antes);
    for (const r of [sensibilidade, lote]) {
      expect(r.stdout).toContain('CANDIDATOS medidos, não uma decisão');
      expect(r.stdout).toContain('nada foi aplicado');
    }
  }, 90_000);

  it('cabe na tela: a sensibilidade inteira da receita viva sai em menos de 4 KB', async () => {
    const r = await varrerReutilizavel({ alvo: VIVA });
    expect(Buffer.byteLength(r.stdout)).toBeLessThan(4_000);
  }, 60_000);

  it('recusa uso ambíguo com diagnóstico, nunca escolhendo por conta própria', async () => {
    expect((await varrerReutilizavel({})).codigo).toBe(2);
    expect((await varrerReutilizavel({ alvo: 'nao-existe' })).codigo).toBe(2);
    const criterioRuim = await varrerReutilizavel({ alvo: VIVA, criterio: 'inventado' });
    expect(criterioRuim.codigo).toBe(2);
    expect(criterioRuim.stderr).toContain('menor-folga');
  }, 30_000);
});

describe('a medição escolhe o enquadramento', () => {
  it('aponta as partes que andaram, não a que foi alterada', async () => {
    const receita = await carregar(VIVA);
    const { comCaminho } = await import('../../src/autoria/parametros-vivos.js');
    const { partes, proporcao } = partesMovidas(
      receita,
      comCaminho(receita.PARAMS, ['w'], 0.036),
    );
    expect(partes.map((p) => p.nome).sort())
      .toEqual(['hub0', 'hub1', 'hub2', 'hub3', 'hub4', 'hub5', 'trackB']);
    expect(partes.every((p) => p.deslocamento > 0)).toBe(true);
    expect(proporcao).toBeGreaterThan(1.5);
  }, 60_000);

  it('escolhe o modo pela quantidade de partes e pede resolução para peça alta', () => {
    const uma = [{ nome: 'aba', deslocamento: 1 }];
    const duas = [...uma, { nome: 'colar', deslocamento: 1 }];
    const tres = [...duas, { nome: 'haste', deslocamento: 1 }];
    expect(sugerirEnquadramento('x', uma)).toContain('--selecionadas=aba --modo=isolar --focar');
    expect(sugerirEnquadramento('x', duas)).toContain('--par=aba,colar');
    expect(sugerirEnquadramento('x', tres)).toContain('--modo=contexto');
    expect(sugerirEnquadramento('x', uma)).not.toContain('--res=');
    expect(sugerirEnquadramento('x', uma, { proporcao: 2.1 })).toContain('--res=1280x1707');
    expect(sugerirEnquadramento('x', [])).toBeNull();
  });

  it('emite a linha pronta na saída da sensibilidade, e nenhuma quando nada move', async () => {
    const comMovimento = await varrerReutilizavel({ alvo: VIVA });
    expect(comMovimento.stdout).toContain('ONDE OLHAR');
    expect(comMovimento.stdout).toContain(`npm run bancada -- ${VIVA} --cores`);

    const semMovimento = await varrerReutilizavel({ alvo: LITERAL, criterio: 'envelope:y' });
    expect(semMovimento.stdout).not.toContain('ONDE OLHAR');
  }, 90_000);
});

describe('custo de regressão — a lição da prova de campo', () => {
  const rel = (pares) => new Map(pares.map(([k, tipo, distancia]) => [k, { tipo, distancia }]));

  it('conta contato perdido, folga que cresce e interpenetração nova', () => {
    const base = rel([['a|b', 'encosta', 0], ['c|d', 'folga', 0.001], ['e|f', 'folga', 0.01]]);
    expect(relacoesPioradas(base, base)).toBe(0);
    expect(relacoesPioradas(base, rel([['a|b', 'folga', 0.002], ['c|d', 'folga', 0.001], ['e|f', 'folga', 0.01]]))).toBe(1);
    expect(relacoesPioradas(base, rel([['a|b', 'encosta', 0], ['c|d', 'folga', 0.004], ['e|f', 'folga', 0.01]]))).toBe(1);
    expect(relacoesPioradas(base, rel([['a|b', 'interpenetra', 0.001], ['c|d', 'folga', 0.001], ['e|f', 'folga', 0.005]]))).toBe(1);
    expect(relacoesPioradas(base, rel([['a|b', 'encosta', 0], ['c|d', 'folga', 0.0005], ['e|f', 'folga', 0.001]]))).toBe(0);
  });

  it('o melhor número do lote deixa de passar por melhoria', async () => {
    /* Fechar a folga trackA↔trackB a zero, via `w` e `esp`, abre outras juntas
       da mesma receita — `w` é compartilhado com os seis pares fráceis. */
    const receita = await carregar(VIVA);
    const r = varrerLote(receita, {
      criterio: 'folga:trackA,trackB',
      liberdades: ['w:0.040..0.060:11', 'esp:0.008..0.028:11'],
      objetivo: { modo: 'minimizar' },
    });
    const zero = r.viaveis[0];
    expect(zero.valor * 1000).toBeCloseTo(0, 1);
    expect(zero.custo.pioradas).toBeGreaterThan(5);

    const texto = (await varrerReutilizavel({
      alvo: VIVA,
      criterio: 'folga:trackA,trackB',
      liberdades: ['w:0.040..0.060:11', 'esp:0.008..0.028:11'],
      objetivo: { modo: 'minimizar' },
    })).stdout;
    expect(texto).toMatch(/junta\(s\) pioraram/);
  }, 120_000);
});
