# Capacidades candidatas ao NÓS

Este registro separa melhorias gerais do produto Mecanifica. Nenhuma entrada
autoriza implementação ou alteração no repositório original.

| Capacidade | Estado e prova | Arquivos | Limite |
|---|---|---|---|
| identidade semântica | entregue e exercitada em peças | `motor/oficina.js`, testes | não usa UUID ou índice salvo |
| partes e grupos | entregue na bancada | `motor/oficina.js`, `bancada.html` | montagem persistida fora |
| portas | entregue, 8 portas provadas | `guarda-portas-bancada.mjs` | cópia de arranjo endereçável por `nomes` |
| arranjo radial/linear | entregue, provado por teste | `portas-espelho-arranja.test.ts`, `nome-de-copia.test.ts` | origem copia uma fonte |
| furo e centros | entregue, provado por teste | `pose-de-criacao.test.ts`, `normais-lisas.test.ts` | não é booleana geral |
| booleanas `unir`, `subtrair`, `intersectar` e `arredondarCostura` | entregue no núcleo, provado por teste; ferramentas conferidas sobre a malha unida | `procedural/nucleo/operacoes/booleanas.js`, `manifold.js`, `booleanas.test.ts`, `arredondar-costura.test.ts`, `arredondar-costura-convexa.test.ts`, `ferramentas-sobre-uniao.test.ts` | depende de `manifold-3d` (WebAssembly), que o núcleo carrega sozinho por await no topo do módulo; só sólido fechado; arredondamento do encontro côncavo (padrão), da borda convexa da costura e das arestas internas da ferramenta de um `subtrair` (`arestas`), todos com raio declarado e medido na malha; em faces planas por prismas em meia-esquadria, em superfície curva facetada por fatias (`ombro-uniao.test.ts`, `arredondar-costura-convexa.test.ts`); onde três arestas do mesmo tipo se encontram a ponta fica reta, e o raio que não cabe grita com `raioMinimo` e `regiao` como saídas |
| faixa estendida de ids por passo | entregue no núcleo, provado por teste; usada pelas booleanas e pelo `arredondarCostura` | `procedural/nucleo/nucleo.js` (`idDoPasso`), `booleanas-revisao-2.test.ts` | do id local 1000 em diante o passo numera em `2^40 + i·2^20 + (k − 1000)`; nenhum conteúdo salvo renumera; furo, arranja e geradores ainda gritam ao passar do bloco |
| contorno 2D puro | entregue no núcleo, provado por teste; o esboço e a forma global N2 o importam | `procedural/nucleo/contorno.js`, `contorno.test.mjs` | funções puras sobre listas `[u, v]`: retângulo de cantos arredondados, recuo por meia-esquadria (só contorno convexo), área com sinal, convexidade e polígono simples (convexo ou côncavo); não faz recuo de contorno côncavo nem união de contornos |
| perfil 2D com furo e deslocamento de contorno, extrudado (`extrusao`) ou revolucionado (`lathe` com `furos` e `deslocar`) | entregue no núcleo, provado por teste; sobre a `CrossSection` da Manifold, com a saída canônica e o hash fixados | `procedural/nucleo/perfil2d.js`, `operacoes/perfis.js`, `pedacos-convexos.js` (extraído de `booleanas.js`), `perfil2d.test.mjs`, `extrusao-de-perfil.test.ts` | furo inteiro dentro do externo e longe da borda (recusado com a distância medida); canto redondo, reto ou em esquadria; grade de 1e-8 do Clipper2; `deslocarContorno` de `contorno.js` não delega a ele, porque preserva o número de vértices que a casca do `loft` exige |
| refinamento da forma global | entregue, provado por teste; opcional na receita (`REFINA`) e no andaime (`portas`) | `src/autoria/refinamento-global.js`, `tools/mecanifica/refinamento-global.mjs`, `refinamento-global.test.js`, `refinamento-global.test.mjs` | confere partes dentro do envelope dos volumes e as portas do andaime pela interface do `publicarPorta` e por `porta-confere-forma.js`; o envelope é limite superior, não prova que a parte preenche o volume |
| `sin`, `cos`, `tan`, `atan`, `atan2` e `sqrt` nas expressões | entregue no núcleo, provado por teste; o ângulo entra e sai em graus, como `graus` das operações | `procedural/nucleo/expressoes.js`, `expressoes.test.ts` | lista fechada de funções; `sqrt` recusa número negativo |
| orientação de seção | entregue em `loft` | `loft-fechado.test.ts`, núcleo | costura de `lathe` continua aberta |
| revisão visual | entregue em quatro vistas | `olhar-bancada.mjs` | visor legado mantém import map para `earcut` |
| exportação resolvida | entregue e gateada | `exportar.mjs` | produto lê dados, não receita |
| consulta de subárvore | entregue na bancada | `descrever-peca.mjs`, testes | sem montagem persistida |
| materiais genéricos | futuro | backlog | não há contrato PBR ou paleta aberta |
| montagem/solver | futuro | planos concluídos e backlog | sem pose, contato ou solver persistidos |

Critério para uma contribuição: manter núcleo sem Three.js e domínio, fornecer
prova determinística, declarar limite e apontar o teste. A prova apontada tem de
existir: até 2026-09-22 três linhas desta tabela apontavam receitas de acervo
apagadas em agosto, e a tabela afirmava "entregue" com a prova fora do
repositório. Prova é teste, porque teste sai do repositório com barulho e
receita de exemplo sai em silêncio. O histórico de
experimentos está em `docs/mecanifica/historico/`.
