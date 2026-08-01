import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatIST } from '../utils/formatIST';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

export default function PrintReceipt() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Try localStorage first (instant — set by Billing/QuickBill on same device)
    try {
      const cached = localStorage.getItem('print_order_' + orderId);
      if (cached) {
        setOrder(JSON.parse(cached));
        return;
      }
    } catch (e) {}

    // 2. Fallback: fetch from API (works because fetchData() already warmed up Render on app load)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    axios.get(`${API_URL}/orders/${orderId}`, { signal: controller.signal })
      .then(res => { clearTimeout(timeout); setOrder(res.data); })
      .catch(err => {
        clearTimeout(timeout);
        setError(err.code === 'ERR_CANCELED'
          ? 'Server timeout. Please try printing again.'
          : 'Could not load order. Check connection and retry.');
      });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [orderId]);

  useEffect(() => {
    if (restaurant) return;
    try {
      const cached = localStorage.getItem('print_restaurant');
      if (cached) { setRestaurant(JSON.parse(cached)); return; }
    } catch (e) {}
    axios.get(`${API_URL}/restaurant`).then(res => setRestaurant(res.data)).catch(() => {});
  }, [restaurant]);

  // Auto-print once order data is fully loaded and DOM is updated
  useEffect(() => {
    if (order) {
      const timer = setTimeout(() => {
        window.focus();
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (error) {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '8px', color: '#000' }}>
        <strong>Error:</strong> {error}<br />
        Order ID: #{orderId}<br /><br />
        <button onClick={() => window.location.reload()} style={{ padding: '6px 14px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '12px', color: '#000', textAlign: 'center' }}>
        Loading receipt #{orderId}...
      </div>
    );
  }

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || 0);
  const tax = Number(order.tax_amount || 0);
  const total = Number(order.total_amount || (subtotal - discount + tax));

  /* ── Inline styles (work even if Tailwind/CSS bundle is not loaded in iframe) ── */
  const font = "'Courier New', Courier, monospace";
  const S = {
    page:     { fontFamily: font, fontSize: '12px', lineHeight: '1.3', color: '#000', background: '#fff', width: '65mm', margin: '0 auto', padding: '0 1mm', boxSizing: 'border-box' },
    center:   { textAlign: 'center' },
    bold:     { fontWeight: 'bold' },
    dash:     { borderTop: '1px dashed #000', margin: '6px 0' },
    solid:    { borderTop: '1px solid #000', margin: '5px 0' },
    row:      { display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '11px' },
    hdr:      { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' },
    colName:  { flex: '1', paddingRight: '4px', overflow: 'hidden' },
    colQty:   { width: '20px', textAlign: 'center', flexShrink: 0 },
    colRate:  { width: '38px', textAlign: 'right', flexShrink: 0 },
    colAmt:   { width: '42px', textAlign: 'right', flexShrink: 0, fontWeight: 'bold' },
    totalRow: { display: 'flex', justifyContent: 'flex-end', gap: '6px', fontSize: '11px', marginBottom: '3px' },
    lbl:      { width: '80px', textAlign: 'right' },
    val:      { width: '55px', textAlign: 'right', fontWeight: 'bold' },
    noprint:  { marginTop: '18px', textAlign: 'center' },
  };

  return (
    <>
      {/* ── 70mm Thermal Print CSS ── */}
      <style>{`
        @page {
          size: 70mm auto !important;
          margin: 0mm !important;
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: 70mm !important;
        }
        @media screen {
          body {
            max-width: 70mm;
            margin: 20px auto;
            border: 1px dashed #ccc;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
        }
        @media print {
          .no-print { display: none !important; }
          html, body {
            width: 70mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div style={S.page}>
        {/* ── Unpaid Watermark / Header ── */}
        {(order.status === 'open' || order.is_estimate || order.payment_type === 'ESTIMATE / UNPAID') && (
          <div style={{ ...S.center, ...S.bold, fontSize: '11px', background: '#000', color: '#fff', padding: '3px 0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            *** Unpaid Bill / Estimate ***
          </div>
        )}
        {/* ── Restaurant Header ── */}
        <div style={S.center}>
          <div style={{ ...S.bold, fontSize: '14px', letterSpacing: '0.5px' }}>
            {restaurant?.name || 'Restaurant'}
          </div>
          {restaurant?.address && <div style={{ fontSize: '10px', marginTop: '1px' }}>{restaurant.address}</div>}
          {restaurant?.phone   && <div style={{ fontSize: '10px' }}>Ph: {restaurant.phone}</div>}
          {restaurant?.gst     && <div style={{ fontSize: '10px', fontWeight: 'bold' }}>GSTIN: {restaurant.gst}</div>}
        </div>

        <div style={S.dash} />

        {/* ── Bill Meta ── */}
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          <div style={S.row}><span style={S.bold}>Bill No:</span>    <span>#{order.id}</span></div>
          <div style={S.row}><span style={S.bold}>Date:</span>       <span>{formatIST(order.created_at)}</span></div>
          <div style={S.row}><span style={S.bold}>Type:</span>       <span>{(order.order_type || 'dine_in').replace('_', ' ').toUpperCase()}</span></div>
          {order.table_number    && <div style={S.row}><span style={S.bold}>Table:</span>     <span>{order.table_number}</span></div>}
          {order.customer_name   && <div style={S.row}><span style={S.bold}>Customer:</span>  <span>{order.customer_name}</span></div>}
          {order.waiter_name     && <div style={S.row}><span style={S.bold}>Served by:</span> <span>{order.waiter_name}</span></div>}
        </div>

        <div style={S.dash} />

        {/* ── Items Header ── */}
        <div style={S.hdr}>
          <span style={S.colName}>Item</span>
          <span style={S.colQty}>Qty</span>
          <span style={S.colRate}>Rate</span>
          <span style={S.colAmt}>Amt</span>
        </div>
        <div style={S.solid} />

        {/* ── Items ── */}
        {(() => {
          let printedSubtotal = 0;
          let totalItemDiscount = 0;

          const renderedItems = (order.items || []).map(item => {
            const originalRate = Number(item.price || 0);
            const qty  = Number(item.quantity || 1);
            const itemDiscount = Number(item.discount_amount || 0);
            const itemNetAmt = (originalRate * qty) - itemDiscount;
            const itemNetRate = itemNetAmt / qty;

            printedSubtotal += itemNetAmt;
            totalItemDiscount += itemDiscount;

            return (
              <div key={item.id} style={{ marginBottom: '3px' }}>
                <div style={S.row}>
                  <span style={S.colName}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                      {item.name}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#222', marginTop: '1px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                        * {item.notes}
                      </div>
                    )}
                  </span>
                  <span style={S.colQty}>{qty}</span>
                  <span style={S.colRate}>{itemNetRate.toFixed(0)}</span>
                  <span style={S.colAmt}>{itemNetAmt.toFixed(0)}</span>
                </div>
              </div>
            );
          });

          const overallDiscount = Number(order.discount_amount || 0);
          const grossSubtotal = printedSubtotal + totalItemDiscount;
          const foodDiscountPercent = grossSubtotal > 0 
            ? Math.round((totalItemDiscount / grossSubtotal) * 100) 
            : 0;
          const billDiscountPercent = printedSubtotal > 0 
            ? Math.round((overallDiscount / printedSubtotal) * 100) 
            : 0;

          return (
            <>
              {renderedItems}
              <div style={S.dash} />
              {/* ── Totals ── */}
              <div style={{ marginBottom: '4px' }}>
                <div style={S.totalRow}>
                  <span style={S.lbl}>Subtotal</span>
                  <span style={S.val}>Rs.{printedSubtotal.toFixed(2)}</span>
                </div>
                {totalItemDiscount > 0 && (
                  <div style={S.totalRow}>
                    <span style={S.lbl}>Food Discount</span>
                    <span style={S.val}>{foodDiscountPercent}%</span>
                  </div>
                )}
                {overallDiscount > 0 && (
                  <div style={S.totalRow}>
                    <span style={S.lbl}>Discount ({billDiscountPercent}%)</span>
                    <span style={S.val}>-{overallDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div style={S.totalRow}>
                  <span style={S.lbl}>Tax ({restaurant?.tax_percent || 5}%)</span>
                  <span style={S.val}>Rs.{tax.toFixed(2)}</span>
                </div>
                <div style={S.solid} />
                <div style={{ ...S.totalRow, fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
                  <span style={{ ...S.lbl, fontWeight: 'bold' }}>TOTAL</span>
                  <span style={{ ...S.val, fontSize: '13px' }}>Rs.{total.toFixed(2)}</span>
                </div>
              </div>
            </>
          );
        })()}

        <div style={S.dash} />

        {/* ── Footer ── */}
        <div style={{ ...S.center, fontSize: '10px', marginTop: '4px' }}>
          <div style={{ fontStyle: 'italic' }}>Thank you! Please visit again.</div>
          <div style={{ fontSize: '9px', marginTop: '2px', color: '#555' }}>Powered by AppThat POS</div>
        </div>

        {/* ── Manual print button (hidden on print) ── */}
        <div className="no-print" style={S.noprint}>
          <button
            onClick={() => window.print()}
            style={{ background: '#000', color: '#fff', border: 'none', padding: '7px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            🖨 Print Receipt
          </button>
        </div>
      </div>
    </>
  );
}
