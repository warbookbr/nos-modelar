/* tabela.js — os perfis estruturais da série europeia, em milímetro: altura h, largura b, alma tw, aba tf, raio de
   concordância r (e, no U, o raio da ponta da aba r2 e a inclinação da face de dentro da aba).

   IPE (I de abas paralelas), HE A (H de abas largas) e UPN (U de abas inclinadas) pela EN 10365, lidos nas tabelas de
   propriedades da ArcelorMittal (Orange Book, "Section properties" de IPE, HE e UPN, aço S355). A inclinação da aba do UPN é
   de 8 % até 300 mm de altura e de 5 % acima, como a EN 10365 dá na figura do perfil; a aba tem a espessura tf a meia
   largura.

   O perfil de alumínio ranhurado não tem norma pública: os lados de 20, 30, 40 e 45 mm e as aberturas de ranhura de 6, 8, 8
   e 10 mm são os usuais do mercado, e a forma da ranhura e do furo central segue regra da família (`geometria.js`). */

const perfil = (h, b, tw, tf, r, r2 = 0, inclinacao = 0) => Object.freeze({ h, b, tw, tf, r, r2, inclinacao });

export const IPE = Object.freeze({
  80: perfil(80, 46, 3.8, 5.2, 5), 100: perfil(100, 55, 4.1, 5.7, 7), 120: perfil(120, 64, 4.4, 6.3, 7), 140: perfil(140, 73, 4.7, 6.9, 7),
  160: perfil(160, 82, 5.0, 7.4, 9), 180: perfil(180, 91, 5.3, 8.0, 9), 200: perfil(200, 100, 5.6, 8.5, 12), 220: perfil(220, 110, 5.9, 9.2, 12),
  240: perfil(240, 120, 6.2, 9.8, 15), 270: perfil(270, 135, 6.6, 10.2, 15), 300: perfil(300, 150, 7.1, 10.7, 15), 330: perfil(330, 160, 7.5, 11.5, 18),
  360: perfil(360, 170, 8.0, 12.7, 18), 400: perfil(400, 180, 8.6, 13.5, 21), 450: perfil(450, 190, 9.4, 14.6, 21), 500: perfil(500, 200, 10.2, 16.0, 21),
  550: perfil(550, 210, 11.1, 17.2, 24), 600: perfil(600, 220, 12.0, 19.0, 24),
});

export const HEA = Object.freeze({
  100: perfil(96, 100, 5.0, 8.0, 12), 120: perfil(114, 120, 5.0, 8.0, 12), 140: perfil(133, 140, 5.5, 8.5, 12), 160: perfil(152, 160, 6.0, 9.0, 15),
  180: perfil(171, 180, 6.0, 9.5, 15), 200: perfil(190, 200, 6.5, 10.0, 18), 220: perfil(210, 220, 7.0, 11.0, 18), 240: perfil(230, 240, 7.5, 12.0, 21),
  260: perfil(250, 260, 7.5, 12.5, 24), 280: perfil(270, 280, 8.0, 13.0, 24), 300: perfil(290, 300, 8.5, 14.0, 27), 320: perfil(310, 300, 9.0, 15.5, 27),
  340: perfil(330, 300, 9.5, 16.5, 27), 360: perfil(350, 300, 10.0, 17.5, 27), 400: perfil(390, 300, 11.0, 19.0, 27), 450: perfil(440, 300, 11.5, 21.0, 27),
  500: perfil(490, 300, 12.0, 23.0, 27), 550: perfil(540, 300, 12.5, 24.0, 27), 600: perfil(590, 300, 13.0, 25.0, 27),
});

const upn = (h, b, tw, tf, r1, r2) => perfil(h, b, tw, tf, r1, r2, h <= 300 ? 8 : 5);
export const UPN = Object.freeze({
  50: upn(50, 38, 5.0, 7.0, 7.0, 3.5), 65: upn(65, 42, 5.5, 7.5, 7.5, 4.0), 80: upn(80, 45, 6.0, 8.0, 8.0, 4.0), 100: upn(100, 50, 6.0, 8.5, 8.5, 4.5),
  120: upn(120, 55, 7.0, 9.0, 9.0, 4.5), 140: upn(140, 60, 7.0, 10.0, 10.0, 5.0), 160: upn(160, 65, 7.5, 10.5, 10.5, 5.5), 180: upn(180, 70, 8.0, 11.0, 11.0, 5.5),
  200: upn(200, 75, 8.5, 11.5, 11.5, 6.0), 220: upn(220, 80, 9.0, 12.5, 12.5, 6.5), 240: upn(240, 85, 9.5, 13.0, 13.0, 6.5), 260: upn(260, 90, 10.0, 14.0, 14.0, 7.0),
  280: upn(280, 95, 10.0, 15.0, 15.0, 7.5), 300: upn(300, 100, 10.0, 16.0, 16.0, 8.0), 320: upn(320, 100, 14.0, 17.5, 17.5, 9.0), 350: upn(350, 100, 14.0, 16.0, 16.0, 8.0),
  380: upn(380, 102, 13.5, 16.0, 16.0, 8.0), 400: upn(400, 110, 14.0, 18.0, 18.0, 9.0),
});

/* alumínio ranhurado: lado e abertura da ranhura */
export const ALUMINIO = Object.freeze({ 20: Object.freeze({ lado: 20, ranhura: 6 }), 30: Object.freeze({ lado: 30, ranhura: 8 }), 40: Object.freeze({ lado: 40, ranhura: 8 }), 45: Object.freeze({ lado: 45, ranhura: 10 }) });

export const SERIES = Object.freeze({ IPE, HEA, UPN, ALUMINIO });
export const TIPO_DA_SERIE = Object.freeze({ IPE: 1, HEA: 1, UPN: 2, ALUMINIO: 3 });

/** Os parâmetros da família para um perfil da tabela ('IPE', 200), com o comprimento e o corte; recusa o que não existe. */
export function parametrosDoPerfil(serie, tamanho, { comprimento, corte = 0 } = {}) {
  const tabela = SERIES[serie];
  if (!tabela) throw new Error(`perfil estrutural: a série '${serie}' não existe; aceitas: ${Object.keys(SERIES).join(', ')}`);
  const p = tabela[String(tamanho)];
  if (!p) throw new Error(`perfil estrutural: ${serie} ${tamanho} não existe; aceitos: ${Object.keys(tabela).join(', ')}`);
  if (serie === 'ALUMINIO') return { tipo: 3, altura: p.lado, aberturaDaRanhura: p.ranhura, comprimento, corte };
  return { tipo: TIPO_DA_SERIE[serie], altura: p.h, largura: p.b, alma: p.tw, aba: p.tf, raio: p.r, raioDaPonta: p.r2, inclinacao: p.inclinacao, comprimento, corte };
}
