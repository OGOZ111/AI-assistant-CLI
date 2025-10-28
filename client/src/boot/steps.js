// Boot sequence steps: [label, durationMs]
const steps = [
  ["memory check", 700],
  ["I/O controller init", 900],
  ["device enumeration", 900],
  ["kernel modules", 1000],
  ["network handshake", 950],
  ["filesystem integrity", 1050],
  ["entropy pool warm-up", 800],
  ["RTC sync", 750],
  ["GPU POST", 850],
  ["audio bus", 700],
  ["input devices", 750],
  ["security policy", 900],
  ["services bring-up", 1000],
  ["telemetry muted", 650],
];

export default steps;
