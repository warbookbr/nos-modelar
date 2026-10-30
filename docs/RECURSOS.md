# Recursos e portas de entrada

Este índice descreve o estado atual do Modelar. A aplicação publicada deste
repositório é `bancada.html`; a aplicação do cliente vive em
`warbookbr/mecanica`. A antiga aplicação jogável, Oficina humana e som foram
removidos e aparecem somente no histórico.

## Comece aqui

- [`docs/COMECE-AQUI.md`](COMECE-AQUI.md): o projeto explicado a quem chega de
  fora.
- [`docs/modelar/INDEX.md`](./modelar/INDEX.md): estado, fontes de verdade,
  comandos e gates.
- [`package.json`](../package.json): scripts disponíveis.
- [`docs/MAPA.md`](MAPA.md): mapa gerado dos documentos e recursos.
- [`docs/modelar/planos/README.md`](./modelar/planos/README.md): plano ativo
  (nenhum), contrato e concluídos.

## Comandos atuais

Os comandos de modelagem e verificação estão no `package.json`. Entre os mais
usados estão:

```bash
npm test
npm run typecheck
npm run build
npm run descrever -- balcao-liso
npm run bancada -- freio-disco --vistas=isometrica
npm run mapa
npm run mapa:check
npm run docs:links:check
```

Para a lista completa, use `npm run` ou leia os scripts do `package.json`; não
há mais comandos `oficina`, `servir`, `guardar:salvar`, `jogar`, `criar`, `executar`, `gabarito` ou `peca`.

## Contratos

- [`docs/modelar/FLUXO-MODELAGEM-IA.md`](./modelar/FLUXO-MODELAGEM-IA.md):
  contrato v4 de autoria e revisão.
- [`docs/nos-herdado/oficina-contrato.md`](./nos-herdado/oficina-contrato.md): vocabulário procedural
  herdado do NÓS.
- [`docs/nos-herdado/oficina-referencia.md`](./nos-herdado/oficina-referencia.md): aviso de
  compatibilidade da interface removida.

Evidências encerradas ficam em [`docs/modelar/historico/`](./modelar/historico/)
e não governam trabalho novo.
