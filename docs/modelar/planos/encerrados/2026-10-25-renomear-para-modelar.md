# Renomear para Modelar — o projeto e o repositório passam a ter um nome só

**Estado:** concluído

**Responsável:** Claude, com a pessoa trocando o segredo do CI e a chave fora do repositório na fatia 3

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [leitura por demanda e limpeza](./2026-10-22-leitura-por-demanda-e-limpeza.md), que remove antes o código e os documentos sem uso

## Problema observado

O repositório passou a se chamar `nos-modelar`, e o projeto continua chamado Mecanifica em todo lugar. Um mapa feito em 2026-10-25, fora do repositório, contou 5.520 menções em 1.165 arquivos de texto, e 1.498 arquivos com o nome no caminho, sob `docs/modelar/` (1.113) e `tools/modelar/` (385). As menções se dividem em caminhos de pasta (2.406), identificadores de código e de dado (2.230, com 292 formatos e ids `mecanifica.*` distintos e 16 variáveis `MECANIFICA_*`), endereços do repositório e da página publicada (42), texto corrido (175), histórico e planos encerrados (666) e uma configuração fora do repositório. Mover as pastas quebra 102 imports, 71 scripts do `package.json`, os gates que conferem caminho e os links de 157 documentos; a base `/nos-mecanifica/` do Vite e uns 20 arquivos que a repetem deixam de responder quando o endereço publicado muda; e a variável `MECANIFICA_CHAVE_TERMOS` do gate de termos proibidos está no CI e no ambiente da pessoa.

## Resultado

O projeto se chama Modelar no texto, no pacote, nas pastas, no endereço publicado e nas variáveis de ambiente, e nenhum gate, import, link ou passo de CI fica apontando para o nome antigo. Os formatos salvos e o banco local da bancada guardam o identificador antigo, que é dado e não marca.

## Filtro Agent-First

A troca de texto e de caminho é USAR DIRETO: substituição conferida pelos gates de links, citações, estrutura e mapa, sem ferramenta nova. A troca de variável é ENVOLVER: o código lê o nome novo e, por um plano, também o antigo com aviso, para o CI e o ambiente da pessoa mudarem sem quebrar o gate. Os identificadores de formato ficam, porque migrar 300 arquivos salvos e os leitores não dá nada a quem usa (decisão 1).

## Incluído

O nome no texto corrido, nos títulos, no `package.json`, no servidor MCP e na página publicada; a base do Vite e os caminhos `/nos-mecanifica/`; o remoto git e os documentos de coordenação; as pastas `docs/modelar/` e `tools/modelar/` e os módulos `@modelar/*`; as variáveis `MECANIFICA_*` com leitura do nome antigo por um plano; um gate que recusa o nome antigo fora das exceções declaradas.

## Excluído

Os identificadores `mecanifica.*` dos formatos salvos, das operações e dos esquemas, o banco local `mecanifica-bancada` do navegador, que guarda as imagens de referência da pessoa, e o histórico e os planos encerrados, que guardam evidência com hash. A purga de histórico antes de tornar o repositório público segue fora, com a lista guardada fora do repositório.

## Invariantes

As peças do acervo regeneram iguais. Nenhum formato salvo muda de identificador. O núcleo continua sem Three.js. Cada fatia termina com `npm run gates -- --completo` verde.

## Gate de saída

1. Fora das exceções declaradas, nenhum arquivo do repositório contém o nome antigo, e um gate o confere.
2. A página publicada abre no endereço novo, com a bancada carregando uma peça.
3. O CI passa com a chave pelo nome novo, e o nome antigo só aparece no aviso de leitura.
4. `npm run gates -- --completo` verde.

## Fatias

1. **Nome, texto e endereço.** O nome no texto corrido, nos títulos, no `CLAUDE.md`, no `package.json`, no servidor MCP e nos documentos de coordenação; a base do Vite e os caminhos `/nos-mecanifica/` da página publicada e dos testes; o remoto git. Pronto quando a página abre no endereço novo e o texto corrido fora do histórico não tem o nome antigo. Feita em 2026-10-27.
2. **Pastas.** `docs/modelar/` vira `docs/modelar/`, `tools/modelar/` vira `tools/modelar/` e os módulos `@modelar/*` mudam de escopo, com os imports, os scripts, os gates ancorados por caminho, os links e as páginas geradas refeitos numa passada só. Os links dos documentos encerrados são corrigidos sem mudar o texto deles. Pronto quando os gates de links, citações, estrutura e mapa passam.
3. **Variáveis e gate do nome.** As variáveis `MECANIFICA_*` viram `MODELAR_*`, e o código aceita o nome antigo com aviso até o fechamento do plano seguinte; a pessoa troca o segredo do CI e o arquivo da chave fora do repositório. Entra o gate que recusa o nome antigo fora das exceções (formatos, banco local, histórico, aviso de leitura). Pronto quando o CI passa pelo nome novo.
4. **Fechamento.** `UPSTREAM-NOS.md`, backlog, `npm run gates -- --completo` e o plano movido para `encerrados/`; o seguinte é o de ajustes no núcleo dos veículos.

## Decisões da pessoa

1. **Plano próprio, com os formatos fora.** Aprovada em 2026-10-25: a renomeação é um plano depois da leitura por demanda, em três fatias, e os identificadores internos dos formatos salvos e o banco local da bancada ficam com o nome antigo.

## Riscos e parada

O risco maior é um caminho antigo citado por texto que nenhum gate lê, como um comando dentro de uma skill ou de uma mensagem de erro; o gate do nome da fatia 3 existe para isso. Para e volta à pessoa se a página publicada não abrir no endereço novo, se uma peça do acervo mudar, ou se uma fatia passar de um dia.

## Andamento

Escrito em 2026-10-25 a partir do mapa das menções, sem implementação. Ativado em 2026-10-27, com o fechamento do plano da leitura por demanda.

Fatia 1 feita em 2026-10-27. O nome entrou no texto corrido, nos títulos e no contrato, com o artigo trocado ("do Modelar" no lugar de "da Mecanifica"), em 83 arquivos; o pacote e o servidor MCP passaram a `modelar` e `modelar-mcp`, e a base do Vite, os endereços da bancada nas ferramentas e os links do repositório, a `/nos-modelar/`, em 21 arquivos. Os achados, cada um com a resposta se o processo o teria pego. A troca por script alterou a definição do agente crítico, que não pode mudar, e o `calibracao:check` pegou; ela voltou ao texto antigo e fica como exceção do gate do nome na fatia 3. Trocou também o cabeçalho dos arquivos OBJ e MTL que o exportador grava, que é marca do formato salvo como os ids `mecanifica.*` (decisão 1); o teste de hash do exportador pegou, e o cabeçalho voltou ao nome antigo com o motivo no código. Dois testes conferiam o nome do pacote, e os testes rápidos pegaram. A bateria padrão desta fatia levou o tempo da completa, porque os testes lentos rodam por impacto e a fatia tocou o repositório inteiro; com o aceite da pessoa, o envio foi feito com os testes rápidos e as conferências que tinham falhado, e os lentos ficaram para o CI.

Pausado em 2026-10-27, com a fatia 1 enviada: a pessoa trouxe o plano da [bateria rápida e retorno cedo](./2026-10-27-bateria-rapida-e-retorno-cedo.md) para antes, porque cada envio desta renomeação esperava a bateria inteira. A fatia 2 recomeça quando ele fechar.

Reativado em 2026-10-28, com o fechamento do plano da bateria rápida, a partir da fatia 2. O envio passa a ir ao ramo `claude/**`, e o CI junta à main com tudo verde.

Fatia 2 feita em 2026-10-28: `docs/mecanifica/` virou `docs/modelar/`, `tools/mecanifica/` virou `tools/modelar/` e os módulos `@mecanifica/*` passaram a `@modelar/*`, com as referências trocadas por um script em 539 arquivos (caminho literal, caminho com barra escapada em expressão regular, caminho montado por partes e caminho relativo) e as páginas geradas refeitas. O `critico-visual.md` não tinha caminho e ficou intacto; os caminhos absolutos da cópia local gravados nas rodadas de peça ficaram como registro. O processo teria pego sozinho o que a fatia revelou? Em parte: a conferência da calibração do crítico reprovou os 44 julgamentos das doze imagens, porque a impressão do brief incluía o nome da pasta do conjunto. A ferramenta passou a tirar a pasta da impressão (`impressaoDoBrief`, com teste), e os julgamentos foram migrados só depois de provar, um a um, que a impressão gravada saía do mesmo texto com o nome antigo da pasta.

Fatia 3 em 2026-10-28, menos a troca do segredo pela pessoa: as variáveis `MECANIFICA_*` passaram a `MODELAR_*`, lidas por `doAmbiente` (`tools/ambiente.mjs`) e, nos scripts Python, por `do_ambiente` (`tools/blender/ambiente.py`), que aceitam o nome antigo com um aviso por nome; cada ponto de leitura tem um teste que passa o nome antigo. O CI lê o segredo novo e, sem ele, o antigo. Entrou o gate `nome:check` (`tools/arquitetura/nome-antigo.mjs`), que recusa o nome antigo em todo arquivo rastreado fora de exceções declaradas com motivo: identificadores de formato gravados, cabeçalho de OBJ e MTL, URI do servidor MCP, globais da bancada, banco local do navegador, histórico, a pasta local da chave, o aviso de leitura e os testes que o provam. O processo teria pego sozinho o que a fatia revelou? Não, e o gate novo pegou dois defeitos que nenhum outro via: o teste das guardas da bancada procurava as guardas pela pasta antiga e conferia uma de doze, e o link do backlog para a pesquisa de geometria exata apontava uma âncora que a fatia 1 tinha renomeado, que a conferência de links não lê.

Fechado em 2026-10-28. O projeto e o repositório têm um nome só: as pastas `docs/modelar/` e `tools/modelar/`, o escopo `@modelar/*`, as variáveis `MODELAR_*` com o nome antigo aceito com aviso até o fechamento do plano seguinte, e o segredo `MODELAR_CHAVE_TERMOS` do CI, que a pessoa criou e que a rodada de `10a06603` provou sem o antigo. O gate `nome:check` recusa o nome antigo fora das exceções declaradas com motivo. A bateria completa dessa fatia é a do CI, que roda a lista inteira antes de a main andar (decisão 5 do plano da bateria rápida). O `UPSTREAM-NOS.md` não precisou de mudança além da troca da fatia 2. Ficam no backlog o endereço `mecanifica://` do servidor MCP e as globais da bancada. O seguinte é o de [ajustes no núcleo dos veículos](../2026-10-21-ajustes-no-nucleo-dos-veiculos.md).
