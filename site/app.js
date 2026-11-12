function srAnalyze(t){
  if(!HIST[t])return null;
  const D=HIST[t].d,B=HIST[t].b,n=B.length;if(n<60)return null;
  const O=B.map(b=>b[0]),H=B.map(b=>b[1]),L=B.map(b=>b[2]),C=B.map(b=>b[3]),V=B.map(b=>b[4]);
  const tr=B.map((b,i)=>i?Math.max(b[1]-b[2],Math.abs(b[1]-C[i-1]),Math.abs(b[2]-C[i-1])):b[1]-b[2]);
  const atr=tr.map((_,i)=>{const s=tr.slice(Math.max(0,i-13),i+1);return s.reduce((a,b)=>a+b,0)/s.length});
  const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
  const price=C[n-1],curAtr=atr[n-1],tol=Math.max(.6*med(atr),price*.004),w=n>=120?5:3;
  const sma=k=>C.map((_,i)=>i+1<k?null:C.slice(i+1-k,i+1).reduce((a,b)=>a+b,0)/k);
  const ma={20:sma(20),50:sma(50),200:sma(200)};
  let g=0,l=0;for(let i=1;i<n;i++){const d=C[i]-C[i-1],u=Math.max(d,0),v=Math.max(-d,0);if(i===1){g=u;l=v}else{g=(g*13+u)/14;l=(l*13+v)/14}}
  const rsi=l===0?100:100-100/(1+g/l);
  // จุดกลับตัว
  let sw=[];
  for(let i=w;i<n-w;i++){const hs=H.slice(i-w,i+w+1),ls=L.slice(i-w,i+w+1);
    if(H[i]===Math.max(...hs))sw.push([i,H[i],"h"]);if(L[i]===Math.min(...ls))sw.push([i,L[i],"l"]);}
  const am=a=>a.indexOf(Math.max(...a)),an=a=>a.indexOf(Math.min(...a));
  sw.push([am(H),H[am(H)],"h"],[n-20+am(H.slice(-20)),Math.max(...H.slice(-20)),"h"],[an(L),L[an(L)],"l"],[n-20+an(L.slice(-20)),Math.min(...L.slice(-20)),"l"]);
  sw=[...new Map(sw.map(p=>[p.join("|"),p])).values()].sort((a,b)=>a[1]-b[1]);
  // รวมเป็นกลุ่ม แล้วจัดการกลุ่มที่ซ้อนกัน
  const cl=[];let cur=[];for(const p of sw){if(cur.length&&p[1]-cur[0][1]>tol){cl.push(cur);cur=[]}cur.push(p)}if(cur.length)cl.push(cur);
  const grp=[];
  for(const gp of cl){let lo=Math.min(...gp.map(p=>p[1]))-tol/2;const hi=Math.max(...gp.map(p=>p[1]))+tol/2;
    const last=grp[grp.length-1];
    if(last&&lo<=last[1]){
      if(Math.max(hi,last[1])-last[0]<=2.2*tol){last[1]=Math.max(hi,last[1]);last[2]=last[2].concat(gp);continue}
      const cut=(Math.max(...last[2].map(p=>p[1]))+Math.min(...gp.map(p=>p[1])))/2;last[1]=cut;lo=cut;}
    grp.push([lo,hi,gp]);}
  const vavg=V.map((_,i)=>{const s=V.slice(Math.max(0,i-19),i+1);return s.reduce((a,b)=>a+b,0)/s.length});
  // volume profile
  const lo0=Math.min(...L),hi0=Math.max(...H),nb=40,bw=(hi0-lo0)/nb,vp=new Array(nb).fill(0);
  B.forEach(b=>{let a=Math.floor((b[2]-lo0)/bw),z=Math.min(nb,Math.ceil((b[1]-lo0)/bw));a=Math.max(0,Math.min(a,nb-1));z=Math.max(z,a+1);for(let k=a;k<z;k++)vp[k]+=b[4]/(z-a)});
  const hvn=vp.map((v,i)=>[v,i]).filter(([v,i])=>(i===0||v>=vp[i-1])&&(i===nb-1||v>=vp[i+1])).sort((a,b)=>b[0]-a[0]).slice(0,4).map(([_,i])=>lo0+bw*(i+.5));
  // pivot รายสัปดาห์ จากสัปดาห์ที่จบแล้วล่าสุด
  const wk=d=>{const x=new Date(d+"T00:00:00Z"),day=(x.getUTCDay()+6)%7;x.setUTCDate(x.getUTCDate()-day);return x.toISOString().slice(0,10)};
  const lastWk=wk(D[n-1]);let ph=-1e9,pl=1e9,pc=null,pw=null;
  for(let i=n-1;i>=0;i--){const k=wk(D[i]);if(k===lastWk)continue;if(pw===null)pw=k;if(k!==pw)break;ph=Math.max(ph,H[i]);pl=Math.min(pl,L[i]);if(pc===null)pc=C[i];}
  const P=(ph+pl+pc)/3,piv={"P":P,"R1":2*P-pl,"S1":2*P-ph,"R2":P+(ph-pl),"S2":P-(ph-pl)};
  const extras=[["MA20",ma[20][n-1]],["MA50",ma[50][n-1]],["MA200",ma[200][n-1]]].filter(x=>x[1]).concat(hvn.map(v=>["ปริมาณซื้อขายหนาแน่น",v]),Object.entries(piv).map(([k,v])=>["Pivot สัปดาห์ "+k,v]));
  const zones=grp.map(([lo,hi,gp])=>{
    const idx=[...new Set(gp.map(p=>p[0]))].sort((a,b)=>a-b),pr=gp.map(p=>p[1]).sort((a,b)=>a-b);
    let touch=0,lt=-999;for(let i=0;i<n;i++)if(L[i]<=hi&&H[i]>=lo&&i-lt>w){touch++;lt=i}
    const rec=Math.max(...idx)/(n-1),vb=Math.min(idx.reduce((a,i)=>a+V[i]/vavg[i],0)/idx.length,3);
    const conf=[...new Set(extras.filter(([_,v])=>v>=lo-tol/4&&v<=hi+tol/4).map(x=>x[0]))];
    const kinds=new Set(gp.map(p=>p[2]));
    return {lv:pr[pr.length>>1],lo,hi,piv:idx.length,touch,last:D[Math.max(...idx)],flip:kinds.size===2,conf,
      sc:idx.length+.5*touch+2*rec+.5*vb+conf.length};
  });
  const scs=zones.map(z=>z.sc).sort((a,b)=>a-b),q=p=>scs[Math.min(scs.length-1,Math.floor(p*(scs.length-1)))];
  const q25=q(.25),q50=q(.5),q75=q(.75);
  zones.forEach(z=>{z.st=z.sc>=q75?3:z.sc>=q50?2:z.sc>=q25?1:0;z.dp=(z.lv/price-1)*100});
  const pick=a=>(a.filter(z=>z.sc>=q25).length?a.filter(z=>z.sc>=q25):a).slice(0,4);
  const res=pick(zones.filter(z=>z.lo>price).sort((a,b)=>a.lv-b.lv));
  const sup=pick(zones.filter(z=>z.hi<price).sort((a,b)=>b.lv-a.lv));
  const at=zones.filter(z=>z.lo<=price&&price<=z.hi);
  const m50=ma[50][n-1],m200=ma[200][n-1];
  const trend=m50&&m200?(price>m50&&m50>m200?"up":price<m50&&m50<m200?"down":"mix"):"mix";
  return {t,D,B,n,price,atr:curAtr,rsi,ma,res,sup,at,trend,piv,hi52:Math.max(...H),lo52:Math.min(...L),asof:D[n-1]};
}
const SR_ST=["อ่อน","ปานกลาง","แข็งแรง","แข็งแรงมาก"];
const srMon=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const srDate=(d,y)=>{const [Y,M,D]=d.split("-").map(Number);return D+" "+srMon[M-1]+(y?" "+Y:"")};
const srEsc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function srChart(a){
  const sm=typeof window!=="undefined"&&window.innerWidth<640,N=sm?60:120;
  const F=sm?14:10,F2=sm?12:9,W=sm?420:760,Hh=sm?280:300,VH=sm?40:46,pl=4,pr=sm?92:118,pt=10,s=Math.max(0,a.n-N),bars=a.B.slice(s),k=bars.length;
  const zs=a.res.concat(a.sup,a.at);
  let lo=Math.min(...bars.map(b=>b[2])),hi=Math.max(...bars.map(b=>b[1]));
  zs.forEach(z=>{if(Math.abs(z.dp)<25){lo=Math.min(lo,z.lo);hi=Math.max(hi,z.hi)}});
  const pad=(hi-lo)*.04;lo-=pad;hi+=pad;
  const cw=(W-pl-pr)/k,x=i=>pl+cw*(i+.5),y=v=>pt+(hi-v)/(hi-lo)*(Hh-pt-6);
  let g="";
  // โซน
  const lab=[];
  a.res.forEach(z=>{if(z.lo>hi)return;g+=`<rect x="${pl}" y="${y(Math.min(z.hi,hi))}" width="${W-pl-pr}" height="${Math.max(2,y(z.lo)-y(Math.min(z.hi,hi)))}" fill="var(--neg)" opacity=".16"/>`;lab.push([z.lv,"R",z,"var(--neg)"])});
  a.sup.forEach(z=>{if(z.hi<lo)return;g+=`<rect x="${pl}" y="${y(z.hi)}" width="${W-pl-pr}" height="${Math.max(2,y(Math.max(z.lo,lo))-y(z.hi))}" fill="var(--pos)" opacity=".18"/>`;lab.push([z.lv,"S",z,"var(--pos)"])});
  a.at.forEach(z=>{g+=`<rect x="${pl}" y="${y(Math.min(z.hi,hi))}" width="${W-pl-pr}" height="${y(Math.max(z.lo,lo))-y(Math.min(z.hi,hi))}" fill="var(--accent)" opacity=".2"/>`;lab.push([z.lv,"=",z,"var(--accent-ink)"])});
  // เส้นตารางราคา
  const step=(()=>{const r=(hi-lo)/5,p=Math.pow(10,Math.floor(Math.log10(r)));return [1,2,2.5,5,10].map(m=>m*p).find(m=>m>=r)})();
  for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step)g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--soft)" stroke-width="1"/><text x="${W-pr+4}" y="${y(v)+3}" font-size="${F2}" fill="var(--muted)" font-family="var(--num)" opacity=".7">${v>=1000?v.toFixed(0):v.toFixed(step<1?2:0)}</text>`;
  // แท่งเทียน
  const vmax=Math.max(...bars.map(b=>b[4]));
  bars.forEach((b,i)=>{const up=b[3]>=b[0],c=up?"var(--pos)":"var(--neg)",X=x(i);
    g+=`<line x1="${X}" x2="${X}" y1="${y(b[1])}" y2="${y(b[2])}" stroke="${c}" stroke-width="1"/><rect x="${X-cw*.35}" y="${y(Math.max(b[0],b[3]))}" width="${cw*.7}" height="${Math.max(1,Math.abs(y(b[0])-y(b[3])))}" fill="${c}"/>`;
    g+=`<rect x="${X-cw*.35}" y="${Hh+VH-b[4]/vmax*(VH-6)}" width="${cw*.7}" height="${b[4]/vmax*(VH-6)}" fill="${c}" opacity=".45"/>`;});
  // เส้นค่าเฉลี่ย
  [[20,"#f0a202"],[50,"var(--sky)"],[200,"#a06cff"]].forEach(([m,c])=>{const pts=a.ma[m].slice(s).map((v,i)=>v==null?null:`${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean);if(pts.length>1)g+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="1.6"/>`});
  // ราคาปัจจุบัน
  g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(a.price)}" y2="${y(a.price)}" stroke="var(--fg)" stroke-dasharray="4 3" stroke-width="1"/>`;
  // ป้ายโซน (กันซ้อน)
  lab.push([a.price,"ปิด",null,null]);
  lab.sort((p,q)=>y(p[0])-y(q[0]));let lastY=-99;
  lab.forEach(([v,t,z,c])=>{let Y=Math.max(y(v)+3,lastY+(z?F+2:F+5));if(Y>Hh+VH-14)return;lastY=Y;
    if(!z){g+=`<rect x="${W-pr+1}" y="${Y-F-1}" width="${pr-3}" height="${F+5}" rx="4" fill="var(--fg)"/><text x="${W-pr+6}" y="${Y}" font-size="${F}" font-weight="700" fill="var(--surface)" font-family="var(--num)">ปิด ${v.toFixed(2)}</text>`;lastY+=2;return}
    g+=`<text x="${W-pr+6}" y="${Y}" font-size="${F}" font-weight="700" fill="${c}" font-family="var(--num)">${t} ${v.toFixed(v>=1000?0:2)}</text>`});
  // แกนวันที่
  for(let i=0;i<k;i+=Math.ceil(k/(sm?4:6)))g+=`<text x="${x(i)}" y="${Hh+VH+12}" font-size="${F2}" fill="var(--muted)" text-anchor="${i?"middle":"start"}" font-family="var(--num)">${srDate(a.D[s+i])}</text>`;
  return `<svg viewBox="0 0 ${W} ${Hh+VH+16}" role="img" aria-label="กราฟแท่งเทียน ${a.t} พร้อมโซนแนวรับแนวต้าน">${g}</svg>`;
}
function srText(a){
  const f=v=>CUR+v.toFixed(2),p=v=>(v>0?"+":"−")+Math.abs(v).toFixed(1)+"%";
  const m50=a.ma[50][a.n-1],m200=a.ma[200][a.n-1],out=[];
  const tr={up:"ขาขึ้น: ราคาอยู่เหนือเส้นเฉลี่ย 50 วัน และเส้น 50 วันอยู่เหนือ 200 วัน",down:"ขาลง: ราคาอยู่ใต้เส้นเฉลี่ย 50 วัน และเส้น 50 วันอยู่ใต้ 200 วัน",mix:"ยังไม่ชัด: ราคากับเส้นเฉลี่ย 50/200 วันสลับกัน"}[a.trend];
  out.push(`${tr} (MA50 ${f(m50)} · MA200 ${f(m200)}) · RSI 14 วัน ${a.rsi.toFixed(0)}${a.rsi<30?" ต่ำกว่า 30 = ถูกขายมาก (oversold) มักมีแรงเด้ง แต่ไม่ได้แปลว่าลงจบแล้ว":a.rsi>70?" สูงกว่า 70 = ถูกซื้อมาก (overbought) ระวังการย่อตัว":""}`);
  const r=a.res[0],s=a.sup[0];
  if(r)out.push(`แนวต้านแรก ${f(r.lo)}–${f(r.hi)} (${p(r.dp)}) ราคาเคยแตะ ${r.touch} ครั้ง (${SR_ST[r.st]})${r.flip?" และเป็นแนวรับเดิมที่กลายเป็นแนวต้าน":""}${r.conf.length?" · ตรงกับ "+r.conf.slice(0,3).join(", "):""} ถ้าปิดเหนือ ${f(r.hi)} ได้ ${a.res[1]?"แนวต้านถัดไปคือ "+f(a.res[1].lv):"จะเป็นจุดสูงสุดใหม่ของรอบปี"}`);
  else out.push(`ราคาอยู่เหนือแนวต้านทั้งหมดในรอบปี (สูงสุด ${f(a.hi52)}) ไม่มีแนวต้านจากประวัติราคาให้อ้างอิง`);
  if(s)out.push(`แนวรับแรก ${f(s.lo)}–${f(s.hi)} (${p(s.dp)}) แตะ ${s.touch} ครั้ง (${SR_ST[s.st]})${s.flip?" และเป็นแนวต้านเดิมที่กลายเป็นแนวรับ":""}${s.conf.length?" · ตรงกับ "+s.conf.slice(0,3).join(", "):""} ถ้าปิดต่ำกว่า ${f(s.lo)} ${a.sup[1]?"แนวรับถัดไปคือ "+f(a.sup[1].lv):a.piv.S2<s.lo?"แนวรับถัดไปคือ Pivot สัปดาห์ S2 "+f(a.piv.S2):"จะเป็นจุดต่ำสุดใหม่ของรอบปี ไม่มีแนวรับจากประวัติราคาให้อ้างอิง"}`);
  else out.push(`ราคาอยู่ต่ำกว่าแนวรับทั้งหมดในรอบปี (ต่ำสุด ${f(a.lo52)}) ให้ดู Pivot สัปดาห์ S1 ${f(a.piv.S1)} และ S2 ${f(a.piv.S2)} แทน`);
  if(a.at.length)out.push(`ตอนนี้ราคาอยู่ในโซน ${f(a.at[0].lo)}–${f(a.at[0].hi)} ซึ่งเคยเป็นจุดกลับตัว ระวังการแกว่งในกรอบนี้`);
  out.push(`ราคาแกว่งเฉลี่ยวันละ ${f(a.atr)} (${(a.atr/a.price*100).toFixed(1)}% · ATR 14 วัน)`);
  return out;
}
function srBox(t){
  if(!(t in HIST)){loadHist(t);return `<div class="box"><div class="label">แนวรับ/แนวต้านจากกราฟ · กำลังโหลดราคาย้อนหลัง…</div></div>`}
  const a=srAnalyze(t);if(!a)return "";
  const row=(z,k)=>`<tr><td>${k}</td><td class="mono">${CUR}${z.lo.toFixed(2)}–${z.hi.toFixed(2)}</td><td class="mono" style="color:var(${z.dp>=0?"--neg":"--pos"})">${z.dp>=0?"+":"−"}${Math.abs(z.dp).toFixed(1)}%</td><td class="mono">${z.touch}</td><td>${SR_ST[z.st]}${z.flip?" ↺":""}</td></tr>`;
  const rows=[...a.res].reverse().map(z=>row(z,"ต้าน")).join("")+a.at.map(z=>row(z,"ตรงราคา")).join("")+a.sup.map(z=>row(z,"รับ")).join("");
  return `<div class="box"><div class="label">แนวรับ/แนวต้านจากกราฟ · ${srEsc(t)} · ราคาปิด ${srDate(a.asof,true)}</div>
   ${srChart(a)}
   <div class="legend"><span><i style="background:var(--neg);opacity:.5"></i>โซนแนวต้าน</span><span><i style="background:var(--pos);opacity:.5"></i>โซนแนวรับ</span><span><i style="background:#f0a202"></i>MA20</span><span><i style="background:var(--sky)"></i>MA50</span><span><i style="background:#a06cff"></i>MA200</span><span>แท่งล่างคือปริมาณซื้อขาย</span></div>
   <div class="grid2"><ul class="news" style="gap:8px">${srText(a).map(x=>`<li style="grid-template-columns:14px 1fr"><span class="d">•</span><span>${srEsc(x)}</span></li>`).join("")}</ul>
   <div style="overflow-x:auto"><table class="srt"><thead><tr><th></th><th>โซน</th><th>ห่าง</th><th>แตะ</th><th>ความแข็งแรง</th></tr></thead><tbody>${rows}</tbody></table>
   <p class="note" style="margin-top:6px">↺ = เคยเป็นทั้งแนวรับและแนวต้าน · ความแข็งแรงเทียบกันเองภายในหุ้นตัวนี้</p></div></div>
   <p class="note">คำนวณจากราคารายวันย้อนหลัง 1 ปี: หาจุดกลับตัว (สูงสุด/ต่ำสุดในช่วง ±5 วัน) รวมจุดที่ราคาใกล้กันเป็นโซน ให้คะแนนจากจำนวนครั้งที่แตะ ความใหม่ ปริมาณซื้อขาย และความสอดคล้องกับเส้นเฉลี่ย, Pivot และระดับที่ซื้อขายหนาแน่น · เป็นการอ่านกราฟเชิงสถิติ ไม่ใช่คำแนะนำให้ซื้อหรือขาย</p></div>`;
}
function startApp(){
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SEC=CFG.sec;
const fmt=b=>b>=1000?CUR+(b/1000).toFixed(2)+"T":b>=1?CUR+b.toFixed(b>=100?0:1)+"B":CUR+(b*1000).toFixed(0)+"M";
const pct=v=>(v>0?"+":v<0?"−":"")+Math.abs(v).toFixed(2)+"%";
const tone=v=>v>0.3?"pos":v<-0.3?"neg":"flat";
const co=RAW.map(r=>({s:r[0],n:r[1],sec:r[2],v:r[3],p:r[4],d:r[5]})).sort((a,b)=>b.v-a.v);
co.forEach((c,i)=>{c.rank=i+1;c.v0=c.v;c.p0=c.p});
let TOTAL=co.reduce((a,c)=>a+c.v,0);
let secs=[],IDX=0;
function calcSecs(){secs=Object.keys(SEC).map(k=>{const L=co.filter(c=>c.sec===k),v=L.reduce((a,c)=>a+c.v,0),Ld=L.filter(c=>c.d!=null),vd=Ld.reduce((a,c)=>a+c.v,0);return {k,th:SEC[k][0],col:SEC[k][1],w:(SN[k]||{}).w,v,d:Ld.reduce((a,c)=>a+c.v*c.d,0)/vd,up:Ld.filter(c=>c.d>0).length,dn:Ld.filter(c=>c.d<0).length}}).sort((a,b)=>b.v-a.v);
const Ld=co.filter(c=>c.d!=null);IDX=Ld.reduce((a,c)=>a+c.v*c.d,0)/Ld.reduce((a,c)=>a+c.v,0);}
calcSecs();
const LT=new Set(['--u1','--z0','--d1','--na']);
const heat=d=>d==null?'--na':d>=3?'--u3':d>=1?'--u2':d>0.2?'--u1':d>-0.2?'--z0':d>-1?'--d1':d>-3?'--d2':'--d3';
let view="co", focus=null, sel={type:"macro"};

$("scale").innerHTML=[["--d3","≤ −3%"],["--d2","−1 ถึง −3%"],["--d1","0 ถึง −1%"],["--z0","ทรงตัว"],["--u1","0 ถึง +1%"],["--u2","+1 ถึง +3%"],["--u3","≥ +3%"],["--na","ไม่มีข้อมูล"]].map(x=>`<span><i style="background:var(${x[0]})"></i>${x[1]}</span>`).join("");
$("macroLabel").textContent="ภาพรวมตลาด · "+SN.meta.week;
$("macro").innerHTML=SN.meta.summary.map(t=>`<li>${esc(t)}</li>`).join("");

function setView(v){view=v;$("v-sec").setAttribute("aria-pressed",v==="sec");$("v-co").setAttribute("aria-pressed",v==="co");}
$("v-sec").onclick=()=>{setView("sec");focus=null;render()};
$("v-co").onclick=()=>{setView("co");render()};

function chips(){
  $("chips").innerHTML=`<button class="chip" data-k="" aria-pressed="${!focus}">ทั้งหมด</button>`+
   secs.map(s=>`<button class="chip" data-k="${s.k}" aria-pressed="${focus===s.k}"><i style="background:var(${s.col})"></i>${s.th}<span class="wk ${tone(s.d)}">${pct(s.d)}</span></button>`).join("");
}
function openSector(k){focus=k||null;if(k){setView("co");sel={type:"sec",k}}else{sel={type:"macro"}}panel();render();}
$("chips").onclick=e=>{const b=e.target.closest(".chip");if(b)openSector(b.dataset.k)};

function bars(){
  const mx=secs[0].v;
  $("bars").innerHTML=secs.map(s=>`<div class="bar" data-k="${s.k}"><span>${s.th}</span><span class="track"><span class="fill" style="display:block;width:${s.v/mx*100}%;background:var(${s.col})"></span></span><span class="n">${fmt(s.v)}</span><span class="wk ${tone(s.d)}" style="justify-self:end" title="วันล่าสุด">${pct(s.d)}</span><span class="wk wkw ${tone(s.w)}" style="justify-self:end" title="ทั้งสัปดาห์">${pct(s.w)}</span></div>`).join("");
}
$("bars").onclick=e=>{const b=e.target.closest(".bar");if(b){openSector(b.dataset.k);$("map").scrollIntoView({behavior:"smooth",block:"start"})}};

/* ---------- panels ---------- */
function sectorPanel(k){
  const s=secs.find(x=>x.k===k),n=SN[k]||{items:[]};
  const top=co.filter(c=>c.sec===k).slice(0,6);
  return `<div class="ph"><div><div class="label">กลุ่มธุรกิจ</div><h2>${s.th}</h2><span class="note">${k}</span></div>
   <div class="kv" style="min-width:min(100%,360px)"><div><div class="label">มูลค่ารวม</div><div class="v">${fmt(s.v)}</div></div>
   <div><div class="label">สัดส่วนในดัชนี</div><div class="v">${(s.v/TOTAL*100).toFixed(1)}%</div></div>
   <div><div class="label">${LIVE?"วันล่าสุด":"วันล่าสุด (11 พ.ย.)"}</div><div class="v"><span class="wk ${tone(s.d)}">${pct(s.d)}</span></div><span class="note">ขึ้น ${s.up} · ลง ${s.dn} ตัว</span></div><div><div class="label">สัปดาห์ล่าสุด</div><div class="v"><span class="wk ${tone(s.w)}">${pct(s.w)}</span></div></div></div></div>
   <div class="grid2"><div class="box"><div class="label">ข่าวและปัจจัยที่ขับเคลื่อนกลุ่มนี้</div><ul class="news">${n.items.map(t=>`<li style="grid-template-columns:1fr">${esc(t)}</li>`).join("")}</ul></div>
   <div class="box"><div class="label">บริษัทใหญ่สุดในกลุ่ม</div><div class="toplist">${top.map(c=>`<button data-s="${c.s}"><b class="mono">${c.s}</b><span>${esc(c.n)}${DET[c.s]?" ●":""}</span><span class="mono">${fmt(c.v)} <span class="wk ${tone(c.d)}">${c.d==null?"—":pct(c.d)}</span></span></button>`).join("")}</div></div></div>`;
}

function epsChart(eps){
  const W=360,H=190,L=36,R=8,T=14,B=30;
  const vals=eps.flatMap(e=>[e[1],e[2]]).filter(v=>v!=null);const mx=Math.max(...vals)*1.12,mn=Math.min(0,...vals);
  const y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));const gw=(W-L-R)/eps.length,bw=gw*.32;
  let g=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>`;
  [mx/2,mx/1.12].forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${L-5}" y="${y(v)+3}" text-anchor="end" font-size="9.5" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${v.toFixed(v<10?2:0)}</text>`});
  eps.forEach((e,i)=>{
    const cx=L+gw*i+gw/2,beat=e[1]==null||e[2]>=e[1];
    const r=(v,x,cls)=>{const a=y(Math.max(v,0)),b=y(Math.min(v,0));return `<rect x="${x}" y="${a}" width="${bw}" height="${Math.max(1,b-a)}" rx="2" ${cls}/>`};
    g+=e[1]==null?r(e[2],cx-bw/2,`fill="var(--bar)"`):r(e[1],cx-bw-1,`fill="var(--est)"`)+r(e[2],cx+1,`fill="var(${beat?"--pos":"--neg"})"`);
    g+=`<text x="${cx}" y="${H-B+13}" text-anchor="middle" font-size="9.5" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${e[0]}</text>`;
    const sp=e[1]?((e[2]-e[1])/Math.abs(e[1])*100):0;
    if(e[1]!=null)g+=`<text x="${cx}" y="${H-B+25}" text-anchor="middle" font-size="9" fill="var(${beat?"--pos":"--neg"})" font-family="IBM Plex Mono,monospace">${sp>=0?"+":""}${Math.abs(sp)>999?">999":sp.toFixed(0)}%</text>`;
    g+=`<title>${e[0]}: คาด ${e[1]} / จริง ${e[2]}</title>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="EPS จริงเทียบประมาณการ">${g}</svg>`;
}
function revChart(r){
  const rows=[];
  if(r.last)rows.push({l:r.last[0],a:r.last[1],e:r.last[2]});
  if(r.nxt)rows.push({l:r.nxt[0],lo:r.nxt[1],hi:r.nxt[2],c:r.cons});
  if(!rows.length)return "";
  const mx=Math.max(...rows.flatMap(x=>[x.a||0,x.e||0,x.hi||0,x.c||0]))*1.1;
  const W=360,L=8,R=8;const sx=v=>L+(W-L-R)*v/mx;
  let h=0,g="";
  rows.forEach(x=>{
    g+=`<text x="${L}" y="${h+12}" font-size="11" fill="var(--fg)">${esc(x.l)}</text>`;h+=18;
    if(x.a!=null){g+=`<rect x="${L}" y="${h}" width="${sx(x.a)-L}" height="12" rx="2" fill="var(--bar)"/><text x="${sx(x.a)+4}" y="${h+10}" font-size="10" fill="var(--fg)" font-family="IBM Plex Mono,monospace">จริง ${CUR}${x.a}B</text>`;h+=16}
    if(x.e!=null){g+=`<rect x="${L}" y="${h}" width="${sx(x.e)-L}" height="12" rx="2" fill="var(--est)"/><text x="${sx(x.e)+4}" y="${h+10}" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono,monospace">คาด ${CUR}${x.e}B</text>`;h+=16}
    if(x.lo!=null){g+=`<rect x="${sx(x.lo)}" y="${h}" width="${Math.max(3,sx(x.hi)-sx(x.lo))}" height="12" rx="2" fill="var(--accent)"/><line x1="${L}" x2="${sx(x.lo)}" y1="${h+6}" y2="${h+6}" stroke="var(--line)"/><text x="${Math.min(sx(x.hi)+4,W-150)}" y="${h+10}" font-size="10" fill="var(--fg)" font-family="IBM Plex Mono,monospace">${CUR}${x.lo}–${x.hi}B</text>`;h+=16;
      if(x.c!=null){g+=`<line x1="${sx(x.c)}" x2="${sx(x.c)}" y1="${h-18}" y2="${h}" stroke="var(--fg)" stroke-width="2"/><text x="${L}" y="${h+10}" font-size="10" fill="var(--muted)">เส้นดำ = ตลาดคาด ${CUR}${x.c}B</text>`;h+=16}}
    h+=8;
  });
  return `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="รายได้จริงเทียบประมาณการ">${g}</svg>`;
}
function stockPanel(c){
  const d=DET[c.s],s=SEC[c.sec],secTot=secs.find(x=>x.k===c.sec).v;
  let h=`<div class="ph"><div><div class="label">${c.s} · ${s[0]}</div><h2>${esc(c.n)}</h2></div>
   <div class="kv" style="min-width:min(100%,420px)"><div><div class="label">มูลค่าตลาด</div><div class="v">${fmt(c.v)}</div></div>
   <div><div class="label">สัดส่วนใน ${CFG.index}</div><div class="v">${(c.v/TOTAL*100).toFixed(2)}%</div><span class="note">อันดับ ${c.rank}</span></div>
   <div><div class="label">สัดส่วนในกลุ่ม</div><div class="v">${(c.v/secTot*100).toFixed(1)}%</div></div>
   ${c.p!=null?`<div><div class="label">${LIVE?"ราคาล่าสุด":"ราคาปิด 11 พ.ย."}</div><div class="v">${CUR}${c.p.toLocaleString()} <span class="wk ${tone(c.d)}">${pct(c.d)}</span></div></div>`:`<div><div class="label">ราคาล่าสุด</div><div class="note">ไม่มีข้อมูลวันล่าสุด</div></div>`}</div></div>`;
  if(!d){return h+srBox(c.s)+`<p class="note">ยังไม่มีข่าว การคาดการณ์ และกราฟงบของ ${c.s} ในหน้านี้</p>`}
  const [lo,avg,hi]=d.tgt||[0,1,2],up=d.tgt?(avg/d.price-1)*100:0,br=d.br||[];
  const brCols=["--pos","--pos","--est","--neg","--neg"],brOp=[1,.6,1,.6,1],brL=["Strong Buy","Buy","Hold","Sell","Strong Sell"];
  const span=hi-lo,px=v=>Math.max(0,Math.min(100,(v-lo)/span*100));
  h+=`<div class="grid2">
   <div class="box"><div class="label">การคาดการณ์ของนักวิเคราะห์${d.n?` (${d.n} ราย)`:""}</div>${d.tgt?`
     <div class="row" style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font-size:1.1rem">${d.rating||""}</b><span class="note">เป้าเฉลี่ย</span><span class="mono" style="font-size:1.1rem">${CUR}${avg.toLocaleString()}</span><span class="wk ${tone(up)}">${up>=0?"+":"−"}${Math.abs(up).toFixed(0)}% จากราคา</span></div>
     ${br.length?`<div class="rb">${br.map((n,i)=>n?`<span title="${brL[i]} ${n}" style="flex:${n};background:var(${brCols[i]});opacity:${brOp[i]}"></span>`:"").join("")}</div>
     <div class="legend">${br.map((n,i)=>n?`<span><i style="background:var(${brCols[i]});opacity:${brOp[i]}"></i>${brL[i]} ${n}</span>`:"").join("")}</div>`:""}
     <div class="label" style="margin-top:6px">ช่วงเป้าราคา</div>
     <div style="position:relative;height:30px"><div style="position:absolute;left:0;right:0;top:12px;height:6px;border-radius:3px;background:var(--line)"></div>
       <div title="เป้าเฉลี่ย" style="position:absolute;left:calc(${px(avg)}% - 1px);top:6px;width:2px;height:18px;background:var(--fg)"></div>
       <div title="ราคาปัจจุบัน" style="position:absolute;left:calc(${px(d.price)}% - 6px);top:9px;width:12px;height:12px;border-radius:50%;background:var(--accent);border:2px solid var(--surface)"></div></div>
     <div class="legend" style="justify-content:space-between"><span class="mono">ต่ำสุด ${CUR}${lo}</span><span><i style="background:var(--accent);border-radius:50%"></i>ราคาตอนนี้</span><span class="mono">สูงสุด ${CUR}${hi}</span></div>
     `:`<p class="note" style="margin:0">ยังไม่มีข้อมูลเป้าราคาของนักวิเคราะห์</p>`}<div class="note">ประกาศงบครั้งถัดไป: ${d.next}</div>
   </div>
   <div class="box"><div class="label">ข่าวล่าสุด</div><ul class="news">${d.news.map(n=>`<li><span class="d">${esc(n[0])}</span><span>${esc(n[1])}</span></li>`).join("")}</ul></div>
  </div>${srBox(c.s)}<div class="grid2">`;
  if(d.eps)h+=`<div class="box"><div class="label">กำไรต่อหุ้น (EPS) รายไตรมาส (${CFG.epsUnit})${d.eps.some(e=>e[1]!=null)?" เทียบประมาณการ":""}</div>${epsChart(d.eps)}
     ${d.eps.some(e=>e[1]!=null)?`<div class="legend"><span><i style="background:var(--est)"></i>ประมาณการ</span><span><i style="background:var(--pos)"></i>จริง ดีกว่าคาด</span><span><i style="background:var(--neg)"></i>จริง ต่ำกว่าคาด</span></div>`:`<div class="legend"><span><i style="background:var(--bar)"></i>EPS จริง (ไม่มีตัวเลขคาดการณ์รายไตรมาสที่เปิดเผย)</span></div>`}</div>`;
  const rv=d.rev?revChart(d.rev):"";
  if(rv)h+=`<div class="box"><div class="label">${CFG.revLabel}</div>${rv}</div>`;
  h+=`</div>${d.note?`<p class="note">หมายเหตุ: ${esc(d.note)}</p>`:""}<p class="disc">${CFG.disc} · ใช้เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน</p>`;
  return h;
}
function panel(){
  let h="";
  if(sel.type==="co"){const c=co.find(x=>x.s===sel.s);h=stockPanel(c)}
  else if(sel.type==="sec")h=sectorPanel(sel.k);
  else h=`<div class="label">เลือกดู</div><p class="note" style="margin:0">แตะชื่อกลุ่มเพื่ออ่านว่าทำไมมูลค่าขึ้นหรือลง หรือแตะหุ้นที่มีจุดขาว (เช่น ${CFG.examples}) เพื่อดูข่าว การคาดการณ์ และงบจริงเทียบเป้า</p>`;
  $("panel").innerHTML=h;
}
$("panel").onclick=e=>{const b=e.target.closest("[data-s]");if(b){sel={type:"co",s:b.dataset.s};panel();render()}};

/* ---------- map ---------- */
function render(){
  chips();
  const q=$("q").value.trim().toLowerCase();
  const list=focus?co.filter(c=>c.sec===focus):co;
  const sum=list.reduce((a,c)=>a+c.v,0);
  $("tot").innerHTML=fmt(sum)+` <span class="wk ${tone(focus?secs.find(x=>x.k===focus).d:IDX)}">${pct(focus?secs.find(x=>x.k===focus).d:IDX)}</span>`;
  $("totLabel").textContent=(focus?"มูลค่ารวม "+SEC[focus][0]:"มูลค่ารวมทั้งดัชนี")+" · วันล่าสุด";
  const el=$("map");const W=el.clientWidth;
  const H=Math.round(W<600?W*1.6:W*0.62);el.style.height=H+"px";
  let h="";
  if(view==="sec"&&!focus){
    const root=d3.hierarchy({children:secs.map(s=>({k:s.k,v:s.v}))}).sum(d=>d.v||0).sort((a,b)=>b.value-a.value);
    d3.treemap().size([W,H]).tile(d3.treemapSquarify.ratio(1.2)).paddingInner(5).round(true)(root);
    root.leaves().forEach(l=>{
      const s=secs.find(x=>x.k===l.data.k),w=l.x1-l.x0,ht=l.y1-l.y0,a=Math.min(w,ht);
      const fs=Math.max(10,Math.min(22,a/6));
      h+=`<button class="tile${LT.has(heat(s.d))?" lt":""}" data-k="${s.k}" aria-label="${s.th} ${fmt(s.v)} ${pct(s.d)}" style="left:${l.x0}px;top:${l.y0}px;width:${w}px;height:${ht}px;background:var(${heat(s.d)});padding:4px">
        ${w>50&&ht>34?`<span class="t" style="font-size:${fs}px;font-family:var(--sans)">${s.th}</span>`:""}
        ${w>50&&ht>54?`<span class="c" style="font-size:${Math.max(9.5,fs*.6)}px">${fmt(s.v)} · ${pct(s.d)}</span>`:""}
        ${w>60&&ht>74?`<span class="c" style="font-size:${Math.max(9,fs*.5)}px">ขึ้น ${s.up} · ลง ${s.dn}</span>`:""}</button>`;
    });
  }else{
    const groups=focus?[{k:focus,children:list}]:secs.map(s=>({k:s.k,children:co.filter(c=>c.sec===s.k)}));
    const root=d3.hierarchy({children:groups}).sum(d=>d.v||0).sort((a,b)=>b.value-a.value);
    d3.treemap().size([W,H]).tile(d3.treemapSquarify.ratio(1.2)).paddingInner(3).paddingOuter(d=>d.depth===1?4:0).paddingTop(d=>d.depth===1?23:0).round(true)(root);
    root.children.forEach(g=>{
      const s=secs.find(x=>x.k===g.data.k),gw=g.x1-g.x0;
      const lab=gw>150?`${s.th} · ${fmt(s.v)} · ${pct(s.d)}`:gw>70?`${s.th} ${pct(s.d)}`:gw>34?pct(s.d):"";
      h+=`<div class="sec" style="left:${g.x0}px;top:${g.y0}px;width:${gw}px;height:${g.y1-g.y0}px;background:var(${s.col})"><button class="sec-h" data-sk="${s.k}" title="${esc(s.th+" · "+fmt(s.v)+" · วันล่าสุด "+pct(s.d)+" · สัปดาห์ "+pct(s.w))}">${lab}</button></div>`;
      g.leaves().forEach(l=>{
        const c=l.data,w=l.x1-l.x0,ht=l.y1-l.y0,a=Math.min(w,ht);
        const match=q&&(c.s.toLowerCase().includes(q)||c.n.toLowerCase().includes(q));
        const isSel=sel.type==="co"&&sel.s===c.s;
        const cls=(q?(match?" hit":" dim"):"")+(isSel?" hit":"");
        const fs=Math.max(9,Math.min(30,a/3.4));
        const dtxt=c.d==null?"—":pct(c.d);
        h+=`<button class="tile${cls}${LT.has(heat(c.d))?" lt":""}" data-s="${c.s}" title="${esc(c.s+" · "+c.n+" · "+fmt(c.v)+" · "+dtxt)}" aria-label="${esc(c.n)} ${fmt(c.v)} ${dtxt}" style="left:${l.x0}px;top:${l.y0}px;width:${w}px;height:${ht}px;background:var(${heat(c.d)})" data-lt="${LT.has(heat(c.d))?1:0}">${DET[c.s]&&w>14&&ht>14?'<span class="dot"></span>':""}${w>22&&ht>13?`<span class="t" style="font-size:${fs}px">${c.s}</span>`:""}${w>30&&ht>26?`<span class="c" style="font-size:${Math.max(8.5,fs*.48)}px">${dtxt}</span>`:""}${w>50&&ht>44?`<span class="m" style="font-size:${Math.max(8.5,fs*.42)}px">${fmt(c.v)}</span>`:""}</button>`;
      });
    });
  }
  el.innerHTML=h;
  bars();
}
$("map").onclick=e=>{const sh=e.target.closest(".sec-h");if(sh){focus=null;sel={type:"sec",k:sh.dataset.sk};panel();render();$("panel").scrollIntoView({behavior:"smooth",block:"nearest"});return}
  const t=e.target.closest(".tile");if(!t)return;
  if(t.dataset.k){openSector(t.dataset.k);return}
  sel={type:"co",s:t.dataset.s};panel();render();$("panel").scrollIntoView({behavior:"smooth",block:"nearest"})};
$("q").oninput=()=>{const q=$("q").value.trim().toLowerCase();if(q){setView("co");const hit=co.find(c=>c.s.toLowerCase()===q)||co.find(c=>c.s.toLowerCase().includes(q)||c.n.toLowerCase().includes(q));if(hit){if(focus&&focus!==hit.sec)focus=null;sel={type:"co",s:hit.s};panel()}}render()};

/* ---------- prices from data/latest-<market>.json (refreshed by GitHub Actions) ---------- */
let LIVE=null;
const hhmm=t=>new Date(t).toLocaleString("th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
function setLive(state,txt){$("live").className="live"+(state?" "+state:"");$("liveTxt").textContent=txt}
function applyLatest(j){
  const by=new Map(co.map(c=>[c.s,c]));let n=0,last="";
  Object.entries(j.quotes||{}).forEach(([s,q])=>{const c=by.get(s);if(!c||q[0]==null)return;
    if(c.p0)c.v=c.v0*q[0]/c.p0;c.p=q[0];c.d=q[1];n++;if(q[2]>last)last=q[2]});
  if(!n)return;
  LIVE={n,at:Date.parse(j.updated),last};
  TOTAL=co.reduce((a,c)=>a+c.v,0);co.sort((a,b)=>b.v-a.v).forEach((c,i)=>c.rank=i+1);calcSecs();
  $("asof").textContent=`ราคา ณ ${srDate(last,true)}`;
  // Fresh means the last fetch was recent; outside market hours the data simply stays at the close.
  setLive((Date.now()-LIVE.at)/60000<45?"on":"stale",`อัปเดต ${hhmm(LIVE.at)} น. · ${n} ตัว`);
  panel();render();
}
async function refresh(){
  try{const r=await fetch(`data/latest-${CFG.market}.json?t=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)throw new Error(r.status);applyLatest(await r.json())}
  catch(e){if(!LIVE)setLive("stale","โหลดราคาไม่สำเร็จ แสดงมูลค่าฐานแทน")}
}
addEventListener("hist",e=>{if(sel.type==="co"&&sel.s===e.detail)panel()});
let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(render,120)});
panel();render();setLive("stale","กำลังโหลดราคา…");
refresh();setInterval(refresh,120000);
}

/* ---------- data loading ---------- */
const CUR=CFG.cur, HIST={};
let RAW, DET, SN;
// Must match history_filename() in scripts/fetch_prices.py.
const RESERVED=new Set(["CON","PRN","AUX","NUL",...[1,2,3,4,5,6,7,8,9].flatMap(n=>["COM"+n,"LPT"+n])]);
const histFile=t=>RESERVED.has(t.toUpperCase())?t+"_.csv":t+".csv";
async function loadHist(t){
  HIST[t]=null;
  try{
    const r=await fetch(`data/history/${CFG.market}/${encodeURIComponent(histFile(t))}`);if(!r.ok)throw new Error(r.status);
    const rows=(await r.text()).trim().split("\n").slice(1).map(l=>l.split(","));
    HIST[t]={d:rows.map(x=>x[0]),b:rows.map(x=>[+x[1],+x[2],+x[3],+x[4],+x[5]/1e6])};
  }catch(e){HIST[t]=null}
  dispatchEvent(new CustomEvent("hist",{detail:t}));
}
Promise.all([`data/universe-${CFG.market}.json`,`data/content-${CFG.market}.json`].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()})))
  .then(([u,c])=>{RAW=u.map(r=>[r.ticker,r.name,r.sector,r.base_mcap_b,r.base_price,null]);DET=c.companies||{};SN=c.sectors;startApp()})
  .catch(()=>{document.getElementById("liveTxt").textContent="โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า"});
