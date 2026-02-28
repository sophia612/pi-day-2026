// public/script.js
// This file runs in the user's browser. It talks to our server.js file when testing.

function toggleRSVP() {
    const form = document.getElementById('main-form');
    const btn = document.getElementById('open-rsvp-btn');

    // Remove the 'hidden' class so the form appears
    form.classList.remove('hidden');

    // Hide the button after it's clicked so they can't click it twice
    btn.style.display = 'none';

    // Smoothly scroll down to the form so the user sees it appear
    form.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    const pool = document.getElementById('pie-pool');
    const slots = [
        document.getElementById('slot-1'),
        document.getElementById('slot-2'),
        document.getElementById('slot-3')
    ];

    // Listen for clicks on the entire section to be efficient
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.pie-vote-card');
        if (!card) return;

        const parent = card.parentElement;

        // IF THE PIE IS IN THE POOL: Move it to the first empty slot
        if (parent.id === 'pie-pool') {
            const nextSlot = slots.find(slot => slot.children.length === 0);
            if (nextSlot) {
                nextSlot.appendChild(card);
                card.classList.add('is-ranked'); // Optional: for styling
            } else {
                alert("You've already picked your top 3! Remove a pie from your rankings to add another.");
            }
        } 
        // IF THE PIE IS IN A SLOT: Move it back to the pool
        else if (parent.classList.contains('drop-zone')) {
            pool.appendChild(card);
            card.classList.remove('is-ranked');
        }
    });
});

// --- FORM SUBMISSION LOGIC ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4Vhe8ivIj4iXN1_1i6WMidYWiowuRyUsjadLowtl1wsoMciKfjdyLl1SvIT3ENHq2/exec';

async function submitEverything() {
    // 1. Find the button and the text
    const btn = document.querySelector('button[onclick="submitEverything()"]');
    const originalText = btn.innerHTML;

    // 2. Disable the button and show the loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending RSVP...';


    const name = document.getElementById('name').value;
    const attending = document.querySelector('input[name="attending"]:checked')?.value;
    const notes = document.getElementById('notes').value;

    // Get the IDs of the pies in the slots
    // If a slot is empty, it returns null
    const slot1 = document.getElementById('slot-1').firstElementChild?.id || null;
    const slot2 = document.getElementById('slot-2').firstElementChild?.id || null;
    const slot3 = document.getElementById('slot-3').firstElementChild?.id || null;

    if (!name || !attending) {
        alert("Please enter your name and RSVP status!");
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
    }

    const formData = {
        name: name,
        attending: attending,
        notes: notes,
        slot1: slot1, // 3 points
        slot2: slot2, // 2 points
        slot3: slot3  // 1 point
    };

    try {
        // Send to Google Sheets
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Scripts
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        // Since 'no-cors' doesn't let us see the 'OK', we just assume success 
        // and show the results screen
        document.getElementById('main-form').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');

        // Refresh the leaderboard
        fetchLeaderboard('public-leaderboard');
        
    } catch (error) {
        console.error("Something went wrong!", error);
        btn.disabled = false;
        btn.innerHTML = originalText;
        alert("Oops! Something went wrong. Please try again or text Sophia.");
    }
}

async function fetchLeaderboard(elementId) {
    const board = document.getElementById(elementId);
    if (!board) return; // Exit if the element doesn't exist on this page

    // Show the spinner immediately when the function starts
    board.innerHTML = '<li><div class="loading-state"><span class="spinner-dark"></span> Loading rankings...</div></li>';

    // Define all your pies here so they show up even with 0 points
    const allPies = ["sweet-potato-pie", "key-lime-pie", "nutmeg-maple-cream-pie", "vegan-chocolate-pudding-pie", "berry-pie-bars", "secret-green-pie"];
    
    // Create a starting score of 0 for everyone
    const scores = {};
    allPies.forEach(pie => scores[pie.toLowerCase()] = 0);

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        data.forEach(entry => {
            // Rank 1 gets 3 points
            if (entry.slot1) scores[entry.slot1] = (scores[entry.slot1] || 0) + 3;
            // Rank 2 gets 2 points
            if (entry.slot2) scores[entry.slot2] = (scores[entry.slot2] || 0) + 2;
            // Rank 3 gets 1 point
            if (entry.slot3) scores[entry.slot3] = (scores[entry.slot3] || 0) + 1;
        });

        // 2. Sort pies: Highest score first
        const sortedPies = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        // 3. Build the HTML
        board.innerHTML = ''; 

        sortedPies.forEach(([pieId, score]) => {
            const li = document.createElement('li');
            const displayName = pieId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // This format works for both your sidebar and your results screen
            li.innerHTML = `
                <span class="pie-name">${displayName}</span>
                <span class="vote-count">${score} pts</span>
            `;
            board.appendChild(li);
        });

    } catch (error) {
        console.error("Leaderboard Error:", error);
        board.innerHTML = "<li>Unable to load rankings right now. Please try refreshing the page.</li>";
    }
}

// Run this as soon as the page loads
window.onload = fetchLeaderboard;