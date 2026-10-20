# Alvo: caminhao-bombeiro

## Origem

- Modelo: "firetruck" do pacote A, de autor A.
- Autor: autor A.
- Pacote: pacote A, com o arquivo `firetruck.glb` (seis malhas: corpo, grade e quatro rodas).
- Licença: licença livre sem exigência de crédito, declarada no `License.txt` do pacote.
- Página: endereço omitido
- A malha não está no repositório (`importados/veiculos-livres/pacote-a/firetruck.glb`, ignorado pelo git).
- Referências versionadas: `fonte-vistas.png` (quatro vistas com a cor original) e `fonte-partes.json` (caixas e silhuetas em fatias de superfície, em metro, escala 1,765, comprimento de 6,001 m). A frente está em +z e à esquerda na vista lateral, sem giro.
- Sem texto nem marca: só cores, escada e luzes.

## Medidas contra a fonte

- Caixa total: x ±1324 mm, y 0 a 3001 mm e z ±3001 mm, iguais à fonte.
- `comparar-silhueta --rigoroso --cabine auto`: fatias em z com média de 1 mm e máxima de 76 mm; fatias em y com média de 2 mm e máxima de 58 mm; cabine com máxima de 13 mm; zero fatias fora de 120 mm.
- Folha comparativa: interseção sobre união de 0,991 (isométrica), 0,992 (lateral), 0,995 (frontal) e 0,996 (de cima).
- Rodas: pneu de 1060 mm de diâmetro e 530 mm de largura, centros em x 971, z 1694 (frente) e -1165 (trás), pé no chão.

## O que não ficou igual

- Persianas: dente de serra de 65 mm (pico em x 1235, vale em x 1170 e 1175 alternados, para não haver vértices colineares); a fonte tem vale no fundo do compartimento e lâminas inclinadas com sombreado.
- Carroceria em três trechos (frente, meio, trás), partidos nos pilares entre os compartimentos; é decisão de construção para a face lateral não ter triângulos longos, e não aparece na imagem.
- Teto da cabine: placa cinza de 12 mm sobre a cabine; a fonte a tem rente.
- Para-choque: viga alta e postes simplificados (a fonte tem uma travessa entre os postes e recortes escuros entre as vigas); a placa de trás sobe 1 mm.
- Estribo: bloco cinza entre a carroceria e o para-lama, de forma aproximada.
- Pneu liso, sem chanfro; aro é um disco liso sem cubo escuro.
- Cores aproximadas, tiradas de `fonte-vistas.png`; o vermelho tem uma só cor, a fonte tem gradiente de sombra.
- Traseira lisa: nenhuma vista da fonte a mostra.

## Diferenças por vista (folha aberta)

- Lateral: perfil, degrau entre cabine e carroceria, janela, três compartimentos com 4, 3 e 3 persianas, saias cinza e rodas na mesma posição; a persiana da receita é menos contrastada.
- Frontal: cabine mais estreita que a carroceria, para-brisa, faróis amarelos, pilares vermelhos, barra de luzes, painel e hastes do teto aparecem como na fonte; o para-choque tem menos relevo.
- De cima: teto cinza da cabine, barras de luzes, painel elevado entre as hastes e fenders cinza nas mesmas posições.
- Isométrica: mesma leitura; as persianas da fonte parecem mais fundas.
