---
name: auditar-montagem
description: Auditar uma montagem persistida da Mecanifica por contexto semântico, relações, impacto de revalidação e vistas visuais. Use quando a tarefa envolver composição de peças, submontagens, encaixes, dependências ou revisão de um conjunto.
---

# Auditar montagem

Use esta skill quando o alvo for uma árvore de composição. A unidade geométrica
editável continua sendo a peça; a montagem organiza peças e relações. Esta
skill audita o estado existente e não transforma a montagem em receita de peça.

## 1. Descobrir o conjunto

Para uma montagem persistida, descreva a árvore com raízes explícitas:

```bash
npm run descrever:montagem:persistida -- \
  --arquivo=montagens/conjunto.json \
  --raiz-montagens=montagens \
  --raiz-pecas=pecas-resolvidas
```

Use `--caminho=freio/disco`, `--profundidade=N` e
`--incluir-relacionados` para reduzir o contexto semântico. Confirme IDs,
caminhos, instâncias, poses, caixas, partes, portas e relações. Não trate
`caixaMundo` como prova de colisão, contato ou folga.

O arquivo raiz deve estar dentro de `--raiz-montagens` e as peças dentro de
`--raiz-pecas`. Traversal, symlink, JSON inválido e referência ausente devem
falhar sem saída parcial. O JSON descreve dados persistidos; não executa shell,
receitas, renderizador ou escrita.

## 2. Ver e medir

Capture mais de um enquadramento, começando por isométrica e direita:

```bash
npm run olhar:montagem -- \
  --arquivo=montagens/conjunto.json \
  --raiz-montagens=montagens \
  --raiz-pecas=pecas-resolvidas \
  --saida=tools/bancadas/out/revisao-conjunto \
  --vistas=isometrica,direita
```

Leia os PNGs. Registre montagem, vista, instâncias visíveis e enquadramento.
Imagem é evidência visual, não substitui relação mensurável nem prova global.
Saída existente não deve ser sobrescrita.

## 3. Revalidar o impacto

Para um alvo alterado, derive o roteiro de revalidação. Separe relações
diretas, indiretas, executáveis e pendências fora de cobertura. Uma relação
local satisfeita não torna a montagem globalmente válida; registre sempre os
limites atuais, inclusive quando colisão global e dependências indiretas não
foram verificadas.

## 4. MCP de leitura

Quando o host estiver configurado por `MECANIFICA_CATALOGO_MONTAGENS`, descubra
montagens pelo recurso `mecanifica://montagens` e use somente IDs semânticos:

- `descrever_montagem`: contexto inteiro ou recorte;
- `planejar_revalidacao_montagem`: impacto e pendências do alvo;
- `catalogar_montagens`: relações entre raízes explicitamente autorizadas;
- `renderizar_montagem`: uma a quatro vistas em memória.

O cliente não fornece caminhos locais ao MCP. A configuração confiável mantém
as raízes. O MCP atual é somente leitura; não assuma que ele materializa
arquivos, publica revisão ou faz commit. A escrita pode ser adicionada quando
o plano ativo de autoria segura fechar seus gates — essa sequência é uma
decisão de implementação, não um veto permanente ao MCP.

## Relato

Separe fatos estruturais, medidas, observações visuais e inferências. Informe
o caminho semântico afetado, a relação que falhou, o alcance do impacto e o
que ficou fora da verificação. Não use índice de array, UUID ou caminho local
como identidade pública.
