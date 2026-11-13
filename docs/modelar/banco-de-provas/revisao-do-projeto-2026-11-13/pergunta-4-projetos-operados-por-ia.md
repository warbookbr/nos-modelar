# Pergunta 4: como se organiza a documentação de um projeto operado por IA

Pesquisa feita em 2026-11-13 pela web. A [pesquisa anterior](pergunta-4-projetos-comparaveis.md) olhou projetos de modelagem por código; esta olha a organização de documentos em repositórios em que um agente trabalha, que é o caso do Modelar. Três páginas foram abertas e lidas; o resto veio do resumo da busca e está dito assim. São quase todas fontes de prática, não de pesquisa com medida, e valem como opinião informada.

## O que as fontes dizem

O arquivo de instrução da raiz é índice, não enciclopédia. O formato [AGENTS.md](https://agents.md) não tem campo obrigatório, e os guias de 2026 pedem o menor conjunto de instruções próprias do repositório, apontando para outros documentos em vez de copiá-los ([guia da BuildBetter](https://blog.buildbetter.ai/agents-md-complete-guide-for-engineering-teams-in-2026/), [Agentic AI Foundation](https://aaif.io/blog/writing-an-effective-agents-md), pelo resumo da busca). O relato da equipe do Codex sobre trabalhar com agentes diz, segundo um resumo de terceiro, que o arquivo deve ter perto de 100 linhas e apontar onde cada coisa mora, com o conhecimento versionado no repositório; a página original recusou a abertura (HTTP 403) e isto não foi confirmado na fonte.

O contexto vem em camadas. Um estudo de caso de um sistema de 108 mil linhas descreve três: uma memória sempre carregada com as convenções e os ganchos de busca, 19 agentes especialistas, e uma base de 34 documentos de especificação abertos sob demanda, medidos em 283 sessões ([arXiv 2602.20478](https://arxiv.org/abs/2602.20478), só o resumo lido).

Os arquivos de contexto crescem como configuração. Um estudo de 2.303 arquivos de contexto em 1.925 repositórios achou que eles "evoluem como código de configuração, por adições pequenas e frequentes" e ficam difíceis de ler; 75,9% trazem como testar, 70,8% detalhes de implementação e 68,1% arquitetura ([arXiv 2511.12884](https://arxiv.org/abs/2511.12884), só o resumo lido).

Documento velho é instrução errada. O agente lê o documento como instrução, e o que envelheceu o manda fazer a coisa errada sem ninguém ter atacado nada ([Codeminer42](https://blog.codeminer42.com/stale-docs-are-prompt-injection-you-wrote-yourself/), lido inteiro). O caso relatado: cinco registros de decisão foram editados para parecer atuais e esconderam quando a decisão mudou. O conserto foi tornar o registro imutável depois de aceito, trocar decisão por um registro novo que substitui o antigo, gerar o índice por máquina com o CI reprovando a diferença, tirar do índice o registro substituído, e mandar o agente começar pelo índice; o índice lista 156 decisões em vigor em cerca de 2.800 palavras, e o CI avisa quando um registro novo passa de 800 palavras.

Plano concluído envelhece; decisão curta dura. As fontes separam o plano e o documento de projeto, que são grandes, olham para a frente e ficam velhos quando a coisa é entregue, do registro de decisão, que é curto e guarda o porquê que o código não guarda (manual da Polar, [Prefactor](https://prefactor.tech/blog/the-death-of-documentation), pelo resumo da busca).

Cada página serve a uma finalidade. O [Diátaxis](https://diataxis.fr), adotado pela Canonical em 2021, separa a documentação em quatro tipos por necessidade de quem lê: aprender, fazer uma tarefa, consultar e entender; a regra é que uma página não misture dois. As fontes o tratam como um bom padrão de partida e não como obrigação de ter quatro pastas (pelo resumo da busca).

## O Modelar contra isso

| Prática | Modelar hoje | Medida |
|---|---|---|
| Raiz como índice curto | cumpre | `CLAUDE.md` com 2,6 KB e o `comecar` |
| Contexto em camadas, sob demanda | cumpre | 13 arquivos obrigatórios e 31 sob condição, com teto conferido |
| Índice gerado e conferido | cumpre em parte | mapa e catálogo gerados; lista de planos à mão em três arquivos |
| Uma finalidade por página, pasta por finalidade | não cumpre | 43 documentos soltos em `docs/modelar/`, com contrato, guia, visão e pesquisa lado a lado |
| Decisão curta e imutável, plano fora depois de entregue | não cumpre | 118 planos encerrados na árvore (1,4 MB, 12 KB em média) e nenhum registro de decisão separado |
| Documento substituído sai do índice | não cumpre | montagem persistida V1, V2, V3 e V4 lado a lado; 64 arquivos de histórico |
| Instrução ao lado do que governa | não cumpre | um arquivo de contrato na raiz e nenhum por pasta |

Leitura minha. O Modelar já fez a parte difícil, que é limitar e conferir o que se lê no começo. O que falta é a organização do que fica depois da primeira leitura: separar por finalidade, tirar da área de trabalho o que foi substituído, e guardar a decisão no lugar do plano inteiro.

## O que não foi confirmado

O relato original da equipe do Codex e os artigos completos do arXiv não foram lidos. Nenhuma fonte mede o efeito da organização por finalidade no trabalho de um agente; a recomendação se apoia no relato de quem praticou.
