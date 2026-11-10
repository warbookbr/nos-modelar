/* empilhadeira/alca — as duas alças de acesso da empilhadeira, uma atrás de cada coluna da frente do protetor, numa peça rígida presa
 * ao protetor.
 *
 * Etapa da montagem `../../montagem.json` depois do escape (fatia 7 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`, com os
 * acessórios do item 7 das partes do `../../ALINHAMENTO.md`). A alça é rígida com o protetor e só toca nele; o protetor está com o crítico
 * e não a recebe, e a alça vira esta peça, presa a ele por posição. A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com uma exceção: os braços, que no rascunho
 * iam até o eixo da coluna e entravam 35 mm nela, acabam na borda de trás do protetor: a face de trás da coluna e, no braço de cima, o
 * contorno da concordância que o perfil do teto ganhou depois do rascunho (de y 1.790 para cima), 0,2 mm atrás dela. O rascunho chama
 * `montarAlca` daqui.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). Na lateral a coluna da frente engrossa das linhas 265 a 110 (y 1.166 a 1.831) até px 486 na
 * linha 140, 60 mm atrás da face de trás dela: um tubo de 30 mm paralelo à coluna, 110 mm atrás do eixo dela, de y 1.180 a 1.820, com
 * dois braços de 30 mm até ela, de x 450 a 485, dentro da largura da coluna (que vai de 440 a 500 ali). A coluna, o eixo e a face de
 * trás dela são os da receita do protetor (`derivar`).
 *
 * O ENCAIXE. A origem é a da máquina. A montagem põe a alça pela porta `bracoEsquerdo` (o plano do fim dos braços, paralelo à face de
 * trás da coluna da frente esquerda, com a normal para a frente) na porta `apoioDaAlcaEsquerda` do protetor, com o afastamento de 0,2
 * mm da folga, e a pose sai identidade; a alça direita vai na mesma pose rígida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarAlca` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';
import { derivar as derivarProtetor } from '../../protetor/receita.js';

export const TABELA = {
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { escuro: CARCACA.cores.escuro },
  /* O tubo de 30 mm, 110 mm atrás do eixo da coluna da frente (35 da meia seção dela e 75 de vão), de y 1.180 a 1.820; os braços de 30
     mm de altura em cada ponta, de 10 mm dentro do tubo à face de trás da coluna; de x 450 a 485, um de cada lado. */
  alca: { y: [1180, 1820], atrasDoEixo: 110, meia: 15, dentroDoTubo: 10, x: [450, 485] },
  /* O fim de cada braço: a borda de trás do protetor na altura dele, de lado, 0,2 mm atrás dela na normal da face de trás da coluna
     (0,207 na horizontal; com o arredondamento de 0,1 mm dos vértices das extrusões, de 0,16 a 0,26). A borda é a face de trás da coluna da frente e, onde o perfil do teto desce atrás dela (a
     concordância da dobra, de y 1.790 para cima), o contorno desse perfil. A margem é também o afastamento da posição na montagem. */
  fimDoBraco: { margem: 0.2 },
};

const m = (mm) => mm / 1000;

/** A faixa de largura 2h em volta do caminho [z, y]: a seção constante de um tubo ao longo dele, vista de lado. */
function faixa(caminho, h) {
  const esq = []; const dir = [];
  caminho.forEach((p, i) => {
    const a = caminho[Math.max(0, i - 1)]; const b = caminho[Math.min(caminho.length - 1, i + 1)];
    const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t);
    const n = [-t[1] / l, t[0] / l];
    esq.push([p[0] + n[0] * h, p[1] + n[1] * h]); dir.push([p[0] - n[0] * h, p[1] - n[1] * h]);
  });
  return [...esq, ...dir.reverse()];
}

/** Os perfis de lado e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const P = derivarProtetor();
  const A = T.alca;
  const zAlca = (y) => P.zEixoFrente(y) - A.atrasDoEixo;
  const ladoTubo = faixa(A.y.map((y) => [zAlca(y), y]), A.meia);
  /* a margem medida na normal da face de trás da coluna, levada à horizontal */
  const recebe = P.portas.apoioDaAlcaEsquerda;
  const margemEmZ = T.fimDoBraco.margem / Math.abs(recebe.normal[2]);
  /* a borda de trás do protetor na altura y, de lado: a face de trás da coluna ou, mais atrás dela, o contorno do perfil do teto */
  const arestas = P.perfilTeto.map((a, i) => [a, P.perfilTeto[(i + 1) % P.perfilTeto.length]]);
  const noPerfil = (y) => arestas.filter(([a, b]) => (a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]).map(([a, b]) => a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
  const borda = (y) => Math.min(P.zTrasFrente(y), ...noPerfil(y));
  /* os pontos do fim do braço de y0 a y1: as pontas, os vértices do perfil entre elas e onde o perfil cruza a face da coluna */
  const fimDoBraco = (y0, y1) => {
    const ys = new Set([y0, y1, ...P.perfilTeto.map(([, y]) => y).filter((y) => y > y0 && y < y1)]);
    for (const [a, b] of arestas) {
      const fa = a[0] - P.zTrasFrente(a[1]); const fb = b[0] - P.zTrasFrente(b[1]);
      if (fa * fb < 0) { const t = fa / (fa - fb); const y = a[1] + (b[1] - a[1]) * t; if (y > y0 && y < y1) ys.add(y); }
    }
    return [...ys].sort((p, q) => p - q).map((y) => [borda(y) - margemEmZ, y]);
  };
  const bracos = A.y.map((y) => [[zAlca(y) + A.dentroDoTubo, y - A.meia], ...fimDoBraco(y - A.meia, y + A.meia), [zAlca(y) + A.dentroDoTubo, y + A.meia]]);
  const portas = {
    bracoEsquerdo: { forma: 'plano', papel: 'apoia', ponto: recebe.ponto.map((v, k) => v + recebe.normal[k] * T.fimDoBraco.margem), normal: recebe.normal.map((v) => (v === 0 ? 0 : -v)), extensao: recebe.extensao, referencia: recebe.referencia },
  };
  return { ladoTubo, bracos, portas };
}

/** Monta as duas alças no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem delas. */
export function montarAlca(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const emX = (s, [a, b]) => (s > 0 ? [a, b] : [-b, -a]);
  /* de cada lado, o tubo e os dois braços de lado, extrudados em x */
  const alcas = unir(...[1, -1].map((s) => unir(extX(D.ladoTubo, ...emX(s, T.alca.x)), ...D.bracos.map((b) => extX(b, ...emX(s, T.alca.x))))));
  parte('alcas', alcas, T.cores.escuro);
  return { alcas };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
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

export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/alca', desc: 'as duas alças de acesso da empilhadeira, atrás das colunas da frente do protetor do operador' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'as alças de acesso de uma empilhadeira de contrapeso de 2,5 t: um tubo de 30 mm atrás de cada coluna da frente do protetor, paralelo a ela, preso por dois braços, numa peça rígida presa ao protetor',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'altura da alça, do braço de baixo ao de cima (rascunho, pela lateral)', milimetros: 670 },
    partes: [
      { nome: 'alcas', forma: 'de cada lado, um tubo escuro de 30 mm paralelo à coluna da frente, 110 mm atrás do eixo dela, de y 1.180 a 1.820, com dois braços de 30 mm até a face de trás dela, de x 450 a 485', tecnica: 'faixa lateral e quadriláteros extrudados em x, unidos, de cada lado' },
    ],
    criteriosDeReprovacao: [
      'a alça solta da coluna da frente do protetor, ou entrando nela',
      'a alça fora da largura da coluna, ou não paralela a ela',
      'uma alça só, ou as duas do mesmo lado',
      'cor trocada: a alça laranja ou cinza claro',
    ],
  },
  contatos: CONTATOS,
  /* O extremo de baixo, de trás e da direita: o braço de baixo e o canto de baixo do tubo da direita, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const { ladoTubo } = derivar(T);
    return [{ nome: 'alça da direita, embaixo e atrás', parte: 'alcas', medida: 'minimo', em: [-T.alca.x[1], T.alca.y[0] - T.alca.meia, Math.min(...ladoTubo.map(([z]) => z))], toleranciaMm: 0.5 }];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
