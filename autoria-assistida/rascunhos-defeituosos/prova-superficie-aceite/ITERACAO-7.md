# Iteração 7 — comparação parcial com o P0

**Decisão:** reprovada parcialmente; sem aceite.

A comparação cobre somente `z=400..2320` mm — nariz até cowl. A prancha P0 e
a sobreposição são evidências distintas em `evidencias/`. A leitura confirma
que a silhueta local ainda diverge muito do alvo: o contorno lateral é angular,
a planta é larga cedo demais e a seção frontal não acompanha o desenho.

As cinco rejeições executáveis nesse recorte deram:

- passam: L01 (nariz), L13 (ombro), abertura de roda e recorte de farol;
- falha: L14 e raio do arco; a prova usa raio interno de 345 mm onde o P0 pede
  arco de 385 mm, e o topo está fora do landmark;
- fora de escopo: teto, traseira, dimensões globais, superfície F3 completa e
  as oito rejeições integrais. Elas não foram marcadas como aprovadas.

O ganho da prova é separar duas perguntas: a representação agora consegue
abrir e integrar recortes; a forma declarada ainda não atinge o alvo. O próximo
passo não é fechar R2 nem promover código: é corrigir os parâmetros e a malha
da região frontal contra a sobreposição antes de tentar o conjunto completo.
