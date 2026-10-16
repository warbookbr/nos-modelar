"""Renderizador mínimo de triângulos em tons de cinza, com z-buffer, usado pelas sondas de importação para as vistas lado a lado."""
import numpy as np
from PIL import Image
def render(T, M, W=900, ref=None):
    P=T@M.T
    Q=(ref if ref is not None else T.reshape(-1,3))@M.T  # projected: x,y screen, z depth (toward viewer larger)
    mn=Q[:,:2].min(0); mx=Q[:,:2].max(0)
    s=(W-40)/max(mx-mn); H=int((mx[1]-mn[1])*s)+40
    img=np.full((H,W),235.0); zb=np.full((H,W),-1e9)
    nrm=np.cross(P[:,1]-P[:,0],P[:,2]-P[:,0]); ln=np.linalg.norm(nrm,axis=1)+1e-12
    luz=np.array([0.3,0.5,0.81]); shade=np.abs((nrm/ln[:,None])@luz)
    for t,sh in zip(P,shade):
        xs=(t[:,0]-mn[0])*s+20; ys=H-((t[:,1]-mn[1])*s+20)
        x0,x1=int(max(0,np.floor(xs.min()))),int(min(W-1,np.ceil(xs.max())))
        y0,y1=int(max(0,np.floor(ys.min()))),int(min(H-1,np.ceil(ys.max())))
        if x1<x0 or y1<y0: continue
        gx,gy=np.meshgrid(np.arange(x0,x1+1)+0.5,np.arange(y0,y1+1)+0.5)
        (ax,bx,cx),(ay,by,cy)=xs,ys
        den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
        if abs(den)<1e-12: continue
        l1=((by-cy)*(gx-cx)+(cx-bx)*(gy-cy))/den; l2=((cy-ay)*(gx-cx)+(ax-cx)*(gy-cy))/den; l3=1-l1-l2
        m=(l1>=0)&(l2>=0)&(l3>=0)
        z=l1*t[0,2]+l2*t[1,2]+l3*t[2,2]
        sub=zb[y0:y1+1,x0:x1+1]; win=m&(z>sub)
        sub[win]=z[win]; img[y0:y1+1,x0:x1+1][win]=60+170*sh
    return Image.fromarray(img.astype(np.uint8))
