"use client";

// Last-resort boundary (root layout failed): plain markup, no app providers.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f7f5", color: "#17201c" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20 }}>কিছু একটা সমস্যা হয়েছে · Something went wrong</h1>
          <p style={{ color: "#5b6762" }}>Your data is safe. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, border: 0, background: "#166534", color: "#fff", cursor: "pointer" }}>
            আবার চেষ্টা করুন · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
