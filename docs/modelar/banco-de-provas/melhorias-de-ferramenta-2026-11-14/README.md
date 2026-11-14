# Melhorias de ferramenta tiradas de 17 peças modeladas por subagentes

Pasta de uma proposta num branch separado, sem plano ativo: o que as 17 peças modeladas numa sessão local (bicicleta, copo, garrafa, vaso, prato, abajur, três mesas, disco de freio, vela e outras) pediram à ferramenta, em ordem de prioridade, e o que cada item mudou. A pessoa alinha a proposta com a sessão que conduz os planos antes de ela entrar na main.

- [Operações do motor que faltaram](OPERACOES-QUE-FALTARAM.md): a lista proposta ao plano do núcleo para quem escreve receita.

## O que mudou nas ferramentas

Contato declarado que mede invasão: o `descrever` mede cada contato declarado corpo a corpo com `src/autoria/contato-de-solidos.js`, por componente conexo dentro de cada parte (`src/autoria/invasao-de-contato.js`). Encostar, inclusive face coplanar e aresta sobre a face, passa; afundar mais que 0,1 mm (um décimo de milímetro, em peça em metro) reprova com o par de corpos e a profundidade, e o contato pode declarar `invasaoMaxima` com o motivo quando a junta afunda de propósito. A profundidade passou a incluir pontos ao longo das arestas, porque a haste que atravessa um cilindro não tem vértice dentro dele e dava indeterminada. A relação entre partes do `descrever` confirma `interpenetra` corpo a corpo, e deixa de herdar a contenção de ponto da parte inteira, que se anula quando dois corpos da mesma parte se sobrepõem.

Movimentos: a receita exporta `MOVIMENTOS` (prismático ou rotativo, com partes, eixo, de, ate e passos), e `src/autoria/movimentos-da-peca.js` leva as partes que se movem a `passos + 1` posições e mede cada uma com a régua do item anterior. A conferência de articulação existente (`src/autoria/conferir-articulacao.js`) pede uma montagem resolvida, com instâncias e portas com eixo, e a gaveta de uma receita só não tem nenhuma das duas.

Análise da bancada: `npm run bancada -- <peça> --analise --saida=<pasta>` grava em `<pasta>/analise-<peça>/`, e duas peças na mesma pasta não se misturam mais. O teste da linha de comando da rodada de modelagem usa a peça fixa `tools/fixtures/acervo/rodada-de-medicao` em vez da primeira peça do acervo. O esqueleto de receita traz a forma mínima de material, parte com vários corpos, ALIASES, PONTOS e furos, apontando a receita do acervo que é exemplo vivo. Cinco pegadinhas de `lathe`, `unir`, `moveV`, extrusão e `loft` entraram em `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`.
