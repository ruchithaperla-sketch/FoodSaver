/**
 * ngo.js
 * Fetches food donations, handles real-time JavaScript filtering,
 * manages dashboard statistics, and handles NGO actions (Request & Confirm Receipt).
 */

import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { setupLogoutButton, protectPage } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {

    // Setup navbar logout listener
    setupLogoutButton();

    // Monitor authentication session
    let loggedInUser = null;
    protectPage('NGO', (userData) => {
        loggedInUser = userData;
    });

    // Container references
    const donationsContainer = document.getElementById('donations-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noDonationsMsg = document.getElementById('no-donations-msg');

    // Filter Input References
    const filterNameInput = document.getElementById('filter-name');
    const filterCategoryInput = document.getElementById('filter-category');
    const filterLocationInput = document.getElementById('filter-location');
    const filterStatusInput = document.getElementById('filter-status');

    // Array to hold the master list of donations directly from Firebase
    let allDonations = [];

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
    function renderDonations(donationsToRender) {
        donationsContainer.innerHTML = ''; // Clear current cards

        if (donationsToRender.length === 0) {
            noDonationsMsg.classList.remove('d-none');
            return;
        } else {
            noDonationsMsg.classList.add('d-none');
        }

        donationsToRender.forEach(donation => {
            const data = donation.data;
            const donationId = donation.id;

            const imageUrl = data.imageUrl || "https://images.unsplash.com/photo-1498837167922-41c53b4f0f14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

            // Check Expiry State
            const expiryTimeObj = new Date(data.expiryTime);
            const isExpired = expiryTimeObj < new Date();
            const timeDiff = expiryTimeObj - new Date();

            // 4 Hours Expiry Soon threshold
            const isExpiresSoon = !isExpired && timeDiff > 0 && timeDiff <= 4 * 60 * 60 * 1000;

            // Override status in UI if expired
            const currentStatus = isExpired ? 'Expired' : (data.status || 'Available');
            const badgeClass = getStatusBadgeClass(currentStatus);
            const expiryDateStr = expiryTimeObj.toLocaleString();

            let expiryBadgeHTML = '';
            if (isExpired) {
                expiryBadgeHTML = `<span class="badge bg-danger text-white ms-1">Expired</span>`;
            } else if (isExpiresSoon) {
                expiryBadgeHTML = `<span class="badge bg-warning text-dark ms-1">Expires Soon ⏳</span>`;
            }

            // Button rendering based on status
            let actionBtnHTML = '';
            if (currentStatus === 'Available') {
                actionBtnHTML = `
                    <button class="btn btn-outline-primary w-100 mt-auto rounded-pill fw-bold" 
                            onclick="requestFood('${donationId}')">
                        Request Food
                    </button>
                `;
            } else if (currentStatus === 'Expired') {
                actionBtnHTML = `
                    <button class="btn btn-outline-danger w-100 mt-auto rounded-pill fw-bold" disabled>
                        Expired
                    </button>
                `;
            } else if (currentStatus === 'Requested') {
                actionBtnHTML = `
                    <button class="btn btn-secondary w-100 mt-auto rounded-pill fw-bold" disabled>
                        Already Requested
                    </button>
                `;
            } else if (currentStatus === 'Volunteer Assigned') {
                actionBtnHTML = `
                    <button class="btn btn-info text-white w-100 mt-auto rounded-pill fw-bold" disabled>
                        Volunteer Assigned
                    </button>
                `;
            } else if (currentStatus === 'Picked Up') {
                actionBtnHTML = `
                    <button class="btn btn-warning text-white w-100 mt-auto rounded-pill fw-bold" disabled>
                        Picked Up
                    </button>
                `;
            } else if (currentStatus === 'Delivered') {
                if (data.isReceived) {
                    actionBtnHTML = `
                        <button class="btn btn-success w-100 mt-auto rounded-pill fw-bold" disabled>
                            Receipt Confirmed ✅
                        </button>
                    `;
                } else {
                    actionBtnHTML = `
                        <button class="btn btn-success w-100 mt-auto rounded-pill fw-bold" 
                                onclick="confirmReceipt('${donationId}')">
                            Confirm Receipt 🤝
                        </button>
                    `;
                }
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
                                ${data.requestedBy ? `<li class="mb-2"><strong class="text-dark">🏢 NGO:</strong> ${data.requestedBy}</li>` : ''}
                                ${data.volunteerName ? `<li class="mb-2"><strong class="text-dark">🚴 Volunteer:</strong> ${data.volunteerName}</li>` : ''}
                            </ul>

                            <a href="${mapsURL}" target="_blank" class="btn btn-sm btn-outline-secondary w-100 rounded-pill mb-3 fw-bold">
                                📍 Open in Maps
                            </a>

                            ${actionBtnHTML}
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
        const categoryQuery = filterCategoryInput.value;
        const locationQuery = filterLocationInput.value.toLowerCase();
        const statusQuery = filterStatusInput.value;

        const filteredDonations = allDonations.filter(donation => {
            const data = donation.data;
            const isExpired = new Date(data.expiryTime) < new Date();
            const currentStatus = isExpired ? 'Expired' : (data.status || 'Available');

            const matchesName = data.foodName.toLowerCase().includes(nameQuery);
            const matchesCategory = categoryQuery === "" || data.category === categoryQuery;
            const matchesLocation = data.pickupLocation.toLowerCase().includes(locationQuery);
            const matchesStatus = statusQuery === "" || currentStatus === statusQuery;

            return matchesName && matchesCategory && matchesLocation && matchesStatus;
        });

        renderDonations(filteredDonations);
    }

    // --- ATTACH EVENTS FOR REAL-TIME FILTERING ---
    filterNameInput.addEventListener('input', applyFilters);
    filterCategoryInput.addEventListener('change', applyFilters);
    filterLocationInput.addEventListener('input', applyFilters);
    filterStatusInput.addEventListener('change', applyFilters);

    // --- DATABASE FETCH FUNCTION ---
    async function fetchDonationsFromFirebase() {
        try {
            loadingSpinner.classList.remove('d-none');
            donationsContainer.innerHTML = '';
            noDonationsMsg.classList.add('d-none');

            const querySnapshot = await getDocs(collection(db, "donations"));
            loadingSpinner.classList.add('d-none');

            allDonations = [];
            querySnapshot.forEach((doc) => {
                allDonations.push({
                    id: doc.id,
                    data: doc.data()
                });
            });

            // Update Counts statically at top
            updateCounts(allDonations);

            // Apply active filters
            applyFilters();

        } catch (error) {
            console.error("Error fetching donations: ", error);
            loadingSpinner.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <strong>Error!</strong> Failed to load donations: ${error.message}
                </div>
            `;
        }
    }

    // Load data when page loads
    fetchDonationsFromFirebase();

    // --- REQUEST FOOD LOGIC ---
    window.requestFood = async function (donationId) {
        try {
            const defaultNgoName = loggedInUser ? loggedInUser.name : "";
            const ngoName = prompt("Please enter your NGO Name to request this food:", defaultNgoName);
            if (!ngoName || ngoName.trim() === "") {
                alert("Request cancelled. NGO Name is required.");
                return;
            }

            const donationDocRef = doc(db, "donations", donationId);

            // Update Firestore Document status and save requestedBy info
            await updateDoc(donationDocRef, {
                status: "Requested",
                requestedBy: ngoName.trim(),
                requestedAt: serverTimestamp()
            });

            alert(`Success! Donation requested successfully for "${ngoName.trim()}".`);

            // Re-fetch data from Firebase
            await fetchDonationsFromFirebase();

        } catch (error) {
            console.error("Error updating status: ", error);
            alert("Error: Could not request food. " + error.message);
        }
    };

    // --- CONFIRM RECEIPT LOGIC ---
    window.confirmReceipt = async function (donationId) {
        try {
            const confirmDone = confirm("Are you sure you want to confirm receipt of this food donation?");
            if (!confirmDone) return;

            const donationDocRef = doc(db, "donations", donationId);

            // Update Firestore Document to record receipt details
            await updateDoc(donationDocRef, {
                isReceived: true,
                receivedAt: serverTimestamp()
            });

            alert("Success! Receipt confirmed. Thank you for rescuing food!");

            // Re-fetch data from Firebase
            await fetchDonationsFromFirebase();
        } catch (error) {
            console.error("Error confirming receipt: ", error);
            alert("Error: Could not confirm receipt. " + error.message);
        }
    };
});
