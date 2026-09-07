/* ============================== DESIGN TOKENS ============================== */
export const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#F6F2EA; --card:#FFFCF6; --forest:#1E3A2E; --forest-dk:#132B21;
  --burgundy:#6E2A3B; --sage:#9FB18F; --sage-lt:#E7EDE1; --blush:#E6C2B2;
  --beige:#E9E0C8; --ink:#282420; --ink-soft:#5B554C; --line:#E4DCC9;
}
*{box-sizing:border-box;}
.ss-root{font-family:'Inter',sans-serif; background:var(--bg); color:var(--ink); min-height:100vh;}
.ss-serif{font-family:'Fraunces',serif;}
.ss-tab{font-variant-numeric: tabular-nums;}
.ss-card{background:var(--card); border-radius:18px; border:1px solid var(--line); box-shadow:0 2px 14px rgba(30,58,46,0.06);}
.ss-btn{border-radius:999px; padding:12px 22px; font-weight:600; font-size:14.5px; border:none; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease;}
.ss-btn:hover{transform:translateY(-1px);}
.ss-btn:active{transform:translateY(0px);}
.ss-btn-primary{background:var(--forest); color:#F6F2EA;}
.ss-btn-primary:hover{box-shadow:0 6px 16px rgba(30,58,46,0.28);}
.ss-btn-outline{background:transparent; color:var(--forest); border:1.5px solid var(--forest);}
.ss-btn-outline:hover{background:var(--sage-lt);}
.ss-btn-burgundy{background:var(--burgundy); color:#FBF3EE;}
.ss-btn-burgundy:hover{box-shadow:0 6px 16px rgba(110,42,59,0.3);}
.ss-chip{border-radius:999px; padding:6px 13px; font-size:12.5px; font-weight:600; border:1px solid var(--line); background:var(--sage-lt); color:var(--forest-dk);}
.ss-input{border:1.5px solid var(--line); border-radius:12px; padding:11px 14px; font-size:14.5px; background:#fff; width:100%; font-family:'Inter',sans-serif;}
.ss-input:focus{outline:none; border-color:var(--sage);}
.ss-navlink{font-weight:600; font-size:14.5px; color:var(--ink-soft); cursor:pointer; padding:8px 4px; border-bottom:2px solid transparent;}
.ss-navlink.active{color:var(--forest); border-bottom-color:var(--forest);}
.ss-scroll::-webkit-scrollbar{height:6px; width:6px;}
.ss-scroll::-webkit-scrollbar-thumb{background:var(--line); border-radius:6px;}
.ss-fade{animation:ssFadeIn .35s ease both;}
@keyframes ssFadeIn{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);}}
.ss-bar-track{height:8px; background:var(--sage-lt); border-radius:6px; overflow:hidden;}
.ss-bar-fill{height:100%; border-radius:6px; transition:width .6s ease;}
.ss-pack{border-radius:16px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;}
.ss-pack::after{content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.08));}
`;
