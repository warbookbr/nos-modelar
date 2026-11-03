/* arvore-de-caixas — a fase ampla do contato de sólidos: uma árvore binária de caixas alinhadas aos eixos sobre uma lista
 * de caixas (uma por triângulo). Serviço neutro, sem Three.js e sem dependência.
 *
 * O QUE ELA FAZ E O QUE NUNCA FAZ. Ela só escolhe CANDIDATOS: dado um raio ou uma caixa de consulta, devolve os itens cujas
 * caixas (alargadas pela margem que quem chama calculou) a consulta toca. Quem decide é a conta exata de
 * `contato-de-solidos.js`, aplicada a cada candidato; a árvore nunca responde "dentro", "fora" ou "cruza". Por isso a margem
 * é sempre generosa: uma margem a mais custa uns candidatos a mais, uma a menos custaria um veredito diferente.
 *
 * DETERMINÍSTICA. A construção divide pelo eixo de maior extensão dos centros das caixas e parte no item do meio, com o
 * índice do item como desempate; a mesma lista de caixas dá a mesma árvore, e a ordem em que os candidatos saem não muda o
 * que quem chama conclui (contagem de cruzamentos e "existe algum" não dependem de ordem).
 *
 * A árvore é montada UMA vez por malha e guardada junto dela por `contato-de-solidos.js`. A pilha da travessia é única do
 * módulo: as funções de visita não são reentrantes, e o `visitar` de quem chama não pode iniciar outra travessia. */

export const TAMANHO_DA_FOLHA = 8;

const PILHA = new Int32Array(256);

function valorDoCentro(centros, item, eixo) { return centros[item * 3 + eixo]; }

/* seleção do k-ésimo item por (centro no eixo, índice), em Hoare iterativo: deixa à esquerda de k os menores e à direita os
   maiores, sem ordenar tudo */
function selecionar(ordem, centros, eixo, esquerda, direita, k) {
  const antes = (p, q) => {
    const x = valorDoCentro(centros, p, eixo); const y = valorDoCentro(centros, q, eixo);
    return x < y || (x === y && p < q);
  };
  let i0 = esquerda; let j0 = direita - 1;
  while (i0 < j0) {
    const meio = (i0 + j0) >> 1;
    /* mediana de três como pivô */
    const x = ordem[i0]; const y = ordem[meio]; const z = ordem[j0];
    const pivo = antes(x, y)
      ? (antes(y, z) ? y : (antes(x, z) ? z : x))
      : (antes(x, z) ? x : (antes(y, z) ? z : y));
    let i = i0; let j = j0;
    while (i <= j) {
      while (antes(ordem[i], pivo)) i += 1;
      while (antes(pivo, ordem[j])) j -= 1;
      if (i <= j) { const t = ordem[i]; ordem[i] = ordem[j]; ordem[j] = t; i += 1; j -= 1; }
    }
    if (k <= j) j0 = j;
    else if (k >= i) i0 = i;
    else return;
  }
}

/**
 * Monta a árvore sobre `quantidade` caixas em `caixas` (Float64Array de seis valores por item: minx, miny, minz, maxx, maxy,
 * maxz). Devolve `{ nos, filho, contagem, ordem }`: `nos` guarda a caixa de cada nó; num nó interno o filho esquerdo é o nó
 * seguinte e `filho[n]` é o direito; numa folha `filho[n]` é o início em `ordem` e `contagem[n]` quantos itens.
 */
export function construirArvore(caixas, quantidade) {
  const ordem = new Uint32Array(quantidade);
  const centros = new Float64Array(quantidade * 3);
  for (let i = 0; i < quantidade; i += 1) {
    ordem[i] = i;
    for (let e = 0; e < 3; e += 1) centros[i * 3 + e] = (caixas[i * 6 + e] + caixas[i * 6 + 3 + e]) / 2;
  }
  const capacidade = Math.max(1, 2 * Math.ceil(quantidade / (TAMANHO_DA_FOLHA / 2)));
  const nos = new Float64Array(capacidade * 6);
  const filho = new Int32Array(capacidade);
  const contagem = new Int32Array(capacidade);
  let usados = 0;

  function montar(inicio, fim) {
    const no = usados; usados += 1;
    let minx = Infinity; let miny = Infinity; let minz = Infinity; let maxx = -Infinity; let maxy = -Infinity; let maxz = -Infinity;
    let cminx = Infinity; let cminy = Infinity; let cminz = Infinity; let cmaxx = -Infinity; let cmaxy = -Infinity; let cmaxz = -Infinity;
    for (let k = inicio; k < fim; k += 1) {
      const item = ordem[k]; const b = item * 6; const c = item * 3;
      if (caixas[b] < minx) minx = caixas[b]; if (caixas[b + 1] < miny) miny = caixas[b + 1]; if (caixas[b + 2] < minz) minz = caixas[b + 2];
      if (caixas[b + 3] > maxx) maxx = caixas[b + 3]; if (caixas[b + 4] > maxy) maxy = caixas[b + 4]; if (caixas[b + 5] > maxz) maxz = caixas[b + 5];
      if (centros[c] < cminx) cminx = centros[c]; if (centros[c + 1] < cminy) cminy = centros[c + 1]; if (centros[c + 2] < cminz) cminz = centros[c + 2];
      if (centros[c] > cmaxx) cmaxx = centros[c]; if (centros[c + 1] > cmaxy) cmaxy = centros[c + 1]; if (centros[c + 2] > cmaxz) cmaxz = centros[c + 2];
    }
    nos[no * 6] = minx; nos[no * 6 + 1] = miny; nos[no * 6 + 2] = minz;
    nos[no * 6 + 3] = maxx; nos[no * 6 + 4] = maxy; nos[no * 6 + 5] = maxz;
    if (fim - inicio <= TAMANHO_DA_FOLHA) { filho[no] = inicio; contagem[no] = fim - inicio; return no; }
    const ex = cmaxx - cminx; const ey = cmaxy - cminy; const ez = cmaxz - cminz;
    const eixo = ex >= ey && ex >= ez ? 0 : ey >= ez ? 1 : 2;
    const meio = (inicio + fim) >> 1;
    selecionar(ordem, centros, eixo, inicio, fim, meio);
    montar(inicio, meio);
    filho[no] = montar(meio, fim);
    return no;
  }
  if (quantidade > 0) montar(0, quantidade);
  return { nos, filho, contagem, ordem, quantidade };
}

/**
 * Visita, em profundidade, os itens cujas caixas (alargadas por `margem` em cada eixo) o raio de origem `[ox,oy,oz]` e
 * direção `[dx,dy,dz]` atravessa ou contém. A direção precisa ter as três componentes diferentes de zero. O raio é a semirreta
 * a partir da origem; uma origem dentro da caixa alargada também conta. `visitar(item)` devolve `true` para parar; a função
 * devolve `true` quando parou.
 */
export function visitarPorRaio(arvore, ox, oy, oz, dx, dy, dz, margem, visitar) {
  if (arvore.quantidade === 0) return false;
  const { nos, filho, contagem, ordem } = arvore;
  const ix = 1 / dx; const iy = 1 / dy; const iz = 1 / dz;
  let topo = 0; PILHA[topo] = 0; topo += 1;
  while (topo > 0) {
    topo -= 1;
    const no = PILHA[topo]; const b = no * 6;
    const x1 = (nos[b] - margem - ox) * ix; const x2 = (nos[b + 3] + margem - ox) * ix;
    const y1 = (nos[b + 1] - margem - oy) * iy; const y2 = (nos[b + 4] + margem - oy) * iy;
    const z1 = (nos[b + 2] - margem - oz) * iz; const z2 = (nos[b + 5] + margem - oz) * iz;
    const entra = Math.max(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2));
    const sai = Math.min(Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2));
    if (sai < 0 || entra > sai) continue;
    const n = contagem[no];
    if (n > 0) {
      const inicio = filho[no];
      for (let k = inicio; k < inicio + n; k += 1) if (visitar(ordem[k])) return true;
    } else {
      PILHA[topo] = filho[no]; topo += 1;
      PILHA[topo] = no + 1; topo += 1;
    }
  }
  return false;
}

/**
 * Visita os itens cujas caixas tocam a caixa de consulta (a que quem chama já alargou). Mesmo contrato de parada de
 * `visitarPorRaio`.
 */
export function visitarPorCaixa(arvore, minx, miny, minz, maxx, maxy, maxz, visitar) {
  if (arvore.quantidade === 0) return false;
  const { nos, filho, contagem, ordem } = arvore;
  let topo = 0; PILHA[topo] = 0; topo += 1;
  while (topo > 0) {
    topo -= 1;
    const no = PILHA[topo]; const b = no * 6;
    if (nos[b] > maxx || nos[b + 3] < minx || nos[b + 1] > maxy || nos[b + 4] < miny || nos[b + 2] > maxz || nos[b + 5] < minz) continue;
    const n = contagem[no];
    if (n > 0) {
      const inicio = filho[no];
      for (let k = inicio; k < inicio + n; k += 1) if (visitar(ordem[k])) return true;
    } else {
      PILHA[topo] = filho[no]; topo += 1;
      PILHA[topo] = no + 1; topo += 1;
    }
  }
  return false;
}
