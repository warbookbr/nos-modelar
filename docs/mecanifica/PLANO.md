# Plano mestre da Mecanifica — aposentado

**Estado:** ENCERRADO em 2 de agosto de 2026. Este arquivo não governa trabalho
novo.

O plano mestre cresceu junto com as primeiras provas do produto e acabou
misturando histórico, backlog, medições, especificações e execução. Sua versão
integral permanece no Git no commit `41f0c50`; ela não deve ser copiada para um
novo roteiro.

A fonte de verdade para planejamento agora é
[`planos/README.md`](planos/README.md). Ela aponta o único plano ativo, quando
existir, e o backlog separa candidatos de compromissos. **No encerramento deste
arquivo não há plano ativo.**

## Resultado do encerramento

- fases 0 a 4 e os ciclos de autoria já entregues permanecem concluídos;
- o fluxo de modelagem por IA, a revisão visual econômica, a retirada da Oficina
  humana e a separação entre autoria e produto permanecem concluídos;
- a F1 do antigo Ciclo 6 foi aceita como entrega independente: A-30 está pago por
  raio, profundidade e nome de grupo no mesmo passo de `furo`, com a peça
  `_flange-de-tubulacao` e gates próprios;
- o restante do Ciclo 6 foi **cancelado como roteiro**, não deixado pela metade:
  ele mandava dar vários painéis a `filete`, enquanto a arquitetura convergida
  preserva `filete` como chanfro e usa `arredondarAresta` para arredondamento;
- A-34, A-37, narrativa de desgaste e outras melhorias continuam somente como
  candidatos no [`BACKLOG.md`](planos/BACKLOG.md). Candidato não é pendência de
  um plano encerrado nem autorização para começar;
- os números A-39 a A-45 propostos dentro do Ciclo 6 nunca entraram no registro
  de atritos e ficam sem efeito. A-38 continua sendo exclusivamente a revisão
  visual econômica já resolvida.

O detalhamento e a justificativa de cada destino estão em
[`ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md`](planos/concluidos/ENCERRAMENTO-PLANO-MESTRE-2026-08-02.md).

## Regra de compatibilidade

Links históricos para `PLANO.md` podem continuar chegando aqui. Agentes não
devem inferir uma próxima tarefa deste arquivo: devem consultar o índice de
planos e, se não houver plano ativo, parar antes de alterar produto ou núcleo.
