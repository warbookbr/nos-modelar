/* composicoes.js — as composições da família `rolamento`: cada peça (anel externo, anel interno, esferas e, na forma 3, o
   mancal) é uma lista de sólidos torneados ou extrudados; os cheios se unem e as ferramentas saem deles, e as esferas são
   uma esfera repetida em volta do eixo por `arranja` radial. A composição sai da geometria de um exemplo, porque o número de
   pontos é fixo por forma. A porta `furo` é o furo do anel interno, e `apoio` é a face do rolamento ou a base do mancal. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { geometriaDoRolamento } from './geometria.js';

export const ID_POR_FORMA = Object.freeze({ 1: 'rolamento.aberto', 2: 'rolamento.vedado', 3: 'rolamento.no-mancal' });
export const EXEMPLO = Object.freeze({ furo: 20, diametroExterno: 47, largura: 14, chanfro: 1 });
const p = (nome) => ({ parametro: nome });

/* os sólidos na ordem fixa: peça a peça, os cheios e depois as ferramentas */
export const solidosDoRolamento = (g) => g.pecas.flatMap((peca, i) => [...peca.cheios.map((s) => ({ ...s, peca: i, cheio: true })), ...(peca.ferramentas ?? []).map((s) => ({ ...s, peca: i }))]);

function composicao(forma) {
  const g = geometriaDoRolamento({ forma, ...EXEMPLO });
  const nomes = [['raioDoFuro', 'numero'], ['raioDoAnel', 'numero'], ['largura', 'numero'], ['pontoDeApoio', 'vetor3'], ['normalDeApoio', 'vetor3'], ['extensaoDeApoio0', 'numero'], ['extensaoDeApoio1', 'numero']];
  const nos = [];
  const porPeca = g.pecas.map(() => ({ cheios: [], ferramentas: [] }));
  solidosDoRolamento(g).forEach((s, k) => {
    const id = 10 + 2 * k;
    nomes.push([`s${k}em`, 'vetor3'], ...s.perfil.map((_, i) => [[`s${k}r${i}`, 'numero'], [`s${k}y${i}`, 'numero']]).flat());
    const perfil = s.perfil.map((_, i) => [p(`s${k}r${i}`), p(`s${k}y${i}`)]);
    if (s.op === 'lathe') nos.push({ id: `solido-${k}`, operacao: 'lathe', argumentos: { origemId: id, lados: s.lados, ...(s.eixo ? { eixo: s.eixo } : {}), perfil, em: p(`s${k}em`) } });
    else { nomes.push([`s${k}altura`, 'numero']); nos.push({ id: `solido-${k}`, operacao: 'extrusao', argumentos: { origemId: id, perfil, altura: p(`s${k}altura`), em: p(`s${k}em`) } }); }
    const fonte = { op: s.op, id };
    const destino = s.cheio ? porPeca[s.peca].cheios : porPeca[s.peca].ferramentas;
    destino.push({ origem: fonte });
    if (s.copias) {
      nomes.push([`s${k}total`, 'inteiro'], [`s${k}graus`, 'numero']);
      nos.push({ id: `copias-${k}`, operacao: 'arranja', argumentos: { modo: 'radial', total: p(`s${k}total`), graus: p(`s${k}graus`), eixo: 'y', pivo: [0, 0, 0], origemId: id + 1, derivaDe: fonte, sel: { origem: fonte } } });
      destino.push({ origem: { op: 'arranja', id: id + 1, de: fonte } });
    }
  });
  const finais = porPeca.map((peca, i) => {
    let base = peca.cheios;
    if (peca.cheios.length > 1 && peca.ferramentas.length) { nos.push({ id: `cheio-${i}`, operacao: 'unir', argumentos: { origemId: 80 + i, solidos: peca.cheios } }); base = [{ origem: { op: 'unir', id: 80 + i } }]; }
    if (!peca.ferramentas.length) return base;
    nos.push({ id: `oco-${i}`, operacao: 'subtrair', argumentos: { origemId: 90 + i, solidos: [...base, ...peca.ferramentas] } });
    return [{ origem: { op: 'subtrair', id: 90 + i } }];
  });
  g.pecas.forEach((peca, i) => finais[i].forEach((sel, j) => nos.push({ id: `parte-${i}-${j}`, operacao: 'parte', argumentos: { nome: peca.parte, sel } })));
  nos.push({ id: 'porta-furo', operacao: 'publicarPorta', argumentos: { id: 'furo', de: finais[1][0].origem, interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: p('raioDoFuro'), raioExterno: p('raioDoAnel'), inicio: 0, fim: p('largura') } } });
  const apoio = finais[forma === 3 ? 3 : 0][0].origem;
  nos.push({ id: 'porta-apoio', operacao: 'publicarPorta', argumentos: { id: 'apoio', de: apoio, interface: { forma: 'plano', papel: 'apoia', ponto: p('pontoDeApoio'), normal: p('normalDeApoio'), extensao: [p('extensaoDeApoio0'), p('extensaoDeApoio1')] } } });
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_POR_FORMA[forma], versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'] }, nos });
}

export const COMPOSICOES = Object.freeze([composicao(1), composicao(2), composicao(3)]);
