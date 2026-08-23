# Iteração 8 — arco dianteiro alinhado ao P0

**Decisão:** passou no recorte regional; sem aceite da R2.

O loop real da abertura foi corrigido para centro `y=340 mm`, `z=1325 mm`,
raio interno `385 mm` e topo no landmark `L14 = [830, 725, 1325]`. A comparação
isolada em `evidencias/arco-dianteiro-p0-vs-loop.svg` usa esse loop da malha,
não um contorno desenhado sobre a renderização.

As cinco rejeições parciais passam: nariz, ombro, arco, abertura de roda e
recorte de farol. Esse resultado só prova a região dianteira: não avalia a
silhueta completa, transições de superfície, teto, traseira nem as oito
rejeições integrais do P0.

O crítico independente aprovou o mesmo recorte após receber apenas alvo,
modelo e comparação em PNG; relatou desvio residual baixo, sem aparência
triangular. A revisão isolada das quatro vistas do quarto dianteiro também
aprovou a nova faixa de transição: sem a antiga cunha, abertura desconectada ou
quina frontal. Próximo gate: aplicar o mesmo ciclo isolado ao recorte do farol.
