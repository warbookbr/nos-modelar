# Protocolo detalhado — diagnóstico do motor procedural

> **Documento de método.** Este arquivo detalha como estudar o motor atual.
> Ele não substitui o plano ativo, não autoriza refatoração e não afirma que os
> resultados já foram observados. A autorização vigente está em
> [`planos/2026-08-06-diagnostico-motor-procedural.md`](planos/2026-08-06-diagnostico-motor-procedural.md).

## Finalidade

O estudo existe para impedir que montagem, escrita para IA, bancada ou MCP sejam
projetados sobre uma compreensão parcial do núcleo procedural.

A pergunta não é apenas “quais funções existem?”. O diagnóstico deve determinar:

- qual contrato o código realmente executa;
- quais garantias são sustentadas por testes;
- quais capacidades dependem de convenções informais das receitas;
- qual informação sobrevive até a malha neutra;
- onde termina a responsabilidade da peça;
- o que uma montagem futura pode consumir sem invadir o motor;
- quais limites afetam de fato a autonomia da IA.

O resultado deve permitir decidir o próximo plano sem refatorar por gosto,
preservar fragilidades por medo ou transportar problemas para uma nova camada.

## Objeto do estudo

O objeto central é o motor de peça formado por:

```text
prototipos/procedural/v3/motor/oficina.js
+ auxiliares importados pelo núcleo
+ contratos de receita realmente consumidos
+ malha neutra emitida
```

Também são estudados os consumidores que revelam o contrato prático da saída:

```text
adaptadores da bancada
descritor de peça
exportador
revisão e comparação
gates estruturais
MCP somente leitura
```

Esses consumidores não definem o motor. Eles mostram quais campos já são
dependências públicas ou quase públicas.

## Distinções obrigatórias

O diagnóstico deve separar cinco coisas que podem parecer iguais:

### Capacidade implementada

Existe código capaz de executar uma operação em algum caso.

### Capacidade contratada

O comportamento possui entrada, saída e falhas suficientemente estáveis para ser
usado por receitas novas sem depender de leitura interna do motor.

### Capacidade provada

Há teste, fixture, gabarito ou execução reproduzível que demonstra o contrato.

### Capacidade conveniente para IA

A operação pode existir e funcionar, mas ainda exigir referências frágeis,
conhecimento implícito ou tentativa excessiva. Isso é um problema de autoria,
mesmo quando a geometria final fica correta.

### Capacidade necessária para montagem

A montagem pode precisar de origem, identidade, portas, medidas ou envelope.
Isso não significa que composição, dependências e relações devam entrar no
motor de peça.

## Perguntas do contrato de entrada

O estudo deve reconstruir os formatos realmente aceitos, incluindo:

- receita que exporta `meta` e `construir`;
- receita baseada em `PASSOS`, `PARAMS`, `TOPO` e campos auxiliares;
- valores padrão;
- campos opcionais;
- campos derivados;
- coerções;
- validações precoces;
- validações tardias;
- comportamentos aceitos apenas por compatibilidade.

Para cada campo relevante, registrar:

| Campo ou conceito | Forma aceita | Momento de resolução | Falha possível | Evidência |
|---|---|---|---|---|
| parâmetros | a observar | a observar | a observar | código/teste |
| topologia | a observar | a observar | a observar | código/teste |
| passos | a observar | a observar | a observar | código/teste |
| materiais | a observar | a observar | a observar | código/teste |
| aliases | a observar | a observar | a observar | código/teste |
| metadados | a observar | a observar | a observar | código/teste |

A tabela final não deve ser preenchida por suposição documental.

## Rastreamento do fluxo interno

Para cada caminho representativo, seguir os dados na sequência real:

```text
módulo da receita
→ normalização
→ parâmetros
→ topologia
→ passos
→ referências
→ operações geométricas
→ transformações
→ seleções
→ identidade
→ partes e grupos
→ materiais
→ portas e origens
→ diagnósticos
→ saída neutra
```

O rastreamento deve procurar:

- estado mutável compartilhado;
- estruturas acumuladoras;
- dependência da ordem dos passos;
- referências por posição;
- referências semânticas;
- aliases;
- mutações retroativas;
- cópias rasas ou profundas;
- perda de proveniência;
- recuperação de erro;
- publicação parcial;
- dados criados apenas para renderização;
- suposições de peça única.

Não basta dizer que há estado global ou dependência de ordem. É necessário
mostrar onde, por que e qual consequência prática isso produz.

## Contrato de saída

A saída deve ser inventariada em três níveis.

### Geometria

- vértices;
- faces;
- normais, quando aplicável;
- grupos;
- topologia derivada;
- caixas ou limites;
- coordenadas locais;
- origem adotada;
- unidades e orientação.

### Semântica

- identidade da peça;
- identidades de partes;
- hierarquia;
- aliases resolvidos;
- grupos selecionáveis;
- materiais declarados;
- portas;
- referenciais;
- proveniência de operações;
- diagnósticos.

### Consumo externo

Para cada campo, identificar:

- quem lê;
- se é obrigatório;
- se é estável;
- se é apenas convenção;
- se pode ser removido sem quebrar consumidor;
- se uma montagem futura precisaria dele;
- se pertence ao motor ou deveria ser derivado acima.

Uma ausência só é bloqueio para montagem quando sua responsabilidade pertence
de fato ao contrato da peça.

## Seleção das receitas representativas

O estudo não deve ler todas as receitas com a mesma profundidade. Deve escolher
um conjunto pequeno que maximize cobertura de capacidades.

A seleção deve incluir, quando existirem bons candidatos:

1. peça estrutural simples;
2. peça com remoção, passagem ou furação;
3. peça baseada em perfil, revolução ou `lathe`;
4. peça com arranjo, espelho ou repetição;
5. peça com partes, hierarquia ou grupos relevantes;
6. peça com portas ou referenciais;
7. peça entre as mais complexas atualmente mantidas.

Uma mesma receita pode cobrir mais de uma categoria.

Para cada receita escolhida, registrar:

- motivo da escolha;
- recursos exercitados;
- entradas relevantes;
- caminho principal;
- saída observada;
- garantias provadas;
- truques ou convenções exigidas;
- limites encontrados;
- impacto possível sobre montagem.

Preferência estética não é critério de seleção.

## Capacidade geométrica real

O estudo deve separar “operação presente” de “operação confiável”.

Para cada família examinada, responder:

- que forma ela expressa bem;
- que forma tenta simular;
- quais combinações possuem testes;
- quais combinações dependem de ordem;
- se identidade sobrevive;
- se seleção continua endereçável;
- se transformação preserva portas e partes;
- se a operação produz órfãos;
- se há risco de faces inválidas;
- se há costuras ou ambiguidade;
- se a IA recebe diagnóstico útil;
- se a receita continua compreensível após refinamentos.

O teto do motor não será definido por contagem de linhas ou polígonos. Ele será
avaliado pelo ponto em que a autoria deixa de ser localizável, previsível,
inspecionável ou corrigível.

## Identidade e endereçamento

A identidade deve ser analisada em todo o percurso.

Perguntas mínimas:

- quando uma identidade nasce;
- quem pode defini-la;
- como duplicidade é tratada;
- como cópia e repetição afetam nomes;
- se transformações preservam identidade;
- se partes internas possuem caminho estável;
- como aliases resolvem;
- se índices ou posições vazam para contratos persistidos;
- o que muda entre duas execuções da mesma receita;
- o que uma instância de montagem precisaria acrescentar.

O estudo deve distinguir:

```text
identidade da definição da peça
identidade da parte interna
identidade da instância em uma montagem
```

A terceira provavelmente pertence à montagem, não ao motor. Essa hipótese deve
ser verificada contra o código real.

## Portas, origens e referenciais

Portas e origens são candidatas centrais à fronteira com montagem.

O diagnóstico deve provar:

- forma de declaração;
- forma resolvida;
- sistema de coordenadas;
- orientação;
- associação com partes;
- comportamento após transformação;
- comportamento após espelho ou arranjo;
- duplicidade;
- diagnóstico de referência inválida;
- consumidores atuais;
- informação ausente para encaixe externo.

Não presumir que “há portas” significa que já existe um contrato suficiente para
instanciar e relacionar peças.

## Materiais

Materiais serão estudados somente como parte do contrato de saída.

Perguntas relevantes:

- como são declarados;
- como são associados à geometria;
- se sobrevivem a operações e combinações;
- se identidade de material é estável;
- o que é genérico e o que é adaptação de renderização.

Este diagnóstico não abre o contrato genérico de materiais nem corrige sua
ausência.

## Diagnósticos e falha

A autonomia da IA depende da qualidade da falha.

Para cada caminho relevante, observar:

- erro lançado;
- código ou categoria;
- alvo identificado;
- passo identificado;
- referência envolvida;
- medida ou dado auxiliar;
- publicação parcial;
- possibilidade de continuar com estado inválido;
- diferença entre erro estrutural e resultado geométrico ruim.

Falha tardia e mensagem genérica podem ser bloqueios de autoria mesmo quando o
motor não corrompe o estado.

## Fronteira com montagem

O diagnóstico deve avaliar a hipótese:

```text
motor
  resolve definição de peça em espaço local

montagem
  cria identidades de instância
  aplica transformações externas
  organiza composição recursiva
  mantém relações e dependências
  decide revalidação

bancada
  observa a resolução
  escolhe alvo e contexto visual

MCP/CLI/API
  expõem capacidades
```

Para confirmar essa divisão, verificar:

- se a peça possui espaço local coerente;
- se origem e orientação são explícitas;
- se portas podem ser transformadas externamente;
- se a saída pode ser clonada ou instanciada sem mutação perigosa;
- se identidade interna pode receber prefixo de instância acima do motor;
- se medidas podem ser calculadas sem conhecer a montagem;
- se o motor contém dependências indevidas de cena;
- se alguma suposição de peça única impede consumo externo.

Conceitos que tendem a ficar fora do motor:

- árvore de montagem;
- instância;
- dependência entre peças;
- relação mecânica entre componentes;
- impacto de alteração;
- alvo de edição;
- contexto visual;
- seleção de várias peças;
- propagação de revalidação;
- versionamento de montagem.

Uma evidência contrária deve ser registrada, não descartada para preservar a
hipótese inicial.

## Padrão de evidência

Cada conclusão importante deve ser marcada como:

### Observado

Confirmado diretamente por código, teste ou execução reproduzível.

### Inferido

Conclusão lógica sustentada por múltiplas observações. Deve declarar as premissas.

### Hipótese

Explicação ainda sem prova suficiente.

### Não examinado

Área deliberadamente deixada fora do recorte.

O relatório não pode apresentar hipótese como capacidade existente.

## Classificação dos achados

### PRESERVAR

Usar quando a capacidade:

- possui contrato compreensível;
- é determinística;
- tem prova;
- sustenta autoria futura;
- não precisa mudar antes da montagem.

### DOCUMENTAR

Usar quando:

- o comportamento é adequado;
- o código e os testes concordam;
- a documentação não declara suficientemente o contrato;
- mudar implementação não traz ganho comprovado.

### REFATORAR

Usar somente quando houver consequência concreta, como:

- referência instável;
- perda de identidade;
- saída insuficiente;
- acoplamento com renderizador;
- estado parcial;
- impossibilidade de instanciar externamente;
- diagnóstico que impede correção pela IA.

A classificação deve indicar o plano mínimo necessário, sem implementar.

### ADIAR

Usar quando:

- o problema existe;
- possui impacto limitado;
- não bloqueia o próximo recorte;
- corrigir agora ampliaria escopo sem ganho necessário.

## Proteção contra conclusões enviesadas

O estudo deve evitar:

- considerar arquivo grande automaticamente ruim;
- considerar extração de módulos automaticamente boa;
- preferir arquitetura conhecida a comportamento observado;
- tratar todo TODO como bloqueio;
- escolher apenas receitas simples;
- usar imagem bonita como prova geométrica;
- usar teste verde como prova de contrato não testado;
- interpretar consumidor atual como fronteira definitiva;
- transformar ausência de uso em prova de inutilidade;
- propor montagem durante a análise do motor.

## Estrutura do relatório final

O relatório posterior deve seguir, no mínimo:

1. resumo executivo;
2. escopo realmente examinado;
3. receitas escolhidas;
4. contrato de entrada;
5. fluxo interno;
6. contrato de saída;
7. identidade e portas;
8. capacidade geométrica;
9. falhas e diagnósticos;
10. fronteira com montagem;
11. achados `PRESERVAR`;
12. achados `DOCUMENTAR`;
13. achados `REFATORAR`;
14. achados `ADIAR`;
15. bloqueios antes da montagem;
16. itens que não precisam mudar;
17. lacunas não examinadas;
18. recomendação única.

## Critério de utilidade

O estudo terá falhado se terminar apenas com uma descrição do arquivo
`oficina.js`.

Ele será útil quando permitir responder de forma operacional:

```text
o que podemos construir acima do motor hoje
o que precisa de contrato explícito
o que realmente bloqueia a IA
o que deve permanecer intacto
qual é o próximo plano mínimo
```

## Relação com a etapa seguinte

A Montagem Mínima Persistida v1 continua candidata, não autorizada.

Ela só deve virar plano ativo depois que o relatório concluir uma das três
situações:

```text
motor adequado
ajustes localizados necessários
redefinição estrutural necessária
```

O diagnóstico não deve antecipar qual delas será verdadeira.
