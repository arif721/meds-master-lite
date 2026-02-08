import { SampleWithLines } from '@/pages/Samples';
import { formatDateOnly, formatTimeWithSeconds, formatCurrency } from '@/lib/format';

function getName(list: { id: string; name: string }[], id: string | null) {
  return id ? list.find(x => x.id === id)?.name || '' : '';
}

export function exportSamplesCSV(
  samples: SampleWithLines[],
  products: { id: string; name: string }[],
  stores: { id: string; name: string }[],
  customers: { id: string; name: string }[],
  sellers: { id: string; name: string }[],
) {
  const header = 'Sample #,Date,Time,Store,Customer,Seller,Receiver,Items,TP Value,Cost Value,Status,Notes\n';
  const rows = samples.map(s => {
    const costVal = s.lines.reduce((sum, l) => sum + l.cost_price * l.quantity, 0);
    return [
      s.sample_number,
      formatDateOnly(s.sale_date_time),
      formatTimeWithSeconds(s.sale_date_time),
      getName(stores, s.store_id),
      getName(customers, s.customer_id),
      getName(sellers, s.seller_id),
      s.receiver_name || '',
      s.lines.length,
      s.total_value.toFixed(2),
      costVal.toFixed(2),
      s.status,
      (s.notes || '').replace(/,/g, ';'),
    ].join(',');
  }).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `samples-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSamplesPDF(
  samples: SampleWithLines[],
  products: { id: string; name: string }[],
  stores: { id: string; name: string }[],
  customers: { id: string; name: string }[],
  sellers: { id: string; name: string }[],
) {
  const totalTP = samples.reduce((s, x) => s + x.total_value, 0);
  const totalCost = samples.reduce((s, x) => s + x.lines.reduce((ls, l) => ls + l.cost_price * l.quantity, 0), 0);

  const rows = samples.map(s => {
    const costVal = s.lines.reduce((sum, l) => sum + l.cost_price * l.quantity, 0);
    const to = getName(stores, s.store_id) || getName(customers, s.customer_id) || s.receiver_name || 'N/A';
    return `<tr>
      <td>${s.sample_number}</td>
      <td>${formatDateOnly(s.sale_date_time)}</td>
      <td>${to}</td>
      <td>${getName(sellers, s.seller_id) || '—'}</td>
      <td style="text-align:right">${s.lines.length}</td>
      <td style="text-align:right">${formatCurrency(s.total_value)}</td>
      <td style="text-align:right">${formatCurrency(costVal)}</td>
      <td>${s.status}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>Samples Report</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px}th{background:#f5f5f5;text-align:left}h2{margin:0}
    .summary{display:flex;gap:20px;margin-top:10px;font-size:13px}.summary b{color:#333}</style>
    </head><body>
    <h2>Samples Report</h2>
    <p style="color:#666;font-size:12px">Generated: ${new Date().toLocaleString()}</p>
    <div class="summary"><span>Total: <b>${samples.length}</b> samples</span><span>TP Value: <b>${formatCurrency(totalTP)}</b></span><span>Cost: <b>${formatCurrency(totalCost)}</b></span></div>
    <table><thead><tr><th>Sample #</th><th>Date</th><th>To</th><th>Seller</th><th>Items</th><th>TP Value</th><th>Cost</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
