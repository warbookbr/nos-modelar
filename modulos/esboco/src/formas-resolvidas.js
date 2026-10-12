/* As formas de uma opção do esboço como dado puro: parâmetros, componentes, simetria, arranjo e relações já viram centro,
   medida e matriz em milímetro de mundo. Quem consome (o tradutor do andaime da forma global, em `src/autoria`) lê este
   JSON e não importa o módulo. Não desenha, não lê nem grava arquivo e não muda nada do que o módulo desenha: resolve a
   opção pelo mesmo `resolverOpcao` do desenho e só copia o resultado, sem objeto de classe, função nem referência circular
   (`JSON.parse(JSON.stringify(x))` devolve um valor igual). O formato está descrito no README, em "Formas resolvidas". */
import { ancorasDe, ErroDeEsboco, resolverOpcao } from './index.js';
import { expandirEsboco } from './expandir.js';
import { unidadesDeclaradas } from './contato.js';
import { lerPlano } from './plano.js';
import { cascoEmSecoes } from './malha.js';

export const FORMATO_DAS_FORMAS = 'mecanifica.formas-resolvidas@1';

const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const casa = (padrao, id) => new RegExp(`^${padrao.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(id);
const limpo = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

/* Copia profunda só de JSON: número finito (o -0 vira 0), texto, booleano, nulo, lista e objeto simples. O que não é
   isso (função, classe, NaN, infinito) é erro: o dado não sai impuro por acidente. `undefined` num objeto some. */
function puro(v, onde) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    exigir(Number.isFinite(v), `formasResolvidas: ${onde} não é um número finito (${v})`);
    return v + 0;
  }
  if (Array.isArray(v)) return v.map((x, i) => puro(x, `${onde}[${i}]`));
  exigir(objeto(v) && Object.getPrototypeOf(v) === Object.prototype, `formasResolvidas: ${onde} não é um dado simples (${typeof v})`);
  const saida = {};
  for (const [k, x] of Object.entries(v)) if (x !== undefined) saida[k] = puro(x, `${onde}.${k}`);
  return saida;
}

const caixaDe = (r) => ({ min: [...r.min], max: [...r.max] });
const matrizDe = (r) => (r.matriz ? r.matriz.map((linha) => linha.map(limpo)) : [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
const somaCentro = (r, q) => q.map((c, i) => c + r.centro[i]);

/* A seção de um loft ou de uma casca como o motor a guarda: `w` e o contorno em coordenadas locais, centradas na forma;
   o contorno leva um terceiro valor por ponto quando a seção está inclinada. */
const secaoDe = (sc, extra = {}) => ({ w: sc.w, ...extra, ...(sc.n ? { n: sc.n } : {}), perfil: sc.perfil });

function casca(pr) {
  if (!pr.casca) return undefined;
  const c = pr.casca;
  return {
    espessura: c.espessura,
    aberta: c.aberta,
    /* o plano `w` em que o fundo termina; a cavidade acompanha as seções da parede */
    fundoAte: c.wc,
    cavidade: c.cavidade.map((sc) => secaoDe(sc)),
  };
}

/* O que cada tipo tem de próprio, em números. As medidas ficam no referencial local da forma (a origem é o centro e os
   eixos são os de mundo antes da `matriz`); o mundo é `centro + matriz · local`. */
function geometriaDoTipo(r) {
  const f = r.forma;
  const pr = r.prisma;
  const eixo = pr ? EIXOS[pr.b.e] : undefined;
  switch (f.tipo) {
    case 'cilindro':
      return { eixo, diametro: f.diametro, comprimento: pr.comprimento, ...(f.lados !== undefined ? { lados: f.lados } : {}), ...(f.achatado ? { achatado: { lado: f.achatado.lado, profundidade: f.achatado.profundidade } } : {}) };
    case 'anel':
      return { eixo, diametroExterno: f.diametroExterno, diametroInterno: f.diametroInterno, espessura: f.espessura, ...(f.lados !== undefined ? { lados: f.lados } : {}) };
    case 'caixa': {
      const furos = Array.isArray(f.furos) ? f.furos : (objeto(f.furo) ? [f.furo] : []);
      return {
        eixo, largura: f.largura, altura: pr.comprimento, profundidade: f.profundidade,
        ...(f.raio !== undefined ? { raio: f.raio } : {}),
        ...(f.chanfro !== undefined ? { chanfro: f.chanfro } : {}),
        ...(furos.length > 0 ? { furos: furos.map((o) => ({ diametro: o.diametro, centro: o.centro ?? [0, 0] })) } : {}),
      };
    }
    case 'cone':
      return { eixo, diametro: f.diametro, diametroTopo: f.diametroTopo ?? 0, comprimento: pr.comprimento };
    case 'esfera':
      return { diametro: f.diametro };
    case 'extrusao':
      /* o contorno já centrado na caixa dele (ou na origem do perfil, com `origem: "perfil"`), anti-horário */
      return { eixo, eixosDoPerfil: [EIXOS[pr.b.u], EIXOS[pr.b.v]], comprimento: pr.comprimento, convexo: pr.naoConvexo !== true, perfil: pr.perfil };
    case 'loft': {
      const declaradas = Array.isArray(f.secoes) ? f.secoes : [];
      return {
        eixo, eixosDoPerfil: [EIXOS[pr.b.u], EIXOS[pr.b.v]], comprimento: pr.comprimento,
        secoes: pr.secoes.map((sc, i) => secaoDe(sc, {
          ...(objeto(declaradas[i]) && typeof declaradas[i].nome === 'string' ? { nome: declaradas[i].nome } : {}),
          ...(objeto(declaradas[i]) && Array.isArray(declaradas[i].inclinacao) && declaradas[i].inclinacao.some((x) => x !== 0) ? { inclinacao: declaradas[i].inclinacao } : {}),
        })),
        ...(pr.casca ? { casca: casca(pr) } : {}),
      };
    }
    case 'revolucao': {
      const declarados = Array.isArray(f.perfil) ? f.perfil : [];
      return {
        eixo, comprimento: pr.comprimento, lados: pr.secoes[0].perfil.length,
        /* cada ponto do perfil: o raio e a altura ao longo do eixo, esta relativa ao centro da forma */
        perfil: pr.secoes.map((sc, i) => ({ raio: Array.isArray(declarados[i]) ? declarados[i][0] : declarados[i].raio, altura: sc.w, ...(objeto(declarados[i]) && typeof declarados[i].nome === 'string' ? { nome: declarados[i].nome } : {}) })),
      };
    }
    case 'tubo':
      return { diametro: f.diametro, raioCurva: f.raioCurva ?? 0, caminho: r.caminho.map((q) => somaCentro(r, q)), trilha: { pontos: r.trilha.pontos.map((q) => somaCentro(r, q)), fechado: r.trilha.fechado } };
    case 'familia': {
      /* a superfície da família não é nenhum dos sólidos acima: sai o que a identifica (família, perfil, ajustes, partes e volume) e o
         casco por seções perpendiculares ao eixo principal, que é o que um consumidor de blocos (a N2) consegue ler. As portas da
         família são as âncoras da forma (`ancoras`). */
      const m = pr.malha;
      return {
        familia: f.familia, ...(f.perfil === undefined ? {} : { perfil: f.perfil }), parametros: f.parametros ?? {},
        partes: m.partes.map((p) => p.nome).filter(Boolean), volume: m.volume,
        extensao: [0, 1, 2].map((e) => m.caixa.max[e] - m.caixa.min[e]), ...cascoEmSecoes(m),
      };
    }
    case 'envolve':
      return { largura: f.largura, espessura: f.espessura, fechado: f.fechado ?? true, trilha: { pontos: r.trilha.pontos.map((q) => somaCentro(r, q)), fechado: r.trilha.fechado } };
    default:
      throw new ErroDeEsboco(`formasResolvidas: o tipo "${f.tipo}" da forma "${r.id}" não tem exportação`);
  }
}

/* As âncoras que o desenho dá a uma forma, sem as seis faces da caixa (que saem de `caixa`): centro, as pontas do eixo e
   as seções, pontos do perfil ou pontos-guia nomeados. */
function ancorasDaForma(r) {
  const todas = ancorasDe(r);
  return Object.fromEntries(Object.entries(todas).filter(([nome]) => !LADOS.includes(nome)));
}

/* O nome do componente (`usa`) de cada instância, lido do esboço bruto da opção. Uma instância espelhada tem o nome da fonte. */
function componentesDaOpcao(brutas) {
  const porId = new Map((brutas ?? []).filter((f) => objeto(f) && typeof f.id === 'string').map((f) => [f.id, f]));
  const nomeDe = (id, vistos = new Set()) => {
    const f = porId.get(id);
    if (!f || vistos.has(id)) return undefined;
    vistos.add(id);
    return typeof f.usa === 'string' ? f.usa : nomeDe(f.espelha?.forma, vistos);
  };
  return nomeDe;
}

/* O que a forma veio de ser: componente, espelho, arranjo ou ligação. Nulo quando foi escrita à mão, solta. */
function origemDe(r, bruta, usaDe) {
  const f = r.forma;
  const instancia = bruta?.daInstancia ?? f.daInstancia;
  const origem = {
    ...(instancia ? { componente: { instancia: instancia.id, principal: instancia.principal === true, ...(usaDe(instancia.id) !== undefined ? { usa: usaDe(instancia.id) } : {}) } } : {}),
    ...(f.espelha ? { espelho: { forma: f.espelha.forma, eixo: f.espelha.eixo, pos: f.espelha.pos ?? 0 } } : {}),
    ...(f.arranjoDe ? { arranjo: f.arranjoDe } : {}),
    ...(bruta?.daLigacao ? { ligacao: bruta.daLigacao } : {}),
  };
  return Object.keys(origem).length > 0 ? origem : null;
}

/* A opção `opcao` do esboço (o número a partir de 1, como nas mensagens do módulo, ou o título dela) como dado puro.
   Aceita o esboço escrito ou já expandido e não o altera. */
export function formasResolvidas(esboco, opcao = 1) {
  exigir(objeto(esboco) && Array.isArray(esboco.opcoes) && esboco.opcoes.length > 0, 'formasResolvidas: o esboço precisa de "opcoes": [{ titulo, nota, formas }]');
  const expandido = expandirEsboco(esboco);
  const indice = typeof opcao === 'string'
    ? expandido.opcoes.findIndex((o) => o?.titulo === opcao)
    : opcao - 1;
  exigir(Number.isInteger(indice) && indice >= 0 && indice < expandido.opcoes.length,
    `formasResolvidas: a opção ${JSON.stringify(opcao)} não existe (o esboço tem ${expandido.opcoes.length}: número de 1 a ${expandido.opcoes.length} ou o título${expandido.opcoes.some((o) => o?.titulo) ? `, um de ${expandido.opcoes.map((o) => JSON.stringify(o.titulo)).join(', ')}` : ''})`);
  const o = expandido.opcoes[indice];
  const rotulo = `opção ${indice + 1}${o.titulo ? ` (${o.titulo})` : ''}`;
  const resolvidas = resolverOpcao(o, rotulo, expandido.pontos);
  const brutas = new Map((o.formas ?? []).filter((f) => objeto(f) && typeof f.id === 'string').map((f) => [f.id, f]));
  const brutasDoEscrito = esboco.opcoes[indice]?.formas ?? esboco.formas;
  const usaDe = componentesDaOpcao(brutasDoEscrito);
  const unidadeDe = unidadesDeclaradas(o.formas);
  const pecas = (lerPlano(expandido.plano)?.pecas ?? []).filter((p) => p.opcoes === undefined || p.opcoes.some((q) => q === o.titulo || q === indice + 1));
  const parteDe = (r) => pecas.find((p) => p.formas.some((q) => (q.includes('*') ? casa(q, r.id) : (r.id === q || brutas.get(r.id)?.daInstancia?.id === q))))?.nome ?? null;
  const pontos = { ...(expandido.pontos ?? {}), ...(o.pontos ?? {}) };
  /* a haste entre dois pontos (`de`/`para`) e as cópias dela (o `haste` do desenho só marca cilindro e caixa) */
  const ehHaste = (id, vistos = new Set()) => {
    const b = brutas.get(id);
    if (!b || vistos.has(id)) return false;
    vistos.add(id);
    if (b.de !== undefined) return b.tipo !== 'tubo';
    const fonte = b.espelha?.forma ?? b.arranjoDe?.fonte;
    return fonte !== undefined && ehHaste(fonte, vistos);
  };

  const formas = resolvidas.map((r) => {
    const bruta = brutas.get(r.id);
    const haste = r.haste === true || ehHaste(r.id);
    return {
      id: r.id,
      tipo: r.forma.tipo,
      oculto: r.forma.oculto === true,
      ...(r.forma.cor !== undefined ? { cor: r.forma.cor } : {}),
      ...(r.forma.rotulo !== undefined ? { rotulo: r.forma.rotulo } : {}),
      ...(r.forma.opacidade !== undefined ? { opacidade: r.forma.opacidade } : {}),
      unidade: unidadeDe.get(r.id) ?? null,
      parte: parteDe(r),
      origem: origemDe(r, bruta, usaDe),
      geometria: {
        centro: r.centro,
        caixa: caixaDe(r),
        matriz: matrizDe(r),
        ...(haste ? { haste: true } : {}),
        ...geometriaDoTipo(r),
        ancoras: ancorasDaForma(r),
      },
    };
  });

  return puro({
    formato: FORMATO_DAS_FORMAS,
    opcao: { numero: indice + 1, ...(o.titulo ? { titulo: o.titulo } : {}) },
    parametros: o.parametros ?? {},
    pontos,
    formas,
  }, 'formas');
}
