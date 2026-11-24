/* tabela.js — a guia linear de esferas de perfil, por tamanho, em milímetro.

   A ISO 12090-1 fixa as medidas de contorno da guia de perfil, mas o texto dela não é público, e as tabelas abertas são de
   fabricante. Os valores abaixo são as medidas de intercâmbio usuais do mercado para a série de carro estreito de flange
   reto, comuns a vários fabricantes, e entram como regra da família: a largura e a altura do trilho, o passo da furação e o
   furo com rebaixo dele; a largura, a altura de montagem (da base do trilho ao topo do carro), o comprimento, a folga de
   baixo do carro, a distância entre os furos do carro (em x e em y) e a rosca deles.

   FICHA parametrosDaGuia
   serve: os parâmetros da família `guia-linear` pelo tamanho (15, 20, 25 e 30): o trilho com a furação e o carro de
     esferas montado sobre ele numa posição.
   quando: movimento linear de mesa, carro ou eixo de máquina sobre trilho de perfil.
   unidades: mm.
   campos:
     tamanho: 15, 20, 25 ou 30.
     comprimento: o comprimento do trilho.
     posicaoDoCarro: o começo do carro ao longo do trilho.
   devolve: os parâmetros completos da família; o trilho vai ao longo de y com a base em z = 0, e as portas `base` e `mesa`.
   exemplo:
     chamar(registro.obter('guia-linear'), 'guia', parametrosDaGuia(15, { comprimento: 600, posicaoDoCarro: 200 }))
   peça: tools/fixtures/elementos-de-maquina/mesa-linear.mjs (as duas guias 15 sobre os perfis).
   FIM DA FICHA */

const tamanho = (larguraDoTrilho, alturaDoTrilho, passo, diametroDoFuro, diametroDoRebaixo, profundidadeDoRebaixo, larguraDoCarro, alturaDeMontagem, comprimentoDoCarro, folgaDeBaixo, furosDoCarroX, furosDoCarroY, rosca) => Object.freeze({ larguraDoTrilho, alturaDoTrilho, passo, diametroDoFuro, diametroDoRebaixo, profundidadeDoRebaixo, larguraDoCarro, alturaDeMontagem, comprimentoDoCarro, folgaDeBaixo, furosDoCarroX, furosDoCarroY, rosca });

export const GUIAS = Object.freeze({
  15: tamanho(15, 15, 60, 4.5, 7.5, 5.3, 34, 24, 61.4, 4.3, 26, 26, 4),
  20: tamanho(20, 18, 60, 6, 9.5, 8.5, 44, 30, 77.5, 4.6, 32, 36, 5),
  25: tamanho(23, 22, 60, 7, 11, 9, 48, 36, 84, 5.5, 35, 35, 6),
  30: tamanho(28, 26, 80, 9, 14, 12, 60, 42, 97.4, 6, 40, 40, 8),
});

/** Os parâmetros da família para o tamanho da guia, com o comprimento do trilho e a posição do carro; recusa o tamanho que não existe. */
export function parametrosDaGuia(nome, { comprimento, posicaoDoCarro = 0 } = {}) {
  const g = GUIAS[String(nome)];
  if (!g) throw new Error(`guia linear: o tamanho '${nome}' não existe; aceitos: ${Object.keys(GUIAS).join(', ')}`);
  return { ...g, comprimento, posicaoDoCarro };
}
