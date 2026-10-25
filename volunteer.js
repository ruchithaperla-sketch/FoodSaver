/**
 * volunteer.js
 * Manages the Volunteer Rescue Portal dashboard: fetching active delivery tasks,
 * rendering cards, updating delivery status in Firestore, and updating dashboard stats.
 */

import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { setupLogoutButton, protectPage } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {

    // Setup navbar logout listener
    setupLogoutButton();

    // Monitor authentication session
    let loggedInUser = null;
    protectPage('Volunteer', (userData) => {
        loggedInUser = userData;
    });

    // Container references
    const donationsContainer = document.getElementById('donations-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noDonationsMsg = document.getElementById('no-donations-msg');

    // Filter Input References
    const filterNameInput = document.getElementById('filter-name');
    const filterLocationInput = document.getElementById('filter-location');
    const filterStatusInput = document.getElementById('filter-status');

    // Array to hold all donations fetched from Firestore
    let allDonations = [];
    // Array to hold only the active rescue tasks (Requested, Volunteer Assigned, Picked Up)
    let rescueTasks = [];

    // Helper function to map a status string to our custom CSS classes
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Available': return 'status-available';
            case 'Requested': return 'status-requested';
            case 'Volunteer Assigned': return 'status-volunteer-assigned';
            case 'Picked Up': return 'status-picked-up';
            case 'Delivered': return 'status-delivered';
            case 'Expired': return 'status-expired';
            default: return 'bg-secondary';
        }
    }

    // --- DASHBOARD COUNTS FUNCTION ---
    function updateCounts(donations) {
        const total = donations.length;
        let available = 0;
        let delivered = 0;
        const activeVolunteersSet = new Set();

        donations.forEach(donation => {
            const data = donation.data;
            const isExpired = new Date(data.expiryTime) < new Date();
            const status = isExpired ? 'Expired' : (data.status || 'Available');

            if (status === 'Available') {
                available++;
            }
            if (status === 'Delivered') {
                delivered++;
            }
            if (data.volunteerName && data.volunteerName.trim() !== '') {
                activeVolunteersSet.add(data.volunteerName.trim().toLowerCase());
            }
        });

        // Update elements on page
        const totalEl = document.getElementById('count-total');
        const availableEl = document.getElementById('count-available');
        const deliveredEl = document.getElementById('count-delivered');
        const volunteersEl = document.getElementById('count-volunteers');

        if (totalEl) totalEl.innerText = total;
        if (availableEl) availableEl.innerText = available;
        if (deliveredEl) deliveredEl.innerText = delivered;
        if (volunteersEl) volunteersEl.innerText = activeVolunteersSet.size;
    }

    // --- RENDER FUNCTION ---
    function renderTasks(tasksToRender) {
        donationsContainer.innerHTML = ''; // Clear current cards

        if (tasksToRender.length === 0) {
            noDonationsMsg.classList.remove('d-none');
            return;
        } else {
            noDonationsMsg.classList.add('d-none');
        }

        tasksToRender.forEach(task => {
            const data = task.data;
            const taskId = task.id;

            const imageUrl = data.imageUrl || "https://images.unsplash.com/photo-1498837167922-41c53b4f0f14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

            // Check Expiry State
            const expiryTimeObj = new Date(data.expiryTime);
            const isExpired = expiryTimeObj < new Date();
            const timeDiff = expiryTimeObj - new Date();

            // 4 Hours Expiry Soon threshold
            const isExpiresSoon = !isExpired && timeDiff > 0 && timeDiff <= 4 * 60 * 60 * 1000;

            // Expiry Label details
            const expiryDateStr = expiryTimeObj.toLocaleString();
            let expiryBadgeHTML = '';
            if (isExpired) {
                expiryBadgeHTML = `<span class="badge bg-danger text-white ms-1">Expired</span>`;
            } else if (isExpiresSoon) {
                expiryBadgeHTML = `<span class="badge bg-warning text-dark ms-1">Expires Soon ⏳</span>`;
            }

            const currentStatus = data.status || 'Requested';
            const badgeClass = getStatusBadgeClass(currentStatus);

            // Dynamic Action Button based on status
            let actionButtonHTML = '';
            if (currentStatus === 'Requested') {
                actionButtonHTML = `
                    <button class="btn btn-primary w-100 mt-auto rounded-pill fw-bold" 
                            onclick="acceptDelivery('${taskId}')">
                        Accept Delivery 🚴
                    </button>
                `;
            } else if (currentStatus === 'Volunteer Assigned') {
                actionButtonHTML = `
                    <button class="btn btn-warning text-white w-100 mt-auto rounded-pill fw-bold" 
                            onclick="markPickedUp('${taskId}')">
                        Mark Picked Up 📦
                    </button>
                `;
            } else if (currentStatus === 'Picked Up') {
                actionButtonHTML = `
                    <button class="btn btn-success w-100 mt-auto rounded-pill fw-bold" 
                            onclick="markDelivered('${taskId}')">
                        Mark Delivered 🏁
                    </button>
                `;
            }

            const mapsQuery = encodeURIComponent(data.pickupLocation);
            const mapsURL = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

            const cardHTML = `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm border-0 custom-card overflow-hidden">
                        <img src="${imageUrl}" class="card-img-top object-fit-cover" alt="${data.foodName}" style="height: 220px;">
                        
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title fw-bold mb-0 text-primary">${data.foodName}</h5>
                                <span class="badge ${badgeClass} rounded-pill px-3 py-2">
                                    ${currentStatus}
                                </span>
                            </div>
                            
                            <p class="text-muted small mb-3">
                                <span class="fw-semibold text-dark">Category:</span> ${data.category || 'N/A'}
                            </p>

                            <ul class="list-unstyled mb-2 text-muted">
                                <li class="mb-2"><strong class="text-dark">📦 Quantity:</strong> ${data.quantity} servings</li>
                                <li class="mb-2"><strong class="text-dark">⏳ Expiry:</strong> ${expiryDateStr} ${expiryBadgeHTML}</li>
                                <li class="mb-2"><strong class="text-dark">📍 Location:</strong> ${data.pickupLocation}</li>
                                <li class="mb-2"><strong class="text-dark">👤 Donor:</strong> ${data.donorName} (${data.contactNumber})</li>
                                <li class="mb-2"><strong class="text-dark">🏢 NGO:</strong> ${data.requestedBy || 'N/A'}</li>
                                ${data.volunteerName ? `<li class="mb-2"><strong class="text-dark">🚴 Volunteer:</strong> ${data.volunteerName}</li>` : ''}
                            </ul>

                            <a href="${mapsURL}" target="_blank" class="btn btn-sm btn-outline-secondary w-100 rounded-pill mb-3 fw-bold">
                                📍 Open in Maps
                            </a>

                            ${actionButtonHTML}
                        </div>
                    </div>
                </div>
            `;
            donationsContainer.innerHTML += cardHTML;
        });
    }

    // --- FILTER FUNCTION ---
    function applyFilters() {
        const nameQuery = filterNameInput.value.toLowerCase();
        const locationQuery = filterLocationInput.value.toLowerCase();
        const statusQuery = filterStatusInput.value;

        const filteredTasks = rescueTasks.filter(task => {
            const data = task.data;
            const currentStatus = data.status || 'Requested';

            const matchesName = data.foodName.toLowerCase().includes(nameQuery);
            const matchesLocation = data.pickupLocation.toLowerCase().includes(locationQuery);
            const matchesStatus = statusQuery === "" || currentStatus === statusQuery;

            return matchesName && matchesLocation && matchesStatus;
        });

        renderTasks(filteredTasks);
    }

    // --- ATTACH EVENTS FOR REAL-TIME FILTERING ---
    filterNameInput.addEventListener('input', applyFilters);
    filterLocationInput.addEventListener('input', applyFilters);
    filterStatusInput.addEventListener('change', applyFilters);

    // --- DATABASE FETCH FUNCTION ---
    async function fetchTasksFromFirebase() {
        try {
            loadingSpinner.classList.remove('d-none');
            donationsContainer.innerHTML = '';
            noDonationsMsg.classList.add('d-none');

            const querySnapshot = await getDocs(collection(db, "donations"));
            loadingSpinner.classList.add('d-none');

            allDonations = [];
            rescueTasks = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const record = {
                    id: doc.id,
                    data: data
                };
                allDonations.push(record);

                // We only show items that are Requested, Volunteer Assigned, or Picked Up
                const status = data.status || 'Available';
                if (status === 'Requested' || status === 'Volunteer Assigned' || status === 'Picked Up') {
                    rescueTasks.push(record);
                }
            });

            // Update Counts at the top statically
            updateCounts(allDonations);

            // Render filtered list
            applyFilters();

        } catch (error) {
            console.error("Error fetching tasks: ", error);
            loadingSpinner.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <strong>Error!</strong> Failed to load tasks: ${error.message}
                </div>
            `;
        }
    }

    // Initial fetch
    fetchTasksFromFirebase();

    // ==========================================
    // VOLUNTEER ACTIONS
    // ==========================================

    // 1. Accept Delivery Logic
    window.acceptDelivery = async function (taskId) {
        try {
            const defaultVolunteerName = loggedInUser ? loggedInUser.name : "";
            const volunteerName = prompt("Please enter your name to accept this delivery rescue task:", defaultVolunteerName);
            if (!volunteerName || volunteerName.trim() === "") {
                alert("Task assignment cancelled. Volunteer name is required.");
                return;
            }

            const docRef = doc(db, "donations", taskId);

            // Update status and record volunteer information
            await updateDoc(docRef, {
                status: "Volunteer Assigned",
                volunteerName: volunteerName.trim(),
                assignedAt: serverTimestamp()
            });

            alert(`Awesome! You have accepted this delivery, ${volunteerName.trim()}. Please head to the pickup location!`);

            // Re-fetch data
            await fetchTasksFromFirebase();

        } catch (error) {
            console.error("Error accepting delivery: ", error);
            alert("Error: Could not accept delivery task. " + error.message);
        }
    };

    // 2. Mark Picked Up Logic
    window.markPickedUp = async function (taskId) {
        try {
            const confirmPickup = confirm("Confirm you have picked up the food from the donor?");
            if (!confirmPickup) return;

            const docRef = doc(db, "donations", taskId);

            // Update status to Picked Up
            await updateDoc(docRef, {
                status: "Picked Up",
                pickedUpAt: serverTimestamp()
            });

            alert("Status updated! Food is in transit. Drive safely!");

            // Re-fetch data
            await fetchTasksFromFirebase();

        } catch (error) {
            console.error("Error picking up: ", error);
            alert("Error: Could not update status. " + error.message);
        }
    };

    // 3. Mark Delivered Logic
    window.markDelivered = async function (taskId) {
        try {
            const confirmDelivered = confirm("Confirm you have safely delivered the food to the NGO?");
            if (!confirmDelivered) return;

            const docRef = doc(db, "donations", taskId);

            // Update status to Delivered
            await updateDoc(docRef, {
                status: "Delivered",
                deliveredAt: serverTimestamp()
            });

            alert("Fantastic! Food delivery completed. The NGO will confirm receipt shortly. Thank you!");

            // Re-fetch data
            await fetchTasksFromFirebase();

        } catch (error) {
            console.error("Error delivering: ", error);
            alert("Error: Could not update status. " + error.message);
        }
    };
});
