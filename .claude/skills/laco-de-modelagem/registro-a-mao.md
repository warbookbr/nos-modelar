# O registro montado à mão

Apoio da skill [`laco-de-modelagem`](SKILL.md). Leia só quando não houver como obter o arquivo do modelador ou o do crítico para o `--registrar`.

Se não houver como obter os arquivos, a alternativa é montar o JSON à mão e
passá-lo como `--registrar <rodada.json>`. Não se misturam as duas formas.

```bash
cat > /tmp/rodada.json <<'JSON'
{
  "partes": [
    { "nome": "base", "confere": true },
    { "nome": "punho", "confere": false, "observacao": "saiu macico; o plano promete rasgo passante" }
  ],
  "veredito": { "alvo": "...", "nota": 6, "defeitos": [], "observacao": "..." },
  "atrito": ["o loft nao fecha tampa propria e o afinamento virou degraus"],
  "notaDePassagem": "folga de 0,2 no furo porque o pino e retificado"
}
JSON
node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar /tmp/rodada.json
```

As regras do registro que estão no corpo da skill (as `partes`, a `nota`, o limite de 240 caracteres, a `notaDePassagem`, a medição da ferramenta e o motivo dos pontos) valem igual para o JSON montado à mão.
