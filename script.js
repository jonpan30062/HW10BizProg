// Global variables
let map;
let markers = {};
let statusChart;
let deliveriesData = {};
let updateTimeout = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeChart();
    setupFormHandler();
    listenToDeliveries();
});

// Initialize Leaflet Map
function initializeMap() {
    // Center map on US (you can change this to any location)
    map = L.map('map').setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// Initialize Chart.js
function initializeChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'In Transit', 'Delivered', 'Cancelled'],
            datasets: [{
                label: 'Delivery Status',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#ffc107',
                    '#17a2b8',
                    '#28a745',
                    '#dc3545'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Delivery Status Distribution',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Setup form submission handler
function setupFormHandler() {
    const form = document.getElementById('deliveryForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addDelivery();
    });
}

// Add new delivery to Firebase
function addDelivery() {
    const submitBtn = document.querySelector('.btn');
    const originalText = submitBtn.textContent;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    submitBtn.style.opacity = '0.6';

    const packageId = document.getElementById('packageId').value;
    const customerName = document.getElementById('customerName').value;
    const driverName = document.getElementById('driverName').value;
    const destination = document.getElementById('destination').value;
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const status = document.getElementById('status').value;

    const deliveryData = {
        packageId: packageId,
        customerName: customerName,
        driverName: driverName,
        destination: destination,
        latitude: latitude,
        longitude: longitude,
        status: status,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    // Push to Firebase
    const newDeliveryRef = database.ref('deliveries').push();
    newDeliveryRef.set(deliveryData)
        .then(() => {
            console.log('Delivery added successfully!');
            // Reset form
            document.getElementById('deliveryForm').reset();
            // Show success feedback
            submitBtn.textContent = 'Added!';
            submitBtn.style.backgroundColor = '#28a745';

            // Reset button after 2 seconds
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.style.backgroundColor = '';
            }, 2000);
        })
        .catch((error) => {
            console.error('Error adding delivery:', error);
            submitBtn.textContent = 'Error!';
            submitBtn.style.backgroundColor = '#dc3545';

            // Reset button after 3 seconds
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.style.backgroundColor = '';
            }, 3000);
        });
}

// Listen to real-time database changes
function listenToDeliveries() {
    const deliveriesRef = database.ref('deliveries');

    // Listen for child added
    deliveriesRef.on('child_added', function(snapshot) {
        const deliveryId = snapshot.key;
        const deliveryData = snapshot.val();
        deliveriesData[deliveryId] = deliveryData;
        updateUI();
    });

    // Listen for child changed
    deliveriesRef.on('child_changed', function(snapshot) {
        const deliveryId = snapshot.key;
        const deliveryData = snapshot.val();
        deliveriesData[deliveryId] = deliveryData;
        updateUI();
    });

    // Listen for child removed
    deliveriesRef.on('child_removed', function(snapshot) {
        const deliveryId = snapshot.key;
        delete deliveriesData[deliveryId];
        updateUI();
    });
}

// Update the entire UI (called when data changes)
// Throttled to prevent too many rapid updates
function updateUI() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        updateDeliveryList();
        updateMap();
        updateStatistics();
        updateChart();
    }, 100); // Wait 100ms before updating
}

// Update delivery list display
function updateDeliveryList() {
    const deliveryList = document.getElementById('deliveryList');

    if (Object.keys(deliveriesData).length === 0) {
        deliveryList.innerHTML = '<div class="loading">No deliveries yet. Add one using the form above!</div>';
        return;
    }

    let html = '';

    // Sort deliveries by timestamp (most recent first)
    const sortedDeliveries = Object.entries(deliveriesData).sort((a, b) => {
        return new Date(b[1].timestamp) - new Date(a[1].timestamp);
    });

    sortedDeliveries.forEach(([id, delivery]) => {
        const statusClass = delivery.status.toLowerCase().replace(' ', '-');
        const date = new Date(delivery.timestamp).toLocaleString();

        html += `
            <div class="delivery-card">
                <div class="delivery-header">
                    <div class="delivery-id">${delivery.packageId}</div>
                    <div class="status-badge status-${statusClass}">${delivery.status}</div>
                </div>
                <div class="delivery-details">
                    <div class="delivery-detail">
                        <span class="detail-label">Customer</span>
                        <span class="detail-value">${delivery.customerName}</span>
                    </div>
                    <div class="delivery-detail">
                        <span class="detail-label">Driver</span>
                        <span class="detail-value">${delivery.driverName}</span>
                    </div>
                    <div class="delivery-detail">
                        <span class="detail-label">Destination</span>
                        <span class="detail-value">${delivery.destination}</span>
                    </div>
                    <div class="delivery-detail">
                        <span class="detail-label">Coordinates</span>
                        <span class="detail-value">${delivery.latitude.toFixed(4)}, ${delivery.longitude.toFixed(4)}</span>
                    </div>
                    <div class="delivery-detail">
                        <span class="detail-label">Created</span>
                        <span class="detail-value">${date}</span>
                    </div>
                </div>
            </div>
        `;
    });

    deliveryList.innerHTML = html;
}

// Update map with delivery markers
function updateMap() {
    // Clear existing markers
    Object.values(markers).forEach(marker => {
        map.removeLayer(marker);
    });
    markers = {};

    // Add new markers
    Object.entries(deliveriesData).forEach(([id, delivery]) => {
        const lat = delivery.latitude;
        const lng = delivery.longitude;

        // Choose marker color based on status
        let markerColor;
        switch(delivery.status) {
            case 'Pending':
                markerColor = 'orange';
                break;
            case 'In Transit':
                markerColor = 'blue';
                break;
            case 'Delivered':
                markerColor = 'green';
                break;
            case 'Cancelled':
                markerColor = 'red';
                break;
            default:
                markerColor = 'gray';
        }

        // Create custom icon
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [25, 25]
        });

        // Create marker
        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);

        // Create popup content
        const popupContent = `
            <div style="font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: #667eea;">${delivery.packageId}</h3>
                <p style="margin: 5px 0;"><strong>Customer:</strong> ${delivery.customerName}</p>
                <p style="margin: 5px 0;"><strong>Driver:</strong> ${delivery.driverName}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${delivery.status}</p>
                <p style="margin: 5px 0;"><strong>Destination:</strong> ${delivery.destination}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        markers[id] = marker;
    });

    // Fit map bounds to show all markers
    if (Object.keys(markers).length > 0) {
        const group = L.featureGroup(Object.values(markers));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Update statistics display
function updateStatistics() {
    const total = Object.keys(deliveriesData).length;
    let pending = 0, inTransit = 0, delivered = 0, cancelled = 0;

    Object.values(deliveriesData).forEach(delivery => {
        switch(delivery.status) {
            case 'Pending':
                pending++;
                break;
            case 'In Transit':
                inTransit++;
                break;
            case 'Delivered':
                delivered++;
                break;
            case 'Cancelled':
                cancelled++;
                break;
        }
    });

    document.getElementById('totalDeliveries').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('inTransitCount').textContent = inTransit;
    document.getElementById('deliveredCount').textContent = delivered;
}

// Update chart with new data
function updateChart() {
    let pending = 0, inTransit = 0, delivered = 0, cancelled = 0;

    Object.values(deliveriesData).forEach(delivery => {
        switch(delivery.status) {
            case 'Pending':
                pending++;
                break;
            case 'In Transit':
                inTransit++;
                break;
            case 'Delivered':
                delivered++;
                break;
            case 'Cancelled':
                cancelled++;
                break;
        }
    });

    // Update chart data
    statusChart.data.datasets[0].data = [pending, inTransit, delivered, cancelled];
    statusChart.update();
}

// Sample data generator (optional - for testing)
function addSampleDeliveries() {
    const sampleDeliveries = [
        {
            packageId: 'PKG-001',
            customerName: 'John Doe',
            driverName: 'Alice Johnson',
            destination: '123 Main St, New York, NY',
            latitude: 40.7128,
            longitude: -74.0060,
            status: 'In Transit'
        },
        {
            packageId: 'PKG-002',
            customerName: 'Jane Smith',
            driverName: 'Bob Williams',
            destination: '456 Oak Ave, Los Angeles, CA',
            latitude: 34.0522,
            longitude: -118.2437,
            status: 'Delivered'
        },
        {
            packageId: 'PKG-003',
            customerName: 'Mike Brown',
            driverName: 'Carol Davis',
            destination: '789 Pine Rd, Chicago, IL',
            latitude: 41.8781,
            longitude: -87.6298,
            status: 'Pending'
        }
    ];

    sampleDeliveries.forEach(delivery => {
        const deliveryData = {
            ...delivery,
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        database.ref('deliveries').push().set(deliveryData);
    });
}

// Uncomment the line below to add sample data (run once)
// addSampleDeliveries();
