/* Storia della lega, condivisa da Albo e Curva: alias, ex e storico delle stagioni. Un solo posto da aggiornare. */
(function(){
var ALIAS={'Andrew_Indium':'AndrewTT','StaCo Atto':'DJ Cst Brazil','Pep Mariola':'Mario','Barny':'Mario','Gingleton':'Mario'};
var EX={'Nobile':1,'AleDmz':1,'Nicolas':1,'17peppe17':1,'SuperBrok':1};
var STORICO=[
 {y:'2025/26',c:'Coppa Campioni',tipo:'Finale',fin:['Mugiwara','Leanzino',1,70,'Grodah','RikyArma',4,84],v:['Grodah','RikyArma']},
 {y:'2025/26',c:'Gioberti Cup',v:['WOA','ser'],t:[['WOA','ser',65],['Grodah','RikyArma',55],['Raimon Junior High','Maria',52],['Stif dc','stifson',52],['Mariana Coneja','Mark Lenders',50],['Real Madrink','AndrewTT',48],['Dynamo Loska','Pep Mariola',48],['Mugiwara','Leanzino',46],['Gli Spaesati','SuperBrok',46],['New Wakanda','apo',39]]},
 {y:'2024/25',c:'Costa Cup',v:['PornHub FC','17peppe17'],t:[['PornHub FC','17peppe17',70],['Stif dc','stifson',67],['Real Madrink','AndrewTT',50],['Mugiwara','Leanzino',49],['WOA','ser',46],['Grodah','RikyArma',43],['Dynamo Loska','Pep Mariola',40],['DeadPool FC','AleDmz',39],['Virgin Van Dick','Nicolas',38],['Wakanda','apo',36]]},
 {y:'2023/24',c:'Serie A',v:['Mugiwara','Leanzino'],t:[['Mugiwara','Leanzino',57],['SdrogoCalcioFC','AleDmz',55],['Grodah','RikyArma',55],['Barolo','Riccardo',53],['AC Risti','Nicolas',52],['Wakanda','apo',51],['Real Madrink','AndrewTT',51],['Stortenham','Barny',48],['WOA','ser',41],['ACPicchia','17peppe17',37]]},
 {y:'2022/23',c:'Serie A',v:['Wakanda','apo'],t:[['Wakanda','apo'],['WOA','ser'],['Stortenham','Barny'],['Real Madrink','AndrewTT'],['Barolo','Nobile'],['Grodah','RikyArma']]},
 {y:'2021/22',c:'Serie A',v:['Wakanda','apo'],t:[['Wakanda','apo',70],['Mugiwara','Leanzino',65],['Dio Brigante','Andrew_Indium',64],['WOA','ser',53],['Rapid Micatant','StaCo Atto',51],['Laghetto FC','Nobile',44],['Tequila Bum Bum','RikyArma',34],['Lil plug','Gingleton',31]]}
];
/* frasi vere sulla storia degli allenatori, usate dai personaggi di Curva */
var FATTI=[
 'Mario ha cambiato nome quattro volte: Gingleton, Barny, Pep Mariola e adesso Mario',
 'ser è l\'unico che dal 2021 non ha mai cambiato né squadra né nome: la WOA',
 'apo ha tre titoli, più di chiunque altro: il 2017/18 e poi 2021/22 e 2022/23 di fila con il Wakanda',
 'apo è passato da campione per due anni a ultimo per due anni di fila',
 '17peppe17 è passato da ultimo con l\'ACPicchia a campione con il PornHub FC, e poi ha lasciato la lega',
 'DJ Cst Brazil, che una volta era StaCo Atto, è tornato dopo quattro stagioni di assenza',
 'Leanzino ha vinto il titolo 2023/24 per appena 2 punti',
 'Riccardo è sparito per due stagioni e adesso è tornato con l\'Atletico Ma Non Troppo',
 'stifson è arrivato nel 2024/25 ed è stato subito secondo, a 3 punti dal campione',
 'RikyArma è passato dall\'ultimo posto del 2022/23 alla Coppa Campioni del 2025/26',
 'ser ha vinto la Gioberti Cup 2025/26 con 10 punti sul secondo, il margine più largo tra i titoli che conosciamo',
 'Mario ha vinto il primo campionato della storia della lega, nel 2016/17, con Mertens',
 'Urba ha vinto il titolo 2018/19 e ha lasciato la lega da campione',
 'Il Wakanda di apo ha vinto il titolo già al debutto, nel 2021/22',
 'Mario e Leanzino hanno formato la coppia della The Blue Brothers',
 'nella storia della lega solo apo si è confermato campione: 2021/22 e 2022/23',
 'AndrewTT, che una volta era Andrew_Indium, ha due podi in cinque anni e mai un titolo'
];
window.CVS={ALIAS:ALIAS,EX:EX,STORICO:STORICO,FATTI:FATTI};
})();
