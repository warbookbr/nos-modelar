/* composicoes.js — a composição da família `esteira`: para cada um dos quatro trechos, a bucha por `lathe` em y, os dois
   trilhos e a sapata por `extrusao` em y, cada um repetido por `arranja` (linear no reto, radial na volta); a motriz por
   `lathe` menos o vão do dente repetido por `arranja` radial; a guia por `lathe` de z lados; e os roletes por `lathe`
   repetido por `arranja` linear ao longo do trecho de baixo. As partes são `buchas`, `trilhos`, `sapatas`, `motriz`, `guia`
   e `roletes`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { LADOS_DA_BUCHA, PONTOS_DA_SAPATA, PONTOS_DO_ELO } from './geometria.js';
import { PONTOS_DO_VAO } from '../roda-dentada/geometria.js';

export const ID_DA_ESTEIRA = 'esteira.de-sapatas';
const TRECHOS = ['reto', 'volta', 'reto', 'volta'];
const p = (nome) => ({ parametro: nome });
const lista = (prefixo, n) => Array.from({ length: n }, (_, k) => [p(`${prefixo}u${k}`), p(`${prefixo}v${k}`)]);
const nomesDe = (prefixo, n) => Array.from({ length: n }, (_, k) => [[`${prefixo}u${k}`, 'numero'], [`${prefixo}v${k}`, 'numero']]).flat();

function composicao() {
  const nomes = [['raioDaBucha', 'numero'], ['meiaLargura', 'numero'], ['menosMeiaLargura', 'numero'], ['espessuraDoElo', 'numero'], ['larguraDaSapata', 'numero'], ['emSapata', 'vetor3']];
  const nos = [];
  const partes = [];
  let id = 10;
  TRECHOS.forEach((tipo, s) => {
    if (tipo === 'volta') nomes.push([`t${s}Centro`, 'vetor3']);
    const repetir = (nome, fonte) => {
      nomes.push([`${nome}Total`, 'inteiro'], tipo === 'reto' ? [`${nome}Passo`, 'vetor3'] : [`${nome}Graus`, 'numero']);
      const args = tipo === 'reto' ? { modo: 'linear', total: p(`${nome}Total`), d: p(`${nome}Passo`) } : { modo: 'radial', total: p(`${nome}Total`), graus: p(`${nome}Graus`), eixo: 'y', pivo: p(`t${s}Centro`) };
      nos.push({ id: `${nome}-copias`, operacao: 'arranja', argumentos: { ...args, origemId: id + 1, derivaDe: fonte, sel: { origem: fonte } } });
      return [{ origem: fonte }, { origem: { op: 'arranja', id: id + 1, de: fonte } }];
    };
    nomes.push([`t${s}buchaEm`, 'vetor3']);
    nos.push({ id: `t${s}bucha`, operacao: 'lathe', argumentos: { origemId: id, lados: LADOS_DA_BUCHA, perfil: [[0, p('menosMeiaLargura')], [p('raioDaBucha'), p('menosMeiaLargura')], [p('raioDaBucha'), p('meiaLargura')], [0, p('meiaLargura')]], em: p(`t${s}buchaEm`) } });
    partes.push(['buchas', repetir(`t${s}bucha`, { op: 'lathe', id })]); id += 2;
    nomes.push(...nomesDe(`t${s}elo`, PONTOS_DO_ELO), ...nomesDe(`t${s}sapata`, PONTOS_DA_SAPATA));
    for (const lado of [0, 1]) {
      nomes.push([`t${s}trilho${lado}Em`, 'vetor3']);
      nos.push({ id: `t${s}trilho${lado}`, operacao: 'extrusao', argumentos: { origemId: id, perfil: lista(`t${s}elo`, PONTOS_DO_ELO), altura: p('espessuraDoElo'), em: p(`t${s}trilho${lado}Em`) } });
      partes.push(['trilhos', repetir(`t${s}trilho${lado}`, { op: 'extrusao', id })]); id += 2;
    }
    nos.push({ id: `t${s}sapata`, operacao: 'extrusao', argumentos: { origemId: id, perfil: lista(`t${s}sapata`, PONTOS_DA_SAPATA), altura: p('larguraDaSapata'), em: p('emSapata') } });
    partes.push(['sapatas', repetir(`t${s}sapata`, { op: 'extrusao', id })]); id += 2;
  });
  /* a motriz: a coroa torneada menos os vãos, girada para um vão cair em cada bucha */
  nomes.push(...nomesDe('vao', PONTOS_DO_VAO), ['coroaMotriz', 'numero'], ['meiaLarguraDoDente', 'numero'], ['menosMeiaLarguraDoDente', 'numero'], ['alturaDoVao', 'numero'], ['emVao', 'vetor3'], ['dentes', 'inteiro'], ['passoAngular', 'numero'], ['raioDaGuia', 'numero'], ['meiaLarguraDaRoda', 'numero'], ['menosMeiaLarguraDaRoda', 'numero'], ['centroDaGuia', 'vetor3'], ['giroDaGuia', 'numero'], ['raioDoRolete', 'numero'], ['centroDoRolete', 'vetor3'], ['roletes', 'inteiro'], ['passoDosRoletes', 'vetor3']);
  const VAO = { op: 'extrusao', id: 200 };
  nos.push(
    { id: 'motriz-coroa', operacao: 'lathe', argumentos: { origemId: 190, lados: 128, perfil: [[0, p('menosMeiaLarguraDoDente')], [p('coroaMotriz'), p('menosMeiaLarguraDoDente')], [p('coroaMotriz'), p('meiaLarguraDoDente')], [0, p('meiaLarguraDoDente')]] } },
    { id: 'motriz-vao', operacao: 'extrusao', argumentos: { origemId: 200, perfil: lista('vao', PONTOS_DO_VAO), altura: p('alturaDoVao'), em: p('emVao') } },
    { id: 'motriz-vaos', operacao: 'arranja', argumentos: { modo: 'radial', total: p('dentes'), graus: p('passoAngular'), eixo: 'y', pivo: [0, 0, 0], origemId: 201, derivaDe: VAO, sel: { origem: VAO } } },
    { id: 'motriz', operacao: 'subtrair', argumentos: { origemId: 210, solidos: [{ origem: { op: 'lathe', id: 190 } }, { origem: VAO }, { origem: { op: 'arranja', id: 201, de: VAO } }] } },
    { id: 'guia', operacao: 'lathe', argumentos: { origemId: 220, lados: p('dentes'), perfil: [[0, p('menosMeiaLarguraDaRoda')], [p('raioDaGuia'), p('menosMeiaLarguraDaRoda')], [p('raioDaGuia'), p('meiaLarguraDaRoda')], [0, p('meiaLarguraDaRoda')]], em: p('centroDaGuia') } },
    { id: 'guia-giro', operacao: 'rotaciona', argumentos: { eixo: 'y', graus: p('giroDaGuia'), pivo: p('centroDaGuia'), sel: { origem: { op: 'lathe', id: 220 } } } },
    { id: 'rolete', operacao: 'lathe', argumentos: { origemId: 230, lados: 48, perfil: [[0, p('menosMeiaLarguraDaRoda')], [p('raioDoRolete'), p('menosMeiaLarguraDaRoda')], [p('raioDoRolete'), p('meiaLarguraDaRoda')], [0, p('meiaLarguraDaRoda')]], em: p('centroDoRolete') } },
    { id: 'roletes', operacao: 'arranja', argumentos: { modo: 'linear', total: p('roletes'), d: p('passoDosRoletes'), origemId: 231, derivaDe: { op: 'lathe', id: 230 }, sel: { origem: { op: 'lathe', id: 230 } } } },
  );
  partes.push(['motriz', [{ origem: { op: 'subtrair', id: 210 } }]], ['guia', [{ origem: { op: 'lathe', id: 220 } }]], ['roletes', [{ origem: { op: 'lathe', id: 230 } }, { origem: { op: 'arranja', id: 231, de: { op: 'lathe', id: 230 } } }]]);
  partes.forEach(([nome, sels], k) => sels.forEach((sel, j) => nos.push({ id: `parte-${k}-${j}`, operacao: 'parte', argumentos: { nome, sel } })));
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_ESTEIRA, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([n, t]) => [n, { tipo: t }])), artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] }, nos });
}

export const COMPOSICOES = Object.freeze([composicao()]);
