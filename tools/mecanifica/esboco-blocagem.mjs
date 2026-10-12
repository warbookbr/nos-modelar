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

/* O tradutor com o que a inclinação deforma demais fora do andaime: as formas cuja perda `inclinacao` passa do limite viram
   `naoTraduzidas`, e o andaime é refeito sem elas. */
function traduzirSemInclinacaoExcessiva(dados) {
  const traducao = traduzirFormasParaAndaime(dados);
  const excessivas = traducao.perdas.filter((p) => p.perdido.some((d) => d.codigo === 'inclinacao') && Math.abs((p.erroVolumeExterno ?? p.erroVolume).relativo) > MUDANCA_MAXIMA_POR_INCLINACAO);
  if (excessivas.length === 0) return traducao;
  const ids = new Set(excessivas.map((p) => p.id));
  const refeita = traduzirFormasParaAndaime({ ...dados, formas: dados.formas.map((f) => (ids.has(f.id) ? { ...f, oculto: true } : f)) });
  const recusadas = excessivas.map((p) => ({
    id: p.id, tipo: p.tipo,
    motivo: `a seção inclinada da ponta, levada ao plano perpendicular ao eixo, muda o volume em ${Math.round(Math.abs((p.erroVolumeExterno ?? p.erroVolume).relativo) * 1000) / 10}% (o limite é ${MUDANCA_MAXIMA_POR_INCLINACAO * 100}%), e a N2 não inclina a seção`,
  }));
  return { ...refeita, naoTraduzidas: [...refeita.naoTraduzidas, ...recusadas], ocultas: refeita.ocultas.filter((id) => !ids.has(id)) };
}

/* A opção `numero` do esboço traduzida e compilada: { dados, traducao, blocagem, formasDe }. */
export function blocagemDaOpcao(bruto, numero = 1) {
  const dados = formasResolvidas(bruto, numero);
  let traducao;
  try {
    traducao = traduzirSemInclinacaoExcessiva(dados);
  } catch (e) {
    if (e instanceof ErroDoTradutor) throw new ErroDeEsboco(`--nivel-zero: a opção ${numero} não tem blocagem: ${e.message}`);
    throw e;
  }
  const blocagem = compilarAndaime(traducao.andaime);
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
