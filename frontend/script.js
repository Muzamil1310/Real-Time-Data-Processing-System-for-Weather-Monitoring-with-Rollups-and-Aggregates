document.getElementById('fetchSummaries').addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:3000/daily-summaries');
        const data = await response.json();

        const summariesDiv = document.getElementById('summaries');
        summariesDiv.innerHTML = ''; // Clear previous summaries

        if (data.length === 0) {
            summariesDiv.innerHTML = '<p>No summaries available.</p>';
            return;
        }

        data.forEach(summary => {
            const summaryDiv = document.createElement('div');
            summaryDiv.classList.add('summary');
            summaryDiv.innerHTML = `
                <p>Date: ${new Date(summary.date).toLocaleDateString()}</p>
                <p>Average Temperature: ${summary.avgTemp.toFixed(2)} °C</p>
                <p>Max Temperature: ${summary.maxTemp} °C</p>
                <p>Min Temperature: ${summary.minTemp} °C</p>
                <p>Dominant Condition: ${summary.dominantCondition}</p>
                <hr>
            `;
            summariesDiv.appendChild(summaryDiv);
        });
    } catch (error) {
        console.error('Error fetching summaries:', error);
    }
});
