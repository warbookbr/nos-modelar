# R2 — iteração 5: leitura por máscara de profundidade

**Decisão:** a comparação anterior por vértices segue descartada; a nova
comparação é válida para diagnosticar, mas reprova a forma global.

A máscara deriva de pixels com profundidade no rasterizador R1B, em vez de
estimar contorno pela lista de vértices. Ela é medida nas três câmeras P0 em
1024 × 768, resolução suficiente para não mascarar o limiar milimétrico pelo
tamanho do pixel. A varredura de profundidade foi corrigida para essa resolução:
ela não expande mais todos os pixels como argumentos de função.

A evidência `comparacao-silhueta-p0.json` mede desvios grandes em planta e
frontal, acima de qualquer tolerância P0. Portanto, os loops globais existem e
podem ser editados, mas a forma não pode seguir para recortes. A próxima mudança
deve usar o pior ponto medido para ajustar largura/altura local, seguida pela
mesma regressão das três vistas.
