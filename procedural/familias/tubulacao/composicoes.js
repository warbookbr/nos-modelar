/* composicoes.js — as composições da família `tubulacao`: o trecho e o tampão por `lathe` da seção fechada, e a curva por
   dois `friso` de seção circular ao longo do arco, o de dentro tirado do de fora por `subtrair`. A parte é `tubo`, `curva` ou
   `tampao`, e a porta `boca` é o anel da entrada, no plano y = 0. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS_DA_SECAO, PONTOS_DO_ARCO, geometriaDaPeca } from './geometria.js';

export const ID_POR_FORMA = Object.freeze({ 1: 'tubulacao.trecho', 2: 'tubulacao.curva', 3: 'tubulacao.tampao', 4: 'tubulacao.te', 5: 'tubulacao.reducao', 6: 'tubulacao.flange', 7: 'tubulacao.valvula-de-esfera', 8: 'tubulacao.valvula-de-gaveta' });
export const LADOS = LADOS_DA_SECAO;
const p = (nome) => ({ parametro: nome });
const sai = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];
const composicao = (id, nomes, nos) => Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai }, nos });
const porta = (de) => ({ id: 'porta-boca', operacao: 'publicarPorta', argumentos: { id: 'boca', de, interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: p('ri'), raioExterno: p('ro'), inicio: 0, fim: p('altura') } } });
const torneada = (id, parte, n) => composicao(id, [['ri', 'numero'], ['ro', 'numero'], ['altura', 'numero'], ...Array.from({ length: n }, (_, k) => [[`r${k}`, 'numero'], [`y${k}`, 'numero']]).flat()], [
  { id: 'corpo', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS, perfil: Array.from({ length: n }, (_, k) => [p(`r${k}`), p(`y${k}`)]) } },
  { id: 'parte', operacao: 'parte', argumentos: { nome: parte, sel: { origem: { op: 'lathe', id: 10 } } } },
  porta({ op: 'lathe', id: 10 }),
]);
const pontos = (prefixo, n) => Array.from({ length: n }, (_, k) => p(`${prefixo}${k}`));
const N = PONTOS_DO_ARCO + 2;
const secao = (prefixo) => Array.from({ length: LADOS_DA_SECAO }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomesDaSecao = (prefixo) => Array.from({ length: LADOS_DA_SECAO }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();
const curva = composicao(ID_POR_FORMA[2], [['ri', 'numero'], ['ro', 'numero'], ['altura', 'numero'], ...Array.from({ length: N }, (_, k) => [`a${k}`, 'vetor3']), ...Array.from({ length: N }, (_, k) => [`d${k}`, 'vetor3']), ...nomesDaSecao('f'), ...nomesDaSecao('i')], [
  { id: 'fora', operacao: 'friso', argumentos: { origemId: 10, linha: { nome: 'fora', pontos: pontos('a', N) }, normal: [0, 0, 1], perfil: secao('f') } },
  { id: 'dentro', operacao: 'friso', argumentos: { origemId: 11, linha: { nome: 'dentro', pontos: pontos('d', N) }, normal: [0, 0, 1], perfil: secao('i') } },
  { id: 'oca', operacao: 'subtrair', argumentos: { origemId: 20, solidos: [{ origem: { op: 'friso', id: 10 } }, { origem: { op: 'friso', id: 11 } }] } },
  { id: 'parte', operacao: 'parte', argumentos: { nome: 'curva', sel: { origem: { op: 'subtrair', id: 20 } } } },
  porta({ op: 'subtrair', id: 20 }),
]);

const perfil4 = (prefixo) => Array.from({ length: 4 }, (_, k) => [p(`${prefixo}r${k}`), p(`${prefixo}y${k}`)]);
const nomes4 = (prefixo) => Array.from({ length: 4 }, (_, k) => [[`${prefixo}r${k}`, 'numero'], [`${prefixo}y${k}`, 'numero']]).flat();
const te = composicao(ID_POR_FORMA[4], [['ri', 'numero'], ['ro', 'numero'], ['altura', 'numero'], ['emDerivacao', 'vetor3'], ...nomes4('p'), ...nomes4('d'), ...nomes4('fp'), ...nomes4('fd')], [
  { id: 'passagem', operacao: 'lathe', argumentos: { origemId: 10, lados: LADOS, perfil: perfil4('p') } },
  { id: 'derivacao', operacao: 'lathe', argumentos: { origemId: 11, lados: LADOS, eixo: 'x', perfil: perfil4('d'), em: p('emDerivacao') } },
  { id: 'cheio', operacao: 'unir', argumentos: { origemId: 12, solidos: [{ origem: { op: 'lathe', id: 10 } }, { origem: { op: 'lathe', id: 11 } }] } },
  { id: 'furo-da-passagem', operacao: 'lathe', argumentos: { origemId: 13, lados: LADOS, perfil: perfil4('fp') } },
  { id: 'furo-da-derivacao', operacao: 'lathe', argumentos: { origemId: 14, lados: LADOS, eixo: 'x', perfil: perfil4('fd'), em: p('emDerivacao') } },
  { id: 'oco', operacao: 'subtrair', argumentos: { origemId: 20, solidos: [{ origem: { op: 'unir', id: 12 } }, { origem: { op: 'lathe', id: 13 } }, { origem: { op: 'lathe', id: 14 } }] } },
  { id: 'parte', operacao: 'parte', argumentos: { nome: 'te', sel: { origem: { op: 'subtrair', id: 20 } } } },
  porta({ op: 'subtrair', id: 20 }),
]);

/* os acessórios: a composição sai da lista de sólidos da geometria de uma peça de exemplo, porque o número de pontos de
   cada sólido é fixo por forma; os nomes dos argumentos são `s<k>r<i>`/`s<k>y<i>` (perfil), `s<k>em`, `s<k>altura` */
export const EXEMPLO_DO_ACESSORIO = Object.freeze({ diametroExterno: 60.3, parede: 3.91, diametroDoFlange: 152.4, espessuraDoFlange: 17.5, circuloDeFuracao: 120.7, furos: 4, diametroDoFuro: 19.1, diametroDoCubo: 77.7, comprimentoDoPescoco: 61.9, faceAFace: 178, giroDosFuros: 45 });
export const solidosDoAcessorio = (g) => [...g.cheios.map((s) => ({ ...s, cheio: true })), ...g.ferramentas];
function acessorio(forma) {
  const g = geometriaDaPeca({ forma, ...EXEMPLO_DO_ACESSORIO });
  const nomes = [['ri', 'numero'], ['ro', 'numero'], ['altura', 'numero']];
  const nos = [];
  const cheios = [];
  const ferramentas = [];
  solidosDoAcessorio(g).forEach((s, k) => {
    const id = 10 + 2 * k;
    nomes.push([`s${k}em`, 'vetor3'], ...s.perfil.map((_, i) => [[`s${k}r${i}`, 'numero'], [`s${k}y${i}`, 'numero']]).flat());
    const perfil = s.perfil.map((_, i) => [p(`s${k}r${i}`), p(`s${k}y${i}`)]);
    if (s.op === 'lathe') nos.push({ id: `solido-${k}`, operacao: 'lathe', argumentos: { origemId: id, lados: LADOS, eixo: s.eixo, perfil, em: p(`s${k}em`) } });
    else { nomes.push([`s${k}altura`, 'numero']); nos.push({ id: `solido-${k}`, operacao: 'extrusao', argumentos: { origemId: id, perfil, altura: p(`s${k}altura`), em: p(`s${k}em`) } }); }
    const fonte = { op: s.op, id };
    (s.cheio ? cheios : ferramentas).push({ origem: fonte });
    if (s.copias) {
      nomes.push([`s${k}total`, 'inteiro'], [`s${k}graus`, 'numero']);
      nos.push({ id: `copias-${k}`, operacao: 'arranja', argumentos: { modo: 'radial', total: p(`s${k}total`), graus: p(`s${k}graus`), eixo: 'y', pivo: [0, 0, 0], origemId: id + 1, derivaDe: fonte, sel: { origem: fonte } } });
      ferramentas.push({ origem: { op: 'arranja', id: id + 1, de: fonte } });
    }
  });
  let base = cheios[0];
  if (cheios.length > 1) { nos.push({ id: 'cheio', operacao: 'unir', argumentos: { origemId: 90, solidos: cheios } }); base = { origem: { op: 'unir', id: 90 } }; }
  nos.push({ id: 'oco', operacao: 'subtrair', argumentos: { origemId: 95, solidos: [base, ...ferramentas] } });
  nos.push({ id: 'parte', operacao: 'parte', argumentos: { nome: g.parte, sel: { origem: { op: 'subtrair', id: 95 } } } });
  nos.push(porta({ op: 'subtrair', id: 95 }));
  return composicao(ID_POR_FORMA[forma], nomes, nos);
}

export const COMPOSICOES = Object.freeze([torneada(ID_POR_FORMA[1], 'tubo', 5), curva, torneada(ID_POR_FORMA[3], 'tampao', 7), te, torneada(ID_POR_FORMA[5], 'reducao', 5), acessorio(6), acessorio(7), acessorio(8)]);
