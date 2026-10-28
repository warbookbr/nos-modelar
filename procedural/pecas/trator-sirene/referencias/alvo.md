# Alvo: trator-sirene

## Origem

Modelo "tractor-police" do pacote A, de autor A, pacote pacote-a, arquivo `tractor-police.glb`. Autor: autor A. Licença livre sem exigência de crédito (declarada no `License.txt` do pacote). Página: endereço omitido. A malha não está no repositório (`importados/veiculos-livres/pacote-a/tractor-police.glb`, ignorado pelo git). Referências versionadas: `fonte-vistas.png` e `fonte-partes.json` (escala 1,765, caixa centrada em z 0). A origem confere com `docs/modelar/veiculos-referencias.json` (pacote A, tractor-police). Sem texto, marca nem brasão: só cores e as lentes da sirene. Na lateral da fonte a frente está à esquerda.

## Medidas contra a fonte

Caixa de 2368 x 3004 x 4062 mm, igual à fonte a menos de 1 mm. Os planos foram lidos dos triângulos da malha por cor de textura, não só do perfil simplificado: espinha de 936 mm, capô de y 831 a 1599, cabine afunilando de 775 a 622 mm de meia largura, anel do para-lama traseiro de 15 a 120 graus (raio 927,5 a 1082,5), suporte dianteiro dobrado, defensa dianteira, engate. Pneus de 24 lados, traseiros de 1855 mm e dianteiros de 1150 mm de diâmetro.

## Diferenças restantes, vistas na folha comparativa (`folha/folha.png`)

- Isométrica (interseção sobre união 0,905): a faixa azul sobre o teto e o tampo do capô é falsa, porque o branco dessas faces é lido como fundo na máscara; na textura coincidem.
- Lateral (0,988): coincide. Os flancos e o anel têm o recorte do pneu nos mesmos vértices.
- Frontal (0,990): coincide.
- De cima (0,69): a sobra de 38% é o mesmo efeito do branco (teto, capô e capô-tampo são brancos na fonte e contam como fundo); a silhueta por fatia confere a menos de 43 mm.
- Os vidros são placas de 12 mm por fora das faces, e na fonte estão rentes à face; o vidro traseiro e os laterais ficam 12 mm mais salientes.
- A cabine é cortada pelo anel do para-lama (o anel e o pneu atravessam a cabine na fonte); a parte escondida foi retirada para os sólidos não se atravessarem. O retrovisor claro encosta no flanco da base e só pela aresta no flanco da cabine.
- O pneu tem o rebaixo do aro, o aro cônico e, atrás, o cubo claro; os raios finos e o relevo da banda da fonte não existem. A faixa escura do capô e as janelas azuis do painel da frente são uma cor única.
- Cores tiradas da textura `colormap.png` da fonte; o brilho das imagens difere pouco do da fonte.
