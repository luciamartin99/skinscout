/* ============================== DESIGN TOKENS ============================== */
export const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#FDF6F7; --card:#FFFDFD; --forest:#C96A84; --forest-dk:#5A1F35;
  --burgundy:#5A1F35; --sage:#C96A84; --sage-lt:#F3DDE4; --blush:#E8B9C7;
  --beige:#F6EBEE; --ink:#2B2025; --ink-soft:#75656D; --line:#E9D7DB;
  --shadow-card:0 2px 20px rgba(90,31,53,0.06);
  --shadow-card-hover:0 14px 32px rgba(90,31,53,0.14);
}
*{box-sizing:border-box;}
.ss-root{font-family:'Inter',sans-serif; background:var(--bg); color:var(--ink); min-height:100vh;}
.ss-serif{font-family:'Fraunces',serif;}
.ss-tab{font-variant-numeric: tabular-nums;}
.ss-card{background:var(--card); border-radius:18px; border:1px solid var(--line); box-shadow:var(--shadow-card);}

/* Interactive card variant — product cards, quiz option cards, anything
   clickable that should feel tactile without being flashy. */
.ss-card-interactive{transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; cursor:pointer;}
.ss-card-interactive:hover{transform:translateY(-2px); box-shadow:var(--shadow-card-hover); border-color:var(--blush);}

/* Small uppercase, letter-spaced label — the recurring "eyebrow" metadata
   style (brand names, section labels, step numbers). */
.ss-eyebrow{font-size:11.5px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:var(--sage);}

.ss-btn{border-radius:10px; padding:12px 24px; font-weight:600; font-size:14.5px; border:none; cursor:pointer; transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease;}
.ss-btn:hover{transform:translateY(-1px);}
.ss-btn:active{transform:translateY(0px);}
.ss-btn:disabled{cursor:not-allowed;}
.ss-btn:focus-visible{outline:2px solid var(--forest); outline-offset:2px;}
.ss-btn-primary{background:var(--forest); color:#FFFDFD;}
.ss-btn-primary:hover{box-shadow:0 8px 20px rgba(201,106,132,0.35);}
.ss-btn-outline{background:transparent; color:var(--forest); border:1.5px solid var(--forest);}
.ss-btn-outline:hover{background:var(--sage-lt);}
.ss-btn-burgundy{background:var(--burgundy); color:#FFFDFD;}
.ss-btn-burgundy:hover{box-shadow:0 8px 20px rgba(90,31,53,0.32);}
.ss-chip{border-radius:8px; padding:7px 14px; font-size:12.5px; font-weight:600; border:1px solid var(--line); background:var(--sage-lt); color:var(--forest-dk); transition:background .18s ease, color .18s ease, border-color .18s ease;}
.ss-input{border:1.5px solid var(--line); border-radius:10px; padding:11px 14px; font-size:14.5px; background:#fff; width:100%; font-family:'Inter',sans-serif; transition:border-color .18s ease;}
.ss-input:focus{outline:none; border-color:var(--sage);}
.ss-input:focus-visible{outline:2px solid var(--forest); outline-offset:1px;}
.ss-navlink{font-weight:600; font-size:14.5px; color:var(--ink-soft); cursor:pointer; padding:8px 4px; border-bottom:2px solid transparent; transition:color .2s ease, border-color .2s ease;}
.ss-navlink:hover{color:var(--forest);}
.ss-navlink.active{color:var(--forest); border-bottom-color:var(--forest);}
.ss-navlink:focus-visible{outline:2px solid var(--forest); outline-offset:3px;}
.ss-scroll::-webkit-scrollbar{height:6px; width:6px;}
.ss-scroll::-webkit-scrollbar-thumb{background:var(--line); border-radius:6px;}
.ss-fade{animation:ssFadeIn .4s ease both;}
@keyframes ssFadeIn{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);}}
.ss-bar-track{height:7px; background:var(--sage-lt); border-radius:6px; overflow:hidden;}
.ss-bar-fill{height:100%; border-radius:6px; transition:width .6s ease;}
.ss-pack{border-radius:16px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;}
.ss-pack::after{content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.08));}

/* Product image treatment — soft neutral background, gentle zoom on the
   parent card's hover (used together with .ss-card-interactive). */
.ss-img-frame{overflow:hidden; border-radius:14px; background:var(--sage-lt);}
.ss-img-frame img{transition:transform .35s ease; display:block;}
.ss-card-interactive:hover .ss-img-frame img{transform:scale(1.04);}

/* Loading skeleton — subtle shimmer, no external animation library. */
.ss-skeleton{background:linear-gradient(90deg, var(--line) 25%, var(--sage-lt) 50%, var(--line) 75%); background-size:200% 100%; animation:ssShimmer 1.6s ease-in-out infinite; border-radius:10px;}
@keyframes ssShimmer{0%{background-position:200% 0;} 100%{background-position:-200% 0;}}

/* Quiz option cards */
.ss-option{border-radius:12px; padding:16px 18px; border:1.5px solid var(--line); background:#fff; cursor:pointer; font-weight:600; font-size:14.5px; color:var(--ink); transition:background .18s ease, color .18s ease, border-color .18s ease, transform .18s ease;}
.ss-option:hover{border-color:var(--sage); transform:translateY(-1px);}
.ss-option.selected{background:var(--burgundy); color:#FFFDFD; border-color:var(--burgundy);}
`;
