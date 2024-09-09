document.addEventListener("DOMContentLoaded", function() {
    fetch('/api/messages')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector("#messagesTable tbody");

            data.forEach(message => {
                const row = document.createElement("tr");

                const channelCell = document.createElement("td");
                channelCell.textContent = message._source.channel;
                row.appendChild(channelCell);

                const textCell = document.createElement("td");
                textCell.textContent = message._source.text;
                row.appendChild(textCell);

                const timestampCell = document.createElement("td");
                const timestamp = new Date(message._source.timestamp);
                const istTime = timestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
                timestampCell.textContent = istTime;
                row.appendChild(timestampCell);

                // const indiaRelatedCell = document.createElement("td");
                // indiaRelatedCell.textContent = message._source.is_india_related ? "Yes" : "No";
                // row.appendChild(indiaRelatedCell);

                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});

document.getElementById('alertsButton').addEventListener('click', function() {
    fetchMessages(true);
});

async function fetchMessages(isIndiaRelated = false) {
    const response = await fetch(`/api/messages${isIndiaRelated ? '?isIndiaRelated=true' : ''}`);
    const messages = await response.json();
    const tableBody = document.getElementById('messagesTableBody');
    tableBody.innerHTML = '';

    messages.forEach(message => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${message._source.channel}</td>
            <td>${message._source.text}</td>
            <td>${new Date(message._source.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
        `;
        tableBody.appendChild(row);
    });
}
// Initial fetch without filtering
fetchMessages();
