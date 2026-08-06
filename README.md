# Mecanifica

Oficina procedural para IA criar, organizar, inspecionar, medir e corrigir
objetos 3D mecânicos. O repositório reúne o núcleo geométrico, receitas
determinísticas, bancada de inspeção e ferramentas de validação necessárias para
a IA evoluir peças, montagens, carros e, futuramente, robôs.

## Acesso

- [Abrir a bancada](https://warbookbr.github.io/nos-mecanifica/bancada.html) —
  seleção, isolamento, contexto fantasma, explosão e vistas reproduzíveis.

`bancada.html` é a única aplicação publicada. A Oficina humana, a aplicação
jogável e o som foram removidos porque não ampliavam o trabalho de modelagem da
IA neste repositório.

## Objetivo

O objetivo é melhorar e facilitar o trabalho da IA durante todo o ciclo de
autoria:

```text
entender o alvo
→ criar ou alterar a definição
→ executar o núcleo
→ observar e medir o resultado
→ validar relações
→ corrigir
→ revalidar os conjuntos afetados
```

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas, carros
completos e, depois que esse modelo estiver maduro, robôs.

Carro e motor não devem ser receitas monolíticas. A IA deve conseguir trabalhar
em um alvo reduzido, escolher quais componentes observar juntos, manter acesso
às dependências e revalidar as montagens afetadas depois de uma alteração.

O mapa de composição, relações e dependências deve ser dado estruturado do
sistema, não apenas documentação manual. MCP, CLI e API são possíveis portas de
acesso; nenhuma delas substitui o núcleo ou define o modelo de autoria.

Leia [`docs/mecanifica/AUTORIA-IA.md`](docs/mecanifica/AUTORIA-IA.md) para a
definição completa e
[`docs/mecanifica/MONTAGENS-SEMANTICAS.md`](docs/mecanifica/MONTAGENS-SEMANTICAS.md)
para a direção de composição.

## Estado

- Casos 1 e 2 estão homologados; o Caso 3 ainda não começou.
- Não há plano executivo ativo.
- O Módulo 1 do MCP, de leitura e auditoria, foi aprovado.
- A primeira tentativa de autoria controlada foi encerrada com decisão
  `interromper`; o PR #25 foi fechado sem merge.
- O núcleo, as receitas, o visor compatível, a bancada e as ferramentas continuam
  ativos.
- Ainda não existem montagem recursiva persistida, mapa completo de dependências,
  solver geral de encaixe ou camada completa de escrita para IA.
- O contrato genérico de materiais ainda não existe.
- O servidor estático local ainda falha ao resolver o import bare `earcut`.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
npm run criar -- _viga
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`.

Comece por [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md). Ele aponta
fontes de verdade, leitura por tarefa, comandos e gates. O inventário completo
está em [`docs/uso/MAPA.md`](docs/uso/MAPA.md).

Documentos em `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS ou
resultados históricos. Não autorizam trabalho novo. Em caso de divergência,
`docs/mecanifica/` prevalece.

## Licença e origem

O código permanece sob a licença [MIT](LICENSE). O histórico Git original foi
preservado para comparação e contribuições futuras.
