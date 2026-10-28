/* esboco-familias.mjs — o adaptador que entrega ao esboço as famílias procedurais.
 *
 * A forma de família do esboço (`{ "tipo": "familia", "familia": "roda-pneu", "perfil": "trem", "parametros": { ... } }`, ver
 * `modulos/esboco/src/familia.js`) precisa da superfície que a família gera, e o módulo não importa o núcleo. Este é o único lugar que
 * conhece os dois lados: para uma chamada genérica (`{ familia, perfil, parametros }`, qualquer família do registro, sem caso
 * especial) busca a família em `procedural/familias`, chama `chamar` com o perfil e os ajustes, executa a receita de composição e
 * converte a peça neutra no dado `mecanifica.malha@1` que o módulo lê: os vértices em milímetro, as faces por parte da família e as
 * portas que a peça publica como âncoras (o centro da interface de cada uma). O caso que pediu isto foi o trem do avião, que não
 * alcançava a roda 2.0 nem o cilindro hidráulico pelo JSON do esboço e usou o componente `roda` e cilindros por `ligar` (E7 do
 * `ATRITOS.md` do avião); a família da superfície aerodinâmica, da asa e da pá, passa pela mesma ponte.
 *
 * Importar este arquivo instala o provedor no módulo (`instalarFamiliasNoEsboco`): toda ferramenta que lê um esboço importa-o, e a
 * leitura sem ele recusa a forma de família dizendo isso. Não grava arquivo nem estado além do registro de famílias, que é imutável. */
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { chamar, criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import { definirProvedorDeFamilias } from '../../modulos/esboco/src/familia.js';
import { FORMATO_DA_MALHA } from '../../modulos/esboco/src/malha.js';

const ID_DA_CHAMADA = 'corpo';
const EIXOS = ['x', 'y', 'z'];
/* A área, em mm2, abaixo da qual uma face é o ponto em que um polo de revolução fecha, e não superfície. */
const AREA_MINIMA_MM2 = 1e-6;
const mm = (metro) => Math.round(metro * 1e9) / 1e6;
const norma = (v) => Math.hypot(v[0], v[1], v[2]);

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A receita que só chama a família, no formato da receita de composição. `CHAMADAS_COMPOSICOES` é um getter para a recusa de
   `chamar` acontecer quando o executor lê o campo, como em qualquer receita de família. */
function receitaDaChamada(familia, parametros) {
  return {
    get CHAMADAS_COMPOSICOES() { return [chamar(familia, ID_DA_CHAMADA, parametros)]; },
    PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {},
  };
}

/* O dobro da área de um polígono (Newell), em mm2. */
function areaDe(pts) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return Math.hypot(nx, ny, nz) / 2;
}

/* O eixo local que a maioria das portas da peça aponta (o eixo da roda, o do cilindro), e em empate o de maior extensão. */
function eixoDasPortas(portas, vertices) {
  const votos = [0, 0, 0];
  for (const { eixo } of portas) {
    const k = eixo ? eixo.findIndex((c) => Math.abs(Math.abs(c) - 1) < 1e-6) : -1;
    if (k >= 0) votos[k] += 1;
  }
  const melhor = Math.max(...votos);
  if (melhor === 0) return undefined;
  const extensao = [0, 1, 2].map((e) => Math.max(...vertices.map((v) => v[e])) - Math.min(...vertices.map((v) => v[e])));
  const empatados = [0, 1, 2].filter((e) => votos[e] === melhor);
  return EIXOS[empatados.reduce((a, b) => (extensao[b] > extensao[a] ? b : a))];
}

/** A peça neutra de uma família (`neutro` de `executarReceita`, em metro) como o dado `mecanifica.malha@1` em milímetro: só os
 *  vértices que as faces usam, as faces agrupadas por parte da família (na ordem em que a peça as declara), as portas que têm
 *  centro como âncoras e as portas com o eixo para o `--descrever`. Uma face sem área sai. Determinística. */
export function malhaDaPeca(neutro, { familia, perfil, versao }) {
  const indice = new Map();
  const vertices = [];
  const novo = (id) => {
    if (!indice.has(id)) { indice.set(id, vertices.length); vertices.push(neutro.V.get(id).map(mm)); }
    return indice.get(id);
  };
  const porParte = new Map();
  for (const f of neutro.F.values()) {
    if (areaDe(f.vs.map((id) => neutro.V.get(id).map(mm))) < AREA_MINIMA_MM2) continue;
    const parte = f.parte ?? 'sem-parte';
    if (!porParte.has(parte)) porParte.set(parte, []);
    porParte.get(parte).push(f.vs.map(novo));
  }
  const faces = [];
  const partes = [];
  for (const [nome, lista] of porParte) {
    partes.push({ nome, de: faces.length, ate: faces.length + lista.length });
    faces.push(...lista);
  }
  const ancoras = {};
  const portas = [];
  for (const [id, porta] of [...neutro.portas].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const interface_ = porta.interface ?? {};
    const centro = interface_.centro ?? interface_.ponto ?? interface_.plano?.ponto;
    const eixo = interface_.eixo ?? interface_.normal;
    if (Array.isArray(centro)) ancoras[id] = centro.map(mm);
    portas.push({ id, tipo: interface_.forma, papel: interface_.papel, ...(Array.isArray(eixo) && norma(eixo) > 0 ? { eixo: eixo.map((c) => Math.round((c / norma(eixo)) * 1e6) / 1e6) } : {}) });
  }
  const eixo = eixoDasPortas(portas, vertices);
  return {
    formato: FORMATO_DA_MALHA, familia, ...(perfil === undefined ? {} : { perfil }), ...(versao === undefined ? {} : { versao }),
    vertices, faces, partes, ancoras, portas, ...(eixo === undefined ? {} : { eixo }),
  };
}

/** O provedor do módulo: `{ familia, perfil, parametros }` -> `mecanifica.malha@1`. Chama a família do registro pelo id, com o
 *  perfil entre os parâmetros (o que o esboço ajusta vale mais que o perfil, como em `chamar`), executa a receita e converte a
 *  peça. A recusa da família (id desconhecido, perfil, faixa, restrição) sobe com a mensagem dela. */
export function malhaDaChamada({ familia, perfil, parametros = {} }) {
  const registros = registroDeFamilias();
  const carregada = registros.obter(familia);
  const { neutro } = executarReceita(receitaDaChamada(carregada, { ...(perfil === undefined ? {} : { perfil }), ...parametros }), {
    registroComposicoes: registros.registroComposicoes, registroOperacoes: registros.registroOperacoes,
  });
  return malhaDaPeca(neutro, { familia, perfil, versao: carregada.contrato.versao });
}

/** Instala `malhaDaChamada` como o provedor de famílias do módulo do esboço. */
export function instalarFamiliasNoEsboco() {
  definirProvedorDeFamilias(malhaDaChamada);
}

instalarFamiliasNoEsboco();
