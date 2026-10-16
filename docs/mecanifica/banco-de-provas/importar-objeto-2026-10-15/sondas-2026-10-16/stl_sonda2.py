"""Sonda de 2026-10-16: STL de malha única -> caixas e cilindros por componente conexo e corpo por fatias reais (corte por planos e loft de 40 seções). Uso: python stl_sonda2.py <arquivo.stl> <saida> <pasta-dos-scripts>. Multiplica as coordenadas por 100 porque o STL da prova estava em decímetros."""
import sys, struct, json, numpy as np
sys.path.insert(0, sys.argv[3]); from stl_vistas_lib import render
p, saida = sys.argv[1], sys.argv[2]
d=open(p,'rb').read(); n=struct.unpack('<I',d[80:84])[0]
a=np.frombuffer(d[84:],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]),count=n)
T=a['v'].astype(float)*100  # tamanho real, mm
V=T.reshape(-1,3); q=np.round(V,2); uniq,inv=np.unique(q,axis=0,return_inverse=True); F=inv.reshape(-1,3)
par=np.arange(len(uniq))
def f(x):
    r=x
    while par[r]!=r: r=par[r]
    while par[x]!=r: par[x],x=r,par[x]
    return r
for t in F:
    ra=f(t[0])
    for v in t[1:]:
        rv=f(v)
        if rv!=ra: par[rv]=ra
comp=np.array([f(t[0]) for t in F]); ids=np.unique(comp)
def tri_box(c,ax,h):  # caixa orientada: centro, eixos (3x3), meias medidas
    s=np.array([[i,j,k] for i in(-1,1) for j in(-1,1) for k in(-1,1)],float)
    P=c+(s*h)@ax
    fs=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    return np.array([[P[a],P[b],P[c_]] for q_ in fs for (a,b,c_) in ((q_[0],q_[1],q_[2]),(q_[0],q_[2],q_[3]))])
def tri_cil(c,eixo,r,meia,lados=32):
    eixo=eixo/np.linalg.norm(eixo); u=np.cross(eixo,[0,0,1] if abs(eixo[2])<0.9 else [1,0,0]); u/=np.linalg.norm(u); w=np.cross(eixo,u)
    ang=np.linspace(0,2*np.pi,lados,endpoint=False); anel=np.array([np.cos(t)*u+np.sin(t)*w for t in ang])*r
    A=c-eixo*meia+anel; B=c+eixo*meia+anel; out=[]
    for i in range(lados):
        j=(i+1)%lados; out+= [[A[i],A[j],B[j]],[A[i],B[j],B[i]],[c-eixo*meia,A[j],A[i]],[c+eixo*meia,B[i],B[j]]]
    return np.array(out)
def tri_loft(secoes):  # secoes: lista de (x, poligono Nx2 em (y,z)) com mesmo N
    out=[]
    for (x0,P0),(x1,P1) in zip(secoes,secoes[1:]):
        N=len(P0)
        for i in range(N):
            j=(i+1)%N
            a_=[x0,*P0[i]];b_=[x0,*P0[j]];c_=[x1,*P1[j]];d_=[x1,*P1[i]]
            out+=[[a_,b_,c_],[a_,c_,d_]]
    for x,P in (secoes[0],secoes[-1]):
        cen=[x,*P.mean(0)]
        for i in range(len(P)): out.append([cen,[x,*P[i]],[x,*P[(i+1)%len(P)]]])
    return np.array(out,float)
def secao(Pts, x, larg, N=24):  # contorno da seção: casca convexa dos pontos da fatia, reamostrada por ângulo
    m=np.abs(Pts[:,0]-x)<larg; S=Pts[m][:,1:]
    if len(S)<8: return None
    c=S.mean(0); ang=np.arctan2(S[:,1]-c[1],S[:,0]-c[0]); r=np.hypot(*(S-c).T)
    alvo=np.linspace(-np.pi,np.pi,N,endpoint=False); res=[]
    for t in alvo:
        dd=np.abs((ang-t+np.pi)%(2*np.pi)-np.pi); sel=dd<np.pi/N*1.5
        rr=r[sel].max() if sel.any() else np.nan; res.append(c+rr*np.array([np.cos(t),np.sin(t)]))
    R=np.array(res)
    if np.isnan(R).any():
        ok=~np.isnan(R[:,0]); idx=np.arange(N)
        for k in range(2): R[:,k]=np.interp(idx,idx[ok],R[ok,k],period=N)
    return R
def corte(Ttri, x, N=48):
    """contorno real do corte em x: segmentos dos triângulos que cruzam o plano, encadeados; fica o laço de maior área,
       reamostrado por comprimento de arco, começando no ponto mais baixo e girando no mesmo sentido"""
    segs=[]
    for t in Ttri:
        d=t[:,0]-x; s_=np.sign(d)
        if (s_>0).all() or (s_<0).all(): continue
        pts=[]
        for i in range(3):
            j=(i+1)%3
            if (d[i]>0)!=(d[j]>0):
                u=d[i]/(d[i]-d[j]); pts.append(t[i,1:]+u*(t[j,1:]-t[i,1:]))
        if len(pts)==2: segs.append(pts)
    if len(segs)<6: return None
    S_=np.array(segs); chave=lambda p: (round(p[0],1),round(p[1],1))
    from collections import defaultdict
    viz=defaultdict(list)
    for a_,b_ in S_: viz[chave(a_)].append(tuple(b_)); viz[chave(b_)].append(tuple(a_))
    usados=set(); lacos=[]
    for a_,b_ in S_:
        k=chave(a_)
        if k in usados: continue
        laco=[tuple(a_)]; atual=tuple(a_); usados.add(k)
        for _ in range(len(S_)):
            prox=[p for p in viz[chave(atual)] if chave(p) not in usados]
            if not prox: break
            atual=prox[0]; usados.add(chave(atual)); laco.append(atual)
        if len(laco)>8: lacos.append(np.array(laco))
    if not lacos: return None
    area=lambda P: 0.5*abs(np.dot(P[:,0],np.roll(P[:,1],1))-np.dot(P[:,1],np.roll(P[:,0],1)))
    P=max(lacos,key=area)
    if (np.dot(P[:,0],np.roll(P[:,1],1))-np.dot(P[:,1],np.roll(P[:,0],1)))<0: P=P[::-1]
    i0=np.argmin(P[:,1]-0.001*P[:,0]); P=np.roll(P,-i0,axis=0); P=np.vstack([P,P[:1]])
    sl=np.r_[0,np.cumsum(np.hypot(*np.diff(P,axis=0).T))]; alvo=np.linspace(0,sl[-1],N,endpoint=False)
    return np.c_[np.interp(alvo,sl,P[:,0]),np.interp(alvo,sl,P[:,1])]
rel=[]; tri_aprox=[]
for k in ids:
    m=comp==k; P=uniq[F[m].ravel()]; nt=int(m.sum())
    c=P.mean(0); U,s,Vt=np.linalg.svd(P-c,full_matrices=False); ax=Vt
    L=(P-c)@ax.T; lo,hi=L.min(0),L.max(0); h=(hi-lo)/2; cc=c+((hi+lo)/2)@ax
    tam=np.sort(2*h)[::-1]
    # cilindro: duas medidas parecidas e simetria radial em torno do eixo de menor (disco) ou maior (barra) dimensão
    tipo='caixa'
    for ie in (2,0):
        outros=[i for i in range(3) if i!=ie]
        if abs(h[outros[0]]-h[outros[1]])<0.12*max(h[outros]):
            rad=np.hypot(L[:,outros[0]]-(hi+lo)[outros[0]]/2, L[:,outros[1]]-(hi+lo)[outros[1]]/2)
            if rad.std()/rad.max()<0.25 or nt>200:
                tipo='cilindro'; eixo=ax[ie]; r=max(h[outros]); meia=h[ie]; break
    if nt>3000: tipo='loft'
    if tipo=='caixa' and np.sort(h)[0] < 0.12*np.sort(h)[1] and nt>200:
        tipo='placa'
    if tipo=='placa':
        ie=int(np.argmin(h)); o=[i for i in range(3) if i!=ie]; Q=L[:,o]
        from scipy.spatial import ConvexHull
        hull=Q[ConvexHull(Q).vertices]; base=lo[ie]; topo=hi[ie]
        def p3(q,z): v=np.zeros(3); v[o[0]],v[o[1]],v[ie]=q[0],q[1],z; return c+v@ax
        out=[]
        for i in range(len(hull)):
            j=(i+1)%len(hull); out+=[[p3(hull[i],base),p3(hull[j],base),p3(hull[j],topo)],[p3(hull[i],base),p3(hull[j],topo),p3(hull[i],topo)]]
        cq=hull.mean(0)
        for i in range(len(hull)):
            j=(i+1)%len(hull); out+=[[p3(cq,base),p3(hull[j],base),p3(hull[i],base)],[p3(cq,topo),p3(hull[i],topo),p3(hull[j],topo)]]
        tri_aprox.append(np.array(out))
    elif tipo=='caixa': tri_aprox.append(tri_box(cc,ax,h))
    elif tipo=='cilindro': tri_aprox.append(tri_cil(cc,eixo,r,meia))
    else:
        Tc=uniq[F[m]]
        xs=np.linspace(P[:,0].min()+5,P[:,0].max()-5,40)
        secs=[(x,s_) for x in xs if (s_:=corte(Tc,x)) is not None]
        tri_aprox.append(tri_loft(secs))
    rel.append({'componente':int(k),'triangulos':nt,'tipo':tipo,'medidas_mm':[round(float(t),1) for t in tam]})
A=np.concatenate(tri_aprox)
json.dump(rel,open(f'{saida}/relatorio.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(Counter(r['tipo'] for r in rel))
R=lambda M: np.array(M,float); c_=np.sqrt(0.5)
vistas={'lateral':R([[1,0,0],[0,0,1],[0,-1,0]]),'frontal':R([[0,-1,0],[0,0,1],[1,0,0]]),'superior':R([[1,0,0],[0,1,0],[0,0,1]]),'isometrica':R([[c_,-c_,0],[-0.408,-0.408,0.816],[0.577,0.577,0.577]])}
from PIL import Image
for nome,M in vistas.items():
    io,mo=render(T,M,ref=np.concatenate([T.reshape(-1,3),A.reshape(-1,3)])),render(A,M,ref=np.concatenate([T.reshape(-1,3),A.reshape(-1,3)]))
    a1=np.array(io)<230; a2=np.array(mo)<230
    iou=(a1&a2).sum()/max((a1|a2).sum(),1)
    W=Image.new('L',(io.width*2,io.height),255); W.paste(io,(0,0)); W.paste(mo,(io.width,0)); W.save(f'{saida}/lado-a-lado-{nome}.png')
    print(nome,'silhueta, interseção/união',round(float(iou),3))
