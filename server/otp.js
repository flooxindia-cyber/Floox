const crypto=require('crypto');
function sb(){const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;if(!base||!key)throw new Error('Supabase environment variables are not configured.');return {base,key,headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`,Prefer:'return=representation'}}}
function hash(code){return crypto.createHash('sha256').update(String(code)).digest('hex')}
function otp(){return String(crypto.randomInt(100000,1000000))}
async function sendEmail(to,name,code,subject='Your Floox verification code'){
 const key=process.env.RESEND_API_KEY, from=process.env.RESEND_FROM;
 if(!key||!from) throw new Error('Email delivery is not configured.');
 const html=`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;background:#100a02;color:#fff;border-radius:18px"><h1 style="margin:0 0 8px;color:#ff5c00">Floox</h1><p style="color:#bbb">Hi ${String(name||'there').replace(/[<>]/g,'')},</p><p style="color:#ddd">Your verification code is:</p><div style="font-size:36px;font-weight:800;letter-spacing:10px;text-align:center;padding:20px;background:#1c1000;border-radius:14px;color:#ff5c00">${code}</div><p style="color:#888">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p></div>`;
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,html})});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||'Email delivery failed.');}
}
async function issue(email,userId,purpose,name){const s=sb(); const code=otp(); const now=new Date(); const exp=new Date(now.getTime()+10*60*1000).toISOString();
 await fetch(`${s.base}/rest/v1/email_otps?email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&used_at=is.null`,{method:'PATCH',headers:s.headers,body:JSON.stringify({used_at:now.toISOString()})});
 const r=await fetch(`${s.base}/rest/v1/email_otps`,{method:'POST',headers:s.headers,body:JSON.stringify({email,user_id:userId,purpose,code_hash:hash(code),attempts:0,created_at:now.toISOString(),expires_at:exp})});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||'OTP storage failed.');}
 await sendEmail(email,name,code,purpose==='registration'?'Verify your Floox account':'Reset your Floox password');
}
async function verify(email,code,purpose){const s=sb(); const r=await fetch(`${s.base}/rest/v1/email_otps?email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&used_at=is.null&order=created_at.desc&limit=1`,{headers:s.headers}); const rows=await r.json(); if(!r.ok||!rows[0]) return {ok:false,error:'No active verification code found.'}; const row=rows[0]; if(new Date(row.expires_at)<new Date()) return {ok:false,error:'This code has expired. Please request a new one.'}; if(row.attempts>=5) return {ok:false,error:'Too many attempts. Please request a new code.'}; if(hash(code)!==row.code_hash){await fetch(`${s.base}/rest/v1/email_otps?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:s.headers,body:JSON.stringify({attempts:row.attempts+1})});return {ok:false,error:'Invalid verification code.'};} await fetch(`${s.base}/rest/v1/email_otps?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:s.headers,body:JSON.stringify({used_at:new Date().toISOString()})}); return {ok:true,userId:row.user_id};}
module.exports={issue,verify};
