# Sonda da costura arredondada em nó de tubos, 2026-11-15

A sonda é o teste `procedural/nucleo/operacoes/arredondar-costura-no.test.ts` sobre a fixture `procedural/nucleo/fixtures/no-de-tubos.js`, e se reproduz com `npx vitest run procedural/nucleo/operacoes/arredondar-costura-no.test.ts`. Os tubos têm 48 lados, raio constante e um polo de 1 mm em cada ponta, são unidos num `unir` e arredondados num `arredondarCostura` com raio de 3 e de 5 mm, sem outro argumento e com `raioMinimo` de 1 mm.

O `arredondarCostura` fecha a malha, sem órfão, sem aresta sem par e sem vínculo não manifold, nos cinco casos sem ponto triplo: T reto de raios 17 e 8 mm, oblíquo a 35° de raios 17 e 8 mm, oblíquo a 60° de raios 17 e 16 mm, dois tubos de raio 8 mm que saem do mesmo ponto a 22° e três tubos cujas costuras no receptor não se tocam.

Ele recusa nos dois casos com ponto triplo, que são dois tubos de raio 8 mm a 22° nascendo no mesmo ponto de um tubo de raio 17 mm, sozinhos ou com um quarto tubo de raio 16 mm à frente, como no nó do selim de um quadro. A recusa sai como órfão do passo, no vértice da costura que fica no tubo receptor entre os dois estais, e diz que as duas superfícies se fecham em 60,8° e que o círculo tangente pediria recuo maior que o raio; com 5 mm, diz que a superfície dobra mais de 45° entre o canto e a tangência. Com `raioMinimo` de 1 mm a recusa continua, dizendo que nem o raio mínimo coube.

Uma primeira versão da sonda deixou as pontas dos tubos abertas, e o `unir` recusou por sólido não fechado; outra afastou os estais 12 mm do eixo do receptor, e a tampa do estai passou para fora da superfície dele, o que é defeito da fixture e não da operação. As duas ficaram fora da fixture.
