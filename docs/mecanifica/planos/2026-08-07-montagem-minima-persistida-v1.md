# Montagem Mínima Persistida v1

**Estado:** concluído
**Responsável:** GPT (coordenação e revisão) e agente local/brigsd (execução local)
**Repositório e base:** `warbookbr/nos-mecanifica`, a partir de `main` após o encerramento do diagnóstico do motor

## Problema observado
O diagnóstico do motor concluiu que uma peça já pode ser resolvida de forma determinística em coordenadas locais, que portas e identidade semântica podem ser consumidas externamente e que múltiplas ocorrências podem receber transformação própria sem exigir mudança estrutural do núcleo.
Ainda não existe, porém, um dado persistido que declare uma montagem como composição reproduzível de instâncias. Sem esse dado, posição, identidade de ocorrência e composição continuam sem fonte de verdade canônica.
A decisão que autoriza este plano está em [`../RELATORIO-DIAGNOSTICO-MOTOR.md`](../RELATORIO-DIAGNOSTICO-MOTOR.md). A direção de composição está em [`../MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

## Resultado
Criar e provar o menor formato persistido e versionado capaz de representar uma montagem reproduzível com identidades de instância estáveis, referências a peças ou montagens, poses locais e resolução recursiva, sem copiar a autoria geométrica das peças para dentro da montagem.
Ao final deve ser possível persistir, ler e resolver uma pequena montagem duas vezes e obter a mesma composição, mantendo duas instâncias da mesma peça independentes em identidade e pose.

## Contrato mínimo a provar
A v1 deve representar somente o necessário para composição:
- versão explícita do formato;
- identidade semântica da montagem;
- lista ordenável/canônica de instâncias;
- identidade semântica estável de cada instância;
- tipo do alvo: peça ou montagem;
- referência persistível ao alvo;
- pose local da instância no referencial da montagem;
- resolução de peça usando o contrato público já existente;
- resolução recursiva de montagem;
- diagnóstico explícito para referência ausente, identidade duplicada e ciclo.
A pose mínima deve ser independente de Three.js e suficiente para translação e rotação rígidas. O plano deve reutilizar vocabulário matemático já existente no repositório quando houver, em vez de criar representação concorrente.

## Identidades distintas
A implementação deve preservar a separação:
```text
definição da peça
→ identidade da receita/artefato responsável

parte interna
→ identidade semântica publicada pela peça

instância
→ identidade pertencente à montagem

montagem
→ identidade própria e persistível
```
Nenhuma dessas identidades pode depender de UUID de runtime, índice visual, ordem de criação no Three.js ou posição de câmera.

## Incluído
- formato persistido v1 para montagem;
- leitor/validador puro do formato;
- resolvedor mínimo de composição;
- instância de peça com pose local;
- instância de montagem com pose local;
- composição recursiva;
- detecção de ciclo;
- duplicidade de identidade no mesmo escopo;
- referência ausente com diagnóstico útil;
- representação resolvida suficiente para a bancada consumir depois;
- testes determinísticos e fixtures mínimas;
- uma prova real usando peças já publicadas, sem alterá-las.

## Excluído
- mapa global de dependências;
- propagação ou revalidação automática de alterações;
- solver geral de encaixe;
- relações mecânicas gerais além da contenção;
- movimento, juntas, cinemática ou espaço varrido;
- edição/autoria de montagem por MCP, CLI ou API;
- transações de escrita concorrente;
- personalização de material por instância;
- ampliar o formato exportado de peça para transportar hierarquia;
- suporte novo a reflexão no validador de encaixe;
- correção de receitas históricas;
- refatoração do motor procedural.

## Invariantes
- peça continua sendo unidade geométrica editável;
- montagem não incorpora `PASSOS`, vértices ou faces como autoria própria;
- motor de peça permanece independente de montagem e Three.js;
- transformação externa pertence à instância;
- duas instâncias da mesma definição podem ter poses diferentes;
- resolver uma montagem não modifica a definição da peça;
- mesma entrada persistida e mesmas definições produzem o mesmo resultado;
- erro em uma referência não publica composição parcial como válida;
- formatos resolvidos continuam derivados da autoria persistida;
- MCP continua fora deste plano.

## Provas obrigatórias
### Prova A — duas instâncias da mesma peça
Persistir uma montagem com duas ocorrências da mesma peça publicada, usando IDs de instância e poses diferentes. Provar:
- ambas resolvem a mesma definição;
- IDs de instância permanecem distintos e estáveis;
- poses não vazam de uma ocorrência para a outra;
- repetir a resolução produz resultado canônico idêntico.

### Prova B — duas peças diferentes
Persistir uma montagem pequena com duas definições publicadas distintas. Provar que a composição mantém referência, identidade e pose de cada ocorrência sem copiar autoria geométrica para o arquivo da montagem.

### Prova C — montagem dentro de montagem
Persistir uma montagem filha e uma montagem raiz que instancia a filha. Provar que a pose final é composição das poses locais e que identidade de instância continua endereçável pelo caminho estrutural.

### Prova D — recusa estrutural
Cobrir ao menos:
- versão desconhecida;
- ID de instância duplicado;
- alvo inexistente;
- pose malformada ou não finita;
- referência recursiva cíclica.
Cada caso deve falhar antes de entregar uma montagem resolvida válida.

## Fronteira com peças
O resolvedor de montagem deve consumir peças pela fronteira pública existente e tratá-las como definições locais. Ele não deve ensinar o motor a conhecer árvore de montagem, ID de instância, pai externo ou posição de mundo.
O risco de catálogo semântico de materiais compartilhado, registrado no diagnóstico, não é corrigido aqui. A v1 não poderá usar mutação in-place desse catálogo como personalização por instância.

## Fronteira com a bancada
Este plano não precisa redesenhar a bancada. Deve apenas produzir uma estrutura resolvida neutra que permita a uma etapa posterior criar um grupo visual por instância e aplicar a pose externa.
Uma prova visual só é obrigatória se a implementação precisar alterar o caminho atual da bancada para demonstrar o resultado. Caso contrário, provas estruturais e de transformação são suficientes para esta v1.

## Gate de saída
1. formato v1 é versionado, validado e documentado;
2. duas instâncias da mesma peça resolvem com identidade e pose independentes;
3. duas peças diferentes compõem sem copiar autoria geométrica;
4. uma montagem pode instanciar outra montagem;
5. ciclos, duplicidades, referências ausentes e poses inválidas falham fechado;
6. repetição da mesma entrada produz saída canônica idêntica;
7. nenhuma mudança estrutural no motor de peça é necessária;
8. testes focados e suíte proporcional ao risco passam;
9. documentação, mapa e índices ficam verdes;
10. fechamento registra o que foi adiado para mapa de dependências e relações.

## Fatias
1. baseline dos contratos de pose e carregamento já existentes;
2. formato persistido + validação fail-closed;
3. resolução de instâncias de peça;
4. composição recursiva de montagem + ciclo;
5. provas reais, determinismo e documentação;
6. fechamento.

## Riscos e parada
Parar e registrar antes de ampliar escopo se:
- a resolução exigir alterar o contrato geométrico do motor;
- for necessário persistir identidade posicional de face/passo/runtime;
- a recursão exigir mapa global de dependências para funcionar;
- surgir necessidade de solver de encaixe para provar simples contenção;
- a única forma de posicionar instância depender de matriz de Three.js;
- o formato não conseguir recusar ciclos ou referências quebradas sem estado parcial válido.
Esses casos indicam que a fronteira precisa ser revista em plano próprio; não autorizam improvisar capacidades maiores dentro desta v1.

## Fechamento
Estado final: concluído.

Contrato adotado: `mecanifica.montagem`, versão 1. Fontes executáveis:
`src/autoria/ler-montagem-persistida.js`,
`src/autoria/resolver-montagem-persistida.js` e
`src/autoria/transformacao-rigida.js`.

Prova persistida: `tools/mecanifica/fixtures/montagens-persistidas/` e
`tools/mecanifica/montagem-persistida-provas.test.ts`. As peças reais usadas
foram `freio-disco` e `roda-dianteira`, sem alteração nelas. As Provas A, B, C
e D foram aprovadas.

Commits relevantes: `dd9b2f4`, `4673d73`, `c52daec`, `74ae226` e `9c3373f`.

Ficam fora: mapa global de dependências, relações mecânicas gerais, solver,
cinemática, writer/autoria de montagem, CLI/MCP e personalização de material por
instância. O candidato natural posterior continua sendo o mapa de
composição/dependências, mas não está autorizado por este fechamento.
