/* referencia-posicional.js — A REGRA ÚNICA de "isto é referência por id
   posicional?", para o formato salvo da Oficina.

   Por que existe (ATRITOS-AUTORIA A-22): a mesma regra vivia copiada em três
   lugares — o gate `tools/bancadas/id-cru.mjs`, a antiga guarda de salvamento
   da Oficina humana e o oráculo do harness. As três
   divergiram DUAS vezes na mesma chave (`de`), e na segunda o resultado foi a
   ferramenta de autoria do projeto recusando uma peça que o CI do projeto
   aprova, acusando de id posicional as cinco portas semânticas que o ciclo
   anterior tinha acabado de entregar. Enquanto a regra viver copiada ela
   diverge de novo; a cura é uma fonte só.

   ONDE ELA MORA: aqui, junto do formato que classifica. A Oficina humana e seu
   harness foram retirados da Mecanifica; hoje o consumidor de produção é o
   gate `id-cru`. Este arquivo não importa nada — nem Three.js, nem o núcleo —
   e continua portátil para uma futura extração ao NÓS.

   O QUE A REGRA DIZ. O formato salvo aceita SEIS formas de COLEÇÃO de id cru.
   A lista não é opinião: saiu de varrer toda leitura `a.<chave>` dentro de
   `OPS` (`oficina.js`) atrás de vértice ou face vindo do passo. Se uma op nova
   ler id de uma chave nova, ela entra aqui — e entra para os três de uma vez:

     forma                  ops que leem                                   caminho semântico?
     faces:[ids]            pincel/solido/liso/material/parte/espelha      SIM (resolverAlvosF -> sel:{...})
                            pesar                                          NÃO (pesar lê a.faces cru)
     sel:{v:[ids]}          displace/transladar/rotaciona                  SIM
     sel:{f:[ids]}          qualquer op com sel                            SIM
     vs:[ids]               pesar                                          NÃO
     pontos:[{f:id}]        pincel modo:'livre'                            NÃO
     de:[ids]               mescla                                         NÃO

   `de` tem DOIS contratos desde o O-12, e só um deles é id cru: `mescla` lê
   `de:[ids]` (coleção de VÉRTICE) e `publicarPorta` lê `de:{op,id,...}` —
   ORIGEM ESTRUTURAL, irmã de `sel:{origem}` e de `derivaDe`, a referência mais
   semântica que a linguagem tem. O discriminador é a FORMA, não o nome da op:
   a regra continua op-agnóstica, porque um passo montado por helper local não
   tem nome de op para consultar.

   NÃO SÃO ID POSICIONAL, e por isso não entram: `id` (a declaração da base do
   passo, que `confereId` já confere contra a POSIÇÃO), e `origemId`/`derivaDe`/
   `de:{op,id}`/`sel:{origem}`/`sel:{alias}`/`sel:{porta}` (identidade estável
   declarada pelo autor).

   FORA DE ESCOPO, de propósito, declarado e COMPLETO — as formas SINGULARES,
   as únicas quatro que existem no núcleo: `face:<id>` (vira/moveF/extruda/
   apagaFace), `v:<id>` (moveV), `a:<id>`/`b:<id>` (moveA) e `para:<id>`
   (mescla). Metade dessas ops não tem caminho semântico nenhum no núcleo
   atual, então gatear isso hoje proibiria usar a op em vez de proibir o
   atalho.

   A CONTAGEM É DE ID, NÃO DE PASSO, e chave presente NUNCA conta 0:
   `faces: []` e `faces: 'nada'` são a forma legada sendo usada (o núcleo grita
   nas duas), não ausência dela — a regra não pode ser mais permissiva que o
   núcleo. */

/* As seis formas, na ordem da mensagem de erro e da serialização —
   determinismo antes de estética. */
export const FORMAS = /** @type {const} */ (['faces', 'selV', 'selF', 'vs', 'pontos', 'mesclaDe']);

export const ROTULO = {
  faces: 'faces:[ids]',
  selV: 'sel:{v:[ids]}',
  selF: 'sel:{f:[ids]}',
  vs: 'vs:[ids] (pesar)',
  pontos: 'pontos:[{f}] (pincel livre)',
  mesclaDe: 'de:[ids] (mescla)',
};

/* Quais formas têm para onde ir HOJE. O conselho de conserto precisa ser
   verdadeiro por forma: mandar trocar `vs:[ids]` por `sel:{alias}` seria mandar
   fazer o que o núcleo não aceita. */
export const TEM_CAMINHO_SEMANTICO = { faces: true, selV: true, selF: true, vs: false, pontos: false, mesclaDe: false };

export const objetoPlano = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

const contarIds = (x) => (Array.isArray(x) ? Math.max(1, x.length) : 1);
/* `pontos` carrega o id dentro da entrada (`{f, a, b}`): conta as entradas que
   trazem `f`, que é o que o `pincel` modo livre lê. */
const contarPontos = (x) => (Array.isArray(x) ? Math.max(1, x.filter((p) => objetoPlano(p) && Object.hasOwn(p, 'f')).length) : 1);

/**
 * `de:{op,id,...}` é ORIGEM ESTRUTURAL (`publicarPorta`), não coleção de id.
 * Contrato mínimo `{op,id}`, o mesmo que `validarOrigem` exige no núcleo;
 * `{}` e `de:'nada'` continuam contando como forma legada.
 */
export const origemEstrutural = (x) => objetoPlano(x) && Object.hasOwn(x, 'op') && Object.hasOwn(x, 'id');

/**
 * As ocorrências de referência posicional de UM passo, em ordem estável.
 * Devolve `[{ forma, rotulo, ids }]`, onde `ids` é quanto id aquela chave
 * carrega (nunca menos que 1 quando a chave existe).
 */
export function ocorrenciasDoPasso(passo) {
  const a = Array.isArray(passo) ? passo[1] : null;
  if (!objetoPlano(a)) return [];
  const achados = [];
  const anotar = (forma, ids) => achados.push({ forma, rotulo: ROTULO[forma], ids });
  if (Object.hasOwn(a, 'faces')) anotar('faces', contarIds(a.faces));
  if (Object.hasOwn(a, 'vs')) anotar('vs', contarIds(a.vs));
  if (Object.hasOwn(a, 'pontos')) anotar('pontos', contarPontos(a.pontos));
  if (Object.hasOwn(a, 'de') && !origemEstrutural(a.de)) anotar('mesclaDe', contarIds(a.de));
  /* TODA chave que carrega SELEÇÃO conta, não só `sel`. O `encostar` tem dois
     lados — `sel` move e `referencia` fica parada —, e as duas falam a mesma
     língua. Contar apenas `sel` deixaria `referencia:{f:[3,4]}` passar invisível,
     que é exatamente a cegueira do MEDIA-5 reaberta por uma porta nova: o gate
     afirmaria cobrir seleção e cobriria metade dela. */
  for (const chave of ['sel', 'referencia']) {
    const selecao = a[chave];
    if (!objetoPlano(selecao)) continue;
    if (Object.hasOwn(selecao, 'v')) anotar('selV', contarIds(selecao.v));
    if (Object.hasOwn(selecao, 'f')) anotar('selF', contarIds(selecao.f));
  }
  return achados;
}

/**
 * As ocorrências de uma LISTA de passos, cada uma já com o índice do passo:
 * `[{ passo, forma, rotulo, ids }]`. O gate usa esta forma para apontar o passo
 * culpado e somar a mesma medida.
 */
export function ocorrenciasPosicionais(passos) {
  const achados = [];
  if (!Array.isArray(passos)) return achados;
  passos.forEach((passo, indice) => {
    for (const o of ocorrenciasDoPasso(passo)) achados.push({ passo: indice, ...o });
  });
  return achados;
}

/** Uma linha por ocorrência, legível para quem está usando: `passo 10: faces:[ids]`. */
export function rotularOcorrencias(ocorrencias) {
  return ocorrencias.map((o) => `passo ${o.passo}: ${o.rotulo}`);
}

/**
 * Contagem por forma numa lista de PASSOS — a medida que o gate congela.
 * Estrutural, não textual: um comentário citando `faces:` não conta, e um passo
 * montado por helper conta.
 */
export function contarIdCru(passos) {
  const uso = { faces: 0, selV: 0, selF: 0, vs: 0, pontos: 0, mesclaDe: 0 };
  for (const o of ocorrenciasPosicionais(passos)) uso[o.forma] += o.ids;
  return uso;
}

export const totalDe = (uso) => FORMAS.reduce((s, k) => s + uso[k], 0);
export const detalheDe = (uso) => FORMAS.filter((k) => uso[k] > 0).map((k) => `${uso[k]}× ${ROTULO[k]}`).join(', ');
