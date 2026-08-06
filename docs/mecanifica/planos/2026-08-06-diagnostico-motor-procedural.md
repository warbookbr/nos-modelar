# Diagnóstico do motor procedural atual
**Estado:** ativo
**Responsável:** IA revisora, com decisão final registrada pelo mantenedor
**Repositório e base:** `warbookbr/nos-mecanifica`, a partir de `main`

## Por que esta é a etapa atual
A direção de autoria já define peça como unidade geométrica editável e montagem
como composição recursiva. Antes de definir montagem persistida, escrita para IA
ou novas ferramentas, é necessário compreender o contrato real do motor que hoje
resolve as receitas de peças.

Este plano autoriza somente diagnóstico. Não autoriza refatorar o motor,
modificar receitas, implementar montagem ou acrescentar escrita ao MCP.

O método detalhado está em
[`PROTOCOLO-DIAGNOSTICO-MOTOR.md`](../PROTOCOLO-DIAGNOSTICO-MOTOR.md).

## Pergunta central
> **Qual é o contrato real do motor procedural atual, qual é seu teto para
> autoria de peças mecânicas e o que precisa — ou não precisa — mudar antes da
> primeira montagem persistida?**

## Resultado verificável
Produzir relatório sustentado por código, receitas, testes e execuções que
responda:
1. qual entrada o motor aceita;
2. como parâmetros, passos, referências e estado percorrem a execução;
3. qual saída neutra é produzida e quais garantias oferece;
4. como identidade, partes, portas, materiais, origens e diagnósticos sobrevivem;
5. quais capacidades geométricas são sólidas e quais dependem de truques;
6. quais limites são locais e quais são estruturais;
7. quais suposições internas tratam a execução como uma única peça;
8. o que uma montagem futura pode consumir sem alterar o motor;
9. quais bloqueios antecedem a montagem mínima v1;
10. o que deve permanecer fora do motor.

Cada achado será **PRESERVAR**, **DOCUMENTAR**, **REFATORAR** ou **ADIAR**.

## Escopo de leitura
### Núcleo
- `prototipos/fps/v3/motor/oficina.js` e auxiliares;
- expressões, parâmetros, topologia e referências;
- criação, transformação e finalização da malha neutra;
- identidade, partes, grupos, portas, materiais e diagnósticos.

### Receitas
Selecionar poucas receitas que cubram estrutura simples, remoção, revolução,
repetição, partes/portas e uma peça atualmente complexa. A escolha deve ser
justificada pelas capacidades exercitadas.

### Consumidores
- adaptadores da bancada;
- descritor e exportador;
- revisão e comparação;
- gates de identidade, portas e inspeção;
- MCP de leitura apenas como consumidor.

## Método
1. Ler contratos sem tratá-los como prova suficiente.
2. Mapear funções, estados e estruturas do núcleo.
3. Seguir receita simples de ponta a ponta.
4. Seguir receitas representativas.
5. Comparar a saída consumida por bancada, descritor, exportador e revisão.
6. Executar testes e comandos existentes.
7. Usar somente provas diagnósticas temporárias quando faltar evidência.
8. Registrar contradições entre código, testes e documentação.
9. Classificar achados.
10. Recomendar um único próximo plano.

## Hipótese a confirmar ou rejeitar
```text
motor de peça
  resolve uma peça em coordenadas locais

resolvedor de montagem
  instancia peças e montagens
  aplica transformações externas
  mantém relações e dependências

bancada
  observa peças e montagens resolvidas
```

## Evidências obrigatórias
O relatório final deve conter:
- fluxo real;
- principais dados de entrada e saída;
- receitas examinadas e justificativa;
- ao menos um caminho sólido e um limite real;
- referências a funções, arquivos e testes;
- separação entre observado, inferido e hipotético;
- bloqueios anteriores à montagem mínima;
- lista do que não precisa mudar;
- decisão final entre:

```text
motor adequado
→ abrir Montagem Mínima Persistida v1

ajustes localizados necessários
→ abrir plano curto para bloqueios comprovados

limitação estrutural comprovada
→ redefinir contrato do motor antes da montagem
```

## Arquivos reservados
- este plano;
- `docs/mecanifica/PROTOCOLO-DIAGNOSTICO-MOTOR.md`;
- `docs/mecanifica/planos/README.md`;
- `docs/mecanifica/INDEX.md`;
- `docs/uso/MAPA.md`, somente regenerado;
- futuro relatório e fechamento deste plano.

Código, receitas, testes, bancada e ferramentas não estão reservados para
alteração. Achados devem ser registrados, não corrigidos silenciosamente.

## Excluído
- refatorar o motor ou criar operações;
- corrigir `lathe`, `earcut` ou materiais;
- alterar receitas;
- implementar montagem, dependências ou escrita para IA;
- mudar MCP, CLI ou API;
- otimizar sem problema medido;
- reorganizar por preferência.

## Invariantes
- nenhuma geometria ou receita publicada muda;
- gabaritos, identidades, portas e revisões permanecem intactos;
- o motor continua independente de Three.js;
- domínio automotivo não entra como caso especial no núcleo;
- carro e motor continuam sendo montagens;
- MCP continua sendo porta opcional;
- achado não autoriza correção fora de plano posterior.

## Gates documentais
```text
npm run mapa
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
git diff --check
```

## Gate de saída
O diagnóstico só encerra quando:
1. as dez perguntas estiverem respondidas;
2. entrada, fluxo e saída estiverem provados;
3. limites locais e estruturais estiverem separados;
4. todos os achados estiverem classificados;
5. a fronteira motor/montagem/bancada tiver decisão explícita;
6. houver recomendação única para o próximo plano;
7. nenhuma correção estiver misturada ao estudo;
8. documentação e gates estiverem verdes.

## Regra de parada
Parar e registrar quando entender o comportamento exigir mudar produção, uma
prova ameaçar receitas/revisões, surgir correção antes da medição, o estudo
começar a desenhar montagem/MCP ou o escopo impedir evidência útil.

## Fatias
1. mapa estático;
2. caminhos reais;
3. contratos e limites;
4. fronteira futura;
5. síntese e recomendação;
6. fechamento.

## Fechamento
Preencher ao concluir ou cancelar: estado, relatório, commit/PR, receitas
analisadas, gates, achados por classificação, decisão e próximo plano.
