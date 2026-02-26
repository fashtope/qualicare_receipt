// Function to add a new custom row to the table
function addRow() {
    const tbody = document.getElementById('items-body');
    const tr = document.createElement('tr');
    tr.className = 'item-row custom-item';
    
    tr.innerHTML = `
        <td contenteditable="true">Enter Item Description...</td>
        <td><input type="number" class="amount-input" oninput="calculateTotals()" placeholder="0.00"></td>
        <td class="col-action no-print"><button class="remove-btn" onclick="removeRow(this)">X</button></td>
    `;
    
    tbody.appendChild(tr);
    calculateTotals();
}

// Function to remove a row
function removeRow(btn) {
    const row = btn.closest('tr');
    row.remove();
    calculateTotals();
}

// Function to calculate subtotals and grand total
function calculateTotals() {
    const amountInputs = document.querySelectorAll('.amount-input');
    let subtotal = 0;
    
    amountInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) {
            subtotal += val;
        }
    });
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    
    const vatInput = document.getElementById('vat-input').value;
    const vat = parseFloat(vatInput) || 0;
    
    const grandTotal = subtotal + vat;
    document.getElementById('grand-total').textContent = grandTotal.toFixed(2);
}

// Function to handle logo upload locally to view in preview
function uploadLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logo-img').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

// Initial calculation
calculateTotals();
