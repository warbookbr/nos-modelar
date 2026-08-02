# [ID] — resultado curto

**Estado:** rascunho

**Responsável:** a definir

**Repositório e base:** a definir

## Problema observado

Descreva a evidência reproduzível e a consequência. Aponte para o registro
permanente; não copie um relatório inteiro.

## Resultado

Uma frase verificável dizendo o que passa a ser possível.

## Incluído

- mudança estritamente necessária;
- prova em fixture geral;
- prova em produto somente quando o resultado exigir.

## Excluído

- melhorias próximas que não bloqueiam o resultado;
- migrações ou refatorações sem relação com o gate.

## Gate de saída

1. comportamento mensurável;
2. compatibilidade e determinismo;
3. prova visual quando a mudança afeta leitura visual;
4. testes e documentação proporcionais ao risco.

## Fatias

1. caso que falha ou baseline;
2. menor implementação completa;
3. prova e documentação;
4. fechamento.

## Riscos e parada

Declare o risco que obriga parar, cancelar ou redesenhar antes de ampliar o
escopo.

## Fechamento

Preencher somente ao concluir ou cancelar: estado final, commit/PR, gates,
resultado observado e candidatos devolvidos ao backlog.
