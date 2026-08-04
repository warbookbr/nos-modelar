# Mecanifica — acordo de trabalho

Este repositório mantém o núcleo procedural, as receitas, o visor compatível,
a bancada e as ferramentas que sustentam a autoria da Mecanifica. A aplicação
jogável, a Oficina humana e o som foram removidos. `bancada.html` é a única
aplicação publicada aqui. O produto do cliente vive em
[`warbookbr/mecanica`](https://github.com/warbookbr/mecanica).

## Entrada de contexto

Leia `docs/mecanifica/INDEX.md` e `docs/mecanifica/planos/README.md` antes de
planejar. Sem plano ativo, o backlog não autoriza implementação. Se tocar
núcleo, plano, atrito ou identidade em trabalho paralelo, leia a coordenação
local, consulte a inbox e reserve arquivos.

## Regras

- O núcleo de autoria é independente de Three.js e do domínio automotivo.
- IDs internos, índices de arrays e posições de passos nunca são identidade
  persistida.
- Conteúdo salvo é determinístico, versionado, reexecutável e validável.
- Modele e revise peças na bancada neutra antes de levá-las ao produto.
- Mudanças gerais que possam voltar ao NÓS ficam isoladas e registradas em
  `docs/mecanifica/UPSTREAM-NOS.md`.
- Não invente contrato genérico de materiais, PBR, paleta nova ou capacidade de
  produto nesta documentação.

## Coordenação e qualidade

- Use pt-BR.
- Rode os gates completos do INDEX.
- Não edite `docs/uso/MAPA.md` à mão; rode `npm run mapa`.
- Histórico e evidências encerradas não governam trabalho novo.
