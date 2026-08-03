# AUT-2026-16 — hierarquia semântica mínima de partes

**Estado:** ativo

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `bdc85da`.

## Problema observado

As partes da peça já têm nomes estáveis, mas ainda formam uma lista plana. Uma
IA que modela um mecanismo consegue dizer que existe `pinca`, `pastilha` e
`pistao`, porém não consegue registrar que pastilha e pistão pertencem à pinça.
Isso obriga outro agente a reconstruir essa intenção pela geometria ou pelo
nome, e impede uma inspeção estrutural simples antes de crescer para uma
montagem grande. A lacuna é a regra 3 de
[`AUTORIA-IA.md`](../AUTORIA-IA.md) e o próximo degrau explícito de
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

## Resultado

Uma parte pode declarar opcionalmente um pai semântico por nome estável. O
núcleo recusa pai ausente, inválido, igual ao filho ou troca posterior de pai;
o estado neutro, a descrição headless e a bancada exibem a mesma árvore,
determinística, sem alterar a geometria nem as transformações.

## Incluído

- campo opcional `pai` no passo `parte`, validado depois que a receita inteira
  declarar suas partes; a ordem de fabricação não vira regra da árvore;
- preservação do pai no estado neutro e nos grupos da bancada;
- árvore determinística no `npm run descrever` e rótulo de contexto no painel;
- uma fixture mecânica existente com uma hierarquia curta;
- recusa explícita de dados inválidos e bloqueio de exportação enquanto o
  formato resolvido ainda não transporta hierarquia.

## Excluído

- reparenting, transformação herdada, explosão por subárvore ou seleção de
  filhos;
- pai entre peças, submontagem, persistência de montagem e solver;
- mudança do formato `peca-resolvida` ou do produto cliente;
- inferir hierarquia a partir de nomes, caixas ou proximidade.

## Gate de saída

1. uma peça real declara uma raiz e dois filhos, e a descrição enumera a árvore
   em ordem estável;
2. pai inválido, inexistente, auto-pai e tentativa de trocar pai falham antes
   de produzir metadado ambíguo;
3. a bancada mostra a relação sem mudar posição, malha, isolamento ou explosão;
4. acervo sem `pai` permanece byte-idêntico nos gates existentes;
5. exportar uma peça hierárquica recusa com causa clara até haver contrato de
   artefato próprio.

## Fatias

1. fixar baseline e contratos de recusa;
2. registrar e validar `pai` no núcleo neutro;
3. expor a árvore no descritor e na bancada;
4. provar numa peça, validar compatibilidade e fechar.

## Riscos e parada

Se a menor forma exigir que o pai mova filhos, que uma montagem persista estado
ou que o artefato resolvido ganhe consumidor no produto, este plano para. Esses
são contratos posteriores e não serão disfarçados de metadado de peça.

## Fechamento

Preencher ao concluir: commit, gates, resultado observado e candidatos que
continuarem no backlog.
