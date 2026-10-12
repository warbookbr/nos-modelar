/* Giro rígido de um grupo de formas em torno de um pivô: o que a instância de componente com `rotacao` (a roda do trem
   principal do avião gira em torno de z ao recolher e precisou de um módulo `rodaGira` que repetia o desenho do componente,
   com o centro dos cubos calculado com seno e cosseno de `ang`; atrito 43) e as `formas` de um `curso` (a porta que abre em
   torno da dobradiça) pedem. O grupo se posiciona como se não girasse (as formas dele se citam entre si na pose de repouso, e
   `ponta`, `sobre` e `encosta` continuam valendo) e depois o conjunto inteiro gira junto, de modo que quem cita uma forma do
   grupo de fora (âncora, `sobre`, `encosta`, o gate, o desenho) enxerga a pose girada. A conta é de `resolverOpcao`
   (`index.js`), que lê `opcao.giros`; aqui ficam a leitura do que o JSON declara e a conversão de ângulos. Puro. */
import { ErroDeEsboco } from './index.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const EIXOS = ['x', 'y', 'z'];
const limpo = (x) => (Math.abs(x) < 1e-9 ? 0 : x);

/* Os três ângulos [rx, ry, rz] em graus de uma rotação escrita como a de uma forma ([rx, ry, rz], { eixo, angulo },
   { x, y, z } ou um número, que gira em y), já com os números resolvidos. */
export function angulosDaRotacao(rot) {
  let [rx, ry, rz] = [0, 0, 0];
  if (Array.isArray(rot)) [rx = 0, ry = 0, rz = 0] = rot;
  else if (objeto(rot)) {
    if (rot.eixo && rot.angulo !== undefined) {
      if (rot.eixo === 'x') rx = rot.angulo; else if (rot.eixo === 'y') ry = rot.angulo; else if (rot.eixo === 'z') rz = rot.angulo;
    } else { rx = rot.x ?? 0; ry = rot.y ?? 0; rz = rot.z ?? 0; }
  } else if (typeof rot === 'number') ry = rot;
  return [rx, ry, rz].map((a) => (Number.isFinite(a) ? a : 0));
}

/* Os ângulos [rx, ry, rz] em graus de uma matriz de rotação, na convenção de `matrizRotacao` (M = Rz · Ry · Rx): a rotação
   composta do grupo com a da forma volta a ser um campo `rotacao` que o resto do módulo lê. */
export function angulosDaMatriz(M) {
  const graus = (a) => limpo(Number(((a * 180) / Math.PI).toFixed(9)));
  const sy = Math.max(-1, Math.min(1, -M[2][0]));
  const ry = Math.asin(sy);
  if (Math.abs(sy) > 1 - 1e-9) return [graus(Math.atan2(-M[1][2], M[1][1])), graus(ry), 0];
  return [graus(Math.atan2(M[2][1], M[2][2])), graus(ry), graus(Math.atan2(M[1][0], M[0][0]))];
}

/* O ângulo em torno de um eixo de mundo, como rotação [rx, ry, rz]. */
export const rotacaoEmEixo = (eixo, graus) => EIXOS.map((e) => (e === eixo ? graus : 0));

/* `opcao.giros`: [{ formas: [ids], pivo: { forma: "<id>" } | { ponto: <ponto> }, rotacao: [rx, ry, rz] }]. Devolve
   [{ ids: Set, pivo, rotacao }] com cada forma em um grupo só e o pivô, quando é uma forma, dentro do grupo. */
export function lerGiros(giros, ids, onde) {
  if (giros === undefined) return [];
  exigir(Array.isArray(giros), `${onde}: "giros" deve ser uma lista de { "formas": [ids], "pivo": { "forma": "<id>" } ou { "ponto": ... }, "rotacao": [rx, ry, rz] }`);
  const dono = new Map();
  return giros.map((g, k) => {
    const rotulo = `${onde}, giro ${k + 1}`;
    exigir(objeto(g) && Array.isArray(g.formas) && g.formas.length > 0 && g.formas.every((x) => typeof x === 'string'), `${rotulo}: "formas" deve ser a lista dos ids das formas que giram juntas`);
    exigir(Array.isArray(g.rotacao) && g.rotacao.length === 3 && g.rotacao.every(Number.isFinite), `${rotulo}: "rotacao" deve ser [rx, ry, rz] em graus, já com os números resolvidos`);
    exigir(objeto(g.pivo) && (typeof g.pivo.forma === 'string' || g.pivo.ponto !== undefined), `${rotulo}: "pivo" deve ser { "forma": "<id>" } (o centro dela, na pose de repouso) ou { "ponto": <ponto> }`);
    for (const id of g.formas) {
      exigir(ids.has(id), `${rotulo}: a forma "${id}" não existe nesta opção`);
      exigir(!dono.has(id), `${rotulo}: a forma "${id}" já gira no giro ${dono.get(id)}; uma forma gira em um grupo só`);
      dono.set(id, k + 1);
    }
    if (typeof g.pivo.forma === 'string') exigir(g.formas.includes(g.pivo.forma), `${rotulo}: o pivô "${g.pivo.forma}" precisa ser uma das formas do grupo`);
    return { ids: new Set(g.formas), pivo: g.pivo, rotacao: g.rotacao };
  });
}

/* Os ids das formas que um nome designa: um id, o id de uma instância de componente (todas as formas dela) ou um padrão com
   `*` (`garfoE.*`). */
export function idsDoNome(formas, nome) {
  if (nome.includes('*')) {
    const re = new RegExp(`^${nome.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    return formas.filter((f) => objeto(f) && typeof f.id === 'string' && re.test(f.id)).map((f) => f.id);
  }
  return formas.filter((f) => objeto(f) && typeof f.id === 'string' && (f.id === nome || f.daInstancia?.id === nome)).map((f) => f.id);
}

/* Os giros de uma opção já expandida, para `opcao.giros`: o das instâncias de componente com `rotacao`
   (`instancias`: [{ instancia, principal, rotacao: [rx, ry, rz] }], o pivô é o centro da forma principal) e o das `formas` de
   cada `curso` que gira em torno de um ponto (`gira: { eixo, centro, sinal }`), no valor que o parâmetro do curso tem na
   opção (`valores`). Rotação nula não gera giro. `num` resolve um número no escopo da opção. */
export function girosDaOpcao({ formas, instancias = [], curso, valores = {}, num, onde }) {
  const giros = [];
  const giraAlgo = (r) => r.some((a) => Math.abs(a) > 1e-9);
  for (const { instancia, principal, rotacao } of instancias) {
    if (!giraAlgo(rotacao)) continue;
    const ids = formas.filter((f) => objeto(f) && typeof f.id === 'string' && f.daInstancia?.id === instancia).map((f) => f.id);
    if (ids.length > 0) giros.push({ formas: ids, pivo: { forma: principal }, rotacao });
  }
  for (const [nome, c] of Object.entries(objeto(curso) ? curso : {})) {
    if (!Array.isArray(c.formas)) continue;
    const valor = valores[c.parametro];
    exigir(Number.isFinite(valor), `${onde}: o curso "${nome}" move formas com o parâmetro "${c.parametro}", que esta opção não declara`);
    const graus = (c.gira.sinal ?? 1) * valor;
    /* o nome que não designa forma nenhuma é erro mesmo com o parâmetro em zero, onde nada gira: o curso o encontraria na primeira pose */
    const ids = [...new Set(c.formas.flatMap((n) => {
      const achadas = idsDoNome(formas, n);
      exigir(achadas.length > 0, `${onde}: o curso "${nome}" move "${n}", que não é forma, instância nem padrão desta opção`);
      return achadas;
    }))];
    if (!giraAlgo([graus])) continue;
    const centro = c.gira.centro;
    const ponto = Array.isArray(centro) ? centro.map((x, i) => num(x, `curso.${nome}.gira.centro[${i}]`, onde)) : centro;
    giros.push({ formas: ids, pivo: { ponto }, rotacao: rotacaoEmEixo(c.gira.eixo, graus) });
  }
  return giros;
}
