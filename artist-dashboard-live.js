// Floox — live artist dashboard connector
(() => {
  'use strict';
  let live = null;
  const esc = value => String(value ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const dateObj = value => value ? new Date(`${value}T00:00:00`) : null;
  const dateLabel = value => { const d = dateObj(value); return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Date not set'; };
  const relative = value => { const d=new Date(value); if(Number.isNaN(d.getTime())) return ''; const sec=Math.max(1,Math.floor((Date.now()-d.getTime())/1000)); if(sec<60)return'just now'; const min=Math.floor(sec/60); if(min<60)return`${min}m ago`; const hr=Math.floor(min/60); if(hr<24)return`${hr}h ago`; const days=Math.floor(hr/24); if(days<7)return`${days}d ago`; return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); };
  const toast = (msg,type='info') => window.FLOOX?.toast(msg,type);
  function statChange(index,text,type='up'){const el=document.querySelectorAll('.stat-change')[index];if(!el)return;el.textContent=text;el.className=`stat-change ${type}`;}

  function setLiveStats(){
    const s=live.stats;
    const total=document.getElementById('totalBookings'); if(total)total.textContent=s.totalBookings;
    const earn=document.getElementById('totalEarnings'); if(earn)earn.textContent=money(s.totalEarnings);
    const cards=document.querySelectorAll('#page-overview .stat-card');
    if(cards[2])cards[2].querySelector('.stat-val').textContent=s.profileViews;
    if(cards[3])cards[3].querySelector('.stat-val').textContent=s.newEnquiries;
    statChange(0,s.totalBookings?`${s.pendingBookings} pending`:'No bookings yet',s.pendingBookings?'up':'down');
    statChange(1,s.totalEarnings?`${s.completedShows} paid show${s.completedShows===1?'':'s'}`:'No paid shows yet',s.totalEarnings?'up':'down');
    statChange(2,s.profileViews?'Live profile views':'No views yet',s.profileViews?'up':'down');
    statChange(3,s.newEnquiries?`${s.newEnquiries} unread`:'No unread enquiries',s.newEnquiries?'up':'down');
    const badge=document.getElementById('pendingBadge'); if(badge){badge.textContent=s.pendingBookings;badge.style.display=s.pendingBookings?'inline':'none';}
    const rating=document.getElementById('pRating'); if(rating)rating.textContent=s.rating==null?'—':Number(s.rating).toFixed(1);
    const shows=document.getElementById('pShows'); if(shows)shows.textContent=s.completedShows;
    const years=document.getElementById('pYears'); if(years){const m=String(live.user?.experience||'').match(/\d+(?:\.\d+)?/);years.textContent=m?`${m[0]}+`:'—';}
  }

  function bookingHTML(b,full=false){
    const d=dateObj(b.date),dd=d&&!Number.isNaN(d.getTime())?d.getDate():'—',mm=d&&!Number.isNaN(d.getTime())?d.toLocaleString('en-IN',{month:'short'}):'',status=b.status||'pending';
    const action=status==='pending'?`<div style="display:flex;gap:.4rem;margin-top:.55rem"><button class="tb-btn tb-fire" style="padding:.38rem .7rem;font-size:.68rem" onclick="event.stopPropagation();artistUpdateBooking('${esc(b.id)}','confirmed')">Accept</button><button class="tb-btn tb-ghost" style="padding:.38rem .7rem;font-size:.68rem" onclick="event.stopPropagation();artistUpdateBooking('${esc(b.id)}','cancelled')">Decline</button></div>`:status==='confirmed'?`<div style="margin-top:.55rem"><button class="tb-btn tb-ghost" style="padding:.38rem .7rem;font-size:.68rem" onclick="event.stopPropagation();artistUpdateBooking('${esc(b.id)}','completed')">Mark completed</button></div>`:'';
    return `<div class="booking-item" ${full?'style="padding:1rem 1.2rem"':''}><div class="bi-date ${status==='completed'||status==='cancelled'?'past':'upcoming'}"><span class="bi-dd">${dd}</span><span class="bi-mm">${mm}</span></div><div class="bi-info"><div class="bi-title">${esc(b.event)}</div><div class="bi-meta">${esc(b.organiser?.name||'Organiser')} <span class="bi-dot"></span> ${esc(b.city||'')} <span class="bi-dot"></span> <span class="bi-badge ${esc(status)}">${esc(status)}</span></div>${b.venue?`<div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">📍 ${esc(b.venue)}</div>`:''}${action}</div><div class="bi-fee">${money(b.fee)}</div></div>`;
  }

  function renderBookings(filter='all'){
    const list=filter==='all'?live.bookings:live.bookings.filter(b=>b.status===filter);
    const upcoming=live.bookings.filter(b=>!['completed','cancelled'].includes(b.status)&&new Date(`${b.date}T23:59:59`)>=new Date()).slice(0,4);
    const up=document.getElementById('upcomingList'); if(up)up.innerHTML=upcoming.length?upcoming.map(b=>bookingHTML(b)).join(''):`<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No upcoming bookings yet.<br><span style="font-size:.75rem">Confirmed and pending bookings will appear here.</span></div>`;
    const all=document.getElementById('allBookingsList'); if(all)all.innerHTML=list.length?`<div>${list.map(b=>bookingHTML(b,true)).join('')}</div>`:`<div style="text-align:center;color:var(--muted);padding:2.5rem;font-size:.85rem">No ${filter==='all'?'bookings':filter+' bookings'} found.</div>`;
  }

  function enquiryHTML(e){return `<div class="enquiry-item" onclick="openLiveEnquiry('${esc(e.id)}')"><div class="enq-head"><span class="enq-from">${esc(e.from)}</span><span class="enq-time">${relative(e.createdAt)}</span></div><div class="enq-event">📅 ${esc(e.date||'Date not specified')}${e.city?' · 📍 '+esc(e.city):''}</div><div class="enq-foot"><span class="bi-badge ${e.read?'completed':'pending'}">${e.read?'Read':'New'}</span><span class="enq-budget">${esc(e.budget||'Budget not specified')}</span></div></div>`;}
  function renderEnquiries(){
    const items=live.enquiries;
    const list=document.getElementById('newEnquiriesList'); if(list)list.innerHTML=items.length?items.map(enquiryHTML).join(''):`<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No enquiries yet. Messages from organisers will appear here.</div>`;
    const preview=document.getElementById('enquiryPreview'); if(preview)preview.innerHTML=items.slice(0,2).map(e=>`<div class="enquiry-item" onclick="openLiveEnquiry('${esc(e.id)}')"><div class="enq-head"><span class="enq-from">${esc(e.from)}</span><span class="enq-time">${relative(e.createdAt)}</span></div><div class="enq-event">${esc(e.event)}${e.city?' · '+esc(e.city):''}</div><div class="enq-foot"><span class="bi-badge ${e.read?'completed':'pending'}">${e.read?'Read':'New'}</span><span class="enq-budget">${esc(e.budget||'Budget not specified')}</span></div></div>`).join('')||'<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:1.2rem">No enquiries yet.</div>';
  }
  window.openLiveEnquiry=async id=>{const e=live.enquiries.find(x=>x.id===id);if(!e)return;const box=document.getElementById('enquiryDetail');if(!box)return;box.innerHTML=`<div style="text-align:left"><div style="font-family:var(--head);font-weight:800;font-size:1rem;margin-bottom:.3rem">${esc(e.from)}</div><div style="font-size:.78rem;color:var(--muted);margin-bottom:1.2rem">${esc(e.event)}${e.city?' · '+esc(e.city):''}${e.date?' · '+esc(e.date):''}</div><div style="font-size:.65rem;color:var(--muted);font-family:var(--head);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem">Message</div><div style="font-size:.85rem;line-height:1.75;background:var(--bg);border-radius:12px;padding:1rem;margin-bottom:1.2rem">${esc(e.message||'No message provided.')}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem"><div><div style="font-size:.65rem;font-family:var(--head);font-weight:700;text-transform:uppercase;color:var(--muted)">Budget</div><div style="font-family:var(--head);font-weight:800;color:var(--orange)">${esc(e.budget||'Not specified')}</div></div><span class="bi-badge ${e.read?'completed':'pending'}">${e.read?'Read':'New'}</span></div><button class="tb-btn tb-fire" style="width:100%;justify-content:center" onclick="window.location.href='floox-messages.html?with=${encodeURIComponent(e.senderId)}'">✉️ Open conversation</button></div>`;};

  function renderEarnings(){
    const s=live.stats; const total=document.getElementById('totalEarnBig');if(total)total.textContent=money(s.totalEarnings);const month=document.getElementById('earnThisMonth');if(month)month.textContent=money(s.monthEarnings);const pending=document.getElementById('pendingPayout');if(pending)pending.textContent=money(s.pendingPayout);const completed=live.bookings.filter(b=>b.status==='completed');const avg=document.getElementById('avgFee');if(avg)avg.textContent=money(completed.length?s.totalEarnings/completed.length:0);const range=document.getElementById('feeRangeStat');if(range){const min=live.user?.min_fee,max=live.user?.max_fee;range.textContent=(min||max)?`${money(min)} – ${money(max)}`:'Not set';}const tx=document.getElementById('transactionList');if(tx)tx.innerHTML=completed.length?completed.map(b=>`<div class="booking-item"><div class="bi-info"><div class="bi-title">${esc(b.event)}</div><div class="bi-meta">${esc(dateLabel(b.date))} <span class="bi-dot"></span><span class="bi-badge completed">${esc(b.paymentStatus==='paid'?'Paid':'Completed')}</span></div></div><div class="bi-fee" style="color:var(--green)">+${money(b.fee)}</div></div>`).join(''):`<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No completed transactions yet.</div>`;
    const bank=document.querySelector('#page-earnings .tb-btn.tb-fire');if(bank){bank.textContent='Payout setup';bank.onclick=()=>toast('Payout setup will be available once payment onboarding is connected.','info');}
  }
  function renderActivity(){
    const events=[];live.enquiries.forEach(e=>events.push({icon:'💬',type:'teal',text:`New enquiry from <strong>${esc(e.from)}</strong>`,time:relative(e.createdAt)}));live.bookings.forEach(b=>events.push({icon:b.status==='completed'?'💰':'📅',type:b.status==='completed'?'green':'orange',text:`Booking <strong>${esc(b.event)}</strong> is ${esc(b.status)}`,time:relative(b.updatedAt||b.createdAt)}));live.views.slice(0,5).forEach(v=>events.push({icon:'👁',type:'teal',text:'Your profile was viewed',time:relative(v)}));const box=document.getElementById('activityList');if(box)box.innerHTML=events.slice(0,5).map(a=>`<div class="activity-item"><div class="act-icon ${a.type}">${a.icon}</div><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div>`).join('')||'<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No activity yet.</div>';
  }

  async function refresh(){try{const d=await FLOOX.apiGet('artist-dashboard',true);live=d;if(d.user)FLOOX.saveSession(FLOOX.getToken(),d.user);setLiveStats();renderBookings();renderEnquiries();renderEarnings();renderActivity();if(window.populateUI)window.populateUI();setLiveStats();}catch(e){console.error('Live artist dashboard:',e);toast(e.message||'Could not load live dashboard data.','error');}}
  window.filterBookings=function(status){document.querySelectorAll('[id^="filter"]').forEach(b=>{b.classList.remove('tb-fire');b.classList.add('tb-ghost')});const active=document.getElementById('filter'+status.charAt(0).toUpperCase()+status.slice(1));if(active){active.classList.add('tb-fire');active.classList.remove('tb-ghost')}renderBookings(status);};
  window.artistUpdateBooking=async function(id,status){try{const d=await FLOOX.apiPost('artist-dashboard',{action:'update-booking',bookingId:id,status},true);toast(d.message||'Booking updated.','success');await refresh();}catch(e){toast(e.message||'Could not update booking.','error');}};
  document.addEventListener('DOMContentLoaded',()=>{if(!window.FLOOX||!window.FLOOX.getUser())return;setTimeout(refresh,0);setInterval(refresh,60000);});
})();
