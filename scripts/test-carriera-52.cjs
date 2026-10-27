const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['girrr/app.html','stadio/girrr/app.html']){
 const s=fs.readFileSync(file,'utf8');
 const m=s.match(/function fiduciaScarto\(t,pos,g\)\{[\s\S]*?\n\}/);
 assert(m,file+' missing Fiducia');
 let ctx={EXP:{Big:2,Emergente:5,Outsider:8},NG:34,Math};vm.createContext(ctx);vm.runInContext(m[0],ctx);
 for(const team of Object.keys(ctx.EXP)){let exp=ctx.EXP[team];assert.equal(ctx.fiduciaScarto(team,exp,34),0);assert(ctx.fiduciaScarto(team,1,34)>=0);assert(ctx.fiduciaScarto(team,10,34)<=0)}
 for(const k of ['function defaultCarMilestone(t)','function aggiornaMilestone(t)','class="trust-fill"','function animaFiducia(t,v)','function vCarL()','S.fdem.baseKey'])assert(s.includes(k),file+' missing '+k);
 for(const script of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/application\/json/.test(script[1])||!script[2].trim())continue;new Function(script[2])}
 console.log('PASS',file);
}
const t=fs.readFileSync('girrr/totogirrr.html','utf8');
for(const k of ['function premioWidget()','carriera_riscatta','carriera_stato','id="riscatta-sponsor"','function carica()'])assert(t.includes(k),k);
for(const script of t.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(script[2].trim()&&!script[1].includes('application/json'))new Function(script[2])}
console.log('PASS Totogirrr');
