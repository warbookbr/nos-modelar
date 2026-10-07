<!-- Gerado por tools/mecanifica/banco-de-provas.mjs. Não edite à mão; rode npm run banco-de-provas:gerar. -->
# Banco de provas e registro de custo

Este banco de provas define os objetos de referência que serão modelados no
começo e no fim do plano de ferramentas de modelagem. O objetivo é comparar
objetivamente a autonomia do agente, a conformidade geométrica e o custo de
inferência (tokens, rodadas e nota final do crítico visual).

A medição experimental completa fica para execução sob demanda com aval humano,
pois envolve consumo significativo de recursos.

## Objetos do banco de provas

| # | Objeto | Família | Nível | Ferramentas exercitadas | Referência | Justificativa |
| - | ------ | ------- | ----- | ----------------------- | ---------- | ------------- |
| 1 | **carrinho de mão** | Veículos terrestres | esboço | `casca`, `barras`, `rodaPneu` | — | Exercita casca com espessura e estrutura de barras tubulares com roda e pneu num objeto compacto. |
| 2 | **picape** | Veículos terrestres | detalhado | `casca`, `chapa`, `rodaPneu`, `mola`, `articula`, `loftSuave` | — | Exercita casca, chapa dobrada na caçamba e articulações integradas a suspensão com molas e rodas. |
| 3 | **cilindro hidráulico** | Motores, transmissões e mecanismos | detalhado | `atuador`, `articula`, `tubulacao`, `cabo`, `vedacao` | [Link](ISO 6020-2) | Exercita a família especializada de atuador e cilindro hidráulico com terminais articulados e conexões. |
| 4 | **suspensão** | Motores, transmissões e mecanismos | detalhado | `mola`, `atuador`, `articula`, `barras` | — | Exercita a família de molas combinada com braços articulados e barras estruturais. |
| 5 | **cadeira de rodas** | Veículos terrestres | esboço | `barras`, `rodaPneu`, `tecido`, `articula`, `manopla` | [Link](ISO 7176) | Exercita cadeira com estrutura de barras tubulares, articulações e rodas raiadas. |
| 6 | **guarda-roupa** | Móveis | esboço | `movel`, `articula`, `guia` | — | Exercita a família de roupeiro modular com caixaria, portas articuladas e trilhos. |
| 7 | **cadeira** | Móveis | esboço | `movel`, `barras`, `tecido`, `deforma` | — | Exercita a família prevista de cadeira com estrutura de barras e assento anatômico. |

## Resumo de custo por objeto

| Objeto | Nível | Família | Medições | Rodadas | Tokens | Menor nota final entre as unidades | Status |
| ------ | ----- | ------- | -------- | ------- | ------ | ---------- | ------ |
| **carrinho de mão** | esboço | Veículos terrestres | 2 | 2 | 194524 | 8 | medido |
| **picape** | detalhado | Veículos terrestres | 0 | 0 | 0 | — | aguardando medição |
| **cilindro hidráulico** | detalhado | Motores, transmissões e mecanismos | 0 | 0 | 0 | — | aguardando medição |
| **suspensão** | detalhado | Motores, transmissões e mecanismos | 0 | 0 | 0 | — | aguardando medição |
| **cadeira de rodas** | esboço | Veículos terrestres | 0 | 0 | 0 | — | aguardando medição |
| **guarda-roupa** | esboço | Móveis | 0 | 0 | 0 | — | aguardando medição |
| **cadeira** | esboço | Móveis | 2 | 2 | 136343 | 9 | medido |

## Histórico de medições

| Data | Commit | Objeto | Unidade | Rodada | Tokens | Origem | Nota | Motivo |
| ---- | ------ | ------ | ------- | ------ | ------ | ------ | ---- | ------ |
| 2026-10-07T17:46:01.030Z | `b29eb325` | **carrinho de mão** | objeto | 1 | 151252 | api | 7 | longarinas do quadro aparecem dentro da caçamba na vista superior (possível travessia do piso) |
| 2026-10-07T17:48:54.769Z | `bdef49f5` | **carrinho de mão** | objeto | 2 | 43272 | api | 8 | defeito anterior resolvido; restam folga mínima roda-caçamba e um bloco sem função clara |
| 2026-10-07T17:51:09.992Z | `6574a7ae` | **cadeira** | objeto | 1 | 117775 | api | 7 | assento ultrapassa o aro e se sobrepõe aos montantes traseiros |
| 2026-10-07T17:52:26.325Z | `0a796fc3` | **cadeira** | objeto | 2 | 18568 | api | 9 | defeito anterior resolvido; sem defeito estrutural |

