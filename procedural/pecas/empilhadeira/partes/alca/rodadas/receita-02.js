/* empilhadeira/alca — as duas alças de acesso da empilhadeira, uma atrás de cada coluna da frente do protetor, numa peça rígida presa
 * ao protetor.
 *
 * Etapa da montagem `../../montagem.json` depois do escape (fatia 7 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`, com os
 * acessórios do item 7 das partes do `../../ALINHAMENTO.md`). A alça é rígida com o protetor e só toca nele; o protetor está com o crítico
 * e não a recebe, e a alça vira esta peça, presa a ele por posição. A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), com três mudanças da rodada 1 do crítico e do encaixe: o tubo é redondo, de Ø 30,
 * varrido num trilho só com curvas de raio 30 nos cantos (no rascunho, perfis quadrados extrudados); os braços, que no rascunho iam até
 * o eixo da coluna e entravam 35 mm nela, são perpendiculares à face de trás dela e acabam 0,2 mm antes, com a tampa paralela à face;
 * e o braço de cima desce de y 1.820 para logo abaixo de onde a concordância do perfil do teto (que o protetor ganhou depois do
 * rascunho) sai de trás da face da coluna. O rascunho chama `montarAlca` daqui.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). Na lateral a coluna da frente engrossa das linhas 265 a 110 (y 1.166 a 1.831) até px 486 na
 * linha 140, 60 mm atrás da face de trás dela: um tubo de 30 mm paralelo à coluna, 110 mm atrás do eixo dela, com dois braços até ela,
 * de x 450 a 485, dentro da largura da coluna (que vai de 440 a 500 ali). A coluna, o eixo, a face de trás dela e o perfil do teto são
 * os da receita do protetor (`derivar`).
 *
 * O ENCAIXE. A origem é a da máquina. A montagem põe a alça pela porta `bracoEsquerdo` (o plano das tampas dos braços, paralelo à face de
 * trás da coluna da frente esquerda, com a normal para a frente) na porta `apoioDaAlcaEsquerda` do protetor, com o afastamento de 0,2
 * mm da folga, e a pose sai identidade; a alça direita vai na mesma pose rígida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula o trilho, a seção e a porta em mm; `montarAlca` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';
import { derivar as derivarProtetor } from '../../protetor/receita.js';
import { gaiolaVarrida } from '../../../../../nucleo/gaiola-varrida.js';

export const TABELA = {
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { escuro: CARCACA.cores.escuro },
  /* Lados da seção redonda do tubo. */
  lados: 24,
  /* O TUBO de Ø 30, em x 467,5 (o meio dos 450 a 485 do rascunho), um de cada lado: o braço de baixo em y 1.180, perpendicular à face de
     trás da coluna da frente; a curva de raio 30; o trecho paralelo à coluna, com o eixo 110 mm atrás do eixo dela na horizontal; a
     curva de cima; e o braço de cima de volta à face. O braço de cima fica abaixo de onde a concordância do perfil do teto sai de trás
     da face da coluna (y 1.803,7 hoje), com o tubo 4 mm abaixo dela: no rascunho ele ia em y 1.820, e o perfil do teto ganhou depois a
     concordância, que o braço cruzaria. Estações a cada 40 mm nas retas e oito em cada curva. */
  alca: { x: 467.5, yDeBaixo: 1180, raio: 15, atrasDoEixo: 110, raioDaCurva: 30, abaixoDaConcordancia: 4, estacoes: { passo: 40, naCurva: 8 } },
  /* O fim de cada braço: a tampa do tubo, paralela à face de trás da coluna e 0,2 mm atrás dela, na normal. A margem é também o
     afastamento da posição na montagem. */
  fimDoBraco: { margem: 0.2 },
};

const m = (mm) => mm / 1000;
const soma = (a, b) => a.map((v, k) => v + b[k]);
const esc = (a, k) => a.map((v) => v * k);

/** O trilho de cada lado, a seção e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const P = derivarProtetor();
  const A = T.alca; const R = A.raioDaCurva;
  const recebe = P.portas.apoioDaAlcaEsquerda;
  const nb = recebe.normal;                                              // para trás e para baixo, saindo da face da coluna
  const lc = Math.hypot(P.INCL, 1); const c = [0, 1 / lc, P.INCL / lc];  // ao longo da coluna, para cima
  /* onde a concordância do perfil do teto sai de trás da face da coluna, e o braço de cima abaixo dela */
  const arestas = P.perfilTeto.map((a, i) => [a, P.perfilTeto[(i + 1) % P.perfilTeto.length]]);
  const saidas = arestas.map(([a, b]) => [a[0] - P.zTrasFrente(a[1]), b[0] - P.zTrasFrente(b[1]), a, b]).filter(([fa, fb]) => fa * fb < 0)
    .map(([fa, fb, a, b]) => a[1] + (b[1] - a[1]) * fa / (fa - fb));
  const yConcordancia = Math.min(...saidas);
  const yDeCima = yConcordancia - A.raio * c[1] - A.abaixoDaConcordancia;
  /* a face de trás na altura y, o ponto na face e a distância do eixo do tubo à face, na normal */
  const naFace = (x, y) => [x, y, P.zTrasFrente(y)];
  const d = (P.zEixoFrente(A.yDeBaixo) - A.atrasDoEixo - P.zTrasFrente(A.yDeBaixo)) * nb[2];
  const arco = (de, centro, para) => {
    /* o giro de +90 ou -90 graus em torno de x que leva `de` a `para` (a regra do arco do trilho) */
    const rad = [0, de[1] - centro[1], de[2] - centro[2]]; const kr = [0, -rad[2], rad[1]];
    const graus = Math.hypot(...soma(centro, kr).map((v, k) => v - para[k])) < 1e-6 ? 90 : -90;
    return { arco: { centro, eixo: [1, 0, 0], de, graus } };
  };
  const trilho = (s) => {
    const x = s * A.x;
    const F0 = naFace(x, A.yDeBaixo); const F1 = naFace(x, yDeCima);
    const P0 = soma(F0, esc(nb, T.fimDoBraco.margem)); const K0 = soma(F0, esc(nb, d));
    const P1 = soma(F1, esc(nb, T.fimDoBraco.margem)); const K1 = soma(F1, esc(nb, d));
    const a0 = soma(K0, esc(nb, -R)); const b0 = soma(K0, esc(c, R)); const a1 = soma(K1, esc(c, -R)); const b1 = soma(K1, esc(nb, -R));
    const L = [Math.hypot(...a0.map((v, k) => v - P0[k])), R * Math.PI / 2, Math.hypot(...a1.map((v, k) => v - b0[k])), R * Math.PI / 2];
    return {
      trilho: [{ reta: { de: P0, ate: a0 } }, arco(a0, soma(a0, esc(c, R)), b0), { reta: { de: b0, ate: a1 } }, arco(a1, soma(a1, esc(nb, -R)), b1), { reta: { de: b1, ate: P1 } }],
      marcos: [L[0], L[0] + L[1], L[0] + L[1] + L[2], L[0] + L[1] + L[2] + L[3]],
    };
  };
  const secao = Array.from({ length: T.lados }, (_, k) => ({ u: A.raio * Math.cos(2 * Math.PI * k / T.lados), v: A.raio * Math.sin(2 * Math.PI * k / T.lados), nome: `l${k}` }));
  const portas = {
    bracoEsquerdo: { forma: 'plano', papel: 'apoia', ponto: recebe.ponto.map((v, k) => v + recebe.normal[k] * T.fimDoBraco.margem), normal: recebe.normal.map((v) => (v === 0 ? 0 : -v)), extensao: recebe.extensao, referencia: recebe.referencia },
  };
  return { trilho, secao, yDeCima, yConcordancia, d, nb, c, portas };
}

/** Monta as duas alças no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem da esquerda. */
export function montarAlca(estado, T = TABELA) {
  const D = derivar(T);
  const { parte } = ferramentas(estado);
  const E = T.alca.estacoes;
  /* de cada lado, o tubo redondo varrido pelo trilho, fechado e tampado, pelo passo `subdivisao` sem nível */
  const tubo = (s) => {
    const { trilho, marcos } = D.trilho(s);
    const g = gaiolaVarrida({ nome: `alca${s > 0 ? 'E' : 'D'}`, trilho, quadro: { u: [1, 0, 0] }, secao: D.secao, fechada: true, tampas: true,
      estacoes: [{ fracao: 0 }, { em: marcos[0] }, { entre: E.naCurva }, { em: marcos[1] }, { passo: E.passo }, { em: marcos[2] }, { entre: E.naCurva }, { em: marcos[3] }, { fracao: 1 }] });
    Object.assign(estado.topo, Object.fromEntries(g.posicoes));
    estado.origem += 1;
    estado.passos.push(['subdivisao', { origemId: estado.origem, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 0 }]);
    const sel = { origem: { op: 'subdivisao', id: estado.origem } };
    parte('alcas', sel, T.cores.escuro);
    return sel;
  };
  const esquerda = tubo(1);
  tubo(-1);
  return { alcas: esquerda };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = {};
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do braço esquerdo. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { alcas } = montarAlca(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  return [...forma, ['publicarPorta', { id: 'bracoEsquerdo', de: alcas.origem, interface: Object.fromEntries(Object.entries(portas.bracoEsquerdo).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]];
}

/** Os pontos nomeados das gaiolas dos tubos, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarAlca(estado, T);
  return Object.fromEntries(Object.entries(estado.topo).map(([nome, p]) => [nome, p.map(m)]));
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/alca', desc: 'as duas alças de acesso da empilhadeira, atrás das colunas da frente do protetor do operador' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'as alças de acesso de uma empilhadeira de contrapeso de 2,5 t: um tubo de 30 mm atrás de cada coluna da frente do protetor, paralelo a ela, preso por dois braços, numa peça rígida presa ao protetor',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'altura da alça, do braço de baixo ao de cima (rascunho, pela lateral)', milimetros: 670 },
    partes: [
      { nome: 'alcas', forma: 'de cada lado, tubo redondo escuro de Ø 30: dois braços perpendiculares à face de trás da coluna da frente, a 0,2 mm dela, e o trecho paralelo à coluna, 110 mm atrás do eixo dela, com curvas de raio 30', tecnica: 'tubo de seção redonda de 24 lados varrido por gaiolaVarrida (retas e arcos), fechado e tampado, um de cada lado' },
    ],
    criteriosDeReprovacao: [
      'a alça solta da coluna da frente do protetor, ou entrando nela',
      'a alça fora da largura da coluna, ou não paralela a ela',
      'uma alça só, ou as duas do mesmo lado',
      'cor trocada: a alça laranja ou cinza claro',
      'o tubo de seção quadrada, ou o canto entre braço e tubo em quina ou chanfro em vez de curva',
    ],
    lataria: { partes: ['alcas'] },
  },
  contatos: CONTATOS,
  /* O extremo de baixo, de trás e da direita, em mm: em x o raio do tubo da direita, e em y e z o da gaiola da direita. */
  get PONTOS() {
    const T = this.PARAMS; const da = Object.entries(gerarTopo(T)).filter(([n]) => n.startsWith('alcaD_')).map(([, p]) => p.map((v) => v * 1000));
    return [{ nome: 'alça da direita, embaixo e atrás', parte: 'alcas', medida: 'minimo', em: [-(T.alca.x + T.alca.raio), Math.min(...da.map((p) => p[1])), Math.min(...da.map((p) => p[2]))], toleranciaMm: 0.5 }];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
