# Lacunas de capacidade v1

## Papel

Uma lacuna registra de modo serializável uma intenção que o catálogo atual não
resolve claramente. Ela não cria operação, não instala extensão e não altera
receita. A borda que consulta o motor decide onde guardar o JSON produzido por
`criarLacunaCapacidade`.

O formato é `mecanifica.lacuna-capacidade@1`; seu schema gerado está em
[`gerado/lacuna-capacidade.schema.json`](gerado/lacuna-capacidade.schema.json).

## Dados exigidos

Cada registro declara `id`, objetivo, artefatos que já existem e os que são
esperados. Também pode declarar interfaces de entrada/saída e requisitos
externos disponíveis. `candidatas` guarda nomes já considerados;
`requisitoAusente` aponta uma evidência concreta; `contorno` registra a solução
manual atual e seu custo; `recorrencia` mede quantas vezes a lacuna ocorreu.

Os campos permitem comparar uma dor real com seu contorno, sem transformar uma
ocorrência isolada em trabalho obrigatório.

## Planejamento e classificação

`planejarCapacidades(catalogo, consulta)` procura cadeias em ordem estável.
Cada operação consome e produz artefatos e interfaces; requisitos só valem se a
consulta os declarar disponíveis. O custo padrão é um por operação e pode ser
substituído por pesos explícitos. A resposta mostra cadeias encontradas e os
contratos descartados com a razão.

O resultado é somente estrutural: ele não escolhe argumentos, não executa
geometria e não afirma que a forma atende à intenção visual ou mecânica.

`classificarLacunaCapacidade` aplica esta ordem:

1. cadeia compatível encontrada: `composicao`;
2. sem cadeia, mas com evidência explícita de representação ausente:
   `representacao`;
3. sem os dois casos: `operacao-nativa`.

`operacao-nativa` significa “candidato a uma nova operação sob o SDK e seus
gates”, não “extensão aprovada” nem “instale automaticamente”. A classificação
é uma explicação reproduzível; a decisão de implementar e de promover continua
humana e exige o recorte próprio.

## Limites

O planejador não lê arquivos, não conhece MCP, visor ou executor e não mantém
estado global. Ele não substitui composição procedural, validação de receita ou
inspeção. A R09 poderá expor estas mesmas funções puras por serviço e MCP, sem
duplicar sua lógica.
