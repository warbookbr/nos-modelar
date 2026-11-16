/* geometria.js — as constantes de construção da família `componente-eletronico` e as contas puras em milímetro.

   O referencial de todo encapsulamento é o da placa: y = 0 é a face de cima da placa e o corpo fica em y > 0; os terminais
   descem até y = -pernaAbaixoDaPlaca, que é o que atravessa a placa e sobra embaixo dela. O centro dos furos (o centróide dos
   pads, como no Eletrifica) fica em x = z = 0, e o eixo longo do componente é x. As medidas que a família não expõe como
   parâmetro moram aqui, com a origem de cada uma; as que expõe estão em `familia.json`, com faixa e padrão. Toda medida é
   estimativa do encapsulamento típico, nunca leitura de um componente em particular.

   Fontes: a tabela `BODIES` de `eletrifica/modulos/pcb/render_3d.py` (linhas 43 a 68) e a prática de mercado dos
   encapsulamentos (passo de 2,54 mm, as folhas de dados JEDEC do TO-220AB e do DIP de 300 e 600 mil, e as barras de pinos de
   2,54 mm). As restrições de `familia.json` repetem algumas destas constantes: se mudar uma, mude a outra. */

/* o passo de 2,54 mm (0,1 polegada) entre pinos do DIP, do TO-220 e da barra */
export const PASSO_DE_PINO = 2.54;
/* o raio da dobra do terminal axial, em múltiplos do diâmetro do fio: o arame dobrado à mão ou na dobradeira */
export const DOBRA_EM_FIOS = 1;
/* o terminal axial começa dentro do corpo, a esta distância da ponta, para entrar nele */
export const ENTRADA_DO_TERMINAL = 0.3;
/* o resistor axial: o perfil do corpo em frações do comprimento (x) e do raio (r), com as pontas mais largas (onde o filme
   termina nas tampas) e o meio um pouco mais fino, como no resistor de filme de carbono de 1/4 W */
export const PERFIL_DO_RESISTOR = Object.freeze([
  [0, -0.5], [0.7, -0.5], [1, -0.42], [1, -0.3], [0.86, -0.23], [0.86, 0.23], [1, 0.3], [1, 0.42], [0.7, 0.5], [0, 0.5],
]);
/* as faixas de cor, em frações do comprimento, cada uma numa zona plana do corpo: a primeira na tampa da esquerda, as de valor
   no meio e a de tolerância na tampa da direita, afastada das outras como no código de cores; o raio da faixa é o da zona mais
   3 % do raio, para ela sair do corpo e ter cor própria */
export const FAIXAS_DO_RESISTOR = Object.freeze({
  4: Object.freeze([[-0.40, -0.32, 1], [-0.20, -0.12, 0.86], [-0.06, 0.02, 0.86], [0.32, 0.40, 1]]),
  5: Object.freeze([[-0.40, -0.32, 1], [-0.20, -0.13, 0.86], [-0.08, -0.01, 0.86], [0.05, 0.12, 0.86], [0.32, 0.40, 1]]),
});
export const SOBRA_DA_FAIXA = 0.03;
export const LADOS_DO_RESISTOR = 16;
export const LADOS_DO_FIO = 3; // segmentos por quarto de volta do fio redondo: 12 lados
export const LADOS_DO_CAPACITOR = 24;
export const LADOS_DO_TERMINAL = 8;
/* o eletrolítico radial: o friso (o vinco do lacre de borracha) perto da base, a borda do topo onde a capa plástica dobra
   sobre a lata, o disco de alumínio do topo com o vinco da válvula em cruz e a faixa de polaridade do lado do negativo */
export const ELETROLITICO = Object.freeze({
  chanfroDaBase: 0.3,
  vinco: Object.freeze({ de: 1.0, fundo: 1.25, ate: 1.5, profundidade: 0.3 }),
  borda: 0.4, // a capa dobra sobre a lata nos últimos 0,4 mm
  recuoDoTopo: 0.75, // a borda da capa cobre 0,75 mm do raio no topo
  disco: Object.freeze({ de: 0.3, ate: 0.1 }), // o disco do topo, de 0,3 a 0,1 mm abaixo da borda
  valvula: Object.freeze({ largura: 0.3, profundidade: 0.1, fracao: 0.75 }),
  faixa: Object.freeze({ abertura: 70, de: 1.6, recuoDoTopo: 0.45, sobra: 0.03, dentro: 0.1, segmentos: 6 }),
  entradaDoTerminal: 0.6,
});
/* o TO-220: os três terminais no passo de 2,54, de 0,8 por 0,5 mm, com o ombro de 1,3 mm de largura até 1,5 mm abaixo do
   corpo; o centro do furo da aba fica 2,8 mm abaixo do topo dela (JEDEC TO-220AB) */
export const TO220 = Object.freeze({
  terminais: 3, larguraDoTerminal: 0.8, espessuraDoTerminal: 0.5, larguraDoOmbro: 1.3, ombro: 1.5, entrada: 0.6,
  furoAbaixoDoTopo: 2.8, chanfro: 0.3, sobreposicao: 0.05,
});
/* o DIP: o corpo 0,5 mm acima da placa (o plano de assento), o ombro largo do pino (1,5 mm) que sai do corpo a 35 % da altura,
   desce até 0,9 mm acima da placa e segue estreito (0,5 mm); a chapa do pino tem 0,25 mm; o entalhe do pino 1 na ponta -x e a
   marca redonda rasa ao lado dele */
export const DIP = Object.freeze({
  assento: 0.5, saida: 0.35, larguraDoOmbro: 1.5, fimDoOmbro: 0.9, larguraDoPino: 0.5, espessuraDoPino: 0.25, entrada: 0.3,
  chanfro: 0.25, entalhe: Object.freeze({ raio: 0.75, de: 0.5 }), marca: Object.freeze({ raio: 0.4, profundidade: 0.1, recuo: 1.5 }),
  ladosDoEntalhe: 16,
});
/* a barra de pinos: base de 2,54 mm por via e por fileira, pino quadrado com a ponta chanfrada */
export const BARRA = Object.freeze({ chanfroDaBase: 0.2, chanfroDoPino: 0.3 });

/* o raio de um perfil de revolução em `x`, entre os pontos dele (ambos em frações) */
export const raioNoPerfil = (perfil, x) => {
  for (let k = 0; k < perfil.length - 1; k += 1) {
    const [r0, x0] = perfil[k];
    const [r1, x1] = perfil[k + 1];
    if (x >= x0 && x <= x1 && x1 > x0) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return 0;
};

/* os pontos do terminal axial dobrado, do lado `sinal` (-1 esquerdo, +1 direito), em mm: entra no corpo, sai na horizontal
   no eixo dele, dobra num quarto de volta de raio `DOBRA_EM_FIOS * fio` e desce até a perna abaixo da placa */
export function pontosDoTerminalAxial({ comprimento, passo, fio, altura, perna }, sinal) {
  const rb = DOBRA_EM_FIOS * fio;
  const xc = sinal * (passo / 2 - rb);
  const yc = altura - rb;
  const pontos = [[sinal * (comprimento / 2 - ENTRADA_DO_TERMINAL), altura, 0]];
  for (let k = 0; k <= 4; k += 1) {
    const a = (Math.PI / 2) * (k / 4);
    pontos.push([xc + sinal * rb * Math.sin(a), yc + rb * Math.cos(a), 0]);
  }
  pontos.push([sinal * passo / 2, -perna, 0]);
  return pontos;
}

/* a faixa de polaridade do eletrolítico, no plano xz: um setor de coroa centrado em -x (o lado do terminal negativo) */
export function contornoDaFaixa(raio) {
  const { abertura, sobra, dentro, segmentos } = ELETROLITICO.faixa;
  const fora = raio + sobra;
  const dentroR = raio - dentro;
  const angulos = Array.from({ length: segmentos + 1 }, (_, k) => Math.PI + ((k / segmentos) - 0.5) * (abertura * Math.PI / 180));
  return [
    ...angulos.map((a) => [fora * Math.cos(a), fora * Math.sin(a)]),
    ...[...angulos].reverse().map((a) => [dentroR * Math.cos(a), dentroR * Math.sin(a)]),
  ];
}

/* o comprimento do corpo do DIP: o vão entre o primeiro e o último pino de um lado mais a margem de cada ponta */
export const comprimentoDoDip = (pinosPorLado, margem) => (pinosPorLado - 1) * PASSO_DE_PINO + 2 * margem;
