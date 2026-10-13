/* esboco-blocagem.mjs — as vistas do esboço desenhadas pela blocagem do nível zero (`--nivel-zero`).
 *
 * O módulo do esboço desenha formas e não importa o núcleo, e o tradutor de `src/autoria` gera a blocagem e não importa o módulo;
 * este adaptador é o único que liga os dois para a imagem. Traduz cada opção do esboço (formas resolvidas -> andaime -> blocagem
 * N2), guarda a procedência de cada volume (a tabela de nomes do tradutor, id da forma -> id do volume, invertida) e entrega a
 * malha ao desenhista da blocagem do módulo (`desenho-da-blocagem.js`), que desenha as quatro vistas com a oclusão da camada.
 *
 * O isolamento por unidade não refaz o esboço: a mesma blocagem da opção serve, e a unidade escolhe os volumes. Um volume é da
 * unidade quando alguma das formas de que ele veio é membro dela (as unidades são as do estado do Condutor gravado ao lado do
 * esboço ou, sem ele, o Plano de detalhe), e é vizinho quando alguma é uma das formas de outra unidade que a tocam (as mesmas
 * do `--unidade` de sempre), desenhado em contorno claro e translúcido. O que o tradutor não traduz (`naoTraduzidas`) não existe
 * na blocagem e não aparece na imagem; o texto do comando diz quais são. Não desenha corte, explosão, zoom nem prévia. */
import { createHash } from 'node:crypto';
import { ErroDeEsboco } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { planoDeDetalhe, unidadePorNome } from '../../modulos/esboco/src/condutor.js';
import { COR_DO_VIZINHO, OPACIDADE_DO_VIZINHO, detalharUnidade, formasVizinhas } from '../../modulos/esboco/src/detalhe.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { ErroDoTradutor, traduzirFormasParaAndaime } from '../../src/autoria/tradutor-nivel-zero.js';
import { compilarAndaime } from '../../src/autoria/medir-blocagem-nivel-zero.js';
import { furosAbertos } from './esboco-blocagem-furo.mjs';
import './esboco-familias.mjs';

const porExtenso = (ids, n = 8) => `${ids.slice(0, n).join(', ')}${ids.length > n ? ', ...' : ''}`;

/* Os volumes da blocagem de cada forma do esboço (`tabela` invertida): volume -> formas, na ordem das formas resolvidas. */
export function procedenciaDosVolumes(dados, tabela) {
  const formasDe = new Map();
  for (const f of dados.formas) {
    const volume = tabela[f.id];
    if (volume === undefined) continue;
    if (!formasDe.has(volume)) formasDe.set(volume, []);
    formasDe.get(volume).push(f);
  }
  return formasDe;
}

/* A aparência de um volume: a da forma principal do componente que ele recolheu, ou a da primeira forma de que veio. */
function aparenciaDo(formas) {
  const f = formas.find((x) => x.origem?.componente?.principal === true) ?? formas[0];
  return { cor: f.cor, ...(f.opacidade !== undefined ? { opacidade: f.opacidade } : {}) };
}

/* Quanto o sólido externo de um loft de seção inclinada pode mudar de volume, em fração do volume do esboço, para a blocagem o
   desenhar. O tradutor leva a seção inclinada da ponta ao plano perpendicular ao eixo, no ponto mais extremo dela, e declara a
   perda em `perdas`; até aqui a forma continua a mesma (a caçamba do carrinho, 10,1%, na vista de lado fica em 0,9554 de IoU).
   Acima disso a blocagem desenharia outra forma (o teto inclinado da baia do trem principal, 18,3%, deixa a baia 19% maior na vista
   de frente, IoU 0,84), e o loft fica sem equivalente, como o tradutor já faz com a forma que gira em dois eixos. */
export const MUDANCA_MAXIMA_POR_INCLINACAO = 0.15;

/* Quanto o recorte (`subtrai`) pode mudar o envelope da forma, em fração da extensão dela no eixo, para a blocagem levar a forma
   inteira. A N2 não subtrai um volume de outro, e o tradutor leva a forma recortada inteira ao andaime e declara a perda
   `recorte`. Quando o vão fica dentro da forma (a boca de ar do motor, o furo do escape) o envelope é o mesmo, e a diferença que
   sobra é a faceta do tubo (1,4e-4 medido). Quando o recorte tira uma ponta (a asa cortada para a ponta levantada, 1,5% medido
   na asa e 15 vezes a extensão na ponta, que sai do mesmo plano), o andaime ganha volume fora do envelope, o quadro das vistas
   muda e a silhueta inteira se desloca. O limite é o da razão das escalas que o gate confere (1e-3): uma face que passa disso
   desloca o quadro além do que o gate aceita. */
export const MUDANCA_MAXIMA_DO_ENVELOPE_POR_RECORTE = 1e-3;

/* Quanto do furo passante de uma forma de família pode ficar descoberto na vista, em fração da silhueta da blocagem, para a
   blocagem a desenhar. A N2 só tem sólido de seção convexo, e a forma de família entra como o casco das seções dela, que fecha o
   furo (a perda `superficie`); o desenho das formas o deixa aberto, e quem olha ao longo do eixo vê o fundo por ele, no que nenhuma
   outra forma cobre (o eixo cobre só a parte dele). O gate das silhuetas admite 0,2% de diferença (0,998), e as facetas do casco
   ficam com até 0,12% disso (0,9988 medido no chassi de tubos curvos); o furo fica com metade, 0,1%. Medido: o furo do cubo da roda
   do trem do nariz deixa descoberto 0,07% da vista lateral e passa; o da roda do trem principal, 0,6% (0,99144 de IoU na lateral e
   0,99785 na isométrica da unidade), e a roda sai sem equivalente. */
export const MUDANCA_MAXIMA_DA_SILHUETA_POR_FURO = 1e-3;

const emPorcento = (x) => Math.round(Math.abs(x) * 1000) / 10;

/* O tradutor com o que a N2 não representa fora do andaime: as formas cuja perda `inclinacao` passa do limite de volume, e as
   cuja perda `recorte` muda o envelope além do limite, viram `naoTraduzidas` com o motivo, e o andaime é refeito sem elas. A
   forma cujo recorte não muda o envelope continua no andaime inteira, com a perda declarada, e é comparada como antes. `jaRecusadas`
   traz as formas que a medida na blocagem já recusou (o furo descoberto, ver `blocagemDaOpcao`): id -> { tipo, motivo }. */
function traduzirSemPerdaExcessiva(dados, jaRecusadas = new Map()) {
  const traducao = traduzirFormasParaAndaime(dados);
  const motivos = new Map();
  const tipos = new Map();
  const recusar = (p, motivo) => { motivos.set(p.id, [...(motivos.get(p.id) ?? []), motivo]); tipos.set(p.id, p.tipo); };
  for (const [id, r] of jaRecusadas) recusar({ id, tipo: r.tipo }, r.motivo);
  for (const p of traducao.perdas) {
    if (p.perdido.some((d) => d.codigo === 'inclinacao') && Math.abs((p.erroVolumeExterno ?? p.erroVolume).relativo) > MUDANCA_MAXIMA_POR_INCLINACAO) {
      recusar(p, `a seção inclinada da ponta, levada ao plano perpendicular ao eixo, muda o volume em ${emPorcento((p.erroVolumeExterno ?? p.erroVolume).relativo)}% (o limite é ${MUDANCA_MAXIMA_POR_INCLINACAO * 100}%), e a N2 não inclina a seção`);
    }
    if (p.perdido.some((d) => d.codigo === 'recorte') && p.erroEnvelope.relativo > MUDANCA_MAXIMA_DO_ENVELOPE_POR_RECORTE) {
      const quais = dados.formas.find((f) => f.id === p.id)?.geometria.recorte?.cortadores.map((c) => c.id).join(', ');
      recusar(p, `o recorte por ${quais} muda o envelope da forma em ${p.erroEnvelope.mm} mm (${emPorcento(p.erroEnvelope.relativo)}% da extensão no eixo; o limite é ${MUDANCA_MAXIMA_DO_ENVELOPE_POR_RECORTE * 100}%), e a N2 não subtrai um volume de outro: o andaime levaria a forma inteira, fora do envelope`);
    }
  }
  if (motivos.size === 0) return traducao;
  const ids = new Set(motivos.keys());
  const refeita = traduzirFormasParaAndaime({ ...dados, formas: dados.formas.map((f) => (ids.has(f.id) ? { ...f, oculto: true } : f)) });
  const recusadas = [...ids].sort().map((id) => ({ id, tipo: tipos.get(id), motivo: motivos.get(id).join('; ') }));
  return { ...refeita, naoTraduzidas: [...refeita.naoTraduzidas, ...recusadas], ocultas: refeita.ocultas.filter((id) => !ids.has(id)) };
}

/* O painel da opção `numero`, com todos os volumes da blocagem, como o desenho da blocagem o recebe: serve a medir a silhueta que o
   gate compara, no mesmo quadro (título, nota e chave em lista incluídos). */
function painelDaOpcao(bruto, numero, blocagem) {
  const expandido = expandirEsboco(bruto);
  const o = expandido.opcoes[numero - 1];
  return {
    titulo: o.titulo, nota: o.nota, ocultar: o.ocultar ?? expandido.ocultar ?? [],
    lista: (o.legendas ?? expandido.legendas) === 'lista', malha: blocagem.malha, volumes: blocagem.volumes.map((v) => ({ id: v.id, cor: '#999999' })),
  };
}

/* A opção `numero` do esboço traduzida e compilada: { dados, traducao, blocagem, formasDe }. A forma de família cujo furo passante
   fica descoberto na vista além do limite (`MUDANCA_MAXIMA_DA_SILHUETA_POR_FURO`) sai do andaime como `naoTraduzidas`, com o
   motivo: o casco da N2 fecha o furo, e a silhueta da blocagem deixa de ser a do desenho. */
export function blocagemDaOpcao(bruto, numero = 1) {
  const dados = formasResolvidas(bruto, numero);
  const traduzir = (recusadas) => {
    try {
      return traduzirSemPerdaExcessiva(dados, recusadas);
    } catch (e) {
      if (e instanceof ErroDoTradutor) throw new ErroDeEsboco(`--nivel-zero: a opção ${numero} não tem blocagem: ${e.message}`);
      throw e;
    }
  };
  let traducao = traduzir();
  let blocagem = compilarAndaime(traducao.andaime);
  const abertos = furosAbertos({ dados, traducao, blocagem, painel: () => painelDaOpcao(bruto, numero, blocagem) });
  const recusadas = new Map();
  for (const a of abertos) {
    if (a.fracao <= MUDANCA_MAXIMA_DA_SILHUETA_POR_FURO || (recusadas.get(a.id)?.fracao ?? 0) >= a.fracao) continue;
    const forma = dados.formas.find((f) => f.id === a.id);
    recusadas.set(a.id, {
      tipo: forma.tipo, fracao: a.fracao,
      motivo: `o furo passante de ${(2 * forma.geometria.furo.raio).toFixed(1)} mm da forma fica descoberto na vista ${a.vista}, em ${(a.fracao * 100).toFixed(2)}% da silhueta da blocagem (o limite é ${MUDANCA_MAXIMA_DA_SILHUETA_POR_FURO * 100}%), e a N2 só tem sólido de seção convexa: o casco da família fecharia o furo`,
    });
  }
  if (recusadas.size > 0) {
    traducao = traduzir(recusadas);
    blocagem = compilarAndaime(traducao.andaime);
  }
  return { dados, traducao, blocagem, formasDe: procedenciaDosVolumes(dados, traducao.tabela) };
}

/* A unidade `nome` do esboço (o estado do Condutor ou o Plano de detalhe), com a mesma recusa do desenho de sempre. */
function unidadeDe(bruto, estado, nome) {
  detalharUnidade(bruto, estado, nome);
  const todas = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  return todas.find((x) => x.id === unidadePorNome(todas, nome));
}

/* A blocagem do esboço pronta para desenhar: um painel por opção (só a primeira com `unidade`, como o isolamento de sempre) e,
   por painel, os volumes na ordem do desenho com a cor da forma de que vieram. Com `unidade`, só os volumes dela e, com
   `vizinhos`, os das formas de outra unidade que a tocam, em contorno claro. Devolve { paineis, unidade, vizinhos, opcoes,
   texto, hash }; `opcoes` leva, por opção, os volumes, o que ficou sem equivalente e o que foi aproximado. */
export function blocagemDoEsboco(bruto, estado = null, { unidade = null, vizinhos = true } = {}) {
  const expandido = expandirEsboco(bruto);
  const u = unidade === null ? null : unidadeDe(bruto, estado, unidade);
  const membros = new Set(u?.membros ?? []);
  const idsVizinhos = u === null || vizinhos === false ? [] : formasVizinhas(bruto, estado, unidade);
  const deFora = new Set(idsVizinhos);
  const numeros = u === null ? expandido.opcoes.map((_, i) => i + 1) : [1];
  const paineis = [];
  const opcoes = [];
  for (const numero of numeros) {
    const o = expandido.opcoes[numero - 1];
    const { dados, traducao, blocagem, formasDe } = blocagemDaOpcao(bruto, numero);
    const volumes = [];
    for (const v of blocagem.volumes) {
      const formas = formasDe.get(v.id) ?? [];
      if (u === null) { volumes.push({ id: v.id, ...aparenciaDo(formas) }); continue; }
      if (formas.some((f) => membros.has(f.id))) volumes.push({ id: v.id, ...aparenciaDo(formas.filter((f) => membros.has(f.id))) });
      else if (formas.some((f) => deFora.has(f.id))) volumes.push({ id: v.id, cor: COR_DO_VIZINHO, opacidade: OPACIDADE_DO_VIZINHO });
    }
    if (volumes.length === 0) throw new ErroDeEsboco(`--nivel-zero: nenhum volume da blocagem da opção ${numero} é da unidade ${u?.id ?? '(esboço inteiro)'} (as formas dela não se traduzem: ${porExtenso(traducao.naoTraduzidas.map((n) => n.id))})`);
    paineis.push({
      titulo: o.titulo, nota: o.nota, ocultar: o.ocultar ?? expandido.ocultar ?? [],
      lista: (o.legendas ?? expandido.legendas) === 'lista', malha: blocagem.malha, volumes,
    });
    const naUnidade = (id) => u === null || membros.has(id) || deFora.has(id);
    opcoes.push({
      numero, volumes: volumes.length, total: blocagem.volumes.length,
      semEquivalente: traducao.naoTraduzidas.filter((n) => naUnidade(n.id)),
      aproximadas: traducao.perdas.map((p) => p.id), perdas: traducao.perdas,
      tabela: traducao.tabela, dados,
    });
  }
  const hash = createHash('sha256').update(JSON.stringify(paineis)).digest('hex');
  const sem = opcoes.flatMap((o) => o.semEquivalente.map((n) => n.id));
  const texto = `pela blocagem do nível zero (${opcoes.map((o) => `${o.volumes} de ${o.total} volumes`).join(', ')}${opcoes.some((o) => o.aproximadas.length > 0) ? `; aproximado: ${porExtenso([...new Set(opcoes.flatMap((o) => o.aproximadas))])}` : ''}${sem.length > 0 ? `; sem equivalente e fora da imagem: ${porExtenso([...new Set(sem)])}` : ''})`;
  return { paineis, unidade: u, vizinhos: idsVizinhos, opcoes, texto, hash };
}

/* A vista `vista` da blocagem, no formato de `desenharEsboco` (com a camada quando `camada`). */
export function desenharVistaDaBlocagem(blocagem, vista, { camada = true } = {}) {
  return desenharBlocagem({ vista, paineis: blocagem.paineis }, { camada });
}
