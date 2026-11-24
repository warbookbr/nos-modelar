/* tabela.js — as correntes de rolos simples da ISO 606, série B europeia, em milímetro: passo p, diâmetro do rolo d1 e
   largura entre as placas internas b1, lidos na tabela aberta de corrente BS/ISO da BEP ("BS Roller Chain") e conferidos
   numa segunda fonte para o 10B e o 16B; o 06B e o 08B pela ficha de catálogo de roda dentada citada no plano.

   A largura do dente da roda é a da ISO 606: 0,93 b1 até o passo de 12,7 mm e 0,95 b1 acima. */

const corrente = (passo, diametroDoRolo, larguraInterna) => Object.freeze({ passo, diametroDoRolo, larguraInterna });
export const CORRENTES = Object.freeze({
  '06B': corrente(9.525, 6.35, 5.72),
  '08B': corrente(12.7, 8.51, 7.75),
  '10B': corrente(15.875, 10.16, 9.65),
  '12B': corrente(19.05, 12.07, 11.68),
  '16B': corrente(25.4, 15.88, 17.02),
});

/** Os parâmetros da família pela corrente e o número de dentes, com o furo e o cubo; recusa a corrente que não existe. */
export function parametrosDaRoda(corrente, dentes, { furo, diametroDoCubo, comprimentoDoCubo } = {}) {
  const c = CORRENTES[corrente];
  if (!c) throw new Error(`roda dentada: a corrente '${corrente}' não existe; aceitas: ${Object.keys(CORRENTES).join(', ')}`);
  const d = c.passo / Math.sin(Math.PI / dentes);
  const raiz = d - c.diametroDoRolo;
  /* o cubo e o furo padrão são regra da família: o cubo até 0,25 d + 2 p, sem passar da raiz menos um passo, que é a folga das placas da corrente */
  const cubo = diametroDoCubo ?? Math.floor(Math.min(raiz - c.passo, 0.25 * d + 2 * c.passo));
  return { ...c, dentes, furo: furo ?? Math.floor(0.5 * cubo), diametroDoCubo: cubo, comprimentoDoCubo: comprimentoDoCubo ?? Math.round(1.2 * c.larguraInterna) };
}
