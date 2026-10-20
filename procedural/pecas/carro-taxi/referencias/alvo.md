# Alvo: carro-taxi

## Origem

Modelo "taxi" do pacote A, de autor A (pacote pacote-a, arquivo taxi.glb), autor autor A, licença livre sem exigência de crédito (declarada no License.txt do pacote), página endereço omitido. A malha não entra no repositório: fica em `importados/veiculos-livres/pacote-a/taxi.glb`, que o git ignora. Do modelo saem só as medidas em `fonte-partes.json` (escala 1,765, gerado por `modelo-de-referencia.mjs`) e as quatro vistas em `fonte-vistas.png`. A origem confere com a tabela `docs/mecanifica/veiculos-referencias.json` (pacote A, taxi). Na vista lateral da fonte a frente está à esquerda, como o acervo pede.

## Medida de referência

Caixa de 2648 mm de largura (com os espelhos), 2648 mm de altura (com o luminoso) e 4854 mm de comprimento (com as placas). A receita reproduz a caixa a menos de 1 mm.

## Como a receita foi feita

Refeita a partir da estrutura do carro-sedan-compacto. Carroceria amarela por extrusão do perfil lateral com os arcos recortados no perfil; chassi em três trechos (soleira de 2294 mm até y 520, painel de 1950 mm acima), cabine, luminoso, para-brisa, vidro traseiro e janelas laterais por interseção do perfil lateral com a seção frontal (a cabine afunila de 1950 mm na cintura a 1610 mm no teto); para-lamas em anel sobre a soleira; caixas de roda entre as faces de dentro dos pneus; rodas por `lathe` com chanfro; para-choques pela planta de quinas fechadas.

## Diferenças restantes, vistas na folha comparativa (`folha/folha.png`)

- Frontal: a faixa azul no alto do para-brisa e a faixa no topo do luminoso são artefato da máscara, porque o vidro e o luminoso da fonte têm cor quase igual ao fundo; a silhueta real coincide. Falta de relevo: a fonte tem o centro da grade recuado em relação aos blocos dos faróis; na receita a grade e os blocos saem 8 e 15 mm do nariz, sem recuo real.
- Lateral: coincide (interseção sobre união 0,98). A fonte mostra uma faixa escura entre soleira e painel que a receita só separa por degrau de largura, e o friso claro da porta é uma placa de 10 mm.
- De cima: as linhas azuis do luminoso e do vidro são o mesmo artefato de cor. O chassi traseiro da receita segue a planta da fonte só até z -2339 (largura 1046 mm); o para-choque de trás tem 37 mm.
- Isométrica: o relevo do capô da fonte (leve elevação central) é plano na receita; o tom do capô, do teto e da lateral varia por sombreamento na fonte e é uma cor única na receita.
- Cores lidas à mão da imagem; as lanternas vermelhas são suposição, porque nenhuma vista da fonte mostra a traseira com cor nítida. Não há mapa de brilho: a ferramenta de brilho não existe neste worktree.
