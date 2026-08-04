# Fluxo de modelagem assistida por IA v4

Contrato atual para criar ou revisar uma peça. O fluxo é determinístico,
versionado e não depende de contexto oculto.

## Pacote

Um pacote contém `briefing.json`, `referencias.json`, tentativas preservadas e
revisões. O briefing declara peça, partes semânticas, envelope, orçamento,
portas, vistas e critérios observáveis. Referências têm caminho, papel e
proveniência. Uma tentativa registra a receita produzida e o resultado objetivo.

Uma revisão contém `revisao.json` e as imagens canônicas. A revisão declara
assinatura do modelo, contagens, envelope, materiais, corpos, portas, critérios
por vista, diagnóstico e promoção. Tentativa recusada nunca é sobrescrita.

## Comandos

```text
npm run preparar:modelagem -- <pacote>
npm run validar:modelagem -- <pacote>
npm run revisar:modelagem -- <pacote> --revisao=r001
npm run comparar:revisao -- <pacote> --a=r001 --b=r002
npm run validar:critica -- <pacote> --revisao=r001
```

O fluxo oficial cria a revisão e promove somente quando todos os gates passam.
Não crie `revisao.json` ou imagens manualmente para simular promoção.

## Limites

- Uma parte deve ter identidade semântica estável.
- Não persista UUID, índice de array ou posição de passo.
- O modelo deve passar sem órfãos, faces sem identidade, corpos inesperados,
  envelope excedido, orçamento excedido ou material não declarado.
- Vistas cortadas ou pequenas são recusadas; vistas finas naturais podem passar.
- O briefing não pode exigir capacidades que o núcleo não expressa. Abertura
  oblonga, solver de montagem e materiais genéricos continuam fora.
- A câmera canônica não deve ser distorcida para esconder defeito.

## Crítica e comparação

Crítica separa forma, identidade, orçamento, enquadramento e aderência ao
briefing. Divergência deve ser registrada, não corrigida por pintura ou
sobreposição. Comparação usa assinaturas, medidas e imagens preservadas.

## Estado

O Caso 1 e o Caso 2 estão concluídos. O Caso 3 não foi iniciado. Protocolos e
resultados encerrados estão em `docs/mecanifica/historico/` e nos pacotes de
`autoria-assistida/`.
