/**
 * admin.js
 * Admin dashboard logic to fetch, update status, and delete Firestore documents.
 * Also calculates and displays system statistics.
 */

// 1. Import database
import { db } from './firebase.js';

// 2. Import required Firestore functions
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // UI Elements
    const tableBody = document.getElementById('admin-table-body');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noDataMsg = document.getElementById('no-data-msg');

    // Statistic Elements
    const statTotal = document.getElementById('stat-total');
    const statDelivered = document.getElementById('stat-delivered');
    const statExpired = document.getElementById('stat-expired');

    // Array to temporarily hold donation IDs and statuses for the "Clear Expired" feature
    let allDonations = [];

    // Main function to fetch data and build the table
    async function loadAdminData() {
        try {
            // Reset UI and stats before loading
            tableBody.innerHTML = '';
            loadingSpinner.classList.remove('d-none');
            noDataMsg.classList.add('d-none');
            allDonations = [];

            let totalCount = 0;
            let deliveredCount = 0;
            let expiredCount = 0;

            // Fetch all donations from Firestore
            const querySnapshot = await getDocs(collection(db, "donations"));
            loadingSpinner.classList.add('d-none');

            if (querySnapshot.empty) {
                noDataMsg.classList.remove('d-none');
                return; // Stop if no data
            }

            // Loop through each donation document
            querySnapshot.forEach((documentSnapshot) => {
                const data = documentSnapshot.data();
                const id = documentSnapshot.id;
                const status = data.status || 'Available';

                // Save minimal info to our array for bulk actions
                allDonations.push({ id: id, status: status });

                // Calculate statistics based on status
                totalCount++;
                if (status === 'Delivered') deliveredCount++;
                if (status === 'Expired') expiredCount++;

                // Fallback image handling
                const imageUrl = data.imageUrl || "https://images.unsplash.com/photo-1498837167922-41c53b4f0f14?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";
                const expiryDate = new Date(data.expiryTime).toLocaleString();

                // Build a dynamic select dropdown so Admin can quickly change the status
                const statusOptions = ['Available', 'Requested', 'Volunteer Assigned', 'Picked Up', 'Delivered', 'Expired'];
                let selectHTML = `<select class="form-select form-select-sm status-dropdown" data-id="${id}">`;
                statusOptions.forEach(opt => {
                    // Mark the current status as the 'selected' option in the dropdown
                    const isSelected = (opt === status) ? 'selected' : '';
                    selectHTML += `<option value="${opt}" ${isSelected}>${opt}</option>`;
                });
                selectHTML += `</select>`;

                // Create a new Table Row (tr) element
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="ps-4 py-3">
                        <img src="${imageUrl}" alt="Food" class="rounded object-fit-cover shadow-sm" style="width: 65px; height: 65px;">
                    </td>
                    <td class="py-3">
                        <h6 class="mb-1 fw-bold text-primary">${data.foodName}</h6>
                        <small class="text-muted d-block">${data.category} • ${data.quantity} Qty</small>
                        <small class="text-danger">Exp: ${expiryDate}</small>
                    </td>
                    <td class="py-3">
                        <span class="fw-semibold text-dark">${data.donorName}</span><br>
                        <small class="text-muted">${data.contactNumber}</small>
                    </td>
                    <td class="py-3" style="width: 180px;">
                        ${selectHTML}
                    </td>
                    <td class="pe-4 py-3 text-end">
                        <button class="btn btn-sm btn-outline-danger fw-bold rounded-pill px-3" onclick="deleteDonation('${id}')">Delete</button>
                    </td>
                `;

                // Add the row to the table body
                tableBody.appendChild(tr);
            });

            // Update the giant Statistic Cards at the top of the page
            statTotal.innerText = totalCount;
            statDelivered.innerText = deliveredCount;
            statExpired.innerText = expiredCount;

            // --- Add Event Listeners to our generated Status Dropdowns ---
            const dropdowns = document.querySelectorAll('.status-dropdown');
            dropdowns.forEach(dropdown => {
                dropdown.addEventListener('change', async (event) => {
                    // When an admin selects a new option, update Firestore!
                    const donationId = event.target.getAttribute('data-id');
                    const newStatus = event.target.value;
                    await updateDonationStatus(donationId, newStatus);
                });
            });

        } catch (error) {
            console.error("Error loading admin data: ", error);
            loadingSpinner.innerHTML = `<p class="text-danger fw-bold">Error loading data: ${error.message}</p>`;
        }
    }

    // Load data initially when the script runs
    loadAdminData();

    // ==========================================
    // ADMIN ACTION FUNCTIONS
    // ==========================================

    // 1. Update Status Function
    async function updateDonationStatus(donationId, newStatus) {
        try {
            // Get a reference to the specific document
            const docRef = doc(db, "donations", donationId);
            // Update the document in Firestore
            await updateDoc(docRef, { status: newStatus });

            // Reload the table to reflect the new statistics (e.g. Total Delivered goes up)
            loadAdminData();
        } catch (error) {
            alert("Failed to update status: " + error.message);
        }
    }

    // 2. Delete Single Donation Function
    // Attached to window so the HTML onclick="deleteDonation()" can access it
    window.deleteDonation = async function (donationId) {
        const confirmDelete = confirm("Are you sure you want to permanently delete this donation?");
        if (!confirmDelete) return;

        try {
            // Delete the document from Firestore
            await deleteDoc(doc(db, "donations", donationId));

            // Refresh table and stats
            loadAdminData();
        } catch (error) {
            alert("Failed to delete donation: " + error.message);
        }
    };

    // 3. Remove ALL Expired Food Function
    // Attached to window for the top "Clear All Expired" button
    window.removeExpiredDonations = async function () {
        // Filter our array to find only the IDs of donations marked as 'Expired'
        const expiredIds = allDonations.filter(d => d.status === 'Expired').map(d => d.id);

        if (expiredIds.length === 0) {
            alert("There are no donations currently marked as 'Expired' to remove.");
            return;
        }

        const confirmClear = confirm(`Are you sure you want to permanently delete ${expiredIds.length} expired donation(s)?`);
        if (!confirmClear) return;

        try {
            // Loop through and delete each expired document
            for (let id of expiredIds) {
                await deleteDoc(doc(db, "donations", id));
            }
            alert(`Successfully removed ${expiredIds.length} expired donation(s).`);

            // Refresh table and stats
            loadAdminData();
        } catch (error) {
            alert("Error removing expired donations: " + error.message);
        }
    };
});
