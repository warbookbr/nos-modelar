/* cache-por-prefixo-acervo.test.mjs — o cache por prefixo em receitas do acervo (plano do cache por passo, fatia 3). Cada receita roda
 * uma vez inteira, guardando o estado depois do passo do meio na memória em armazém (serializado com `v8`, como no disco), e uma segunda
 * vez com a mesma memória, recomeçando dali; a impressão do neutro das duas tem de ser a mesma, e a segunda tem de ter executado só a
 * metade de trás.
 *
 * Por padrão roda o CONJUNTO DE COBERTURA: o exemplo do registro de cada operação (as 43 da receita, as do núcleo e a `estruturaDeBarras`)
 * e as peças mais baratas do acervo que, juntas, usam toda operação que o acervo usa, menos três. A escolha foi medida em 2026-11-17
 * pelo tempo de cada receita na varredura inteira (uma execução e meia, com a máquina dividida): a cobertura gulosa pelo custo por
 * operação nova, sem as redundantes, dá as sete peças abaixo, 7,6 s na varredura. As três de fora são as que só peça cara tem: o
 * `aparar`, que só a carroceria do sedã usa (289 s), e a `aberturaPorContorno` e a `limparLascas`, que só o furgão realista (94 s) e o
 * quarto traseiro do carro (236 s) usam; as três ficam com o exemplo do registro aqui e com a peça na varredura inteira.
 *
 * A VARREDURA INTEIRA, as 121 receitas do acervo, é a prova do gate 1 do plano: roda com `CACHE_ACERVO_INTEIRO=1`, levou de 709 a 767 s
 * em duas rodadas de 2026-11-17, e está registrada na pasta do plano no banco de provas. */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { importarReceita, receitaDoModulo } from '../../../tools/modelar/importar-receita.mjs';
import { REGISTRO_DA_RECEITA, entradaDaReceita } from '../../../src/autoria/executar-receita.js';
import { nucleo } from '../entrada.js';
import { criarMemoriaEmArmazem } from './memoria-em-armazem.js';
import { divergenciaDaImpressao } from './impressao-do-neutro.js';

const PECAS = resolve(dirname(fileURLToPath(import.meta.url)), '../../pecas');
const INTEIRO = process.env.CACHE_ACERVO_INTEIRO === '1';

/* as peças mais baratas que cobrem as operações do acervo, com o tempo de cada uma na varredura inteira de 2026-11-17 */
export const PECAS_DA_COBERTURA = Object.freeze([
  'empilhadeira/partes/garfo/receita.js', // 17 ms: extrusao, intersectar, liso, parte, pincel, publicarPorta
  'poltrona-vime-roxa/receita.js', // 13 ms: chamferBox, material, parte, rotaciona
  'aviao/partes/helice/receita.js', // 197 ms: arranja, lathe, liso, loft, material, parte, rotaciona, solido, transladar
  'aviao/partes/empenagem-vertical/receita.js', // 269 ms: espelha, extrusao, liso, loft, material, moveV, parte, rotaciona, solido, subtrair, transladar
  'braco-robotico/partes/flange/receita.js', // 1,3 s: arredondarAresta, cilindro, furo, parte, publicarPorta
  'braco-robotico/partes/elo-punho-4/receita.js', // 2,0 s: arredondarCostura, lathe, parte, publicarPorta, unir
  'sedan-chassi-e-lataria/partes/frente-e-traseira/receita.js', // 3,8 s: cubo, friso, parte, pincel, publicarPorta, subdivisao
]);
/* as operações do acervo que só peça cara usa, cobertas aqui pelo exemplo do registro */
const SO_EM_PECA_CARA = Object.freeze(['aparar', 'aberturaPorContorno', 'limparLascas', 'divisaoPorContorno']);

function receitasDoAcervo() {
  const receitas = [];
  for (const d of readdirSync(PECAS, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (existsSync(join(PECAS, d.name, 'receita.js'))) receitas.push(`${d.name}/receita.js`);
    const partes = join(PECAS, d.name, 'partes');
    if (existsSync(partes)) for (const p of readdirSync(partes).sort()) if (existsSync(join(partes, p, 'receita.js'))) receitas.push(`${d.name}/partes/${p}/receita.js`);
  }
  return receitas;
}
const exemploDe = (operacao) => operacao.uso?.exemplos ?? operacao.uso?.exemplo ?? null;
const entradaDoAcervo = async (relativo) => entradaDaReceita(receitaDoModulo(await importarReceita(join(PECAS, relativo))));

/** Roda a entrada inteira guardando o passo do meio, e de novo recomeçando dali. */
function inteiraEDoMeio(e, rotulo) {
  const meio = Math.floor(e.PASSOS.length / 2);
  const arquivos = new Map();
  const memoria = criarMemoriaEmArmazem({
    armazem: { ler: (n) => arquivos.get(n) ?? null, gravar: (n, b) => { arquivos.set(n, b); }, apagar: (n) => { arquivos.delete(n); } },
    serializar: serialize, desserializar: deserialize, versao: 'acervo', rotulo, passosGuardados: [meio],
  });
  const rodar = () => { let executados = 0; const n = nucleo(e.PASSOS, e.PARAMS ?? {}, e.TOPO ?? {}, e.MATERIAIS ?? {}, e.ESQUELETO ?? null, e.ALIASES ?? [], { registroOperacoes: REGISTRO_DA_RECEITA, memoria, aoRastrear: () => { executados += 1; } }); return { n, executados }; };
  const inteira = rodar();
  expect(inteira.executados).toBe(e.PASSOS.length);
  const doMeio = rodar();
  expect(divergenciaDaImpressao(doMeio.n, inteira.n)).toBeNull();
  /* a receita vazia (as partes ainda sem passo de um objeto em alinhamento) não tem ponto */
  if (!e.PASSOS.length) { expect(memoria.estatisticas).toMatchObject({ guardados: 0, lidos: 0, falhas: 0 }); return; }
  /* a chave e o estado se serializam: o ponto do meio foi guardado e lido, e a segunda execução fez só a metade de trás */
  expect(memoria.estatisticas).toMatchObject({ guardados: 1, lidos: 1, falhas: 0 });
  expect(doMeio.executados).toBe(e.PASSOS.length - meio - 1);
}

describe.runIf(!INTEIRO)('o cache por prefixo no conjunto de cobertura', () => {
  it('o exemplo de cada operação do registro, e as peças da cobertura usam toda operação do acervo menos as de peça cara', async () => {
    const operacoes = REGISTRO_DA_RECEITA.listar();
    for (const op of operacoes) {
      const exemplo = exemploDe(op);
      expect(exemplo?.PASSOS, op.nome).toBeTruthy();
      inteiraEDoMeio(exemplo, `exemplo:${op.nome}`);
    }
    const cobertas = new Set();
    for (const r of PECAS_DA_COBERTURA) for (const [op] of (await entradaDoAcervo(r)).PASSOS) cobertas.add(op);
    const doAcervo = new Set();
    for (const r of receitasDoAcervo()) for (const [op] of (await entradaDoAcervo(r)).PASSOS) doAcervo.add(op);
    expect([...doAcervo].filter((op) => !cobertas.has(op) && !SO_EM_PECA_CARA.includes(op)).sort()).toEqual([]);
  }, 120_000);

  for (const r of PECAS_DA_COBERTURA) {
    it(r, async () => { inteiraEDoMeio(await entradaDoAcervo(r), r); }, 120_000);
  }
});

describe.runIf(INTEIRO)('o cache por prefixo no acervo inteiro (CACHE_ACERVO_INTEIRO=1)', () => {
  const receitas = receitasDoAcervo();
  it('o acervo tem receitas', () => { expect(receitas.length).toBeGreaterThan(100); });
  for (const r of receitas) {
    it(relative('.', r), async () => { inteiraEDoMeio(await entradaDoAcervo(r), r); }, 900_000);
  }
});
