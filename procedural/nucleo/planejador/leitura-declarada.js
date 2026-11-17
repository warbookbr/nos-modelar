/* leitura-declarada.js — o que cada operação do núcleo lê da malha, declarado, e a conferência contra o que o passo leu de fato (fatia 2
 * do plano do cache por passo). É o par de `ESCRITA_DAS_OPERACOES` do núcleo, que declara o que a operação escreve.
 *
 * A declaração é por mapa (`V`, os vértices, e `F`, as faces) e diz o que a função da operação lê, FORA da resolução da seleção, das
 * entradas que já existiam antes do passo:
 *   'nada'     nenhuma: a operação só lê os próprios argumentos e o que ela mesma cria (as primitivas);
 *   'citados'  só as entradas que a seleção do passo citou: as faces que `resolverSelecao` e `resolverOrigem` devolveram e os vértices
 *              delas. O passo depende então só dos passos que escreveram essas entradas;
 *   'malha'    qualquer uma, a varredura do mapa ou o tamanho dele: o passo depende da malha inteira e é barreira para o cache.
 * A resolução da seleção lê à parte e é da citação: a seleção por origem, alias ou id lê só o que cita, e a por `onde`, `regiao`,
 * `grupo`, `v` ou `tudo` varre a malha. Um passo com seleção que varre depende da malha inteira qualquer que seja a declaração, e o
 * planejador já o vê pelos argumentos (`dinamica` em `leitura-escrita.js`).
 *
 * A ordem 'nada' < 'citados' < 'malha' é a da conferência: o passo cumpre a declaração quando leu no máximo o nível declarado. Operação
 * fora desta tabela não tem leitura declarada e vale como 'malha'. A declaração vale só para a função do próprio núcleo; a conferência
 * (`OPCOES.leitura: 'conferido'`) roda sobre peças do acervo no teste `leitura-declarada-acervo.test.mjs`.
 *
 * Os registros de origem (`st.origens`) que o passo consulta saem no resumo do registro de leitura, e não são declarados aqui: a
 * consulta é pela identidade citada no argumento, que o planejador lê da receita sem executar. */
import { niveisDoPasso } from './leitura-do-passo.js';

const ORDEM = Object.freeze({ nada: 0, citados: 1, malha: 2 });

/* As operações que somam mais de 90 % da execução das peças pesadas da linha de base, medidas no acervo pelo `levantar-leitura.mjs` do
   banco de provas do plano (2026-11-17); o teste confere cada uma de novo. A declaração é a leitura que a operação faz HOJE, e 'malha'
   diz onde ela varre o mapa:
     - as primitivas leem só os argumentos;
     - o `friso` lê só a costura que cita, pelo registro da origem dela;
     - as booleanas varrem as faces (a coleta dos vértices que nenhuma face usa depois do corte e a busca da face vizinha numa aresta,
       em `operacoes/booleanas.js`); o `subtrair` lê só os vértices dos sólidos citados, e o `unir` que refina a faixa da costura
       (`operacoes/refino-da-costura.js`, o cordão de solda) varre também os vértices, para a caixa da peça inteira;
     - a abertura por contorno varre os vértices (o raio da peça inteira, de todos eles) e as chaves dos dois mapas (a escolha do id
       local livre), a limpeza de lascas varre os vértices (a caixa de todos eles) e as faces, e o arredondamento de aresta varre as
       faces para achar a outra face da aresta e a terceira de cada ponta (`operacoes/estruturais.js`). */
export const LEITURA_DAS_OPERACOES = Object.freeze({
  lathe: Object.freeze({ V: 'nada', F: 'nada' }),
  extrusao: Object.freeze({ V: 'nada', F: 'nada' }),
  subdivisao: Object.freeze({ V: 'nada', F: 'nada' }),
  friso: Object.freeze({ V: 'citados', F: 'citados' }),
  subtrair: Object.freeze({ V: 'citados', F: 'malha' }),
  unir: Object.freeze({ V: 'malha', F: 'malha' }),
  aberturaPorContorno: Object.freeze({ V: 'malha', F: 'malha' }),
  limparLascas: Object.freeze({ V: 'malha', F: 'malha' }),
  arredondarAresta: Object.freeze({ V: 'malha', F: 'malha' }),
});

/** A declaração da operação, ou null quando ela não tem (e vale como 'malha'). */
export function leituraDeclaradaDe(nome) { return Object.hasOwn(LEITURA_DAS_OPERACOES, nome) ? LEITURA_DAS_OPERACOES[nome] : null; }

/**
 * A conferência de um passo: null se ele leu no máximo o que a operação declara, ou o texto da divergência (o mapa, o nível lido, o
 * declarado e até cinco ids lidos fora do declarado). Operação sem declaração não diverge.
 */
export function conferirLeituraDoPasso(nome, resumo, tabela = LEITURA_DAS_OPERACOES) {
  const declarada = Object.hasOwn(tabela, nome) ? tabela[nome] : null;
  if (!declarada) return null;
  const niveis = niveisDoPasso(resumo);
  const partes = [];
  for (const mapa of ['V', 'F']) {
    if (ORDEM[niveis[mapa]] <= ORDEM[declarada[mapa]]) continue;
    const leitura = resumo.operacao[mapa];
    const citados = new Set(resumo.citados[mapa]);
    const fora = declarada[mapa] === 'nada' ? leitura.lidos : leitura.lidos.filter((id) => !citados.has(id));
    const como = leitura.varreu ? 'varreu o mapa' : leitura.tamanho ? 'leu o tamanho do mapa' : `leu ${fora.length} entrada(s) fora do declarado (${fora.slice(0, 5).join(', ')}${fora.length > 5 ? ', …' : ''})`;
    partes.push(`${mapa} declarado '${declarada[mapa]}', lido '${niveis[mapa]}': ${como}`);
  }
  return partes.length ? partes.join('; ') : null;
}
