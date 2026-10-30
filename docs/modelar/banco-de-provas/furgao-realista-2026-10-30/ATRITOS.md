# Furgão realista: atritos

Cada atrito do plano do [furgão realista](../../planos/2026-10-30-furgao-realista.md), com o comando que o reproduz e o destino dado. A classificação final (corrigido no plano, gate ou instrução nova, ou devolvido ao backlog) é da fatia de fechamento.

## 1. A cópia levou a tabela de medidas da fonte

A cópia do `furgao` levou junto o `referencias/fonte-partes.json`, as medidas tiradas da malha do pacote de licença livre. O teste da origem das fontes exige que toda peça com esse arquivo esteja na tabela de fontes de veículo, que registra as 27 recriações e o pacote de cada uma, e a cópia não é uma recriação nova. O processo pegou sozinho: o `test:rapidos` dos gates recusou a cópia. A correção ficou na cópia, que deixa o arquivo só no `furgao` e aponta para ele no cabeçalho e no `alvo.md`; a instrução de cópia de peça com fonte, que não existe hoje, fica para o fechamento decidir.

```bash
npx vitest run tools/modelar/origem-das-fontes.test.mjs
```
