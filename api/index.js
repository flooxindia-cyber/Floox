// Floox API gateway — single Vercel Serverless Function
const HANDLERS={
'artist-profile':require('../server/functions/artist-profile').handler,'artist-dashboard':require('../server/functions/artist-dashboard').handler,artists:require('../server/functions/artists').handler,'change-password':require('../server/functions/change-password').handler,'delete-account':require('../server/functions/delete-account').handler,'forgot-password':require('../server/functions/forgot-password').handler,events:require('../server/functions/events').handler,'global-events':require('../server/functions/global-events').handler,'get-likes':require('../server/functions/get-likes').handler,'get-profile':require('../server/functions/get-profile').handler,'get-profile-views-remaining':require('../server/functions/get-profile-views-remaining').handler,'get-reveals-remaining':require('../server/functions/get-reveals-remaining').handler,health:require('../server/functions/health').handler,login:require('../server/functions/login').handler,me:require('../server/functions/me').handler,messages:require('../server/functions/messages').handler,'mark-messages-read':require('../server/functions/mark-messages-read').handler,'marketplace':require('../server/functions/marketplace').handler,'organiser-profile':require('../server/functions/organiser-profile').handler,'organiser-stats':require('../server/functions/organiser-stats').handler,organisers:require('../server/functions/organisers').handler,users:require('../server/functions/users').handler,register:require('../server/functions/register').handler,'resend-otp':require('../server/functions/resend-otp').handler,'reset-password':require('../server/functions/reset-password').handler,'reveal-contact':require('../server/functions/reveal-contact').handler,'send-message':require('../server/functions/send-message').handler,'toggle-like':require('../server/functions/toggle-like').handler,'upload-media':require('../server/functions/upload-media').handler,'verify-otp':require('../server/functions/verify-otp').handler};
const ROUTE_ALIASES={'auth/otp/send':'resend-otp','auth/otp/resend':'resend-otp','auth/otp/verify':'verify-otp','auth/login':'login','auth/register':'register','auth/forgot-password':'forgot-password','auth/reset-password':'reset-password'};
function getRoute(req){const raw=req.query?.route||req.query?.path||'';if(Array.isArray(raw))return raw.join('/').replace(/^\/+|\/+$/g,'');return String(raw).replace(/^\/+|\/+$/g,'').split('?')[0]}
function toEvent(req){return{httpMethod:req.method,headers:req.headers||{},body:req.body==null?'':(typeof req.body==='string'?req.body:JSON.stringify(req.body)),queryStringParameters:req.query||{},path:req.url}}
function jsonResponse(res,status,body){res.status(status).setHeader('Content-Type','application/json');res.setHeader('Access-Control-Allow-Origin','*');return res.end(JSON.stringify(body))}
function supabaseUrl(table,qs=''){const base=process.env.SUPABASE_URL;if(!base)throw new Error('SUPABASE_URL env var is not set');return `${base}/rest/v1/${table}${qs?'?'+qs:''}`}
function serviceHeaders(){const key=process.env.SUPABASE_SERVICE_KEY;if(!key)throw new Error('SUPABASE_SERVICE_KEY env var is not set');return{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`}}
async function enforceSingleProfileView(req,route){
  if(req.method!=='GET'||!['artists','users','organisers'].includes(route))return null;
  const profileId=String(req.query?.id||'').trim();
  if(!profileId)return null; // directory/list requests remain public
  const auth=req.headers?.authorization||req.headers?.Authorization||'';
  if(!auth.startsWith('Bearer '))return{status:401,body:{error:'Please sign in to view full profiles.'}};
  // Verify the token using the same JWT secret as the API functions.
  const jwt=require('jsonwebtoken');
  const secret=process.env.JWT_SECRET||'floox_dev_secret_change_in_prod';
  let decoded;
  try{decoded=jwt.verify(auth.slice(7),secret)}catch{return{status:401,body:{error:'Session expired. Please sign in again.'}}}
  if(String(decoded.id)===profileId)return null; // own profile is never counted
  const r=await fetch(supabaseUrl('rpc/consume_full_profile_view'),{method:'POST',headers:serviceHeaders(),body:JSON.stringify({p_viewer_id:String(decoded.id),p_profile_id:profileId})});
  const text=await r.text();
  let usage={};try{usage=text?JSON.parse(text):{}}catch{usage={}}
  if(!r.ok)return{status:503,body:{error:'Profile-view limit service is temporarily unavailable. Please try again.'}};
  const u=Array.isArray(usage)?usage[0]:usage;
  if(!u?.allowed)return{status:429,body:{error:"You've reached today's limit of 5 full profile views.",code:'PROFILE_VIEW_LIMIT_REACHED',limit:5,viewedToday:Number(u?.viewed_today||5),remaining:0,resetsOn:'next India calendar day'}};
  // The legacy directory endpoint may still return a profile-shaped record.
  // Mark that this request already consumed the quota so downstream handlers
  // can be prevented from charging it a second time in the future.
  req.headers['x-floox-profile-view-authorized']='1';
  req.headers['x-floox-profile-view-remaining']=String(Number(u?.remaining??0));
  return null;
}
async function invoke(fn,req,res){if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');return res.status(204).end()}const result=await fn(toEvent(req),{});Object.entries(result?.headers||{}).forEach(([k,v])=>res.setHeader(k,v));return res.status(result?.statusCode||200).send(result?.body||'')}
module.exports=async function handler(req,res){const requestedRoute=getRoute(req),route=ROUTE_ALIASES[requestedRoute]||requestedRoute,fn=HANDLERS[route];if(!fn)return jsonResponse(res,404,{error:`API route not found: /api/${requestedRoute}`});try{const blocked=await enforceSingleProfileView(req,route);if(blocked)return jsonResponse(res,blocked.status,blocked.body);return await invoke(fn,req,res)}catch(err){console.error(`API gateway error [${route}]:`,err);return jsonResponse(res,500,{error:'Internal server error.'})}};