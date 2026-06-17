"use client";

import { useState, useEffect } from "react";
import { api, type ContactMessage } from "@/lib/api";

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    const res = await api.getContactMessages();
    if (res.data) setMessages(res.data.messages);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const res = await api.markContactRead(id);
    if (res.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      );
    }
  }

  function openMessage(msg: ContactMessage) {
    setSelectedMsg(msg);
    if (!msg.is_read) markAsRead(msg.id);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const categorized = [
    { label: "Unread", items: messages.filter((m) => !m.is_read) },
    { label: "Read", items: messages.filter((m) => m.is_read) },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0 }}>Contact Messages</h3>
          {unreadCount > 0 && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadMessages}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading messages…</p>
      ) : messages.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--muted)", margin: 0 }}>No contact messages yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Message list */}
          <div>
            {categorized.map((section) =>
              section.items.length > 0 && (
                <div key={section.label} style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {section.label} ({section.items.length})
                  </h4>
                  {section.items.map((msg) => (
                    <div
                      key={msg.id}
                      className="card"
                      style={{
                        padding: 14,
                        marginBottom: 8,
                        cursor: "pointer",
                        borderLeft: msg.is_read ? "3px solid transparent" : "3px solid var(--accent)",
                        opacity: msg.is_read ? 0.75 : 1,
                      }}
                      onClick={() => openMessage(msg)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <strong style={{ fontSize: 14 }}>{msg.name}</strong>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{formatDate(msg.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                        {msg.subject} · {msg.email}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Message detail */}
          <div>
            {selectedMsg ? (
              <div className="card" style={{ position: "sticky", top: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{selectedMsg.name}</h4>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{selectedMsg.email}</p>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {formatDate(selectedMsg.created_at)}
                  </span>
                </div>

                <div className="badge" style={{
                  display: "inline-block",
                  background: "var(--tan-light)",
                  color: "var(--tan-dark)",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                }}>
                  {selectedMsg.subject}
                </div>

                <div style={{
                  background: "var(--bg)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  fontSize: 15,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}>
                  {selectedMsg.message}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <p style={{ color: "var(--muted)", margin: 0 }}>Select a message to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
