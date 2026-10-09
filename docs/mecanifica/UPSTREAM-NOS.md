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
