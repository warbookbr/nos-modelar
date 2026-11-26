# Processo e CI: o envio entra na main sem vermelho falso, e as regras de texto viram régua

**Estado:** ativo

**Núcleo:** não

**Território:** `.github/workflows/`, `.github/actions/`, `tools/ci/`, `docs/modelar/MECANISMOS.md`, `tools/testes-lentos.mjs`, `tools/testes-lentos.test.mjs`, `tools/modelar/custo-de-importar-receita.test.mjs`, `tools/testes-lentos-pesos.json`, `tools/modelar/guardas/abre-na-bancada.test.mjs`, `tools/modelar/guardas/abre-na-bancada-pecas-1.test.mjs`, `tools/modelar/guardas/abre-na-bancada-pecas-2.test.mjs`, `tools/modelar/guardas/abre-na-bancada-pecas-3.test.mjs`, `tools/gates.mjs`, `tools/mapa/planos.mjs`, `tools/mapa/planos.test.mjs`, `tools/mapa/mapa.mjs`, `tools/mapa/mapa.test.mjs`, `tools/mapa/territorio-do-envio.mjs`, `tools/mapa/territorio-do-envio.test.mjs`, `docs/MAPA.md`, `tools/reguas-de-texto/`, `docs/modelar/banco-de-provas/processo-e-ci-2026-11-26/`.

Ativado pela pessoa em 2026-11-26, com as recomendações 1 a 4 e 9 da análise do projeto ("1 a 10 aprovadas") e a regra nova do limite de planos de núcleo ("Sim, pode seguir com suas recomendações").

**Responsável:** a IA da sessão implementa e mede; mudança de gate passa por revisão adversarial.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26.

## Problema observado

Entre 16 e 26 de novembro o CI rodou 188 vezes e 52 falharam; 34 dessas 52 (65%) não apontavam defeito no que a sessão escreveu: 13 perderam a corrida do passo de juntar porque outra sessão andou a main, 12 foram teto de tempo estourado em máquina mais lenta, 7 foram o mapa gerado desatualizado e 1 foi a instalação do navegador (banco de provas da análise do projeto, `processo.md`). A regra de território, a de negrito no meio do texto e a de domínio fora do núcleo vivem só em texto. O limite de planos ativos é o mesmo para todo plano, e a pessoa decidiu que o de núcleo pode passar dele.

## Resultado

O passo de juntar à main junta a main nova e tenta de novo sozinho; o teto de tempo avisa no CI e reprova só na máquina local; o navegador do CI vem do cache pela versão; o mapa gerado sai do caminho dos conflitos; o envio é conferido contra o território do plano ativo; o negrito e o termo de domínio no núcleo têm régua com catraca; e o limite de planos segue a regra da pessoa.

## Incluído

- o passo `juntar` do CI: com a main andada, junta a main nova, roda de novo os gates baratos e tenta outra vez, até um limite, e só reprova com conflito;
- o teto de tempo como aviso no CI, com a reprovação local de hoje ;
- o navegador do Playwright em cache pela versão no CI;
- o `docs/MAPA.md` fora do versionamento e gerado onde é lido, ou gerado só no CI, conforme quem o lê; e o `--ajuda` do mapa, que hoje regrava o arquivo;
- a conferência do envio contra o território: cada arquivo mudado pertence a um plano ativo ou a um caminho compartilhado, ou o envio diz que é defeito pontual;
- as réguas de negrito no meio do texto e de termo de domínio no código do núcleo, como catraca que só desce;
- a regra do limite: todo plano declara `**Núcleo:** sim` ou `**Núcleo:** não` abaixo do Estado; o campo é conferido contra o território (sim pede um caminho em `procedural/nucleo/`, e um caminho lá pede sim); até 6 planos ativos de qualquer tipo, mais até 3 só de núcleo.

## Excluído

- mudar testes ou o que um gate cobra além do descrito; trocar o CI de provedor.

## Invariantes

Nenhum gate deixa de cobrar o que cobra hoje; o que muda é quando ele reprova e quem refaz a junção.

## Gate de saída

1. Cada mudança com teste nos dois sentidos (o que passa e o que reprova).
2. Dez envios seguidos sem vermelho de infraestrutura, de teto de tempo ou de junção perdida, contados no banco de provas.
3. Revisão adversarial sem bloqueio; `npm run gates` verde e o CI verde.

## Fatias

1. A regra do limite com o campo Núcleo, e o `--ajuda` do mapa.
2. O navegador em cache e o teto de tempo como aviso no CI.
3. O passo de juntar que tenta de novo, e o mapa fora do caminho dos conflitos.
4. A conferência do território e as duas réguas de texto, e o fechamento.

## Riscos e parada

O passo de juntar que tenta de novo não pode juntar por cima de um conflito real: com conflito ele para e reprova como hoje. Se tirar o mapa do versionamento quebrar quem o lê (o roteador, as skills), ele fica versionado e só sai da conferência de cada envio.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-26 ("Pode sim, até porque a outra sessão estourou o limite de 5 horas"): o arquivo dos testes lentos passa do plano do resgate dos ramos antigos a este, porque o teto de tempo reprovou os envios das duas sessões no mesmo dia (`pedacos-convexos.test.mjs` a 31,9 s na bateria e 17,6 s sozinho, `familia.test.mjs` a 145 s contra 142 s, e a importação dos acessórios do sedã a 14,2 s contra 12 s, nenhum mudado pelo envio).

## Andamento

## Fechamento
