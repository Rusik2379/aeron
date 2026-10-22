// Brand assets are original files from the companies' sites; see image-prompts/client-logos-sources.md.
export const partners=[
 {id:'nsk',name:'Национальная сурьмяная компания',logo:'nsk.png',primaryProject:'zhelezny-kryazh',note:'Месторождение Железный Кряж',site:'https://stibiumrus.ru/'},
 {id:'zzt',name:'Забайкальский зерновой терминал',logo:'zzt.png',note:'Забайкальск',site:'https://sibgrain.ru/'},
 {id:'efko',name:'ЭФКО',logo:'efko.svg',note:'Завод в Тольятти',site:'https://www.efko.ru/'},
 {id:'chernozemye',name:'Черноземье',logo:'chernozemye.png',note:'EXOIL Group · Тербуны',site:'https://exoil.org/llc-chernozemye/'},
 {id:'indeyka-altaya',name:'Индейка Алтая',note:'Воеводское'},
 {id:'agrocentr',name:'Агроцентр',logo:'agrocentr.png',note:'Выставочный павильон · Барнаул',site:'https://agro-centr.ru/'},
 {id:'featagro',name:'FEATAGRO',logo:'featagro.png',note:'Производственный цех · Леньки',site:'https://featagro.com/'},
 {id:'altaitent',name:'Алтай-Тент',logo:'altaitent.svg',note:'Совместный проект · Барнаул',site:'https://altai-tent.ru/'},
 {id:'yto',name:'YTO',logo:'yto.jpg',note:'Сервисный центр · Барнаул',site:'https://ag-res.ru/others/yto/'},
 {id:'altailes',name:'Алтайлес',logo:'altailes.svg',note:'Павловский и Кемеровский ДОК',site:'https://www.altailes.com/'},
 {id:'capitalbank',name:'Алтайкапиталбанк',logo:'capitalbank.png',note:'Объекты в Барнауле',site:'https://capitalbank.ru/'},
 {id:'beeline',name:'билайн',logo:'beeline.svg',note:'Объекты в Барнауле',site:'https://moskva.beeline.ru/'},
 {id:'megafon',name:'МегаФон',logo:'megafon.svg',note:'Объекты в Барнауле',site:'https://corp.megafon.ru/'},
 {id:'veles',name:'VELES',logo:'veles.png',note:'Завод в Павловске',site:'https://veles-alt.com/'},
 {id:'holod',name:'Холод',logo:'holod.svg',note:'Производственный объект · Заринск',site:'https://22rus.oooholod.ru/'},
 {id:'evalar',name:'Эвалар',logo:'evalar.svg',note:'Два склада · с. Алтайское',site:'https://corp.evalar.ru/'},
 {id:'tatzerno',name:'Татарскзернопродукт',logo:'tatzerno.png',note:'Маслоэкстракционный завод · Татарск',site:'https://tatzerno.ru/'},
 {id:'apteka22',name:'Аптека22',logo:'apteka22.svg',note:'Аптечная сеть · Барнаул',site:'https://apteka22.ru/'}
];
export const partnerById=id=>partners.find(p=>p.id===id);
export function partnerCarousel({esc,projects}){
 const items=partners.filter(p=>p.logo).map(p=>{const related=projects.filter(x=>x.client===p.id||x.clients?.includes(p.id));return {...p,project:related.find(x=>x.slug===p.primaryProject)||related[0]};}).filter(p=>p.project);
 if(!items.length)return '';
 const card=(p,duplicate=false)=>`<li><a class="partner-logo-card" href="projects/${p.project.slug}/index.html"${duplicate?' tabindex="-1"':''} aria-label="${esc(p.name)} — объект АЭРОН"><div class="partner-logo-box ${p.id==='beeline'?'partner-logo-symbol':''}"><img src="assets/images/clients/${p.logo}" alt="${esc(p.name)}" width="240" height="90" loading="eager"></div><div class="partner-logo-caption"><strong>${esc(p.name)}</strong><span>${esc(p.note)}</span></div><i aria-hidden="true">↗</i></a></li>`;
 return `<section class="section partners-section" id="partners" data-partner-carousel role="region" aria-roledescription="карусель" aria-label="Компании, с которыми работал АЭРОН"><div class="container"><div class="section-head"><div><p class="eyebrow">Опыт сотрудничества</p><h2>С кем работали</h2></div><p>Промышленность, агробизнес и сервис.<br>Компании, на объектах которых работал АЭРОН.</p></div><div class="partner-toolbar"><a class="text-link" href="projects/index.html">Все объекты <span aria-hidden="true">↗</span></a></div><div class="partner-viewport"><div class="partner-track"><ul class="partner-set" aria-label="Логотипы компаний">${items.map(p=>card(p)).join('')}</ul><ul class="partner-set" aria-hidden="true">${items.map(p=>card(p,true)).join('')}</ul></div></div></div></section>`;
}

