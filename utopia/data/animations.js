const lenis=new Lenis({duration:0.8,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smooth:true});
function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf);
gsap.registerPlugin(ScrollTrigger);
lenis.on("scroll",ScrollTrigger.update);gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);
// Scale reveal (1 elements)
(()=>{const el=document.querySelector(".frame__line");if(!el)return;
gsap.set(el,{opacity:1,scaleX:0,transformOrigin:"left center"});
gsap.to(el,{scaleX:1,duration:1.2,delay:0.2,ease:"expo.out"});})();
document.querySelectorAll('[class*="cover"],[class*="Cover"],[class*="overlay"],[class*="Overlay"]').forEach(el=>{if(el.style)el.style.display="none"});
// Card stagger (5 grids)
document.querySelectorAll(".hero__grid").forEach(w=>{
  const els=w.querySelectorAll(".hero__top");if(els.length<2)return;
  gsap.set(els,{x:-25,opacity:0});
  ScrollTrigger.create({trigger:w,start:"top 80%",once:true,onEnter:()=>{
    els.forEach((el,i)=>{gsap.to(el,{x:0,opacity:1,duration:0.8,delay:i*0.1,ease:"expo.out",clearProps:"transform"})});
  }});
});
document.querySelectorAll(".mask__component").forEach(w=>{
  const els=w.querySelectorAll(".masks__preview");if(els.length<2)return;
  gsap.set(els,{x:-25,opacity:0});
  ScrollTrigger.create({trigger:w,start:"top 80%",once:true,onEnter:()=>{
    els.forEach((el,i)=>{gsap.to(el,{x:0,opacity:1,duration:0.8,delay:i*0.1,ease:"expo.out",clearProps:"transform"})});
  }});
});
document.querySelectorAll(".masks__preview-list").forEach(w=>{
  const els=w.querySelectorAll(".masks__preview-item");if(els.length<2)return;
  gsap.set(els,{x:-25,opacity:0});
  ScrollTrigger.create({trigger:w,start:"top 80%",once:true,onEnter:()=>{
    els.forEach((el,i)=>{gsap.to(el,{x:0,opacity:1,duration:0.8,delay:i*0.1,ease:"expo.out",clearProps:"transform"})});
  }});
});
document.querySelectorAll(".masks__grid-cms").forEach(w=>{
  const els=w.querySelectorAll(".masks__grid-item");if(els.length<2)return;
  gsap.set(els,{x:-25,opacity:0});
  ScrollTrigger.create({trigger:w,start:"top 80%",once:true,onEnter:()=>{
    els.forEach((el,i)=>{gsap.to(el,{x:0,opacity:1,duration:0.8,delay:i*0.1,ease:"expo.out",clearProps:"transform"})});
  }});
});
document.querySelectorAll(".mask-progress__bottom").forEach(w=>{
  const els=w.querySelectorAll(".mask-progress__hint");if(els.length<2)return;
  gsap.set(els,{x:-25,opacity:0});
  ScrollTrigger.create({trigger:w,start:"top 80%",once:true,onEnter:()=>{
    els.forEach((el,i)=>{gsap.to(el,{x:0,opacity:1,duration:0.8,delay:i*0.1,ease:"expo.out",clearProps:"transform"})});
  }});
});
// Visibility fix for JS-dependent elements
document.querySelectorAll('[style*="opacity: 0"],[style*="opacity:0"]').forEach(el=>{
  if(!el.closest('[class*="modal"],[class*="Modal"]'))el.style.opacity="1";
});
document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
  el.style.pointerEvents="auto";el.style.cursor="pointer";
  const img=el.querySelector("img");if(!img)return;
  el.addEventListener("mouseenter",()=>gsap.to(img,{scale:1.03,filter:"brightness(0.9)",duration:0.75,ease:"expo.out"}));
  el.addEventListener("mouseleave",()=>gsap.to(img,{scale:1,filter:"brightness(1)",duration:0.75,ease:"expo.out"}));
});
