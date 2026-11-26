# Esqueleto de proporção: o humanoide de 1.750 mm aprovado em 2026-11-26

Evidência do plano [esqueleto de proporção](../../planos/2026-11-26-esqueleto-de-proporcao.md). O esqueleto sai de `procedural/pecas/esqueleto-humanoide/proporcoes.json` por `npm run esqueleto -- --proporcoes=procedural/pecas/esqueleto-humanoide/proporcoes.json`, e as vistas de cada pose por `--vistas=tools/bancadas/out/<pasta>`.

## O que a pessoa aprovou

A base, em pé, sentada e com o braço direito erguido, aprovada por imagem em 2026-11-26 com a frase "Vamos seguir com suas recomendações. E pode fazer baixar sim", entre a base e duas variantes mostradas lado a lado: pernas 4% mais longas (altura total 1.784 mm) e tronco 4% mais longo (1.770 mm). A recomendação foi a base, a única que mantém os 1.750 mm.

| Medida | mm |
|---|---|
| altura do ombro | 1.435 |
| altura do quadril | 930 |
| altura do joelho | 499 |
| braço, antebraço, mão | 330, 230, 190 |
| coxa, canela | 431, 431 |
| ombro a partir da linha central | 250 |

O braço e a altura do ombro vêm do braço do robô (`procedural/pecas/robo-humanoide/proporcoes.json`); o resto segue as proporções segmentares médias de Drillis e Contini para a mesma altura. As imagens aprovadas estão nesta pasta (`aprovado-*.png`).

## O sentado

Na primeira versão a pose só girava as juntas, a bacia ficava na altura de quem está em pé e os pés ficavam no ar. A pessoa pediu que o sentado baixasse; a pose ganhou `deslocamentoDaRaiz`, e o sentado baixa a bacia o comprimento da coxa: o assento fica a 499 mm, o tornozelo a 68 mm e a ponta do pé a 31 mm, sem aviso de chão (`sentado-com-a-bacia-baixada-lado.png`). O aviso de chão não pegava os pés no ar, porque só acusava o que passa abaixo dele, e quem viu foi a pessoa, nas imagens; a ferramenta ganhou o aviso de pose sem apoio, que acusa a pose em que nada encosta no chão declarado a menos de 10 mm, e o sentado sem a bacia baixada passaria a avisar.

## Medidas da ferramenta

Na fixture do braço de prova (`tools/fixtures/esqueleto/`), a pose com o antebraço dobrado contra o tronco dá dois avisos (a bola da mão atravessa o tronco em 58 mm e o bastão da mão em 98 mm), e a pose zero e a de braços abertos não dão nenhum. As vistas das três poses da fixture levam uns 29 s. A vista frontal da bancada olha a peça por trás (o lado direito do robô aparece à direita da imagem), o que vale para toda peça e não muda medida.
