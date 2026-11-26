# Processo e CI: a série dos dez envios sem vermelho falso

Pasta do plano [processo e CI](../../planos/2026-11-26-processo-e-ci.md), gate de saída 2. Cada linha é um envio da sessão ao ramo dela, com o resultado do CI conferido por `gh api repos/warbookbr/nos-modelar/actions/runs?head_sha=<commit>`. Conta como vermelho falso o que reprova por infraestrutura, por teto de tempo ou por junção perdida; o vermelho por defeito do envio não conta nem zera a série, porque é o que o CI existe para pegar.

| Envio | Data | CI | Na série |
| --- | --- | --- | --- |
| d242b681 | 2026-11-26 | verde | 1 |
| 44eab990 | 2026-11-26 | verde | 2 |
| e7716db5 | 2026-11-26 | vermelho, testes lentos parte 2/10: o apt recusou a fonte da Microsoft da imagem do GitHub (403, "no longer signed") nas três tentativas do `install-deps` | zera |
| b342a5c6 | 2026-11-26 | verde, a main andou e o Pages publicou | 1 |
| 18c4c5d3 | 2026-11-26 | verde e a main andou; a publicação falhou no GitHub, que não achou o pacote da página ("Fetching artifact metadata failed"), e a nova tentativa falhou por achar dois, o da primeira e o novo; a publicação seguinte leva a página | 2 |

O vermelho de e7716db5 é de infraestrutura e o processo o pegou sozinho, pela reprovação do CI. A correção tira a fonte da Microsoft antes de instalar as bibliotecas do navegador (`.github/actions/preparar/action.yml`), e a série recomeça no envio dela.
