// Injecte un splash Paylika dans dist/index.html (affiché avant le bundle JS).
// Exécuté après `expo export` pour supprimer l'écran blanc au 1er chargement.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILE = "dist/index.html";
if (!existsSync(FILE)) { console.log("[splash] dist/index.html introuvable, skip"); process.exit(0); }
let html = readFileSync(FILE, "utf8");
if (html.includes("paylika-splash")) { console.log("[splash] deja injecte"); process.exit(0); }

const STYLE = `<style>#paylika-splash{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;transition:opacity .35s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}#paylika-splash .pk-name{margin-top:14px;font-size:20px;font-weight:700;color:#18181B;letter-spacing:-.5px}#paylika-splash .pk-name b{color:#7B1126}#paylika-splash .pk-sub{margin-top:6px;font-size:13px;color:#71717A}#paylika-splash .pk-spin{margin-top:22px;width:26px;height:26px;border:3px solid rgba(123,17,38,.16);border-top-color:#7B1126;border-radius:50%;animation:pkspin .8s linear infinite}@keyframes pkspin{to{transform:rotate(360deg)}}</style>`;

const SPLASH = `<div id="paylika-splash"><svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><rect width="56" height="56" rx="16" fill="#7B1126"/><text x="28" y="39" font-size="32" font-weight="800" fill="#fff" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif">P</text></svg><div class="pk-name">Pay<b>lika</b></div><div class="pk-sub">Chargement du paiement…</div><div class="pk-spin"></div></div>`;

const SCRIPT = `<script>(function(){var s=document.getElementById('paylika-splash'),r=document.getElementById('root');if(!s||!r)return;var done=false;function hide(){if(done)return;done=true;s.style.opacity='0';setTimeout(function(){if(s&&s.parentNode)s.parentNode.removeChild(s);},420);}var mo=new MutationObserver(function(){if(r.childNodes.length>0){mo.disconnect();hide();}});mo.observe(r,{childList:true});setTimeout(function(){mo.disconnect();hide();},10000);})();</script>`;

html = html.replace("</head>", STYLE + "</head>");
html = html.replace('<div id="root"></div>', SPLASH + '<div id="root"></div>');
html = html.replace("</body>", SCRIPT + "</body>");
writeFileSync(FILE, html);
console.log("[splash] injecte dans dist/index.html");
