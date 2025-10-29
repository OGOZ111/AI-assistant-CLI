// Boot sequence steps: [label, durationMs]
const stepsEn = [
  ["memory check", 700],
  ["I/O controller init", 900],
  ["device enumeration", 900],
  ["kernel modules", 1000],
  ["network handshake", 950],
  ["filesystem integrity", 1050],
  ["entropy pool warm-up", 800],
  ["RTC sync", 750],
];

const stepsFi = [
  ["muistin tarkistus", 700],
  ["I/O-ohjaimen alustus", 900],
  ["laitteiden tunnistus", 900],
  ["ytimen moduulit", 1000],
  ["verkkokättely", 950],
  ["tiedostojärjestelmän eheys", 1050],
  ["entropia-altaan lämmitys", 800],
  ["RTC-synkronointi", 750],
];

export function getSteps(lang = "en") {
  return lang === "fi" ? stepsFi : stepsEn;
}

export default getSteps;
