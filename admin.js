// Supabase Configuration
const SUPABASE_URL = 'https://goumsgdcyopzqbkrhxpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdW1zZ2RjeW9wenFia3JoeHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNTYsImV4cCI6MjA4NzY4MzA1Nn0.xgAghgMcptEhiCCuAIyIV32tLpv5qfG69bi1ZBiSA2w';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global raw data storage
let receiptData = [];

// Fetch data on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data, error } = await supabaseClient
            .from('receipt')
            .select('*')
            .order('created_at', { ascending: false });

        document.getElementById('loading').style.display = 'none';

        if (error) {
            throw error;
        }

        receiptData = data;

        if (receiptData && receiptData.length > 0) {
            renderTable(receiptData);
            document.getElementById('receipts-table').style.display = 'table';
        } else {
            document.getElementById('empty-state').style.display = 'block';
            document.querySelector('.btn-primary').disabled = true; // Disable export if empty
        }

    } catch (err) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Error fetching data from Supabase: ' + err.message;
        console.error("Supabase fetch error:", err);
    }
});

// Render table HTML
function renderTable(data) {
    const tbody = document.getElementById('receipts-tbody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');

        // Format timestamp for display
        const dateObj = new Date(row.created_at);
        const createdFormatted = dateObj.toLocaleString();

        tr.innerHTML = `
            <td>${row.id || '-'}</td>
            <td>${row.date || '-'}</td>
            <td><strong>${row.invoice_no || '-'}</strong></td>
            <td>${row.so_no || '-'}</td>
            <td>$${parseFloat(row.total_amount).toFixed(2)}</td>
            <td>${createdFormatted}</td>
        `;

        tbody.appendChild(tr);
    });
}

// Group data by Month using logic
function groupDataByMonth(data) {
    const grouped = {};

    data.forEach(row => {
        // We will group by the 'date' field, or created_at if date is empty
        let dateToParse = row.created_at;

        // Try to parse the user-provided "Date" string from the receipt if it exists
        // E.g. "January 14, 2026", "01/14/2026", "2026-01-14"
        if (row.date) {
            const parsed = new Date(row.date);
            // Check if it's a valid date
            if (!isNaN(parsed.getTime())) {
                dateToParse = row.date;
            }
        }

        const dateObj = new Date(dateToParse);

        if (isNaN(dateObj.getTime())) {
            // Unparseable, lump into "Unknown"
            if (!grouped["Unknown Date"]) grouped["Unknown Date"] = [];
            grouped["Unknown Date"].push(row);
            return;
        }

        // Format to "Month Year" (e.g., "January 2026")
        const monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (!grouped[monthYear]) {
            grouped[monthYear] = [];
        }
        grouped[monthYear].push(row);
    });

    return grouped;
}

// Export parsed data to Multi-Sheet Excel via SheetJS
function exportToExcel() {
    if (!receiptData || receiptData.length === 0) {
        alert("No data available to export.");
        return;
    }

    // Group the raw data
    const groupedData = groupDataByMonth(receiptData);

    // Create a new Workbook
    const wb = XLSX.utils.book_new();

    // Loop through each grouped Month
    for (const [monthYear, records] of Object.entries(groupedData)) {

        // Map the records to a cleaner array of objects for Excel columns
        const excelData = records.map(record => ({
            "System ID": record.id,
            "Invoice Date": record.date,
            "Invoice Number": record.invoice_no,
            "S/O Number": record.so_no,
            "Total Amount (USD)": record.total_amount,
            "Logged At": new Date(record.created_at).toLocaleString()
        }));

        // Convert the array of objects to a Sheet
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Name of the sheet can't have certain special chars and max 31 chars
        // "January 2026" is perfectly valid. "Unknown Date" also fine.
        let safeSheetName = monthYear.substring(0, 31).replace(/[\\/*?:[\]]/g, '');

        // Append the sheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }

    // Trigger download
    XLSX.writeFile(wb, "Qualicare_Receipts_Report.xlsx");
}
