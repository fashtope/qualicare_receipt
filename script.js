// Supabase Configuration
const SUPABASE_URL = 'https://goumsgdcyopzqbkrhxpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdW1zZ2RjeW9wenFia3JoeHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNTYsImV4cCI6MjA4NzY4MzA1Nn0.xgAghgMcptEhiCCuAIyIV32tLpv5qfG69bi1ZBiSA2w';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        reader.onload = function (e) {
            document.getElementById('logo-img').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

// Initial calculation
calculateTotals();

// Function to validate that required fields are filled
function getValidationMissingFields() {
    const missingFields = [];

    if (!document.getElementById('date-input').value.trim()) missingFields.push('Date');
    if (!document.getElementById('invoice-no-input').value.trim()) missingFields.push('Invoice No');
    if (!document.getElementById('so-no-input').value.trim()) missingFields.push('S/O No');
    if (!document.getElementById('service-type-select').value.trim()) missingFields.push('Service Type');
    if (!document.getElementById('tin-no-input').value.trim()) missingFields.push('TIN No');

    let hasItem = false;
    const amountInputs = document.querySelectorAll('.amount-input');
    amountInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0 && input.value.trim() !== '') {
            hasItem = true;
        }
    });

    if (!hasItem) missingFields.push('At least one Item Amount');

    return missingFields;
}

// Function triggered by print button
async function printInvoice() {
    const missingFields = getValidationMissingFields();
    if (missingFields.length > 0) {
        alert('Cannot Print Document. Please fill in the following required fields:\n- ' + missingFields.join('\n- '));
        return; // Stop execution, do not open print dialog
    }

    // Gather data for Supabase
    const invoiceNo = document.getElementById('invoice-no-input').value.trim();
    const soNo = document.getElementById('so-no-input').value.trim();
    const date = document.getElementById('date-input').value.trim();
    // Grand total is in a td, so we read textContent
    const totalAmount = document.getElementById('grand-total').textContent;

    try {
        // Optional: show a loading state on the print button
        const printBtn = document.querySelector('button[onclick="printInvoice()"]');
        const originalText = printBtn.textContent;
        printBtn.textContent = '💾 Saving to Database...';
        printBtn.disabled = true;

        // Save to Supabase
        const { data, error } = await supabaseClient
            .from('receipt')
            .insert([
                {
                    invoice_no: invoiceNo,
                    so_no: soNo,
                    date: date,
                    total_amount: parseFloat(totalAmount)
                }
            ]);

        // Restore button state
        printBtn.textContent = originalText;
        printBtn.disabled = false;

        if (error) {
            console.error("Supabase Insert Error:", error);
            alert("Failed to save invoice to the database.\nError: " + error.message);
            return; // Don't print if saving failed
        }

        // If save is successful, trigger print
        console.log("Successfully saved invoice to Supabase!");
        window.print();
    } catch (err) {
        console.error("Unexpected error:", err);
        alert("An unexpected error occurred while saving to the database.");
    }
}

// Function to handle printing logic before window prints (in case they use Ctrl+P directly)
window.addEventListener('beforeprint', () => {
    // Check validation for native Ctrl+P prints
    const missingFields = getValidationMissingFields();
    if (missingFields.length > 0) {
        document.body.classList.add('print-invalid');
    } else {
        document.body.classList.remove('print-invalid');
    }

    // Hide empty item rows
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const input = row.querySelector('.amount-input');
        if (input) {
            const val = parseFloat(input.value);
            // Hide row if value is invalid, zero, or empty
            if (isNaN(val) || val === 0 || input.value.trim() === '') {
                row.classList.add('hide-on-print');
            } else {
                row.classList.remove('hide-on-print');
            }
        }
    });

    // Hide VAT row if empty
    const vatInput = document.getElementById('vat-input');
    if (vatInput) {
        const vatVal = parseFloat(vatInput.value);
        if (isNaN(vatVal) || vatVal === 0 || vatInput.value.trim() === '') {
            vatInput.closest('tr').classList.add('hide-on-print');
        } else {
            vatInput.closest('tr').classList.remove('hide-on-print');
        }
    }

    // Style select dropdown for print
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.style.appearance = 'none';
        select.style.border = 'none';
    });
});

window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-invalid');
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.style.appearance = 'auto'; // Back to standard appearance
        select.style.borderBottom = '1px dotted #ccc';
    });
});
