# Tolerância do STEP: o acervo exportado antes e depois da tolerância em milímetro

Medida do plano da tolerância do STEP em milímetro (2026-11-22). `medir.mjs` exporta cada peça do acervo em STEP, em memória, com as opções padrão do comando (mm, escala 1000, tolerância 0,001), e grava se a validação passa, se a costura fecha, o número de corpos e a impressão geométrica. `comparar.mjs` compara duas medidas peça a peça.

`antes.json` foi medido numa cópia do repositório no commit anterior à correção; `depois.json`, com a correção. As partes de objeto (`aviao/asas`) foram medidas numa segunda passada, depois de o script aprender que elas moram em `partes/`.

```bash
node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/medir.mjs --saida=<arquivo.json> [--pecas=a,b]
node docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/comparar.mjs antes.json depois.json
```

## Resultado

Das 122 entradas do acervo, antes da correção 54 exportavam, 67 eram recusadas na validação por área abaixo da tolerância e 1 não executa por si (o micro-ondas, com passos órfãos). Depois, 103 exportam, nenhuma é recusada na validação e a mesma 1 não executa: 49 peças passaram a exportar, e nenhuma que exportava deixou de exportar ou mudou o número de corpos. Só a impressão do banco da empilhadeira mudou, com 0,1 mm³ a menos num volume de 27.847.626 mm³, pela costura de 0,001 mm no lugar de 1 mm.

Oito peças agora passam da validação e param na costura do OCCT, onde antes a validação as recusava. Em cinco (`braco-robotico/antebraco`, `braco`, `elo-punho-4`, `elo-punho-5` e `carro-fastback/lataria`) o sólido costurado sai inválido com qualquer tolerância de 0,001 a 1 mm, medido com `escreverStepFacetado` direto: o defeito é da malha ou do OCCT, e a recusa por área o escondia. Nas outras três (`braco-robotico/base`, `furgao-realista` e `sedan-chassi-e-lataria/carroceria`) o OCCT em WebAssembly estoura a memória na costura ou na escrita. As oito foram ao backlog.
