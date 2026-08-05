# Mecanifica

Repositório de autoria procedural, receitas determinísticas e bancada de
inspeção para o simulador 3D Mecanifica.

## Portas

- [Abrir a Mecânica](https://warbookbr.github.io/mecanica/) — produto do cliente,
  mantido em [`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).
- [Abrir a bancada](https://warbookbr.github.io/nos-mecanifica/bancada.html) —
  seleção, isolamento, contexto fantasma, explosão e vistas reproduzíveis.

Este repositório publica somente `bancada.html`. A aplicação jogável, a Oficina
humana, o som e suas pontes foram removidos. O produto carrega peças resolvidas;
ele não executa o núcleo procedural.

## Estado

Casos 1 e 2 estão homologados e as Fatias 1A e 1B do MCP foram aprovadas e
encerradas. Não há plano ativo; o Caso 3 ainda não começou.
O núcleo, as receitas, o visor compatível, a bancada e as ferramentas continuam
ativos. O contrato genérico de materiais ainda não existe. O servidor estático
local ainda falha ao resolver o import bare `earcut`.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
npm run criar -- _viga
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`. Para o produto do
cliente, use o repositório [`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).

Comece por [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md). Ele aponta
fontes de verdade, leitura por tarefa, comandos e gates. O inventário completo
está em [`docs/uso/MAPA.md`](docs/uso/MAPA.md).

Documentos em `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS ou
resultados históricos. Não autorizam trabalho novo. Em caso de divergência,
`docs/mecanifica/` prevalece.

## Licença e origem

O código permanece sob a licença [MIT](LICENSE). O histórico Git original foi
preservado para comparação e contribuições futuras.
