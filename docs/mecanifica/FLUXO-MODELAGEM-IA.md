# Fluxo de modelagem assistida por IA v4

## Escopo atual

Este é o contrato operacional atual para criar ou revisar **uma peça**. O fluxo
é determinístico, versionado e não depende de contexto oculto.

Ele ainda não é o fluxo completo de um carro, motor ou montagem recursiva.
Montagens persistidas v1/v2/v3, contexto estrutural e visual, impacto local e
roteiro assistido existem; mapa geral implícito, materialização e revalidação
automática de conjuntos afetados ainda não existem.

A direção de sistemas compostos está em [`AUTORIA-IA.md`](AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md). Este documento não deve ser
esticado silenciosamente para fingir que essas capacidades já existem.

## Pacote de peça

Um pacote contém `briefing.json`, `referencias.json`, tentativas preservadas e
revisões. O briefing declara peça, partes semânticas, envelope, orçamento,
portas, vistas e critérios observáveis. Referências têm caminho, papel e
proveniência. Uma tentativa registra a receita produzida e o resultado objetivo.

Uma revisão contém `revisao.json` e as imagens canônicas. A revisão declara
assinatura do modelo, contagens, envelope, materiais, corpos, portas, critérios
por vista, diagnóstico e promoção. Tentativa recusada nunca é sobrescrita.

O pacote organiza evidência da tarefa. Ele não substitui a receita da peça nem
serve como formato de montagem.

## Comandos atuais

```text
npm run preparar:modelagem -- <pacote>
npm run validar:modelagem -- <pacote>
npm run revisar:modelagem -- <pacote> --revisao=r001
npm run comparar:revisao -- <pacote> --a=r001 --b=r002
npm run validar:critica -- <pacote> --revisao=r001
```

O fluxo oficial cria a revisão e promove somente quando todos os gates passam.
Não crie `revisao.json` ou imagens manualmente para simular promoção.

## Ciclo atual de uma peça

1. declarar briefing e referências;
2. criar ou alterar a receita responsável;
3. executar o núcleo;
4. conferir integridade e identidade;
5. medir partes e interfaces disponíveis;
6. renderizar as vistas canônicas;
7. registrar crítica objetiva;
8. preservar a tentativa;
9. promover somente o resultado aprovado;
10. comparar com a revisão anterior quando houver.

## Limites do fluxo atual

- Uma parte deve ter identidade semântica estável.
- Não persista UUID, índice de array ou posição de passo quando existir caminho
  semântico melhor.
- O modelo deve passar sem órfãos, faces sem identidade, corpos inesperados,
  envelope excedido, orçamento excedido ou material não declarado.
- Vistas cortadas ou pequenas são recusadas; vistas finas naturais podem passar.
- O briefing não pode exigir capacidades que o núcleo não expressa. Solver de
  montagem e materiais genéricos continuam fora; abertura oblonga passou a ser
  expressável por `furo` com `ate`, e por isso saiu desta lista.
- A câmera canônica não deve ser distorcida para esconder defeito.
- Isolamento visual não prova sozinho encaixe, folga ou alinhamento.
- O pacote de uma peça não deve absorver artificialmente todo um sistema para
  evitar definir montagens.

## Extensão em andamento para sistemas compostos

Uma tarefa de sistema deve começar antes do pacote de peça. Os serviços atuais
já derivam alvo consultado, contexto estrutural/visual e relações afetadas numa
raiz explícita; o MCP aprovado tornou essa leitura diretamente consumível por
agentes.

O sistema precisará derivar:

1. **alvo de edição** — peça ou montagem que pode mudar;
2. **contexto visual** — componentes exibidos somente para comparação;
3. **dependências afetadas** — relações e montagens a revalidar;
4. **escopo de validação** — medidas, vistas e movimentos obrigatórios.

Exemplo:

```text
alvo:
  aro-dianteiro

contexto visual:
  pneu-dianteiro
  cubo-dianteiro
  pinca-dianteira

dependentes:
  roda-dianteira
  conjunto-dianteiro
  carro

validar:
  assentamento do pneu
  fixação no cubo
  folga da pinça
  interferência com a caixa de roda
```

O fluxo futuro não deve exigir que a IA lembre sozinha quais dependentes revisar.
Essa lista deve vir do mapa estruturado.

Depois da alteração local, o sistema deverá:

1. reexecutar a peça;
2. validar sua integridade;
3. reavaliar interfaces locais;
4. localizar dependentes diretos e indiretos;
5. revalidar relações afetadas;
6. separar o que continuou válido do que quebrou;
7. permitir correção, adaptação da montagem ou criação de variante;
8. publicar apenas estado completo e válido.

Para montagem, materialização segura, aplicação de alteração e publicação
condicionada à revalidação foram aprovadas em repositório local autorizado.
Reexecução automática e descoberta de dependentes fora do catálogo continuam
fora do recorte.

## Crítica e comparação

Crítica separa forma, identidade, orçamento, enquadramento e aderência ao
briefing. Divergência deve ser registrada, não corrigida por pintura ou
sobreposição. Comparação usa assinaturas, medidas e imagens preservadas.

Para montagens futuras, a comparação também deverá distinguir:

- mudança da peça;
- mudança de pose;
- mudança de relação;
- mudança de dependências;
- regressão local;
- regressão propagada para uma montagem maior.

## Relação com MCP

O MCP atual pode descrever, validar, comparar e renderizar evidências do fluxo.
Ele não define o formato da peça nem o futuro formato de montagem.

Uma escrita, via MCP ou outra porta, exige alvo explícito, planejamento,
confinamento, publicação atômica, nenhuma sobrescrita acidental e revalidação.
Para montagem, essas garantias foram provadas em perfil MCP opt-in; receita e
outras portas ainda requerem plano e evidência próprios.

## Estado

Os Casos 1 e 2 estão concluídos e a série foi encerrada aí. Não há plano
executivo ativo.

O Módulo 1 do MCP foi aprovado para leitura e auditoria. A primeira tentativa de
autoria controlada foi encerrada com decisão `interromper`; o PR #25 foi fechado
sem merge. Protocolos e resultados encerrados estão em
`docs/mecanifica/historico/`, `docs/mecanifica/planos/` e nos pacotes de
`autoria-assistida/`.
