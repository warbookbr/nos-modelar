"""Amostra estratificada e determinística: ordena por id dentro de cada categoria e toma os primeiros N.
Categorias mecânicas/móveis levam 4; as quatro menos ligadas a objeto mecânico levam 3 (4*12+3*4=60)."""
import json,sys,collections
raiz=sys.argv[1]
rows=[json.loads(l) for l in open(raiz+'/fonte/BlendNet.jsonl')]
menos={'Foodstuffs','Graphic symbols and logos, surface patterns, ornamentation, arrangement of interiors and exteriors','Articles of clothing and haberdashery','Musical instruments'}
por=collections.defaultdict(list)
for r in rows: por[r['category']].append(r)
out=[]
for cat in sorted(por):
    n=3 if cat in menos else 4
    for r in sorted(por[cat],key=lambda r:r['id'])[:n]: out.append(r)
json.dump(out,open(raiz+'/amostra.json','w'),ensure_ascii=False,indent=1)
print(len(out))
for i,r in enumerate(out): print(i,r['id'][:8],r['category'][:30],'|',r['name'])
