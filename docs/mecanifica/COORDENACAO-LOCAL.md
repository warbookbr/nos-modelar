# Coordenação local entre agentes

Este é o manual curto da caixa postal usada por Codex e Claude quando trabalham
em cópias locais diferentes da Mecanifica. O canal reduz contexto sem esconder
estado: mostra mensagens novas primeiro, não carrega corpos automaticamente e
usa commits para que cada agente consulte somente o `git diff` necessário.

## Onde fica

- programa versionado: `tools/coordenacao/coord.mjs` neste repositório;
- estado compartilhado: `C:\Users\tiago\Desktop\Mecanifica-coord`;
- decisões duráveis: issue indicada em
  [`COORDENACAO-REPOS.md`](COORDENACAO-REPOS.md).

A pasta compartilhada guarda somente mensagens, confirmações, reservas e a
configuração local dos repositórios. Ela não entra em Git.

## Começo de cada turno

Cada agente executa:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs inbox codex
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs inbox claude
```

Use apenas o nome do agente atual. `inbox` mostra cabeçalhos não confirmados, do
mais novo para o mais antigo. Ele não mostra o corpo. Para consumir uma mensagem:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs read ID
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs ack AGENTE ID
```

Não use `inbox --all` por padrão. Essa opção existe apenas para auditoria.

## Antes de trabalhar

Reserve arquivos, pastas ou identidades compartilhadas. Uma sobreposição ativa
é erro e exige coordenação antes da edição:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs claim codex `
  --repo=warbook --files=prototipos/procedural/v3/motor/oficina.js `
  --ids=A-40,A-41 --subject="objetivo curto"
```

Depois envie a intenção. `--repo-path` registra branch, `HEAD`, remoto e estado
sujo. `--base` também guarda um resumo do delta commitado, sem copiar o código:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs send `
  --from=codex --to=claude --kind=intencao --subject="objetivo curto" `
  --repo-path=C:\Users\tiago\Desktop\Mecanifica `
  --files=prototipos/procedural/v3/motor/oficina.js --ids=A-40,A-41
```

## Entrega econômica

Faça commit antes da entrega quando possível. Informe o commit anterior em
`--base`. O destinatário recebe `base`, `head`, `diffStat` e arquivos previstos.
Se precisar de código, ele executa `git diff BASE..HEAD` no repositório. O diff
inteiro nunca entra na mensagem.

Corpos maiores devem vir de arquivo, evitando escape de terminal:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs send `
  --from=claude --to=codex --kind=entrega --subject="furo por grupo pronto" `
  --body-file=C:\tmp\entrega.txt `
  --repo-path=C:\Users\tiago\Desktop\brigsd-Mecanifica --base=COMMIT_ANTERIOR
```

Ao terminar, libere a reserva:

```powershell
node C:\Users\tiago\Desktop\Mecanifica\tools\coordenacao\coord.mjs release AGENTE ID_DA_RESERVA
```

## O que vai para cada canal

| Caixa local | Issue do GitHub |
|---|---|
| intenção e arquivos previstos | decisão consolidada |
| entrega e commits | escolha da base de convergência |
| bloqueio operacional | atribuição durável de faixas de IDs |
| reserva temporária | registro que precisa sobreviver às cópias locais |

O canal é assíncrono. Ele não acorda o outro agente. No início de cada turno, o
agente precisa consultar sua própria caixa de entrada.
