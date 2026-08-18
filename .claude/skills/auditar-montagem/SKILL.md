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

Quando a observação precisar sobreviver a outra execução, use
`mecanifica.achados-critica-visual` v1: alvo semântico, vista, severidade,
observação objetiva, decisão, estado, hash opcional da evidência e vínculo
`antes/depois`. Reexecute o mesmo achado após a correção. Não marque como
resolvido somente porque uma imagem nova existe; compare o defeito declarado.

Além das vistas iniciais, a captura de montagem aceita `frontal`, `traseira`,
`esquerda`, `superior` e `inferior`. Escolha até quatro por chamada conforme o
defeito investigado; não use a frontal como substituta silenciosa do verso.

## 3. Revalidar o impacto e as interseções

Para um alvo alterado, derive o roteiro de revalidação. Separe relações
diretas, indiretas, executáveis e pendências fora de cobertura. Uma relação
local satisfeita não torna a montagem globalmente válida; registre sempre os
limites atuais, inclusive quando colisão global e dependências indiretas não
foram verificadas.

Quando a alteração é na definição reutilizada e não em uma ocorrência, use
`{tipo:'peca'|'montagem', ref}` no planejador. A resposta precisa listar todos
os `consumidoresDefinicao` da raiz; planejar apenas a primeira ocorrência deixa
as demais instâncias sem revalidação. A limitação de usos fora da raiz continua
obrigatória.

`descrever_montagem` só fornece contexto estrutural. `revisar_montagem`, quando
disponível, também audita pares de peças-folha por contenção e malha. Registre
para cada par `interpenetram`, `encostam`, `separadas` ou `inconclusivo`, o método,
as expectativas associadas e a cobertura. Interpenetração reprova a revisão;
`inconclusivo`, foco parcial ou vista indisponível deixam-na incompleta. Uma
expectativa explica a intenção, mas nunca apaga um achado. Não chame isso de
solver, folga universal, movimento ou aprovação completa.

No serviço local, foco `incidente` testa o alvo contra toda a raiz; foco
`interno` testa apenas pares cujos dois lados estão dentro da subárvore. Use o
segundo para inspecionar um subconjunto grande sem receber todos os vizinhos,
mas reporte `paresOmitidosPorFoco`: consulta interna nunca vira passe global.

Para comparar poses, prefira alterações compactas endereçadas pelo id da
instância e pelo campo inteiro `pose.rotacao`/`pose.deslocamento`. Audite cada
estado separadamente. Duas poses estáticas não provam folga em toda a trajetória;
se não houve varredura, registre essa ausência em vez de inferir movimento livre.

## 4. MCP de leitura

Quando o host estiver configurado por `MECANIFICA_CATALOGO_MONTAGENS`, descubra
montagens pelo recurso `mecanifica://montagens` e use somente IDs semânticos:

- `descrever_montagem`: contexto inteiro ou recorte;
- `planejar_revalidacao_montagem`: impacto e pendências do alvo;
- `catalogar_montagens`: relações entre raízes explicitamente autorizadas;
- `renderizar_montagem`: uma a quatro vistas em memória entre as sete direções
  suportadas;
- `revisar_montagem`: verificações declaradas, auditoria de interseções,
  cobertura, recomendações e vistas.

O cliente não fornece caminhos locais ao MCP. A configuração confiável mantém
as raízes. O perfil padrão é somente leitura e não materializa arquivos, publica
revisão nem faz commit. Quando o host habilitar explicitamente o perfil `autoria`,
use `observar_autoria_montagem`, `planejar_*`, `inspecionar_proposta_montagem` e
`aplicar_autoria_montagem` somente na sequência observação → plano → inspeção →
aplicação; a aplicação exige confirmação, gates e revalidação. Isso é opt-in,
não uma permissão implícita do catálogo e não é veto permanente ao MCP.

## Relato

Separe fatos estruturais, medidas, observações visuais e inferências. Informe
o caminho semântico afetado, a relação que falhou, o alcance do impacto e o
que ficou fora da verificação. Não use índice de array, UUID ou caminho local
como identidade pública.
