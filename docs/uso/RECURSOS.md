# Recursos e portas de entrada

Este índice descreve o estado atual da Mecanifica. A aplicação publicada deste
repositório é `bancada.html`; a aplicação do cliente vive em
`warbookbr/mecanica`. A antiga aplicação jogável, Oficina humana e som foram
removidos e aparecem somente no histórico.

## Comece aqui

- [`docs/mecanifica/INDEX.md`](../mecanifica/INDEX.md): estado, fontes de verdade,
  comandos e gates.
- [`package.json`](../../package.json): scripts disponíveis.
- [`docs/uso/MAPA.md`](MAPA.md): mapa gerado dos documentos e recursos.
- [`docs/mecanifica/planos/README.md`](../mecanifica/planos/README.md): plano ativo
  (nenhum), contrato e concluídos.

## Comandos atuais

Os comandos de modelagem e verificação estão no `package.json`. Entre os mais
usados estão:

```bash
npm test
npm run typecheck
npm run build
npm run criar -- _viga
npm run bancada -- freio-disco --vistas=isometrica
npm run mapa
npm run mapa:check
npm run docs:links:check
```

Para a lista completa, use `npm run` ou leia os scripts do `package.json`; não
há mais comandos `oficina`, `servir`, `guardar:salvar` ou `jogar`.

## Contratos

- [`docs/mecanifica/FLUXO-MODELAGEM-IA.md`](../mecanifica/FLUXO-MODELAGEM-IA.md):
  contrato v4 de autoria e revisão.
- [`docs/uso/oficina-contrato.md`](oficina-contrato.md): vocabulário procedural
  preservado para `npm run criar`.
- [`docs/uso/oficina-referencia.md`](oficina-referencia.md): aviso de
  compatibilidade da interface removida.

Evidências encerradas ficam em [`docs/mecanifica/historico/`](../mecanifica/historico/)
e não governam trabalho novo.
