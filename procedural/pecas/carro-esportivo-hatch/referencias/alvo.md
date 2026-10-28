# Alvo: carro-esportivo-hatch

## Origem

- Modelo: "hatchback-sports" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `hatchback-sports.glb` (cinco malhas: carroceria e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/hatchback-sports.glb`, ignorado pelo git). A tabela `docs/modelar/veiculos-referencias.json` confirma o pacote.
- Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (em metro, escala 1,765, comprimento de 5,03 m, frente em +z).

## Medidas contra a fonte

- Caixa: x ±1147, y 0 a 1942 (1 mm de diferença) e z ±2515, iguais à fonte.
- Rodas: diâmetro 1059, largura 618, centros em x ±750, z 1474 e -1385.
- Perfil lateral, seção frontal (cabine de 971 a 794 de meia-largura) e planta tirados da fonte e das cores da textura da malha (para-lama em anel de 688 mm, saia de x 853 a 1147, aerofólio em cunha de z -1249 a -1602).
- Simetria exata em x.

## O que não ficou igual

- Vista lateral (falta 0,58% da área): o para-lama não tem a perna de baixo do lado de fora das rodas e a fonte tem pequenos blocos nos para-choques (z 1987 a 2149 e -2081 a -2014, de y 353 a 514 e 675 a 863); o arco tem 12 segmentos e raio de 545 mm, contra 530 mm da fonte.
- Frontal (sobra 0,68%): o pneu tem 0,1% de sobra nas bordas de baixo por causa dos 32 lados.
- Isométrica (sobra 0,82%): o contorno das rodas e do para-choque da frente sobra por pixels.
- Pneu liso e sem cubo; as rodas têm só o aro cinza.
- Retrovisor sem o vidro claro da face de trás; o vão sob o carro entre as rodas fica aberto como na fonte.
- Placas: caixas claras sem as faixas coloridas da textura.
- Traseira: a fonte não tem vidro, e a receita também não; as lanternas são placas sobre a rampa.
- Cores aproximadas das cores da textura (carroceria `#46ad7c`, saia `#58c088`, cinza `#6d6e83`).

## Duvidoso

- Face de trás da fonte não aparece nas quatro vistas; o aerofólio e a rampa foram lidos da malha.
- A silhueta confere por fatia; a forma é julgada na folha comparativa.
