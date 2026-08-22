const grid = document.getElementById("eventsGrid");
const searchInput = document.getElementById("eventSearch");
const citySelect = document.getElementById("eventCity");
const searchBtn = document.getElementById("searchEventsBtn");

async function loadEvents(city = "", keyword = "") {

    grid.innerHTML = "<p>Loading live events...</p>";

    const res = await fetch(
        `/api/events?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}`
    );

    const events = await res.json();

    if (!events.length) {
        grid.innerHTML = "<p>No live events found.</p>";
        return;
    }

    grid.innerHTML = events.map(event => `
        <div class="event-card">

            <img src="${event.image_url}" alt="${event.title}">

            <div class="event-info">

                <span class="badge">${event.category}</span>

                <h3>${event.title}</h3>

                <p>📍 ${event.city}, ${event.country}</p>

                <p>📅 ${new Date(event.event_date).toLocaleString()}</p>

                <p class="price">${event.price}</p>

                <a
                  href="${event.booking_url}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="book-btn"
                >
                  Book Tickets →
                </a>

            </div>

        </div>
    `).join("");

}

searchBtn.addEventListener("click", () => {
    loadEvents(citySelect.value, searchInput.value);
});

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        loadEvents(citySelect.value, searchInput.value);
    }
});

loadEvents();