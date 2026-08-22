const grid = document.getElementById("liveEventsGrid");

async function loadEvents(){

 const response = await fetch("/api/events?city=Delhi");
 const events = await response.json();

 grid.innerHTML = events.slice(0,6).map(event=>`

<div class="event-card">

<img src="${event.image_url}" alt="${event.title}">

<div class="content">

<span>${event.category}</span>

<h3>${event.title}</h3>

<p>${event.city}, ${event.country}</p>

<p>${new Date(event.event_date).toLocaleDateString()}</p>

<a href="${event.booking_url}" target="_blank">

Book Tickets →

</a>

</div>

</div>

`).join("");

}

loadEvents();