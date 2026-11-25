/* geometria.js — o gabinete de plástico, em milímetro: a caixa de cantos arredondados partida em base e tampa num plano
   horizontal, com o encaixe entre as duas e os ressaltos para parafuso.

   O gabinete tem a largura em x e a profundidade em z, centrado, e a altura em y, da base em y = 0 ao topo. Cada metade é
   a caixa cheia menos o vão de dentro, recuado pela parede (a parede sai exata, sem a operação `casca`). A base vai até a
   altura da base e tem o lábio de encaixe: a metade de dentro da parede sobe a altura do encaixe acima da divisão. A tampa
   vai da divisão ao topo e tem o rebaixo onde o lábio entra: a metade de dentro da parede dela é tirada na altura do
   encaixe, de modo que o lábio e o rebaixo se tocam de face e a borda de fora da tampa apoia na borda de fora da base.

   Os quatro ressaltos ficam nos cantos de dentro, afastados da parede pela folga: na base, do fundo à divisão, com o furo
   passante pelo fundo para o parafuso entrar por baixo; na tampa, da divisão ao teto, com o furo piloto cego. Os ressaltos
   da base e da tampa se tocam de topo na divisão. Regra da família: sem norma, por medidas declaradas.

   Com `grade` 1, o teto da tampa tem a grade de ventilação: rasgos de pontas redondas ao longo de x, repetidos a passos
   iguais em z e centrados. Com `recortes` 1, a parede da frente da base (z = −profundidade/2) tem o recorte retangular e
   o redondo do painel, à mesma altura, o retangular à esquerda do meio e o redondo à direita, com o centro em x declarado. */

export function geometriaDoGabinete(q) {
  const { largura: W, profundidade: D, altura: H, parede: t, raioDoCanto: r, alturaDaBase: hb, alturaDoEncaixe: he, diametroDoRessalto: dr, diametroDoFuro: df, folgaDoRessalto: f } = q;
  const ri = Math.max(r - t, 0.5); const rl = Math.max(r - t / 2, 0.5);
  const cx = W / 2 - t - f - dr / 2; const cz = D / 2 - t - f - dr / 2;
  const centros = [[-cx, -cz], [cx, -cz], [cx, cz], [-cx, cz]];
  return {
    externo: { largura: W, profundidade: D, cantos: r },
    interno: { largura: W - 2 * t, profundidade: D - 2 * t, cantos: ri },
    labio: { largura: W - t, profundidade: D - t, cantos: rl },
    base: { de: 0, ate: hb }, vaoDaBase: { de: t, ate: hb + 1 },
    labioY: { de: hb - t, ate: hb + he },
    tampa: { de: hb, ate: H }, vaoDaTampa: { de: hb - 1, ate: H - t }, rebaixo: { de: hb - 1, ate: hb + he },
    centros, raioDoRessalto: dr / 2, raioDoFuro: df / 2,
    ressaltoDaBase: { de: t / 2, ate: hb }, furoDaBase: { de: -1, ate: hb + 1 },
    ressaltoDaTampa: { de: hb, ate: H - t / 2 }, furoDaTampa: { de: hb - 1, ate: H - 2 * t },
    rasgo: { largura: q.comprimentoDoRasgo ?? 0, profundidade: q.larguraDoRasgo ?? 0, cantos: (q.larguraDoRasgo ?? 0) / 2 - 0.01 },
    rasgoY: { de: H - t - 1, ate: H + 1 }, primeiroRasgo: -((q.rasgos ?? 1) - 1) * (q.passoDosRasgos ?? 0) / 2,
    recorteRetangular: [[(q.centroDoRetangulo ?? 0) - (q.larguraDoRetangulo ?? 0) / 2, -D / 2 - 1], [(q.centroDoRetangulo ?? 0) + (q.larguraDoRetangulo ?? 0) / 2, -D / 2 - 1], [(q.centroDoRetangulo ?? 0) + (q.larguraDoRetangulo ?? 0) / 2, -D / 2 + t + 1], [(q.centroDoRetangulo ?? 0) - (q.larguraDoRetangulo ?? 0) / 2, -D / 2 + t + 1]],
    retanguloY: { de: (q.alturaDosRecortes ?? 0) - (q.alturaDoRetangulo ?? 0) / 2, ate: (q.alturaDosRecortes ?? 0) + (q.alturaDoRetangulo ?? 0) / 2 },
    recorteRedondo: { centro: [q.centroDoRedondo ?? 0, q.alturaDosRecortes ?? 0, -D / 2 - 1], raio: (q.diametroDoRedondo ?? 0) / 2, comprimento: t + 2 },
  };
}
