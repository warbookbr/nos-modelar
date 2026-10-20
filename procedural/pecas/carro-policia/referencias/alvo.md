# Alvo: carro-policia

## Origem

Modelo "police" do pacote A, de autor A, pacote pacote-a, arquivo `police.glb`. Autor: autor A. Licença livre sem exigência de crédito (declarada no `License.txt` do pacote). Página: endereço omitido. A malha não está no repositório (`importados/veiculos-livres/pacote-a/police.glb`, ignorado pelo git). Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (escala 1,765). A origem confere com `docs/mecanifica/veiculos-referencias.json` (pacote A, police). Sem texto, marca nem brasão: só cores e a barra de luzes. Na lateral da fonte a frente está à esquerda.

## Medidas contra a fonte

Caixa de 2648 x 2294 x 5472 mm (com espelhos e placas), igual à fonte a menos de 1 mm. Rodas de 1060 mm de diâmetro e 529 mm de largura, centros em z ±1430. Os planos da carroceria (capô, para-brisa a 45 graus, cabine afunilando de 971 a 794 mm de meia largura, saia inclinada, blocos de ponta, anéis de para-lama) foram lidos das faces da malha, não só do perfil simplificado.

## Diferenças restantes, vistas na folha comparativa (`folha/folha.png`)

- Isométrica (união sobre interseção 0,97): o triângulo azul sobre o teto é o painel branco do teto, que tem cor quase igual à do fundo na máscara; na textura ele coincide. Na fonte a defensa tem barras com recuo na grade; na receita a travessa e os braços são caixas simples.
- Lateral (0,99): coincide. O degradê claro da porta é uma cor única; o arco da roda tem 10 mm de folga (raio 540 contra 530 do pneu) para não coincidir com a superfície do pneu.
- Frontal (0,99): coincide. As luzes azul e vermelha das pontas da defensa e as faixas amarelas dos faróis são caixas planas; a cor das lentes é lida da textura.
- De cima (0,98): coincide, com a mesma observação do painel branco. A planta curva da barra baixa usa 6 segmentos.
- Pneu com chanfro de 50 mm e aro com cubo, por `lathe`; na fonte o cubo é um pouco menor. Lanternas traseiras vermelhas e a placa de trás vêm das faces da malha (z -2648).
- Cores tiradas da textura `colormap.png` da fonte; o brilho das imagens difere pouco do da fonte.
