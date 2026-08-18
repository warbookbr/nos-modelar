/* executor.js — orquestra núcleo, adaptador e animação sem duplicar execução. */
import { nucleo } from './nucleo.js';
import { adaptarV3 } from './adaptador.js';
import { bindPoseOssos, montarAnimar } from './animacao.js';

/* ----------------------------------------------------------------------------
   API pública que a PEÇA usa.
---------------------------------------------------------------------------- */
/* executar: roda a lista e devolve o objeto pronto pro visor
   ({lotes:[{mesh:{v}, tex, matriz, ...params-de-material}], animar?, camera}). É núcleo
   + adaptador. MATERIAIS (12a) e ANIMACOES (13a) são dados da peça, como PARAMS/TOPO —
   vêm por ÚLTIMO e opcionais: {} deixa toda peça sem material com UM lote só (byte-idêntico
   ao 11a) e ANIMACOES vazio -> `animar` undefined -> o render vê `peca.animar||null`=null
   -> byte-idêntico (nenhuma peça de hoje anima). Cada lote ganha a SUA identidade (não uma
   compartilhada) pra a animação sobrescrever o lote certo sem alias; `animar` casa
   parte<->lote por ÍNDICE via `infoPorLote`, PARALELO aos lotes que o render vai mapear. */
export function executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS = {}, ANIMACOES = {}, ESQUELETO = null, ALIASES = []) {
  const neutro = nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, ESQUELETO, ALIASES);
  if (!ctx || !ctx.tex || !ctx.tex.texCanvas) throw new Error('oficina.executar precisa de ctx {tex,...} do motor v3');
  if (neutro.orfaos.length && typeof console !== 'undefined') console.warn(`oficina: ${neutro.orfaos.length} órfão(s) —`, neutro.orfaos);
  const { lotes, tex, atlas, partes, esqueleto } = adaptarV3(neutro, ctx, MATERIAIS);
  const infoPorLote = lotes.map((L) => L.parte || null);   // PARALELO aos lotes (mesma ordem que o render mapeia)
  const animar = montarAnimar(ANIMACOES, infoPorLote, partes, esqueleto);   // 14a: esqueleto resolvido -> trilhas de OSSO viram L.ossos
  const ident = () => (ctx.m4 ? ctx.m4.ident() : undefined);
  /* 14a: lote skinado nasce na BIND POSE (L.ossos = N identidades) — o render sobe isso
     e a peça renderiza em repouso mesmo SEM `animar`. Com `animar`, ele sobrescreve por
     quadro. Lote sem esqueleto não ganha L.ossos (o render nem olha). */
  /* `atlas` (tamanho de célula/gutter do atlas por face, D-90) sai ANEXADO ao retorno —
     campo NOVO, ninguém que já lia {lotes,animar,camera} quebra. É pra ferramenta de
     auditoria (detector-de-banding) saber o tamanho de CÉLULA sem duplicar o número
     mágico ATLAS_TILE num segundo lugar; a peça/render seguem ignorando o campo. */
  return { lotes: lotes.map((L) => ({ ...L, tex, matriz: ident(), ...(L.esqueleto ? { ossos: bindPoseOssos(L.nOssos) } : {}) })), animar, camera: { e: 1.05, r: 2.9 }, atlas };
}

/* colisaoDe: SÓ a geometria (sem adaptador/textura/pincel) -> descritor de
   colisão encaixado na malha FINAL (depois das extrusões). Roda no CARREGAMENTO
   do módulo, então é barato e tem um dono só (nada de número medido e guardado).
   Encaixa nas faces `solido` se houver; senão, na malha toda. */
export function colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS = {}, ALIASES = []) {
  const { V, F } = nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, null, ALIASES);
  let ids = new Set();
  for (const f of F.values()) if (f.solido) for (const v of f.vs) ids.add(v);
  if (!ids.size) ids = new Set(V.keys());
  let raio = 0, minY = Infinity, maxY = -Infinity;
  for (const v of ids) { const p = V.get(v); if (!p) continue; raio = Math.max(raio, Math.hypot(p[0], p[2])); if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  if (!Number.isFinite(minY)) { minY = 0; maxY = 0; }
  return { forma: 'cilindro', raio, altura: maxY - minY, base: minY };
}

