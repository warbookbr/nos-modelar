/* tabela.js — a corrente de rolos simples da ISO 606, série B, em milímetro: passo, diâmetro do rolo, largura entre as
   placas internas, diâmetro do pino, altura da placa interna e espessura das placas (a da 16B é 4,15 na externa e 3,1 na
   interna), lidos na tabela aberta de corrente BS/ISO da BEP ("BS Roller Chain"), nas linhas da corrente dupla, que
   repetem as medidas do elo da simples. */

const corrente = (passo, diametroDoRolo, larguraInterna, diametroDoPino, alturaDaPlaca, espessuraInterna, espessuraExterna = espessuraInterna) => Object.freeze({ passo, diametroDoRolo, larguraInterna, diametroDoPino, alturaDaPlaca, espessuraInterna, espessuraExterna });
export const CORRENTES = Object.freeze({
  '06B': corrente(9.525, 6.35, 5.72, 3.28, 8.2, 1.3),
  '08B': corrente(12.7, 8.51, 7.75, 4.45, 11.8, 1.6),
  '10B': corrente(15.875, 10.16, 9.65, 5.08, 14.7, 1.7),
  '12B': corrente(19.05, 12.07, 11.68, 5.72, 16.0, 1.85),
  '16B': corrente(25.4, 15.88, 17.02, 8.28, 21.0, 3.1, 4.15),
});

export function medidasDaCorrente(nome) {
  const c = CORRENTES[nome];
  if (!c) throw new Error(`corrente: '${nome}' não existe; aceitas: ${Object.keys(CORRENTES).join(', ')}`);
  return c;
}
