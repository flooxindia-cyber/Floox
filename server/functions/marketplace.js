// Floox marketplace APIs — no payment/monetisation layer
const {
  corsOk, json, verifyToken, extractBearer, findUser, publicUser,
  supabaseHeaders, supabaseUrl, readJson,
} = require('./_utils');

const id = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
async function auth(event){
  const token=extractBearer(event); if(!token) throw Object.assign(new Error('Please sign in.'),{status:401});
  let decoded; try{decoded=verifyToken(token)}catch{throw Object.assign(new Error('Session expired. Please sign in again.'),{status:401})}
  const user=await findUser('id','eq',decoded.id); if(!user) throw Object.assign(new Error('Account not found.'),{status:401});
  return user;
}
async function db(table,qs='',opts={}){
  const res=await fetch(supabaseUrl(table,qs),{headers:supabaseHeaders(),...opts});
  const data=await readJson(res);
  if(!res.ok) throw new Error(data.message||data.error||`Database error (${table})`);
  return data;
}
async function insert(table,row){return db(table,'',{method:'POST',body:JSON.stringify(row)})}
async function patch(table,qs,row){return db(table,qs,{method:'PATCH',body:JSON.stringify(row)})}

function cleanProfile(u){
  const p=publicUser(u); if(!p)return null; delete p.password_hash; delete p.email; delete p.phone; return p;
}

async function notify(userId,type,title,body,link=''){
  try{await insert('notifications',{id:id('notif'),user_id:userId,type,title,body,link})}catch(e){console.error('notification:',e.message)}
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return corsOk();
  try{
    const user=await auth(event); const p=event.queryStringParameters||{}; const action=p.action||'';
    if(event.httpMethod==='GET'){
      if(action==='reviews'){
        const rows=await db('reviews',`reviewed_id=eq.${encodeURIComponent(p.profileId||'')}&order=created_at.desc&limit=50`);
        const out=await Promise.all(rows.map(async r=>{const u=await findUser('id','eq',r.reviewer_id);return {...r,reviewer:cleanProfile(u)}}));
        const avg=rows.length?Number((rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length).toFixed(1)):null;
        return json(200,{reviews:out,average:avg,count:rows.length});
      }
      if(action==='availability'){
        const rows=await db('availability',`user_id=eq.${encodeURIComponent(p.userId||user.id)}&date=gte.${encodeURIComponent(p.from||new Date().toISOString().slice(0,10))}&date=lte.${encodeURIComponent(p.to||'2099-12-31')}&order=date.asc&limit=500`);
        return json(200,{availability:rows});
      }
      if(action==='quotes'){
        const rows=await db('quote_requests',`or=(requester_id.eq.${encodeURIComponent(user.id)},provider_id.eq.${encodeURIComponent(user.id)})&order=created_at.desc&limit=100`);
        return json(200,{requests:rows});
      }
      if(action==='notifications'){
        const rows=await db('notifications',`user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=100`);
        return json(200,{notifications:rows,unread:rows.filter(x=>!x.read).length});
      }
      if(action==='notes'){
        const rows=await db('profile_notes',`user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc&limit=100`);
        return json(200,{notes:rows});
      }
      if(action==='tasks'){
        const rows=await db('event_tasks',`event_id=eq.${encodeURIComponent(p.eventId||'')}&user_id=eq.${encodeURIComponent(user.id)}&order=due_date.asc&limit=200`);
        return json(200,{tasks:rows});
      }
      if(action==='match'){
        const q=p.q||''; const city=p.city||''; const genre=p.genre||''; const eventType=p.eventType||''; const budget=Number(p.budget||0);
        const qs=['role=eq.artist','verified=eq.true','profile_complete=eq.true','limit=100'];
        if(city)qs.push(`city=ilike.*${encodeURIComponent(city)}*`);
        const artists=await db('users',qs.join('&'));
        const score=a=>{
          let s=0;
          const hay=[a.name,a.stage_name,a.bio,a.city,a.performer_type,...(a.genres||[]),...(a.event_types||[]),...(a.performance_types||[])].join(' ').toLowerCase();
          if(q&&hay.includes(q.toLowerCase()))s+=25;
          if(city&&String(a.city||'').toLowerCase().includes(city.toLowerCase()))s+=25;
          if(genre&&(a.genres||[]).some(g=>String(g).toLowerCase().includes(genre.toLowerCase())))s+=20;
          if(eventType&&(a.event_types||[]).some(g=>String(g).toLowerCase().includes(eventType.toLowerCase())))s+=15;
          if(budget){const min=Number(a.min_fee||0);if(!min||min<=budget)s+=10;else if(min<=budget*1.25)s+=5}
          if(a.verified)s+=5; return Math.min(100,s);
        };
        const matches=artists.map(a=>({profile:cleanProfile(a),score:score(a)})).sort((a,b)=>b.score-a.score).slice(0,12);
        return json(200,{matches,criteria:{q,city,genre,eventType,budget}});
      }
      return json(400,{error:'Unknown marketplace action.'});
    }
    if(event.httpMethod==='POST'){
      const body=event.body?JSON.parse(event.body):{};
      if(action==='review'){
        if(!body.reviewedId||!body.rating)return json(400,{error:'Profile and rating are required.'});
        let verified=false;
        if(body.bookingId){const b=(await db('artist_bookings',`id=eq.${encodeURIComponent(body.bookingId)}&limit=1`))[0];verified=!!b&&b.status==='completed'&&(b.artist_id===body.reviewedId||b.organiser_id===body.reviewedId)&&(b.artist_id===user.id||b.organiser_id===user.id)}
        const row={id:id('review'),reviewer_id:user.id,reviewed_id:body.reviewedId,booking_id:body.bookingId||null,rating:Number(body.rating),communication:body.communication?Number(body.communication):null,professionalism:body.professionalism?Number(body.professionalism):null,quality:body.quality?Number(body.quality):null,value:body.value?Number(body.value):null,punctuality:body.punctuality?Number(body.punctuality):null,body:String(body.body||'').slice(0,3000),verified_booking:verified};
        const result=await insert('reviews',row); await notify(body.reviewedId,'review','New review received',`${user.name||'A Floox user'} left you a ${row.rating}/5 review.`,'floox-dashboard.html'); return json(201,{review:Array.isArray(result)?result[0]:result});
      }
      if(action==='availability'){
        if(user.role!=='artist'&&user.role!=='organiser')return json(403,{error:'Only artists and organisers can manage availability.'});
        const row={id:id('avail'),user_id:user.id,date:body.date,status:body.status||'available',note:body.note||'',updated_at:new Date().toISOString()};
        const existing=await db('availability',`user_id=eq.${encodeURIComponent(user.id)}&date=eq.${encodeURIComponent(body.date)}&limit=1`);
        const result=existing.length?await patch('availability',`id=eq.${encodeURIComponent(existing[0].id)}`,row):await insert('availability',row);
        return json(200,{availability:Array.isArray(result)?result[0]:result});
      }
      if(action==='quote-request'){
        const row={id:id('quote'),requester_id:user.id,provider_id:body.providerId,event_id:body.eventId||null,event_name:body.eventName||'',event_date:body.eventDate||null,city:body.city||'',venue:body.venue||'',event_type:body.eventType||'',guest_count:body.guestCount?Number(body.guestCount):null,duration_hours:body.durationHours?Number(body.durationHours):null,budget:body.budget?Number(body.budget):null,requirements:String(body.requirements||'').slice(0,5000),status:'pending',expires_at:body.expiresAt||null};
        const result=await insert('quote_requests',row); await notify(row.provider_id,'quote_request','New quote request',`${user.name||'A Floox user'} requested a quote for ${row.event_name||'an event'}.`,'floox-dashboard.html'); return json(201,{request:Array.isArray(result)?result[0]:result});
      }
      if(action==='quote'){
        const req=(await db('quote_requests',`id=eq.${encodeURIComponent(body.requestId)}&limit=1`))[0]; if(!req)return json(404,{error:'Quote request not found.'}); if(req.provider_id!==user.id)return json(403,{error:'Only the invited provider can quote.'});
        const total=['performanceFee','travelFee','accommodationFee','equipmentFee','otherFee'].reduce((s,k)=>s+(Number(body[k])||0),0);
        const row={id:id('offer'),request_id:req.id,sender_id:user.id,performance_fee:Number(body.performanceFee)||0,travel_fee:Number(body.travelFee)||0,accommodation_fee:Number(body.accommodationFee)||0,equipment_fee:Number(body.equipmentFee)||0,other_fee:Number(body.otherFee)||0,total,currency:body.currency||'INR',notes:String(body.notes||'').slice(0,3000),cancellation_terms:String(body.cancellationTerms||'').slice(0,2000),valid_until:body.validUntil||null,status:'sent'};
        const result=await insert('quotes',row); await patch('quote_requests',`id=eq.${req.id}`,{status:'responded',updated_at:new Date().toISOString()}); await notify(req.requester_id,'quote','New quote received',`A provider sent a quote of ${row.currency} ${row.total.toLocaleString('en-IN')}.`,'floox-dashboard.html'); return json(201,{quote:Array.isArray(result)?result[0]:result});
      }
      if(action==='task'){
        const row={id:id('task'),event_id:body.eventId,user_id:user.id,title:String(body.title||'Untitled task').slice(0,200),description:String(body.description||'').slice(0,2000),due_date:body.dueDate||null};
        const result=await insert('event_tasks',row); return json(201,{task:Array.isArray(result)?result[0]:result});
      }
      if(action==='note'){
        const row={id:id('note'),user_id:user.id,profile_id:body.profileId,note:String(body.note||'').slice(0,2000),updated_at:new Date().toISOString()};
        const existing=await db('profile_notes',`user_id=eq.${encodeURIComponent(user.id)}&profile_id=eq.${encodeURIComponent(body.profileId)}&limit=1`);
        const result=existing.length?await patch('profile_notes',`id=eq.${existing[0].id}`,{note:row.note,updated_at:row.updated_at}):await insert('profile_notes',row); return json(200,{note:Array.isArray(result)?result[0]:result});
      }
      if(action==='notification-read'){
        const result=await patch('notifications',`id=eq.${encodeURIComponent(body.id)}&user_id=eq.${encodeURIComponent(user.id)}`,{read:true}); return json(200,{ok:true,result});
      }
      if(action==='task-toggle'){
        const result=await patch('event_tasks',`id=eq.${encodeURIComponent(body.id)}&user_id=eq.${encodeURIComponent(user.id)}`,{completed:!!body.completed,updated_at:new Date().toISOString()}); return json(200,{task:Array.isArray(result)?result[0]:result});
      }
      return json(400,{error:'Unknown marketplace action.'});
    }
    return json(405,{error:'Method not allowed.'});
  }catch(e){console.error('marketplace:',e);return json(e.status||500,{error:e.message||'Marketplace request failed.'})}
};
