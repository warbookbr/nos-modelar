# Decisões

Visão do projeto e o porquê das escolhas que continuam governando o trabalho:
o que o Modelar é, o critério que filtra capacidade nova, a continuidade da
arquitetura e a coordenação com os outros repositórios.

## Registros de decisão

Os registros moram em `registros/`, um arquivo curto por decisão em vigor, com
o nome `AAAA-MM-DD-assunto-curto.md`. Cada um diz o que ficou decidido, por
quê, quando reabrir, a origem (o caminho e o commit do plano ou documento onde
a decisão foi tomada) e o registro que substitui. O formato é fixo e tem teto
de 250 palavras.

Registro aceito não é editado. Uma decisão nova o substitui: o registro novo
nomeia o antigo na linha `Substitui:`, o antigo passa a dizer
`Estado: substituído por <arquivo>.md.` e sai da lista abaixo, que o gate lê.
A lista é gerada: `npm run decisoes:gerar` a regrava e `npm run decisoes:check`
reprova formato inválido e lista desatualizada.

Decisões em vigor, por data:

<!-- decisoes:inicio -->
- 2026-08-19: [A pele exterior da carroceria nasce de subdivisão com vincos, e não de loft, envelope varrido, campo implícito nem kernel próprio](registros/2026-08-19-pele-da-carroceria-por-subdivisao.md)
- 2026-08-20: [Potrace e o traçador do Inkscape ficam fora do caminho crítico da prancha por licença e por semântica](registros/2026-08-20-potrace-e-inkscape-fora-do-caminho-critico.md)
- 2026-09-03: [A ciência de materiais mora no repositório irmão, sem import nos dois sentidos](registros/2026-09-03-ciencia-de-materiais-no-repositorio-irmao.md)
- 2026-10-07: [O OCCT é kernel só da exportação STEP e não da autoria](registros/2026-10-07-occt-so-na-exportacao-step.md)
- 2026-10-14: [Potrace e VectorCraft não substituem a borda subpixel do contorno da imagem](registros/2026-10-14-borda-subpixel-e-resolvedor-de-restricoes.md)
- 2026-10-25: [Os importadores de .csg, STEP e STL saíram, e o desenho deles fica guardado para quem os recriar](registros/2026-10-25-importadores-fora-com-o-desenho-guardado.md)
- 2026-10-27: [O grafo de capacidades saiu e só volta se o motor ganhar tipos intermediários de artefato](registros/2026-10-27-grafo-de-capacidades-fora.md)
- 2026-10-30: [Não há glossário separado: o termo é definido no documento que o governa](registros/2026-10-30-sem-glossario-separado.md)
- 2026-11-05: [O esboço 2D antigo só se recria se voltar a haver objeto sem forma de referência](registros/2026-11-05-esboco-antigo-fora.md)
- 2026-11-08: [Textura, relevo e ambiente são gerados de números, sem imagem de fora](registros/2026-11-08-material-gerado-de-numeros.md)
- 2026-11-13: [As hipóteses de forma reprovadas em 38 falhas de autoria não voltam como base, e duas regras de processo valem antes de abrir experimento](registros/2026-11-13-hipoteses-de-forma-reprovadas-e-regras-de-processo.md)
<!-- decisoes:fim -->

Não moram aqui:

- formato e regra de consulta, que ficam em `../contratos/`;
- guia de como fazer uma tarefa, que fica em `../usar/`;
- pesquisa e análise com data, que ficam em `../pesquisas/`;
- plano em andamento, que fica em `../planos/`.
