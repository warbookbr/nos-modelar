# Prova privada de superfície — R2

Primeira hipótese de autoria: uma meia pele dianteira por quatro estações de
caráter declaradas. Cada estação nomeia eixo e bojo do capô, quebra de ombro,
volume do flanco, soleira e recorte de farol; a malha deriva dessas decisões.

## Resultado da iteração 1: reprovada

As quatro vistas foram abertas em PNG. A lateral e a superior leem como uma
faixa dobrada; a isométrica não sustenta a leitura de um quarto dianteiro. A
verificação local também recusa a malha: ela não tem abertura de roda
topológica nem recorte de farol geométrico. Uma linha desenhada sobre a imagem
não será aceita como substituto.

## Iteração 2: representação corrigida, ainda sem aceite

O arco passou a ser uma borda curva de quadriláteros ao redor de espaço vazio,
e o retalho do farol é removido da pele em vez de pintado. A segunda leitura,
porém, mostrou o arco separado da pele. O verificador agora reprova qualquer
malha com mais de um componente conectado: não basta conter as peças certas,
elas precisam formar uma carroceria contínua. A iteração seguinte adiciona as
duas pontes que unem as extremidades do arco aos vértices da pele; a imagem é
o juiz dessa integração, não a contagem de componentes.

O próximo incremento é topológico: uma cage única, com os loops do arco e do
farol inseridos nela antes da geração das faces. Ainda faltam sobreposição P0,
rejeições completas e crítico independente. Não há aprovação.

Gerar vistas: `node render.mjs`.
