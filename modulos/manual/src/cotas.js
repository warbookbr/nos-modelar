/* cotas.js — valida as cotas que uma receita declara no export opcional `COTAS`. O programa não escolhe cotas: só confere e normaliza as declaradas.

   Cada cota é um objeto:
     linear:    { vista, de, ate, lado, texto?, afastamentoMm? }
     diâmetro:  { tipo: 'diametro', vista, centro, diametro, lado?, texto? }
   `vista` é 'frente', 'cima' ou 'lado'. Os pontos são [x, y, z] em milímetro nos eixos da receita, ou o `nome` de um ponto de `PONTOS`
   (o campo `em` dele). Na cota linear, `lado` 'cima' ou 'baixo' mede a distância horizontal entre as projeções dos pontos e põe a linha
   de cota daquele lado; 'esquerda' ou 'direita' mede a vertical. `texto` substitui o valor medido; `afastamentoMm` (positivo) é a
   distância da linha de cota ao ponto mais próximo daquele lado. */
import { VISTAS_DO_DESENHO } from './projecao.js';

export const LADOS = Object.freeze(['cima', 'baixo', 'esquerda', 'direita']);
const MARGEM_DA_CAIXA_MM = 1;
const MEDIDA_MINIMA_MM = 0.01;

const recusa = (indice, cota, motivo, esperado) => {
  const quem = cota?.texto ? ` ('${cota.texto}')` : '';
  throw new Error(`COTAS[${indice}]${quem}: ${motivo}. Esperado: ${esperado}.`);
};
const ehNumero = (n) => typeof n === 'number' && Number.isFinite(n);

function pontoDe(valor, campo, indice, cota, pontos, caixa) {
  let ponto = valor;
  if (typeof valor === 'string') {
    const achado = (pontos ?? []).find((p) => p?.nome === valor);
    if (!achado) recusa(indice, cota, `'${campo}' cita o ponto '${valor}', que a receita não declara em PONTOS`, `um nome de PONTOS${pontos?.length ? ` (${pontos.map((p) => `'${p.nome}'`).join(', ')})` : ' (a receita não declara PONTOS)'} ou [x, y, z] em mm`);
    ponto = achado.em;
  }
  if (!Array.isArray(ponto) || ponto.length !== 3 || !ponto.every(ehNumero)) {
    recusa(indice, cota, `'${campo}' não é um ponto`, `[x, y, z] em mm, três números, ou o nome de um ponto de PONTOS`);
  }
  for (let k = 0; k < 3; k += 1) {
    if (ponto[k] < caixa.min[k] - MARGEM_DA_CAIXA_MM || ponto[k] > caixa.max[k] + MARGEM_DA_CAIXA_MM) {
      recusa(indice, cota, `'${campo}' = [${ponto.join(', ')}] cai fora da caixa da peça (${caixa.min.map((v, i) => `${'xyz'[i]} de ${v.toFixed(1)} a ${caixa.max[i].toFixed(1)}`).join('; ')} mm)`, 'ponto dentro da caixa da peça, em mm (a malha neutra sai em metro; a cota é em milímetro)');
    }
  }
  return [...ponto];
}

/** Valida e normaliza `COTAS`. `caixa` é a caixa da malha em mm ({ min, max }), `pontos` é o `PONTOS` da receita. Ausente vira []. */
export function validarCotas(cotas, { caixa, pontos = [] }) {
  if (cotas === undefined || cotas === null) return [];
  if (!Array.isArray(cotas)) throw new Error('COTAS: não é uma lista. Esperado: um array de cotas, por exemplo [{ vista: \'frente\', de: [0, 0, 0], ate: [10, 0, 0], lado: \'baixo\' }].');
  return cotas.map((cota, i) => {
    if (!cota || typeof cota !== 'object' || Array.isArray(cota)) recusa(i, cota, 'a cota não é um objeto', '{ vista, de, ate, lado } ou { tipo: \'diametro\', vista, centro, diametro }');
    const tipo = cota.tipo ?? 'linear';
    if (!['linear', 'diametro'].includes(tipo)) recusa(i, cota, `tipo '${tipo}' desconhecido`, "'linear' (padrão) ou 'diametro'");
    if (!Object.hasOwn(VISTAS_DO_DESENHO, cota.vista)) recusa(i, cota, `vista ${JSON.stringify(cota.vista)} desconhecida`, Object.keys(VISTAS_DO_DESENHO).map((v) => `'${v}'`).join(', '));
    if (cota.texto !== undefined && (typeof cota.texto !== 'string' || !cota.texto.trim())) recusa(i, cota, '`texto` vazio ou que não é texto', 'texto não vazio, ou omita para usar o valor medido');
    const normal = { tipo, vista: cota.vista, ...(cota.texto !== undefined ? { texto: cota.texto } : {}) };
    if (cota.lado !== undefined && !LADOS.includes(cota.lado)) recusa(i, cota, `lado ${JSON.stringify(cota.lado)} desconhecido`, LADOS.map((l) => `'${l}'`).join(', '));
    const uv = VISTAS_DO_DESENHO[cota.vista].uv;
    if (tipo === 'diametro') {
      normal.centro = pontoDe(cota.centro, 'centro', i, cota, pontos, caixa);
      if (!ehNumero(cota.diametro) || cota.diametro <= 0) recusa(i, cota, `diâmetro ${JSON.stringify(cota.diametro)} inválido`, 'número positivo em mm');
      normal.diametro = cota.diametro;
      normal.lado = cota.lado ?? 'cima';
      return normal;
    }
    if (cota.lado === undefined) recusa(i, cota, 'falta `lado` na cota linear', LADOS.map((l) => `'${l}'`).join(', '));
    normal.lado = cota.lado;
    normal.de = pontoDe(cota.de, 'de', i, cota, pontos, caixa);
    normal.ate = pontoDe(cota.ate, 'ate', i, cota, pontos, caixa);
    if (cota.afastamentoMm !== undefined) {
      if (!ehNumero(cota.afastamentoMm) || cota.afastamentoMm <= 0) recusa(i, cota, `afastamentoMm ${JSON.stringify(cota.afastamentoMm)} inválido`, 'número positivo em mm, ou omita');
      normal.afastamentoMm = cota.afastamentoMm;
    }
    const [u1, v1] = uv(normal.de); const [u2, v2] = uv(normal.ate);
    const horizontal = normal.lado === 'cima' || normal.lado === 'baixo';
    const medida = Math.abs(horizontal ? u2 - u1 : v2 - v1);
    if (medida < MEDIDA_MINIMA_MM) {
      recusa(i, cota, `os dois pontos coincidem na vista '${cota.vista}' ao longo do eixo medido (${horizontal ? 'horizontal' : 'vertical'}, pelo lado '${normal.lado}')`, `pontos que diferem em ${horizontal ? 'u' : 'v'} na vista, ou outro lado (${horizontal ? "'esquerda' ou 'direita'" : "'cima' ou 'baixo'"}) se a medida é a outra`);
    }
    normal.medidaMm = medida;
    return normal;
  });
}
