import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req,res){

 const city = req.query.city || "";
 const keyword = req.query.keyword || "";

 const url =
`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=20&city=${city}&keyword=${keyword}`;

 const response = await fetch(url);
 const data = await response.json();

 const events =
 data._embedded?.events?.map(event=>({

 id:event.id,
 title:event.name,
 description:event.info || "",
 category:event.classifications?.[0]?.segment?.name || "Event",
 city:event._embedded?.venues?.[0]?.city?.name || "",
 country:event._embedded?.venues?.[0]?.country?.name || "",
 venue:event._embedded?.venues?.[0]?.name || "",
 event_date:event.dates?.start?.dateTime,
 image_url:event.images?.[0]?.url,
 booking_url:event.url,
 price:event.priceRanges?.length
 ? `${event.priceRanges[0].min}-${event.priceRanges[0].max} ${event.priceRanges[0].currency}`
 : "Check website",
 source:"Ticketmaster"

 })) || [];

 await supabase.from("events_cache").upsert(events);

 res.status(200).json(events);

}