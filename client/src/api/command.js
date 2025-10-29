export async function sendCommand(input, lang) {
  const res = await fetch("http://localhost:5000/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, lang }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Command API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.response;
}
