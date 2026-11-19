(function(){
  "use strict";

  // Mobile navigation
  const toggle=document.querySelector(".mobile-toggle");
  const menu=document.querySelector(".mobile-menu");
  if(toggle && menu){
    toggle.addEventListener("click",()=>{
      const open=menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded","false");
      toggle.setAttribute("aria-label","Open menu");
    }));
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape"){
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded","false");
        toggle.setAttribute("aria-label","Open menu");
      }
    });
  }

  // Cinematic home slideshow
  const slides=[...document.querySelectorAll(".hero-slide")];
  const dots=document.querySelector(".hero-controls");
  if(slides.length && dots){
    slides.forEach((s,i)=>{
      const b=document.createElement("button");
      b.className="hero-dot"+(i===0?" active":"");
      b.setAttribute("aria-label","Show photo "+(i+1));
      b.type="button";
      b.addEventListener("click",()=>show(i,true));
      dots.appendChild(b);
    });
    const ds=[...dots.children];
    let current=0, timer;
    function show(i,manual){
      current=(i+slides.length)%slides.length;
      slides.forEach((s,j)=>{
        s.classList.toggle("active",j===current);
        s.classList.toggle("previous",j!==current);
      });
      ds.forEach((d,j)=>d.classList.toggle("active",j===current));
      const hero=document.querySelector(".hero");
      if(hero) hero.classList.toggle("aerial-active",current===0);
      if(manual) restart();
    }
    function restart(){clearInterval(timer);timer=setInterval(()=>show(current+1),7000);}
    restart();
  }

  // Ministry page photo sequences
  document.querySelectorAll(".ministry-slideshow").forEach(slider=>{
    const slides=[...slider.querySelectorAll(".ministry-slide")];
    const dots=[...slider.querySelectorAll(".ministry-dot")];
    const prev=slider.querySelector(".ministry-prev");
    const next=slider.querySelector(".ministry-next");
    if(slides.length<2){
      prev?.setAttribute("hidden","");
      next?.setAttribute("hidden","");
      if(slider.querySelector(".ministry-controls")) slider.querySelector(".ministry-controls").setAttribute("hidden","");
      return;
    }
    let current=0,timer;
    const show=(i,manual=false)=>{
      current=(i+slides.length)%slides.length;
      slides.forEach((el,j)=>el.classList.toggle("active",j===current));
      dots.forEach((el,j)=>el.classList.toggle("active",j===current));
      if(manual)restart();
    };
    const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(current+1),Number(slider.dataset.interval||5000));};
    prev?.addEventListener("click",()=>show(current-1,true));
    next?.addEventListener("click",()=>show(current+1,true));
    dots.forEach((d,i)=>d.addEventListener("click",()=>show(i,true)));
    slider.addEventListener("mouseenter",()=>clearInterval(timer));
    slider.addEventListener("mouseleave",restart);
    restart();
  });

  // Year
  document.querySelectorAll("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());

  // Gallery lightbox
  const lightbox=document.getElementById("lightbox");
  const lightboxImage=document.getElementById("lightboxImage");
  const lightboxCaption=document.getElementById("lightboxCaption");
  const galleryItems=[...document.querySelectorAll(".gallery-item")];
  if(lightbox && lightboxImage){
    const close=()=>{
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden","true");
      document.body.style.overflow="";
      lightboxImage.src="";
    };
    galleryItems.forEach(item=>item.addEventListener("click",e=>{
      e.preventDefault();
      const img=item.querySelector("img");
      lightboxImage.src=item.getAttribute("href");
      lightboxImage.alt=img?.alt||"RPC gallery image";
      if(lightboxCaption) lightboxCaption.textContent=img?.alt||"";
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden","false");
      document.body.style.overflow="hidden";
    }));
    document.querySelector(".lightbox-close")?.addEventListener("click",close);
    lightbox.addEventListener("click",e=>{if(e.target===lightbox)close()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape" && lightbox.classList.contains("open"))close()});
  }

  // Events stored locally for the client-review prototype.
  const EVENT_KEY="rpc_events";
  const ADMIN_HASH=""; // replaced below at build time

  // Lightweight SHA-256 using Web Crypto where available.
  async function sha256(value){
    if(window.crypto?.subtle){
      const data=new TextEncoder().encode(value);
      const hash=await crypto.subtle.digest("SHA-256",data);
      return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
    }
    return value; // fallback is handled by direct comparison below
  }
  // Password hash for 27759881
  const PASSWORD_HASH="1d111ab15e8a3d4410c3ab20c83e5c45e7403bd9e90681edf76ac2368330b605"; // placeholder replaced below

  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  window.rpcEsc=esc;

  function getEvents(){try{return JSON.parse(localStorage.getItem(EVENT_KEY)||"[]")}catch{return[]}}
  function saveEvents(a){localStorage.setItem(EVENT_KEY,JSON.stringify(a));}

  window.renderEvents=function(){
    const box=document.getElementById("eventList"); if(!box)return;
    const events=getEvents();
    if(!events.length){
      box.innerHTML='<div class="empty" style="grid-column:1/-1"><h3>No upcoming events have been published yet.</h3><p class="lead">There are no upcoming events at the moment.</p></div>';
      return;
    }
    box.innerHTML=events.map(e=>`<article class="event"><img src="${e.flyer}" alt="${esc(e.title)} flyer"><div class="event-body"><div class="event-date">${esc(e.date)}${e.time?' · '+esc(e.time):''}</div><h3>${esc(e.title)}</h3><p>${esc(e.location||"Rock Priesthood Church")}</p>${e.description?`<p class="lead">${esc(e.description)}</p>`:""}</div></article>`).join("");
  };

  const adminContent=document.getElementById("adminContent");
  const adminLocked=document.getElementById("adminLocked");
  const authForm=document.getElementById("authForm");
  const authStatus=document.getElementById("authStatus");
  let authorised=false;

  async function checkPassword(input){
    // Explicit password requested by RPC for the current client-review build.
    if(input==="27759881") return true;
    const h=await sha256(input);
    return h===PASSWORD_HASH;
  }

  async function requirePassword(){
    if(authorised)return true;
    const input=window.prompt("RPC Events authorisation password:");
    if(input===null)return false;
    const ok=await checkPassword(input);
    if(!ok){alert("Incorrect password.");return false;}
    authorised=true; unlockAdmin(); return true;
  }

  function unlockAdmin(){
    if(adminLocked)adminLocked.hidden=true;
    if(adminContent)adminContent.hidden=false;
    renderAdmin();
  }

  function renderAdmin(){
    const list=document.getElementById("adminEventList"); if(!list)return;
    const events=getEvents();
    list.innerHTML=events.length ? events.map((e,i)=>`<div class="admin-event"><img src="${e.flyer}" alt="${esc(e.title)}"><div><b>${esc(e.title)}</b><br><small>${esc(e.date)} ${esc(e.time||"")} · ${esc(e.location||"")}</small></div><button class="btn btn-red" type="button" data-delete="${i}">Delete</button></div>`).join("") : "<p>No events published yet.</p>";
    list.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!(await requirePassword()))return;
      const i=Number(btn.dataset.delete);
      if(!confirm("Delete this event?"))return;
      const events=getEvents(); events.splice(i,1); saveEvents(events); renderAdmin(); renderEvents();
    }));
  }

  if(authForm){
    authForm.addEventListener("submit",async e=>{
      e.preventDefault();
      const ok=await checkPassword(document.getElementById("adminPassword").value);
      if(!ok){authStatus.textContent="Incorrect password. Please try again.";return;}
      authorised=true; unlockAdmin();
    });
  }

  const form=document.getElementById("eventForm");
  if(form){
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      if(!(await requirePassword()))return;
      const file=document.getElementById("flyer").files[0];
      if(!file)return;
      if(file.size>5*1024*1024){alert("Please use an image smaller than 5 MB.");return;}
      const reader=new FileReader();
      reader.onload=()=>{
        const source=new Image();
        source.onload=()=>{
          const max=1600;
          const scale=Math.min(1,max/source.width,max/source.height);
          const canvas=document.createElement("canvas");
          canvas.width=Math.max(1,Math.round(source.width*scale));
          canvas.height=Math.max(1,Math.round(source.height*scale));
          const ctx=canvas.getContext("2d");
          ctx.drawImage(source,0,0,canvas.width,canvas.height);
          const compressed=canvas.toDataURL("image/jpeg",0.82);
          const events=getEvents();
          events.unshift({
            title:document.getElementById("title").value.trim(),
            date:document.getElementById("date").value,
            time:document.getElementById("time").value.trim(),
            location:document.getElementById("location").value.trim(),
            description:document.getElementById("description").value.trim(),
            flyer:compressed
          });
          saveEvents(events); form.reset(); renderAdmin();
          const status=document.getElementById("status"); if(status)status.textContent="Event published successfully on this browser.";
        };
        source.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if(document.getElementById("eventList"))renderEvents();
  if(adminContent && !authForm) { requirePassword(); }


  // Contact form uses native HTML validation and FormSubmit POST.

})();