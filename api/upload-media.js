const { verifyToken, extractBearer } = require('../server/functions/_utils');
function json(res,status,body){return res.status(status).json(body)}
module.exports = async (req,res)=>{
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(204).end()}
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  const token=extractBearer({headers:req.headers});
  if(!token) return json(res,401,{error:'Authentication required.'});
  let decoded; try{decoded=verifyToken(token)}catch{return json(res,401,{error:'Session expired.'})}
  const {fileData,fileName,fileType,mediaType='image'}=req.body||{};
  if(!fileData) return json(res,400,{error:'No file data provided.'});
  const supa=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_KEY;
  if(!supa||!key) return json(res,500,{error:'Supabase storage is not configured.'});
  const m=String(mediaType).toLowerCase();
  const allowed=m==='video'?['video/']:m==='audio'?['audio/']:['image/'];
  if(!allowed.some(p=>String(fileType||'').startsWith(p))) return json(res,400,{error:'Invalid media type.'});
  const raw=String(fileData); const comma=raw.indexOf(','); const b64=comma>=0?raw.slice(comma+1):raw;
  const ext=(String(fileName||'file').split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').toLowerCase()||'bin';
  const safeName=`${decoded.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const bytes=Buffer.from(b64,'base64');
  if(bytes.length>25*1024*1024) return json(res,413,{error:'File is larger than 25 MB.'});
  const upload=await fetch(`${supa}/storage/v1/object/floox-media/${safeName}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':fileType||'application/octet-stream','x-upsert':'false'},body:bytes});
  const data=await upload.json().catch(()=>({}));
  if(!upload.ok) return json(res,500,{error:data.message||data.error||'Upload failed.'});
  const url=`${supa}/storage/v1/object/public/floox-media/${safeName}`;
  return json(res,200,{url,secure_url:url,publicId:safeName,resourceType:m,bytes:bytes.length});
};
