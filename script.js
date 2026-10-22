'use strict';
const toggle = document.querySelector('.menu-button');
const nav = document.querySelector('#main-nav');
const servicesMenu = document.querySelector('.services-nav');
const servicesToggle = servicesMenu?.querySelector('summary');
const servicesPanel = servicesMenu?.querySelector('.services-dropdown');
const mobile = window.matchMedia('(max-width: 1050px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const servicesArea = document.querySelector('.nav-services');
const hoverNavigation = window.matchMedia('(hover: hover) and (min-width: 1051px)');
let hoverCloseTimer;
let closeTimer;
function openServices() {
  clearTimeout(closeTimer);
  clearTimeout(hoverCloseTimer);
  servicesMenu.classList.remove('closing');
  servicesPanel.inert = false;
  servicesMenu.open = true;
  servicesToggle.setAttribute('aria-expanded', 'true');
}
function closeServices(restoreFocus = false, immediate = false) {
  clearTimeout(hoverCloseTimer);
  if (!servicesMenu?.open) return;
  clearTimeout(closeTimer);
  if (restoreFocus) servicesToggle.focus();
  servicesToggle.setAttribute('aria-expanded', 'false');
  servicesPanel.inert = true;
  servicesMenu.classList.add('closing');
  const finish = () => { servicesMenu.open = false; servicesMenu.classList.remove('closing'); };
  if (immediate || reducedMotion.matches) finish();
  else closeTimer = setTimeout(finish, 300);
}
servicesToggle?.addEventListener('click', event => {
  event.preventDefault();
  if (servicesMenu.open && !servicesMenu.classList.contains('closing')) closeServices();
  else openServices();
});
servicesArea?.addEventListener('mouseenter', () => { if (hoverNavigation.matches) openServices(); });
servicesArea?.addEventListener('mouseleave', () => { if (hoverNavigation.matches) hoverCloseTimer = setTimeout(() => closeServices(), 220); });
servicesPanel?.addEventListener('mouseenter', () => { if (hoverNavigation.matches) openServices(); });
function closeNavigation(restoreFocus = false) {
  if (restoreFocus) toggle?.focus();
  closeServices(false, true);
  nav?.classList.remove('open');
  if (nav) nav.inert = mobile.matches;
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Открыть навигацию');
}
toggle?.addEventListener('click', () => {
  if (nav.classList.contains('open')) closeNavigation();
  else {
    nav.inert = false;
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Закрыть навигацию');
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-services')) closeServices();
  if (mobile.matches && !event.target.closest('.header')) closeNavigation();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (servicesMenu?.open && !servicesMenu.classList.contains('closing')) { event.preventDefault(); closeServices(true); }
  else if (nav?.classList.contains('open')) { event.preventDefault(); closeNavigation(true); }
});
document.addEventListener('focusin', event => {
  if (!event.target.closest('.nav-services')) closeServices();
  if (mobile.matches && !event.target.closest('.header')) closeNavigation();
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeNavigation()));
mobile.addEventListener('change', () => closeNavigation());
closeNavigation();
// Animate only FAQ accordions; native details remains the no-script fallback.
document.querySelectorAll('.faq-list details').forEach(details=>{
  const summary=details.querySelector('summary');
  const answer=details.querySelector('.faq-answer');
  if(!summary||!answer)return;
  let expanded=details.open;
  let animation=null;
  const updateState=()=>{
    details.dataset.expanded=String(expanded);
    summary.setAttribute('aria-expanded',String(expanded));
    answer.inert=!expanded;
  };
  const clearStyles=()=>{answer.style.height='';answer.style.opacity='';};
  updateState();
  summary.addEventListener('click',event=>{
    event.preventDefault();
    const startHeight=details.open?answer.getBoundingClientRect().height:0;
    const startOpacity=details.open?Number(getComputedStyle(answer).opacity):0;
    animation?.cancel();
    animation=null;
    expanded=!expanded;
    updateState();
    if(reducedMotion.matches||typeof answer.animate!=='function'){
      details.open=expanded;clearStyles();return;
    }
    details.open=true;
    const endHeight=expanded?answer.scrollHeight:0;
    answer.style.height=endHeight+'px';
    answer.style.opacity=expanded?'1':'0';
    const current=answer.animate([
      {height:startHeight+'px',opacity:startOpacity},
      {height:endHeight+'px',opacity:expanded?1:0}
    ],{duration:460,easing:'cubic-bezier(.22,1,.36,1)'});
    animation=current;
    current.finished.then(()=>{
      if(animation!==current)return;
      animation=null;details.open=expanded;clearStyles();
    }).catch(()=>{});
  });
  details.addEventListener('toggle',()=>{
    if(animation)return;
    expanded=details.open;updateState();
  });
  reducedMotion.addEventListener('change',event=>{if(event.matches&&animation)animation.finish();});
});

document.querySelectorAll('[data-filter-group]').forEach(group=>{const buttons=group.querySelectorAll('[data-filter]'),grid=document.getElementById(group.dataset.filterGroup),status=document.querySelector('[data-filter-status]');const run=filter=>{let count=0;buttons.forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});grid.querySelectorAll('[data-category]').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.category!==filter;if(!card.hidden)count++;});const empty=grid.querySelector('.empty-state');if(empty)empty.hidden=count>0;if(status)status.textContent=count?'Показано: '+count:'В этой категории пока нет опубликованных кейсов';};buttons.forEach(b=>b.addEventListener('click',()=>{run(b.dataset.filter);history.replaceState(null,'','#'+b.dataset.filter);}));const initial=location.hash.slice(1);if([...buttons].some(b=>b.dataset.filter===initial))run(initial);});
const photoViewer = document.querySelector('.photo-viewer');
const galleryLinks = [...document.querySelectorAll('[data-gallery] [data-photo]')];
if (photoViewer && galleryLinks.length) {
  const photo = photoViewer.querySelector('.photo-stage img');
  const photoStage = photoViewer.querySelector('.photo-stage');
  photo.addEventListener('load', () => photoStage.classList.remove('loading'));
  photo.addEventListener('error', () => { photoStage.classList.remove('loading'); photoStage.classList.add('load-error'); });
  const caption = photoViewer.querySelector('#photo-caption');
  const position = photoViewer.querySelector('#photo-position');
  let currentPhoto = 0;
  let photoTrigger;
  let photoCloseTimer;
  const showPhoto = index => {
    currentPhoto = (index + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[currentPhoto];
    photoStage.classList.remove('load-error');
    photoStage.classList.add('loading');
    photo.alt = link.dataset.caption;
    photo.src = link.href;
    caption.textContent = link.dataset.caption;
    position.textContent = `${currentPhoto + 1} / ${galleryLinks.length}`;
  };
  const closePhoto = () => {
    if (!photoViewer.open || photoViewer.classList.contains('closing')) return;
    photoViewer.classList.add('closing');
    photoCloseTimer = setTimeout(() => photoViewer.close(), reducedMotion.matches ? 0 : 180);
  };
  galleryLinks.forEach((link,index) => link.addEventListener('click', event => {
    event.preventDefault();
    photoTrigger = link;
    showPhoto(index);
    photoViewer.classList.remove('closing');
    photoViewer.showModal();
    document.body.classList.add('gallery-open');
    photoViewer.querySelector('.photo-close').focus();
  }));
  photoViewer.querySelector('.photo-close').addEventListener('click', closePhoto);
  photoViewer.querySelector('.photo-prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
  photoViewer.querySelector('.photo-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
  photoViewer.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    showPhoto(event.key === 'Home' ? 0 : event.key === 'End' ? galleryLinks.length - 1 : currentPhoto + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  photoViewer.addEventListener('cancel', event => { event.preventDefault(); closePhoto(); });
  photoViewer.addEventListener('click', event => { if (event.target === photoViewer) closePhoto(); });
  photoViewer.addEventListener('close', () => {
    clearTimeout(photoCloseTimer);
    document.body.classList.remove('gallery-open');
    photoViewer.classList.remove('closing');
    if (photoTrigger?.isConnected) photoTrigger.focus();
  });
}

document.querySelectorAll('[data-geography-map]').forEach(map=>{
  const section=map.closest('section'),workspace=section.querySelector('[data-map-workspace]'),panel=section.querySelector('.map-projects');
  let closeTimer,trigger;
  const close=()=>{
    if(panel.hidden)return;
    clearTimeout(closeTimer);panel.classList.add('closing');panel.inert=true;
    map.querySelectorAll('[data-map-target]').forEach(pin=>pin.setAttribute('aria-expanded','false'));
    trigger?.focus();
    const finish=()=>{panel.hidden=true;panel.classList.remove('closing');workspace.classList.remove('panel-open');};
    if(reducedMotion.matches)finish();else closeTimer=setTimeout(finish,230);
  };
  const select=pin=>{
    clearTimeout(closeTimer);trigger=pin;
    map.querySelectorAll('[data-map-target]').forEach(el=>{el.setAttribute('aria-pressed',String(el===pin));el.setAttribute('aria-expanded',String(el===pin));el.classList.toggle('selected',el===pin);});
    section.querySelector('[data-map-city]').textContent=pin.dataset.mapName;
    section.querySelector('[data-map-count]').textContent=pin.dataset.mapCopy;
    const template=[...section.querySelectorAll('[data-map-projects]')].find(el=>el.dataset.mapProjects===pin.dataset.mapTarget);
    section.querySelector('[data-map-results]').replaceChildren(template.content.cloneNode(true));
    section.querySelector('[data-map-panel-city]').textContent=pin.dataset.mapName;
    panel.classList.remove('closing');panel.hidden=false;panel.inert=false;workspace.classList.add('panel-open');
    if(window.matchMedia('(max-width: 900px)').matches)panel.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest'});
  };
  map.querySelectorAll('[data-map-target]').forEach(pin=>{
    pin.addEventListener('click',()=>select(pin));
    pin.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select(pin);}});
  });
  section.querySelector('[data-map-close]').addEventListener('click',close);
  workspace.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}});
});
if('IntersectionObserver' in window){
  const mapObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-visible',entry.isIntersecting)),{threshold:.15});
  document.querySelectorAll('[data-geography-map]').forEach(map=>mapObserver.observe(map));
  if(!reducedMotion.matches){
    const targets=document.querySelectorAll('.section-head,.intro-grid>div:not(.form-panel),.service-card,.project-card,.article-card,.about-cards article,.process-item,.partner-card,.sro-card,.split-banner>div,.strip-item,.news-band,.faq-intro,.faq-list details,.about-principles article,.business-scenarios article,.business-start-grid article,.business-competencies>a,.development-priorities>div,.development-invite .container');
    const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{threshold:.04,rootMargin:'0px 0px -18px 0px'});
    document.body.classList.add('motion-ready');
    targets.forEach((element,index)=>{element.classList.add('reveal');element.style.setProperty('--reveal-delay',`${index%3*90}ms`);revealObserver.observe(element);});
    reducedMotion.addEventListener('change',event=>{if(event.matches){document.body.classList.remove('motion-ready');revealObserver.disconnect();}});
  }
}else document.querySelectorAll('[data-geography-map]').forEach(map=>map.classList.add('is-visible'));

const form=document.querySelector('#project-form');
if(form){const feedback=document.querySelector('#form-feedback'),prepared=document.querySelector('#prepared'),output=document.querySelector('#request-output'),submit=form.querySelector('[type=submit]');form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));if(data.consent!=='yes')return;data.consentVersion='2026-10-21';data.source=location.pathname;data.consentAt=new Date().toISOString();for(const key of ['name','contact','task'])if(!data[key]?.trim()){feedback.textContent='Заполните имя, контакт и описание проекта.';return;}if(form.dataset.endpoint){submit.disabled=true;feedback.textContent='Отправляем заявку…';try{const res=await fetch(form.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok||result.ok!==true)throw Object.assign(new Error(result.error||'Не удалось отправить заявку.'),{userMessage:true});feedback.textContent='Заявка отправлена. Спасибо за обращение.';form.reset();prepared.hidden=true;}catch(error){feedback.textContent=(error.userMessage?error.message:'Не удалось отправить заявку. Проверьте соединение и повторите попытку.')+' Текст обращения можно скопировать или скачать.';prepare(data);}finally{submit.disabled=false;}}else{prepare(data);feedback.textContent='Текст заявки готов. Отправка пока не подключена: скопируйте или скачайте обращение.';}});function prepare(d){output.value=`ЗАЯВКА В АЭРОН\n\nИмя: ${d.name.trim()}\nКонтакт: ${d.contact.trim()}\n\nОписание проекта:\n${d.task.trim()}`;prepared.hidden=false;}document.querySelector('#copy-request')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.value);feedback.textContent='Текст заявки скопирован.';}catch{output.focus();output.select();feedback.textContent='Выделенный текст можно скопировать сочетанием Ctrl+C.';}});document.querySelector('#download-request')?.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Заявка-АЭРОН.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
