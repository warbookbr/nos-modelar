# Separação direcional e impacto local de montagem

**Estado:** ativo

**Responsável:** GPT (arquitetura e revisão) e agente local (execução)

**Repositório e base:** `warbookbr/nos-mecanifica`; PR #42 em `4036286`.

## Problema observado

O [estudo de campo](../RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md)
demonstrou uma intrusão de 5 mm entre disco e ponte da pinça na R002, enquanto
as quatro relações v2 continuaram corretamente satisfeitas. O contexto novo
expõe que colisão global não foi verificada, mas ainda não existe relação
persistida para uma separação espacial declarada nem mapa que responda quais
relações precisam ser revalidadas após mudar uma instância.

Disco–pinça é somente a fixture de aceitação. O contrato não conhece domínio
automotivo e deve servir também a eixo–carcaça, engrenagem–tampa ou qualquer par
de regiões semanticamente endereçadas.

## Resultado

Montagem persistida v3 pode declarar uma separação mínima ao longo de um eixo
entre duas peças ou partes semânticas. O resolvedor mede a relação e um serviço
puro deriva impacto direto e indireto por composição e relações, sem alegar
colisão geral.

## Versionamento e relação

V1/v2 permanecem fechadas e compatíveis. V3 preserva instâncias e relações v2 e
acrescenta `mantemSeparacaoDirecional`, cujos endpoints são:

```text
{ caminho: [ids...], parte?: id-semantico }
```

A especificação é:

```text
eixo: [x,y,z] finito e não nulo, relativo à montagem declarante
separacaoMinima: finito >= 0
toleranciaNumerica: finito >= 0
```

O eixo é normalizado deterministicamente e transformado à pose mundo da
montagem declarante. A medida projeta os vértices das duas regiões: `min(movel)
- max(referencia)`. Valor negativo é sobreposição direcional, não prova de
colisão volumétrica. Parte ausente, vazia ou caminho não peça falha fechado.

## Mapa de impacto local

Entrada: árvore resolvida e caminho semântico alterado. Saída serializável:

```text
formato: mecanifica.impacto-montagem
versao: 1
alvo: { caminho }
relacoesDiretas: relações com endpoint no alvo
relacoesIndiretas: fecho por endpoints compartilhados, separado das diretas
instanciasRelacionadas: caminhos + origem direta/indireta
montagensARevalidar: declarantes e ancestrais, ordenados
limitacoes: uso global fora da raiz e dependência interna de porta não inferida
```

O mapa não executa revalidação, não inventa dependência por proximidade e não
chama todo conectado de diretamente afetado.

## Filtro Agent-First

- **USAR DIRETO:** caminhos, poses, regiões por faces/partes e validação v2.
- **ENVOLVER:** projeção direcional pura e mapa derivado da árvore resolvida.
- **REFATORAR:** leitor/resolvedor apenas para versionar v3 e compartilhar a
  resolução semântica de endpoints; não duplicar composição ou matemática.
- **ADIAR:** colisão de malha, distância euclidiana mínima, espaço varrido,
  catálogo global de usos, revalidação automática, solver, visual, MCP e escrita.

O ganho é diagnóstico explícito e descoberta de impacto. O custo é um novo
contrato versionado; v3 é obrigatório porque alterar silenciosamente v2
quebraria seu fechamento e porque endpoint de região difere de endpoint porta.

## Incluído

- leitor/resolvedor v3 compatível com v1/v2;
- relação genérica `mantemSeparacaoDirecional` entre peça ou parte;
- eixo local da montagem composto corretamente em árvores recursivas;
- mapa local de composição, relações e impacto direto/indireto;
- contexto JSON transportando a nova relação sem malha;
- fixture neutra e R001/R002 como aceitação adicional;
- testes, contrato e documentação Agent-First.

## Excluído

- colisão geral, BVH, distância entre triângulos ou inferência de contato;
- novo formato de peça, hierarquia transportada ou seleção por face/índice;
- mudança em câmera, material, peça publicada ou motor procedural;
- writer, transação, revalidação automática, CLI nova, MCP ou bancada visual;
- mapa entre múltiplas raízes/repositórios ou catálogo global de usos.

## Provas obrigatórias

1. v1/v2 permanecem byte/semanticamente compatíveis e sem relações inventadas.
2. Fixture neutra prova separações positiva, zero e negativa com eixo não unitário.
3. Parte semântica restringe vértices; parte ausente/vazia e eixo zero recusam.
4. Relação em montagem filha usa eixo local composto à pose mundo corretamente.
5. R001 mede `+0.020 m`; R002 mede `-0.005 m` e reprova somente essa relação.
6. Mapa do disco lista `discoNoCubo` e a separação disco–pinça como diretas,
   pinça/cubo como relacionados e ancestrais corretos para revalidação.
7. Impacto indireto é determinístico, separado e não depende da ordem das listas.
8. Contexto continua serializável, sem malha/runtime e abaixo de 64 KiB.
9. Entradas não são mutadas; erros têm código, campo/trilha e ação possível.

## Gate de saída

1. nenhuma string de domínio entra em `src/autoria/`;
2. v3 é explícita e v1/v2 continuam legíveis;
3. separação direcional não é chamada de colisão ou folga euclidiana;
4. identidade usa somente montagem, caminho e parte semântica;
5. mapa distingue impacto direto, indireto e limitação global;
6. provas 1–9, suíte, typecheck, build, mapa, links e planos passam;
7. decisão sobre revalidação automática fica registrada, sem abertura implícita.

## Fatias

1. R00 — contrato v3, fixture neutra e baseline R001/R002;
2. R01 — leitura/resolução de `mantemSeparacaoDirecional`;
3. R02 — mapa de impacto direto e indireto;
4. R03 — integração no contexto e estudo de campo;
5. R04 — documentação, regressões e fechamento.

## Riscos e parada

- parar se projeção direcional for apresentada como colisão geral;
- parar se a região exigir índice de face ou identidade de runtime;
- separar outro plano se distância mínima exigir estrutura espacial/BVH;
- reduzir o mapa se o fecho indireto não puder explicar a origem de cada nó;
- não ampliar para escrita, render ou MCP para fechar uma prova.

## Fechamento

Registrar versão, fixtures, medidas R001/R002, impacto observado, commits, gates,
limitações e decisão sobre abrir ou não revalidação automática.
