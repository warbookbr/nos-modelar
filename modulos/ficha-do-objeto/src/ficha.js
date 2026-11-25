/* ficha.js — monta a ficha do objeto (contrato da ponte com a mecatrônica, esquema 1.1) a partir do que o Modelar sabe: as
   instâncias da montagem resolvida, com a pose e as portas publicadas de cada uma, o resumo da malha exportada e a declaração da
   ponte do objeto (`procedural/pecas/<objeto>/ponte.json`), que diz o que a montagem não diz: quais instâncias giram juntas, as
   juntas com a porta que dá o eixo, o curso, a redução e o motor.

   Puro e determinístico: a entrada em metro (a unidade da malha neutra) sai em milímetro, arredondada a 1 µm, e a ordem segue a
   montagem e a declaração. O que o Modelar não sabe sai como `{ ausente: true, motivo }`, que o contrato aceita. */

import { girar, inerciaDoConjunto } from './validar.js';

export class ErroFicha extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroFicha'; }
}

const UNIDADES = { comprimento: 'mm', area: 'mm²', massa: 'g', inercia: 'g·mm²', angulo: 'grau', tensao: 'V' };
const arredondar = (x, casas = 3) => { const v = Number(x.toFixed(casas)); return Object.is(v, -0) ? 0 : v; };
const mm = (v) => v.map((x) => arredondar(x * 1000));
const aplicar = (m, v) => m.map((linha) => linha[0] * v[0] + linha[1] * v[1] + linha[2] * v[2]);
const normalizar = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };

/** O identificador da ficha (minúsculas e hífen) de um id de instância em camelCase: `anelPunho4` vira `anel-punho-4`. */
export function idDaFicha(id) {
  return id.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])(\d)/g, '$1-$2').toLowerCase();
}

/** A orientação `{ eixo, angulo }` (grau, mão direita) da matriz de rotação `r` (linhas), a que gira `v` em `r·v`. */
export function eixoEAngulo(r) {
  const traco = r[0][0] + r[1][1] + r[2][2];
  const angulo = Math.acos(Math.min(1, Math.max(-1, (traco - 1) / 2)));
  if (angulo < 1e-9) return { eixo: [0, 1, 0], angulo: 0 };
  let eixo;
  if (Math.PI - angulo < 1e-6) {
    /* meia volta: o eixo vem da diagonal, com o sinal das entradas fora dela */
    const d = [0, 1, 2].map((k) => Math.sqrt(Math.max(0, (r[k][k] + 1) / 2)));
    const k = d.indexOf(Math.max(...d));
    eixo = [0, 1, 2].map((j) => (j === k ? d[k] : (r[k][j] + r[j][k]) / (4 * d[k])));
  } else {
    eixo = [r[2][1] - r[1][2], r[0][2] - r[2][0], r[1][0] - r[0][1]];
  }
  return { eixo: normalizar(eixo).map((x) => arredondar(x, 9)), angulo: arredondar((angulo * 180) / Math.PI, 6) };
}

/** A matriz de rotação (linhas) da orientação `{ eixo, angulo }` (grau, mão direita). */
export function matrizDe({ eixo, angulo }) {
  const [x, y, z] = normalizar(eixo);
  const a = (angulo * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a); const t = 1 - c;
  return [[c + x * x * t, x * y * t - z * s, x * z * t + y * s], [y * x * t + z * s, c + y * y * t, y * z * t - x * s], [z * x * t - y * s, z * y * t + x * s, c + z * z * t]];
}
const produto = (a, b) => a.map((linha) => [0, 1, 2].map((j) => linha[0] * b[0][j] + linha[1] * b[1][j] + linha[2] * b[2][j]));

const ausente = (motivo) => ({ ausente: true, motivo });
const SEM_DENSIDADE = 'o material da peça ainda não tem densidade declarada na ponte do objeto';
const sig = (x) => { const v = Number(x.toPrecision(9)); return Object.is(v, -0) ? 0 : v; };
const transposta = (m) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));

/* a massa, o centro e a inércia de uma peça no referencial dela: `r` e `p` levam o referencial da peça ao da instância em que a
   massa foi medida (identidade e zero para a própria instância) */
function massaNaPeca(m, r = null, p = [0, 0, 0]) {
  if (!m) return { massa: ausente(SEM_DENSIDADE), centroDeMassa: ausente(SEM_DENSIDADE), inercia: ausente(SEM_DENSIDADE) };
  const rt = r ? transposta(r) : null;
  const centro = rt ? aplicar(rt, m.centro.map((x, k) => x - p[k])) : m.centro;
  const T = rt ? produto(produto(rt, m.tensor), r) : m.tensor;
  const nota = m.nota ? { nota: m.nota } : {};
  return {
    massa: { valor: sig(m.massa), origem: m.origem ?? 'estimativa', ...nota },
    centroDeMassa: { valor: centro.map((x) => arredondar(x)), origem: 'estimativa', nota: 'centro do volume da malha, no referencial da peça' },
    inercia: { valor: { ixx: sig(T[0][0]), iyy: sig(T[1][1]), izz: sig(T[2][2]), ixy: sig(T[0][1]), ixz: sig(T[0][2]), iyz: sig(T[1][2]) }, origem: 'estimativa', nota: 'pela malha com densidade uniforme, no centro de massa e nos eixos da peça' },
  };
}

/**
 * @param {{ declaracao: object, instancias: Array<{ id: string, ref: string, pose: { rotacao: number[][], deslocamento: number[] },
 *   portas: Array<{ id: string, interface?: { eixo: number[], centro: number[] } }> }>, malha: { caminho: string, caixa: { min: number[], max: number[] }, faces: number },
 *   componentes?: Array<{ id: string, instancia: string, nome?: string, familia: string, variante: string, posicao: number[], orientacao: { eixo: number[], angulo: number } }>,
 *   portasEletricas?: Array<object>, massas?: Record<string, { massa: number, centro: number[], tensor: number[][], nota?: string }> }} entrada
 *   a pose e as portas das instâncias em metro; a caixa da malha já em milímetro, medida no arquivo exportado. Os componentes são as
 *   peças que uma instância carrega dentro dela (os da placa declarada), com a posição em mm e a orientação no referencial da
 *   instância; eles entram como peças da ficha, no conjunto da instância. As portas elétricas já vêm no formato da ficha. As
 *   massas, por identificador da ficha, vêm em g, com o centro (mm) e o tensor (g·mm²) no referencial da instância que carrega a
 *   peça; a peça que não tem massa sai ausente, e o conjunto soma as peças quando todas têm.
 */
export function montarFicha({ declaracao, instancias, malha, componentes = [], portasEletricas = [], massas = {} }) {
  const d = declaracao;
  if (d?.formato !== 'modelar.ponte' || d.versao !== 1) {
    throw new ErroFicha(`ponte.json: formato '${d?.formato}' versão ${d?.versao}; esperado 'modelar.ponte' versão 1.`);
  }
  const porId = new Map(instancias.map((i) => [i.id, i]));
  const conjuntoDe = new Map();
  d.conjuntos.forEach((c, k) => c.instancias.forEach((id) => {
    if (!porId.has(id)) throw new ErroFicha(`ponte.json: conjuntos[${k}] cita a instância '${id}', que a montagem não tem; as instâncias são ${[...porId.keys()].join(', ')}.`);
    if (conjuntoDe.has(id)) throw new ErroFicha(`ponte.json: a instância '${id}' está nos conjuntos '${conjuntoDe.get(id)}' e '${c.id}'; cada instância fica em um só.`);
    conjuntoDe.set(id, c.id);
  }));
  const fora = instancias.filter((i) => !conjuntoDe.has(i.id)).map((i) => i.id);
  if (fora.length) throw new ErroFicha(`ponte.json: as instâncias ${fora.join(', ')} não estão em nenhum conjunto; ponha cada uma em \`conjuntos[].instancias\`.`);

  const pecas = instancias.map((i) => ({
    id: idDaFicha(i.id),
    nome: i.ref,
    familia: null,
    conjunto: conjuntoDe.get(i.id),
    posicao: { valor: mm(i.pose.deslocamento), origem: 'medido', nota: 'origem da peça na pose de repouso da montagem resolvida' },
    orientacao: { valor: eixoEAngulo(i.pose.rotacao), origem: 'medido' },
    ...massaNaPeca(massas[idDaFicha(i.id)]),
  }));

  const ids = new Set(pecas.map((p) => p.id));
  for (const c of componentes) {
    const inst = porId.get(c.instancia);
    if (!inst) throw new ErroFicha(`componente '${c.id}': a instância '${c.instancia}' que o carrega não existe na montagem.`);
    if (ids.has(c.id)) throw new ErroFicha(`componente '${c.id}' da instância '${c.instancia}': o identificador já é de outra peça da ficha; mude o designador na placa.`);
    ids.add(c.id);
    const { rotacao, deslocamento } = inst.pose;
    const posicao = aplicar(rotacao, c.posicao).map((x, n) => arredondar(x + deslocamento[n] * 1000));
    pecas.push({
      id: c.id,
      nome: c.nome ?? `${c.variante} em ${c.instancia}`,
      familia: c.familia,
      variante: c.variante,
      conjunto: conjuntoDe.get(c.instancia),
      posicao: { valor: posicao, origem: 'medido', nota: `origem do componente, posto pela placa declarada de '${c.instancia}'` },
      orientacao: { valor: eixoEAngulo(produto(rotacao, matrizDe(c.orientacao))), origem: 'medido' },
      ...massaNaPeca(massas[c.id], matrizDe(c.orientacao), c.posicao),
    });
  }

  const juntas = d.juntas.map((j, k) => {
    for (const lado of ['pai', 'filho']) {
      if (!porId.has(j[lado])) throw new ErroFicha(`ponte.json: juntas[${k}].${lado} é '${j[lado]}', que a montagem não tem.`);
    }
    const inst = porId.get(j.eixoDe.instancia);
    const porta = inst?.portas.find((p) => p.id === j.eixoDe.porta);
    if (!porta?.interface) {
      throw new ErroFicha(`ponte.json: juntas[${k}].eixoDe cita a porta '${j.eixoDe.porta}' de '${j.eixoDe.instancia}', que não existe ou não tem interface; as portas dela são ${inst ? inst.portas.map((p) => p.id).join(', ') : '(instância inexistente)'}.`);
    }
    const { rotacao, deslocamento } = inst.pose;
    const ponto = aplicar(rotacao, porta.interface.centro).map((x, n) => x + deslocamento[n]);
    const direcao = normalizar(aplicar(rotacao, porta.interface.eixo)).map((x) => arredondar(x, 9));
    const medida = ({ valor, min, max, origem, nota }) => ({ valor: valor ?? { min, max }, origem, ...(nota ? { nota } : {}) });
    return {
      id: j.id,
      tipo: 'rotativa',
      pai: idDaFicha(j.pai),
      filho: idDaFicha(j.filho),
      acionadaPor: j.acionadaPor === null ? null : idDaFicha(j.acionadaPor),
      eixo: { valor: { ponto: mm(ponto), direcao }, origem: 'medido', nota: `eixo da porta '${j.eixoDe.porta}' de '${j.eixoDe.instancia}'` },
      curso: medida(j.curso),
      reducao: medida(j.reducao),
    };
  });

  /* o conjunto soma as peças dele, pelos valores já arredondados da ficha, como o conferidor refaz a conta */
  const conjuntos = d.conjuntos.map((c) => {
    const suas = pecas.filter((p) => p.conjunto === c.id);
    if (!suas.length || suas.some((p) => p.massa.ausente)) {
      const motivo = 'alguma peça do conjunto não tem massa (o material dela não tem densidade declarada na ponte do objeto)';
      return { id: c.id, movel: c.movel, massa: ausente(motivo), centroDeMassa: ausente(motivo), inercia: ausente(motivo) };
    }
    const total = suas.reduce((s, p) => s + p.massa.valor, 0);
    const centros = suas.map((p) => girar(p.orientacao.valor, p.centroDeMassa.valor).map((x, k) => x + p.posicao.valor[k]));
    const centro = [0, 1, 2].map((k) => suas.reduce((s, p, n) => s + p.massa.valor * centros[n][k], 0) / total);
    const [ixx, iyy, izz, ixy, ixz, iyz] = inerciaDoConjunto(suas, centros, centro).map(sig);
    return {
      id: c.id,
      movel: c.movel,
      massa: { valor: sig(total), origem: 'estimativa', nota: 'soma das massas estimadas das peças do conjunto' },
      centroDeMassa: { valor: centro.map((x) => arredondar(x)), origem: 'estimativa', nota: 'média das peças pesada pela massa, no referencial da montagem' },
      inercia: { valor: { ixx, iyy, izz, ixy, ixz, iyz }, origem: 'estimativa', nota: 'das peças em torno do centro do conjunto, nos eixos da montagem' },
    };
  });

  return {
    tipo: 'ficha',
    versao: '1.1',
    objeto: d.objeto,
    revisao: d.revisao,
    unidades: UNIDADES,
    referencial: { cima: '+y', frente: d.referencial.frente, origem: d.referencial.origem, poseZero: d.referencial.poseZero },
    malha: {
      caminho: malha.caminho,
      formato: 'glb',
      caixa: { valor: { min: malha.caixa.min.map((x) => arredondar(x)), max: malha.caixa.max.map((x) => arredondar(x)) }, origem: 'medido' },
      faces: { valor: malha.faces, origem: 'medido', nota: 'triângulos do arquivo' },
    },
    conjuntos,
    pecas,
    portas: portasEletricas,
    juntas,
    volumesLivres: [],
  };
}
