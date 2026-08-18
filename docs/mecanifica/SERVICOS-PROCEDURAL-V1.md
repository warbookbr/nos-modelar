# Serviços procedurais v1

## Papel

`prototipos/procedural/v3/servicos/descoberta.js` é a porta neutra para a IA
descobrir e avaliar o vocabulário procedural. Ela recebe uma configuração de
registro explícita, não lê disco, não inicia MCP, não renderiza e não executa
receitas. MCP, CLI ou API devem chamar este serviço, nunca copiar sua lógica.

`criarServicoDescobertaProcedural` entrega uma configuração imutável com:

- catálogo e hipergrafo derivados do registro;
- schema da lacuna;
- busca e descrição de capacidades;
- planejamento de cadeia estrutural;
- validação e expansão de composição declarativa em memória;
- análise de lacuna e diagnóstico de extensão.

Validar composição confirma contrato, tipos, parâmetros, ciclo e orçamento. Não
executa geometria, não aprova estética e não publica receita.

## Exposição MCP

O perfil MCP padrão publica os recursos abaixo, todos somente leitura:

- `mecanifica://procedural/catalogo`;
- `mecanifica://procedural/grafo`;
- `mecanifica://procedural/schemas`.

E as ferramentas: `buscar_capacidades`, `descrever_capacidade`,
`combinar_capacidades`, `validar_composicao`, `analisar_lacuna` e
`diagnosticar_extensao`.

O fluxo esperado para uma IA é ler o catálogo ou buscar, descrever o contrato,
combinar/validar a opção e só então registrar uma lacuna se ainda faltar algo.
Uma cadeia é estrutural, não prova forma correta. Uma lacuna ou extensão ausente
também não autoriza instalar código, escrever receita ou promover capacidade.

## Limites

O serviço não enumera arquivos de extensão nem altera a configuração do motor.
`diagnosticar_extensao` apenas informa se uma capacidade está na configuração do
servidor e, quando não estiver, aponta a ação segura. O perfil de autoria já
existente continua separado; esta R09 não abre escrita procedural.
