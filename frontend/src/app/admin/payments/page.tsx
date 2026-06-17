"use client";

import { useState } from "react";

export default function AdminPaymentsPage() {
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [reminderName, setReminderName] = useState("");
  const [showReminder, setShowReminder] = useState(false);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  return (
    <>
      {/* Payment Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>₦42.5M</div>
          <div className="stat-label">Total Collected (2025)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warn)" }}>1,244</div>
          <div className="stat-label">Renewals Due in 30 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₦8.2M</div>
          <div className="stat-label">Expected from Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">94%</div>
          <div className="stat-label">Collection Rate</div>
        </div>
      </div>

      {/* Payment Records */}
      <div className="card">
        <div className="card-header">
          <h3>Payment Records</h3>
          <button className="btn btn-outline btn-sm" onClick={() => showToast("Exporting…", "success")}>
            Export
          </button>
        </div>
        <div className="search-bar">
          <input type="text" placeholder="Search by name or membership number…" />
          <select>
            <option>All Statuses</option>
            <option>Confirmed</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Adebayo O. Johnson
                  <br />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>NC-2024-001234</span>
                </td>
                <td>₦35,000</td>
                <td>Renewal</td>
                <td>12 Jan 2025</td>
                <td>Paystack</td>
                <td><span className="badge badge-active">Confirmed</span></td>
                <td className="actions"><button className="btn btn-ghost btn-xs">View</button></td>
              </tr>
              <tr>
                <td>
                  Dr. Amina Bello
                  <br />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>NC-2024-003456</span>
                </td>
                <td>₦75,000</td>
                <td>Renewal</td>
                <td>05 Jan 2025</td>
                <td>Bank Transfer</td>
                <td><span className="badge badge-active">Confirmed</span></td>
                <td className="actions"><button className="btn btn-ghost btn-xs">View</button></td>
              </tr>
              <tr>
                <td>
                  Emeka C. Nwosu
                  <br />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Pending Application</span>
                </td>
                <td>₦20,000</td>
                <td>New Member</td>
                <td>03 Jan 2025</td>
                <td>Paystack</td>
                <td><span className="badge badge-pending">Pending</span></td>
                <td className="actions">
                  <button className="btn btn-accent btn-xs" onClick={() => showToast("Payment confirmed", "success")}>
                    Confirm
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  Chidi Okeke
                  <br />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>NC-2024-007890</span>
                </td>
                <td>₦8,000</td>
                <td>Renewal</td>
                <td>28 Dec 2024</td>
                <td>USSD</td>
                <td><span className="badge badge-active">Confirmed</span></td>
                <td className="actions"><button className="btn btn-ghost btn-xs">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="card">
        <div className="card-header">
          <h3>Upcoming Renewals (Next 30 Days)</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Fatima S. Ibrahim", cat: "Fellow", amt: "₦75,000", due: "31 Mar 2025" },
                { name: "Musa Abubakar", cat: "Full Member", amt: "₦35,000", due: "15 Apr 2025" },
                { name: "Ngozi Uche", cat: "Associate", amt: "₦20,000", due: "22 Apr 2025" },
              ].map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.cat}</td>
                  <td>{r.amt}</td>
                  <td>{r.due}</td>
                  <td>
                    <button
                      className="btn btn-accent btn-xs"
                      onClick={() => {
                        setReminderName(r.name);
                        setShowReminder(true);
                      }}
                    >
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewal Reminder Modal */}
      {showReminder && (
        <div className="modal-overlay open" onClick={() => setShowReminder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReminder(false)}>✕</button>
            <h3>Send Renewal Reminder</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Sending to: <strong>{reminderName}</strong>
            </p>
            <div className="form-group">
              <label>Email Template</label>
              <select>
                <option>Standard Renewal Reminder</option>
                <option>Final Notice (30 days overdue)</option>
                <option>Custom Message</option>
              </select>
            </div>
            <div className="form-group">
              <label>Additional Note (optional)</label>
              <textarea rows={2} placeholder="Personal note to include…" />
            </div>
            <button
              className="btn btn-accent"
              style={{ width: "100%" }}
              onClick={() => {
                setShowReminder(false);
                showToast("Reminder sent successfully", "success");
              }}
            >
              Send Reminder
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
