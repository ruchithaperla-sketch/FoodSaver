/**
 * donor.js
 * Handles form validation, image upload to Firebase Storage,
 * and saving data to Firebase Firestore using ES Modules.
 */

// Import database
import { db } from './firebase.js';

// Import Firestore functions
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import Auth functions
import { setupLogoutButton, protectPage } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Setup navbar logout listener
    setupLogoutButton();

    let currentDonorName = "";

    // Prefill logged-in donor's name and trigger history loading
    protectPage('Donor', (userData) => {
        currentDonorName = userData.name;
        
        const donorNameInput = document.getElementById('donorName');
        if (donorNameInput && !donorNameInput.value) {
            donorNameInput.value = userData.name;
        }

        const profileNameEl = document.getElementById('donor-profile-name');
        if (profileNameEl) {
            profileNameEl.innerText = userData.name;
        }

        // Load the history list
        loadDonorHistory(userData.name);
    });

    // History rendering function
    async function loadDonorHistory(donorName) {
        const historyContainer = document.getElementById('donor-history-container');
        if (!historyContainer) return;

        try {
            historyContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
            `;
            
            // Fetch donations
            const querySnapshot = await getDocs(collection(db, "donations"));
            
            let totalCount = 0;
            let activeCount = 0;
            const myDonations = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.donorName && data.donorName.toLowerCase() === donorName.toLowerCase()) {
                    myDonations.push({ id: doc.id, data: data });
                    totalCount++;
                    
                    const isExpired = new Date(data.expiryTime) < new Date();
                    const status = isExpired ? 'Expired' : (data.status || 'Available');
                    if (status === 'Available') {
                        activeCount++;
                    }
                }
            });

            // Update sidebar count labels
            if (window.animateValue) {
                window.animateValue('donor-stat-total', 0, totalCount);
                window.animateValue('donor-stat-active', 0, activeCount);
            } else {
                document.getElementById('donor-stat-total').innerText = totalCount;
                document.getElementById('donor-stat-active').innerText = activeCount;
            }

            if (myDonations.length === 0) {
                historyContainer.innerHTML = `
                    <div class="text-center py-5">
                        <div class="display-6 text-muted mb-2">🍲</div>
                        <p class="text-muted mb-0 small">No food donations listed yet.</p>
                    </div>
                `;
                return;
            }

            historyContainer.innerHTML = '';

            // Render cards
            myDonations.forEach(donation => {
                const data = donation.data;
                const img = data.imageUrl || "https://images.unsplash.com/photo-1498837167922-41c53b4f0f14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                
                const isExpired = new Date(data.expiryTime) < new Date();
                const currentStatus = isExpired ? 'Expired' : (data.status || 'Available');
                
                let badgeClass = 'bg-secondary';
                if (currentStatus === 'Available') badgeClass = 'status-available';
                else if (currentStatus === 'Requested') badgeClass = 'status-requested';
                else if (currentStatus === 'Volunteer Assigned') badgeClass = 'status-volunteer-assigned';
                else if (currentStatus === 'Picked Up') badgeClass = 'status-picked-up';
                else if (currentStatus === 'Delivered') badgeClass = 'status-delivered';
                else if (currentStatus === 'Expired') badgeClass = 'status-expired';

                const cardHTML = `
                    <div class="col-md-6 col-12">
                        <div class="card h-100 shadow-sm border-0 custom-card overflow-hidden">
                            <img src="${img}" class="card-img-top object-fit-cover" alt="food" style="height: 120px;">
                            <div class="card-body p-3 d-flex flex-column">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6 class="fw-bold mb-0 text-primary small">${data.foodName}</h6>
                                    <span class="badge ${badgeClass} rounded-pill px-2 py-1" style="font-size: 0.7rem;">
                                        ${currentStatus}
                                    </span>
                                </div>
                                <ul class="list-unstyled mb-0 small text-muted" style="font-size: 0.8rem;">
                                    <li><strong>📦 Qty:</strong> ${data.quantity} servings</li>
                                    <li><strong>⏳ Exp:</strong> ${new Date(data.expiryTime).toLocaleString()}</li>
                                    ${data.requestedBy ? `<li><strong>🏢 NGO:</strong> ${data.requestedBy}</li>` : ''}
                                    ${data.volunteerName ? `<li><strong>🚴 Rider:</strong> ${data.volunteerName}</li>` : ''}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
                historyContainer.innerHTML += cardHTML;
            });

        } catch (error) {
            console.error("Error loading donor history:", error);
            historyContainer.innerHTML = `<p class="text-danger small p-3">Failed to load history: ${error.message}</p>`;
        }
    }

    const donationForm = document.getElementById('donation-form');
    const formAlert = document.getElementById('form-alert');

    if (donationForm) {
        donationForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            // Hide previous alerts
            formAlert.classList.add('d-none');
            formAlert.classList.remove('alert-success', 'alert-danger');

            // HTML5 form validation check
            if (!donationForm.checkValidity()) {
                event.stopPropagation();
                donationForm.classList.add('was-validated');
                return;
            }

            const donorName = document.getElementById('donorName').value.trim();
            const contactNumber = document.getElementById('contactNumber').value.trim();
            const foodName = document.getElementById('foodName').value.trim();
            const quantity = document.getElementById('quantity').value.trim();
            const foodCategory = document.getElementById('foodCategory').value;
            const expiryTime = document.getElementById('expiryTime').value;
            const pickupLocation = document.getElementById('pickupLocation').value.trim();
            const imageUrl = document.getElementById('imageUrl').value.trim();

            try {
                const submitBtn = donationForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = 'Submitting... ⏳';
                submitBtn.disabled = true;

                // Save Data to Firestore
                const docRef = await addDoc(collection(db, "donations"), {
                    donorName: donorName,
                    contactNumber: contactNumber,
                    foodName: foodName,
                    quantity: Number(quantity),
                    category: foodCategory,
                    expiryTime: expiryTime,
                    pickupLocation: pickupLocation,
                    imageUrl: imageUrl,
                    status: "Available",
                    createdAt: serverTimestamp()
                });

                console.log("Document saved to Firestore with ID: ", docRef.id);

                // Success Handling
                formAlert.innerHTML = `<strong>Success!</strong> Donation for <em>${foodName}</em> has been listed.`;
                formAlert.classList.remove('d-none');
                formAlert.classList.add('alert-success');
                window.showToast(`Donation for "${foodName}" listed successfully! 🍲`, "success");

                // Clear the form
                donationForm.reset();
                donationForm.classList.remove('was-validated');
                
                // Prefill donor name again
                if (currentDonorName) {
                    document.getElementById('donorName').value = currentDonorName;
                }

                // Restore button
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;

                // Reload the listing history
                loadDonorHistory(donorName);

            } catch (error) {
                console.error("Error during submission: ", error);
                formAlert.innerHTML = `<strong>Error!</strong> Something went wrong: ${error.message}`;
                formAlert.classList.remove('d-none');
                formAlert.classList.add('alert-danger');
                window.showToast(`Error: ${error.message}`, "danger");

                // Restore button
                const submitBtn = donationForm.querySelector('button[type="submit"]');
                submitBtn.innerHTML = 'Submit Donation';
                submitBtn.disabled = false;
            }

            // Scroll to alert
            formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
});
