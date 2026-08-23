# R2 — iteração 4: controles de caráter sem recortes

**Decisão:** infraestrutura e topologia de controle aprovadas; forma global
ainda não está aceita.

A cage agora contém os landmarks de base e topo do para-brisa, teto e fim do
vidro traseiro como linhas distintas. Capô, teto, queda traseira, ombro e
cintura são loops endereçáveis, e a linha de ombro tem vinco explícito de um
nível. A mudança não cria arco, vidro, farol ou outra abertura.

O compilado volta a medir 4,60 m × 2,00 m × 1,19 m. As vistas ortográficas e o
teste mostram a transição do teto e a queda traseira como controles reais; elas
ainda não bastam para aceitar a silhueta como carro.

Uma tentativa de reutilizar o comparador histórico foi rejeitada: ele estima a
frontal por faixas de vértices de toda a malha e produz um contorno ziguezague,
não a silhueta visível. A próxima etapa é extrair máscara de silhueta do
rasterizador com profundidade da R1B e compará-la, por vista isolada, contra a
prancha P0. Só então um loop poderá ser movido por desvio medido.
