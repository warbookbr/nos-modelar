# Mecanismos do Modelar: a visão em uma tela

O que existe no projeto além do código que constrói formas, o que cada coisa faz e onde mora. Esta página é a lista; o detalhe de cada mecanismo está no lugar indicado. Escrita em 2026-11-13, pelo [plano das melhorias de processo](planos/2026-11-13-melhorias-de-processo-da-revisao.md), que ainda deve a conferência que acusa mecanismo novo fora desta lista.

| Mecanismo | O que faz | Quando é usado | Onde mora |
|---|---|---|---|
| Contrato | As regras que nenhuma ferramenta confere | No começo de toda sessão | `CLAUDE.md` |
| Instrução por pasta | O que só vale no núcleo, nas peças e nas ferramentas | Ao mexer num arquivo da pasta | `procedural/nucleo/CLAUDE.md`, `procedural/pecas/CLAUDE.md`, `tools/CLAUDE.md` |
| Começar | Diz o que ler, a skill e o primeiro passo de cada tipo de tarefa | Antes de qualquer tarefa | `npm run comecar`, `docs/modelar/roteiros/` |
| Roteiros de leitura | A lista do que se lê por tipo de tarefa, com teto de tamanho | Pelo começar | `docs/modelar/roteiros/roteiros.json` |
| Planos | Autorizam um trabalho e dizem em que arquivos ele mexe | Antes de implementar | `docs/modelar/planos/` |
| Backlog | O que foi adiado, sem autorização de fazer | Ao propor trabalho novo | [`BACKLOG.md`](planos/BACKLOG.md) |
| Skills | O passo a passo de uma tarefa: alinhar, criar peça, auditar | Durante a tarefa | `.claude/skills/` |
| Agentes | Ajudantes de papel fixo: modelador, implementador, crítico visual, revisor | Despachados por quem conduz | `.claude/agents/`, com as regras comuns e o formato do atrito em `.claude/REGRAS-DOS-AGENTES.md` |
| Ficha de capacidade | Para que serve um ajudante do núcleo, os campos e um exemplo que roda | Antes de usar o ajudante | `npm run capacidade` |
| Catálogo | A lista gerada das operações do núcleo, com schema | Ao escrever receita | `docs/modelar/gerado/` |
| Bancada | A tela neutra onde a peça é vista e medida | Antes de a peça ir adiante | `src/bancada/`, `npm run bancada` |
| Crítico visual | Compara as vistas do modelo com a referência, sem saber como a peça foi feita | A cada rodada de forma | `.claude/agents/critico-visual.md` |
| Gates | As verificações que rodam antes de cada envio | `npm run gates` e no CI | `tools/gates.mjs` |
| Testes | Programas que conferem cada parte do sistema | Dentro dos gates | arquivos `*.test.*` ao lado do código |
| Guardas e réguas | Conferem cada peça do acervo: fechada, sem lasca, sem interseção | Nos gates e à mão por peça | `tools/modelar/guardas/`, `tools/modelar/reguas-de-malha/` |
| Famílias | Peças que nascem de medidas, como roda e dobradiça | Ao modelar peça padrão | `procedural/familias/` |
| Extensões | Operações a mais do núcleo, fora do registro base | Ao escrever receita | `procedural/extensoes/` |
| Módulos | Exportadores, esboço, textura, contorno da imagem | Conforme a saída pedida | `modulos/` |
| Servidor de ferramentas | A porta por onde a IA chama as ferramentas sem digitar comando | Em sessão com MCP | `tools/mcp/` |
| Banco de provas | As medidas, imagens e atritos de cada objeto modelado | Ao pesquisar o que já se tentou | `docs/modelar/banco-de-provas/` |
| Mapa e índices | As listas geradas de tudo que existe | Para achar um arquivo | [`MAPA.md`](../MAPA.md), [`INDEX.md`](INDEX.md) |
| Documentos por finalidade | Fazer em `usar/` e `guias/`, consultar em `contratos/`, entender em `decisoes/` e `pesquisas/` | Ao procurar um documento | `docs/modelar/` |
