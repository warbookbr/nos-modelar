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
| 8 | **avião de pequeno porte** | Veículos aéreos e espaciais | esboço | `aerofolio`, `loftSuave`, `casca`, `rodaPneu` | [Link](aviao-2026-10-11/referencias) | Objeto difícil do plano o que o avião pede: perfil aerodinâmico, superfície suave por seções e mecanismo de recolhimento. |

## Resumo de custo por objeto

Uma linha por objeto e dia de medição; dias diferentes não se somam.

| Objeto | Nível | Família | Dia | Medições | Rodadas | Tokens | Menor nota final entre as unidades |
| ------ | ----- | ------- | --- | -------- | ------- | ------ | ---------- |
| **carrinho de mão** | esboço | Veículos terrestres | 2026-10-07 | 2 | 2 | 194524 | 8 |
| **carrinho de mão** | esboço | Veículos terrestres | 2026-10-08 | 1 | 1 | 126849 | 8 |
| **carrinho de mão** | esboço | Veículos terrestres | 2026-10-11 | 1 | 1 | 124539 | 8 |
| **picape** | detalhado | Veículos terrestres | aguardando medição | 0 | 0 | 0 | — |
| **cilindro hidráulico** | detalhado | Motores, transmissões e mecanismos | aguardando medição | 0 | 0 | 0 | — |
| **suspensão** | detalhado | Motores, transmissões e mecanismos | aguardando medição | 0 | 0 | 0 | — |
| **cadeira de rodas** | esboço | Veículos terrestres | 2026-10-07 | 1 | 1 | 193819 | 9 |
| **cadeira de rodas** | esboço | Veículos terrestres | 2026-10-08 | 1 | 1 | 159687 | 8 |
| **cadeira de rodas** | esboço | Veículos terrestres | 2026-10-11 | 1 | 1 | 185321 | 8 |
| **guarda-roupa** | esboço | Móveis | 2026-10-07 | 3 | 3 | 247352 | 8 |
| **guarda-roupa** | esboço | Móveis | 2026-10-08 | 1 | 1 | 143669 | 8 |
| **guarda-roupa** | esboço | Móveis | 2026-10-11 | 1 | 1 | 134033 | 8 |
| **cadeira** | esboço | Móveis | 2026-10-07 | 2 | 2 | 136343 | 9 |
| **cadeira** | esboço | Móveis | 2026-10-08 | 1 | 1 | 101631 | 8 |
| **cadeira** | esboço | Móveis | 2026-10-10 | 1 | 1 | 94093 | 9 |
| **avião de pequeno porte** | esboço | Veículos aéreos e espaciais | 2026-10-12 | 1 | 1 | 3934576 | 8 |

## Histórico de medições

| Data | Commit | Objeto | Unidade | Rodada | Tokens | Origem | Nota | Motivo |
| ---- | ------ | ------ | ------- | ------ | ------ | ------ | ---- | ------ |
| 2026-10-07T17:46:01.030Z | `b29eb325` | **carrinho de mão** | objeto | 1 | 151252 | api | 7 | longarinas do quadro aparecem dentro da caçamba na vista superior (possível travessia do piso) |
| 2026-10-07T17:48:54.769Z | `bdef49f5` | **carrinho de mão** | objeto | 2 | 43272 | api | 8 | defeito anterior resolvido; restam folga mínima roda-caçamba e um bloco sem função clara |
| 2026-10-07T17:51:09.992Z | `6574a7ae` | **cadeira** | objeto | 1 | 117775 | api | 7 | assento ultrapassa o aro e se sobrepõe aos montantes traseiros |
| 2026-10-07T17:52:26.325Z | `0a796fc3` | **cadeira** | objeto | 2 | 18568 | api | 9 | defeito anterior resolvido; sem defeito estrutural |
| 2026-10-07T17:52:53.476Z | `3af072d9` | **guarda-roupa** | objeto | 1 | 137569 | api | 5 | cabideiro por cima do tampo e gaveta esquerda sumida na isométrica; as duas vêm da ordem de desenho das vistas, o JSON está certo |
| 2026-10-07T17:57:25.994Z | `252d86d4` | **cadeira de rodas** | objeto | 1 | 193819 | api | 9 | sem defeito estrutural; folga curta rodízio-aro |
| 2026-10-07T17:59:47.858Z | `5d81ae51` | **guarda-roupa** | objeto | 2 | 83864 | api | 5 | contorno do erro de desenho piorou o móvel (porta partida, gaveta recuada na isométrica); ferragens soltas na vista do interior |
| 2026-10-07T19:03:22.591Z | `6845851a` | **guarda-roupa** | objeto | 3 | 25919 | api | 8 | com o desenho por pixel (6845851a) os contornos da rodada 2 foram desfeitos; sem defeito estrutural |
| 2026-10-08T17:59:54.384Z | `7e449634` | **carrinho de mão** | objeto | 1 | 126849 | api | 8 | caminho curto: sem defeito estrutural; curvas dos tubos segmentadas na frontal e linha residual no piso da caçamba |
| 2026-10-08T17:59:54.580Z | `7e449634` | **cadeira de rodas** | objeto | 1 | 159687 | api | 8 | caminho curto: fresta entre assento e encosto, apoio de pé fora do centro da placa e placa do eixo grande demais |
| 2026-10-08T17:59:54.779Z | `7e449634` | **guarda-roupa** | objeto | 1 | 143669 | api | 8 | caminho curto: sem defeito estrutural nas vistas externas; dobradiças aparentes por fora e interior não verificável |
| 2026-10-08T17:59:54.960Z | `7e449634` | **cadeira** | objeto | 1 | 101631 | api | 8 | caminho curto: sem defeito estrutural; emenda ambígua no poste traseiro e estofado em laje reta |
| 2026-10-10T20:47:00.360Z | `a4f013e1` | **cadeira** | objeto | 1 | 94093 | api | 9 | nível zero: maquete e conferência pela blocagem; sem defeito estrutural, só acabamento e proporção fina das ripas |
| 2026-10-11T16:24:17.457Z | `2529aa08` | **carrinho de mão** | objeto | 1 | 124539 | api | 8 | depois do plano: sem defeito estrutural; casco facetado, pneu de cantos vivos e travessa com pontas sobrando |
| 2026-10-11T16:24:17.835Z | `2529aa08` | **guarda-roupa** | objeto | 1 | 134033 | api | 8 | depois do plano: sem defeito estrutural; dobradiças com o nó na quina da frente, visíveis de fora, e vão sem função acima das gavetas |
| 2026-10-11T16:28:55.193Z | `41d5b921` | **cadeira de rodas** | objeto | 1 | 185321 | api | 8 | depois do plano: sem defeito estrutural; barra grossa na altura do cubo, folga apertada da rodinha e raios que parecem atravessar o cubo; o esbocista inseriu um campo de texto por script |
| 2026-10-12T16:01:51.583Z | `a052a9fe` | **avião de pequeno porte** | objeto | 1 | 3934576 | api | 8 | primeira rodada do plano o que o avião pede, só com o que existia: 12 esbocistas e 19 críticas, Marco de 100% com 8; motor em 3 rodadas, fuselagem e Marco de 25% liberados pela pessoa com 7; trem do nariz atravessa o capô depois de 85 graus e o principal recolhe em carenagem sob a asa, por falta de recorte |

