/* perfis.js — `extrusao`: um perfil 2D com furos e deslocamento de contorno vira um sólido prismático.

   O perfil é montado por `montarPerfil` (perfil2d.js, sobre a CrossSection da Manifold): contorno externo menos furos,
   deslocado por uma distância com canto redondo, reto ou em esquadria, sem a receita calcular ponto nenhum. Esta op só
   levanta o resultado em y. O `lathe` revoluciona o mesmo perfil (campos `furos` e `deslocar`).

   ARGUMENTOS
     `perfil`         o contorno externo: lista de pontos [u, v], {retangulo: {largura, profundidade, centro?, cantos?}}
                      ou {circulo: {raio, centro?}};
     `furos`          lista de formas, nas mesmas três escritas, todas inteiras dentro do externo;
     `deslocar`       {para: 'dentro'|'fora', distancia, canto: 'redondo'|'reto'|'esquadria', limite?};
     `segmentosArco`  segmentos por quarto de volta nos círculos e nos cantos redondos (padrão 4);
     `altura`         extensão em y, maior que zero (padrão 1);
     `em`, `eixo`     a pose de criação dos outros geradores (o eixo da extrusão é y).
   O ponto [u, v] vai para x = u e z = v (o plano xz, como o `plano`); a base fica em y = 0 e o topo em y = altura.

   NUMERAÇÃO (formato salvo, travada por teste). Os contornos de todos os componentes do perfil são enfileirados na
   ordem canônica de `montarPerfil`: componente por componente, o externo (anti-horário em [u, v]) e depois os furos
   (horários), cada um começando pelo menor ponto. Com N pontos no total:
     vértices   base do ponto g = g; topo do ponto g = N + g;
     faces      lateral g (a aresta do ponto g ao seguinte no seu contorno) = g, com os cantos [base g, topo g,
                topo g+1, base g+1], a normal para fora do material (a lateral do cilindro); depois as peças convexas
                da tampa de baixo (normal -y), na ordem em que saem da fusão de triângulos; depois as do topo
                (normal +y), cada uma a peça de baixo na ordem inversa, com a mesma posição na lista.
   A tampa com furo é triangulada pela Manifold (`triangularPerfil`) e os triângulos são fundidos em peças convexas
   (pedacos-convexos.js). O earcut foi descartado: com furos alinhados (uma aresta de um furo na reta de um ponto de
   outro) ele devolve triângulo de área nula e a tampa sai com aresta solta.

   ORIGEM PUBLICADA `{op: 'extrusao', id}`: `lado` (índice da lateral g, o eixo numérico do cilindro), `tampa`
   ('fundo' ou 'topo', todas as peças da tampa) e `parede` ('externo', 'furos', 'todas' ou o número do furo na ordem
   canônica, as laterais daquele contorno). Sem eixo nenhum, é o sólido inteiro (laterais e as duas tampas), que é o que
   as booleanas aceitam.

   COMPLETUDE, a lei do `arranja`: perfil recusado, altura inválida e triangulação que não cobre a área GRITAM com o
   campo e o valor, e o passo aborta com 0 V/0 F. */
import { ErroDePerfil, montarPerfil, triangularPerfil } from '../perfil2d.js';
import { pedacosConvexos } from '../pedacos-convexos.js';

const cruz2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export function criarOperacoesPerfis({ grita, registraOrigem, confereId, addV, addF, idDoPasso, BLOCO, FAIXA_ESTENDIDA }) {
  return {
  extrusao(st, a, i) {
    confereId(st, i, 'extrusao', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'extrusao', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const altura = st.num(a.altura ?? 1);
    if (!(altura > 0) || !Number.isFinite(altura)) return grita(st, i, 'extrusao', 'altura', `altura precisa ser um número finito maior que zero (veio ${altura})`);
    let perfil;
    try {
      perfil = montarPerfil(
        { externo: a.perfil, furos: a.furos, deslocar: a.deslocar, segmentosArco: a.segmentosArco == null ? undefined : st.num(a.segmentosArco) },
        { num: (x) => st.num(x), nomes: { externo: 'perfil' } },
      );
    } catch (e) {
      if (e instanceof ErroDePerfil) return grita(st, i, 'extrusao', e.campo, e.message);
      throw e;
    }

    // tudo é calculado ANTES de reservar um id
    const contornos = [];     // {tipo, base, pontos}
    let N = 0;
    perfil.componentes.forEach((comp) => {
      for (const [tipo, pontos] of [['externo', comp.externo], ...comp.furos.map((f) => ['furo', f])]) {
        contornos.push({ tipo, base: N, pontos });
        N += pontos.length;
      }
    });
    let tampa;
    try { tampa = triangularPerfil(perfil); } catch (e) {
      if (e instanceof ErroDePerfil) return grita(st, i, 'extrusao', e.campo, e.message);
      throw e;
    }
    const posicao = tampa.pontos.map((p) => [p[0], 0, p[1]]);
    const pecas = [];
    perfil.componentes.forEach((_, c) => {
      const doComponente = tampa.triangulos.filter((t) => tampa.componenteDe[t[0]] === c);
      const area = doComponente.reduce((s, [p, q, r]) => s + cruz2(tampa.pontos[p], tampa.pontos[q], tampa.pontos[r]) / 2, 0);
      pecas.push(...pedacosConvexos((g) => posicao[g], doComponente, [0, -1, 0], 1e-9 * area));
    });
    const total = 2 * N;
    const nFaces = N + 2 * pecas.length;
    if (total > BLOCO + FAIXA_ESTENDIDA - 1 || nFaces > BLOCO + FAIXA_ESTENDIDA - 1) {
      return grita(st, i, 'extrusao', 'perfil', `o perfil com ${N} pontos e ${pecas.length} peças de tampa estoura o bloco e a faixa estendida de ids (${BLOCO + FAIXA_ESTENDIDA}); reduza segmentosArco`);
    }

    const vBase = (g) => idDoPasso(i, g);
    const vTopo = (g) => idDoPasso(i, N + g);
    for (let g = 0; g < N; g++) addV(st, vBase(g), posicao[g]);
    for (let g = 0; g < N; g++) addV(st, vTopo(g), [posicao[g][0], altura, posicao[g][2]]);
    const laterais = [];
    const paredes = { externo: [], furos: [] };
    for (const k of contornos) {
      const ids = [];
      for (let j = 0; j < k.pontos.length; j++) {
        const g = k.base + j, n = k.base + ((j + 1) % k.pontos.length);
        const fid = idDoPasso(i, g);
        addF(st, fid, [vBase(g), vTopo(g), vTopo(n), vBase(n)]);
        laterais.push(fid); ids.push(fid);
      }
      if (k.tipo === 'externo') paredes.externo.push(...ids); else paredes.furos.push(ids);
    }
    const fundo = [], topo = [];
    pecas.forEach((P, q) => {
      const fb = idDoPasso(i, N + q);
      addF(st, fb, P.map(vBase)); fundo.push(fb);
    });
    pecas.forEach((P, q) => {
      const ft = idDoPasso(i, N + pecas.length + q);
      addF(st, ft, [...P].reverse().map(vTopo)); topo.push(ft);
    });
    if (a.origemId != null) registraOrigem(st, i, 'extrusao', a.origemId, { laterais, tampas: { fundo, topo }, paredes });
  },
  };
}
