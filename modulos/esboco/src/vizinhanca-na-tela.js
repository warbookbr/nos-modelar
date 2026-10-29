/* O que cada lado de uma linha mostra.

   A aresta da malha é só candidata. A fronteira entre duas partes da mesma superfície, o círculo de uma peça que entra na outra à mesma
   altura da face da vizinha, a emenda de duas faces no mesmo plano com malhas diferentes: nenhuma é aresta na imagem, porque a superfície
   que se vê dos dois lados dela é a mesma, e nenhuma regra sobre a topologia da malha as pega todas (duas caixas encostadas, uma peça de
   cada vez, cada uma com a malha dela). A decisão está na tela, onde a imagem está: olhe a superfície mais perto do olho um pouco para
   cada lado da linha e veja se continuam a mesma superfície. A linha é aresta quando um lado tem superfície e o outro não (silhueta
   contra o fundo), quando as normais passam do vinco (mais de 30 graus) ou quando o plano de uma delas, levado ao ponto da linha, fica
   a mais que o degrau de profundidade do plano da outra (a oclusão: uma superfície que passa à frente de outra). É a mesma definição com
   que a medida do desenho tira as arestas da referência (`medida-do-desenho.js`), aplicada em vetor, de modo que as duas concordam
   por construção da regra e só a conta (o pixel contra o vetor) as separa.

   Cada linha é amostrada ao longo do comprimento, e onde a decisão muda de uma amostra para a seguinte a fronteira é achada por bissecção,
   de modo que um trecho de uma linha comprida que passa a ser emenda (a parede de uma caixa encostada só na metade dela) é cortado onde
   deve. É determinística: a mesma entrada dá a mesma saída. */

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const PASSOS_DA_BISSECCAO = 10;
const AMOSTRAS_MAXIMAS = 40;

/* `linhas`: segmentos `[a, b]` (pontos 3D); `V`: a vista; `superficieEm`: de `oclusaoExata`. Opções (em unidade do plano da vista, mm): `delta`
   (a distância da linha às duas amostras de superfície), `passo` (o comprimento de cada pedaço da amostragem), `cosseno` (o limite do
   vinco) e `degrau` (a diferença de profundidade que separa uma superfície da outra). Devolve os trechos que são aresta. */
export function arestasPelaVizinhanca(linhas, V, superficieEm, { delta, passo, cosseno, degrau }) {
  const saida = [];
  for (const [a, b] of linhas) {
    const pa = V.p(a); const pb = V.p(b);
    const dx = pb[0] - pa[0]; const dy = pb[1] - pa[1];
    const comprimento = Math.hypot(dx, dy);
    if (!(comprimento > 1e-12)) { saida.push([a, b]); continue; }
    const px = -dy / comprimento; const py = dx / comprimento;
    const ehAresta = (t) => {
      const mx = pa[0] + t * dx; const my = pa[1] + t * dy;
      const mais = superficieEm(mx + delta * px, my + delta * py);
      const menos = superficieEm(mx - delta * px, my - delta * py);
      if (!mais && !menos) return false;
      if (!mais || !menos) return true;
      if (mais.n && menos.n && dot(mais.n, menos.n) < cosseno) return true;
      return Math.abs(mais.plano(mx, my) - menos.plano(mx, my)) > degrau;
    };
    const n = Math.max(1, Math.min(AMOSTRAS_MAXIMAS, Math.ceil(comprimento / passo)));
    const estado = Array.from({ length: n }, (_, i) => ehAresta((i + 0.5) / n));
    if (estado.every(Boolean)) { saida.push([a, b]); continue; }
    if (!estado.some(Boolean)) continue;
    /* a fronteira entre a amostra k e a k + 1: onde a decisão muda entre os dois meios dos pedaços */
    const fronteira = (k) => {
      let lo = (k + 0.5) / n; let hi = (k + 1.5) / n;
      for (let i = 0; i < PASSOS_DA_BISSECCAO; i++) { const m = (lo + hi) / 2; if (ehAresta(m) === estado[k]) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    const em = (t) => a.map((c, e) => c + t * (b[e] - c));
    for (let i = 0; i < n;) {
      if (!estado[i]) { i++; continue; }
      let j = i;
      while (j + 1 < n && estado[j + 1]) j++;
      saida.push([em(i === 0 ? 0 : fronteira(i - 1)), em(j === n - 1 ? 1 : fronteira(j))]);
      i = j + 1;
    }
  }
  return saida;
}
