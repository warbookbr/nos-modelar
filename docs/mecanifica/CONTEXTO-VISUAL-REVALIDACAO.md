# Contexto visual, revalidação e catálogo de montagem

## Capacidades

O contexto estrutural de uma montagem resolvida agora possui três consumidores
neutros e separados:

- `adaptarMontagemThree` compõe as peças em poses mundo e mantém caminhos
  semânticos no grafo visual;
- `derivarRoteiroRevalidacao` classifica relações diretas, indiretas,
  executáveis e pendências fora de cobertura;
- `derivarCatalogoMontagens` indexa usos e relações somente nas raízes
  explicitamente recebidas.

Nenhuma saída afirma colisão ou validade global. O catálogo não varre disco nem
infere dependência por proximidade.

## Captura confinada

```bash
npm run olhar:montagem -- \
  --arquivo=montagens/conjunto.json \
  --raiz-montagens=montagens \
  --raiz-pecas=pecas-resolvidas \
  --saida=tools/bancadas/out/revisao-conjunto \
  --caminho=freio/disco \
  --vistas=isometrica,direita
```

`olhar-montagem.mjs` usa um visor privado servido somente durante a captura. A
bancada publicada não muda e continua sendo a única aplicação do repositório.
Saída existente não é sobrescrita. Os metadados registram montagem, vista,
instâncias visíveis e caminhos relativos das imagens.

Uma imagem é evidência para leitura do agente; não substitui relações
mensuráveis, roteiro de revalidação ou diagnóstico estrutural.

## Escrita interna

O armazenamento escolhido está em
[`ESCRITA-TRANSACIONAL-MONTAGEM.md`](ESCRITA-TRANSACIONAL-MONTAGEM.md). Revisões
são imutáveis, conteúdo e commits usam SHA-256, e o commit é a fronteira de
visibilidade. Concorrência produz conflito explícito. MCP e materialização no
workspace permanecem fora.
