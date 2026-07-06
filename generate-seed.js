/**
 * Seed script: generates 615 Raichur + 862 Yadgir realistic feedback records
 * and merges them with existing data in server/data/feedback.json
 * Run: node generate-seed.js
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'server', 'data', 'feedback.json');

// ─── Name lists ──────────────────────────────────────────────────────────────
const firstNames = [
  'Ramesh','Suresh','Mahesh','Dinesh','Rajesh','Anil','Sunil','Vinod','Pramod','Sanjay',
  'Ashok','Vijay','Ajay','Sanjiv','Pradeep','Deepak','Ravi','Kiran','Arjun','Naveen',
  'Govind','Shiva','Venkat','Lakshman','Krishna','Naresh','Girish','Harish','Paresh','Bharat',
  'Swapna','Priya','Kavita','Sunita','Geeta','Anita','Savita','Rekha','Meena','Nisha',
  'Pooja','Divya','Ritu','Sneha','Usha','Lata','Asha','Sushma','Radha','Parvati',
  'Ramaiah','Shivaiah','Venkaiah','Narsaiah','Srinivas','Balaiah','Mallaiah','Yellaiah','Raju','Babu',
  'Nagaraj','Manjunath','Shivakumar','Hanumantha','Basavaiah','Chalapathi','Sriramaiah','Tirumala','Sreedhar','Nagesh',
  'Fatima','Amina','Zainab','Ruqaiya','Yasmeen','Raheela','Nasreen','Shabana','Gulshan','Benazir',
  'Mohammed','Abdul','Ibrahim','Ismail','Salman','Imran','Faisal','Shahid','Junaid','Tariq'
];

const lastNames = [
  'Reddy','Kumar','Sharma','Singh','Patel','Gupta','Naidu','Rao','Verma','Mishra',
  'Patil','Kulkarni','Desai','Shinde','Jadhav','More','Kale','Pawar','Bhosale','Chavan',
  'Goud','Yadav','Nair','Menon','Pillai','Iyer','Krishnan','Rajan','Murthy','Swamy',
  'Begum','Khan','Ansari','Sheikh','Siddiqui','Qureshi','Malik','Mirza','Raza','Hussain'
];

const cities = [
  'Raichur','Yadgir','Hyderabad','Bengaluru','Vijayapura','Gulbarga','Bidar','Bellary',
  'Hospet','Gadag','Dharwad','Hubli','Mysuru','Mandya','Hassan','Tumkur',
  'Secunderabad','Nagpur','Pune','Mumbai','Delhi','Chennai','Kolkata','Ahmedabad'
];

const ratingWords = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'];
const areaKeys = ['appearancePlatform', 'taps', 'tracks', 'waitingHall', 'toilets', 'retiringRooms', 'staffBehavior'];

const remarks = [
  'Good station, clean and well maintained.',
  'Excellent cleanliness and staff behaviour.',
  'Overall good experience at the station.',
  'Clean station, good facilities.',
  'Very satisfied with the cleanliness.',
  'Station is well maintained, good work.',
  'Facilities are good, keep it up.',
  'Satisfied with overall station management.',
  'Platform is clean, waiting hall is good.',
  'Good hygiene maintained throughout.',
  'Staff are helpful and courteous.',
  'Nice and tidy station.',
  'Toilets need some improvement.',
  'Good experience overall.',
  'Clean tracks and platforms.',
  'Excellent maintenance of the station.',
  'Very happy with the station facilities.',
  'Good food stalls and cleanliness.',
  'Station management is very good.',
  'Overall satisfactory experience.',
  '',''  // some blank remarks too
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randPhone() {
  const prefixes = ['9', '8', '7', '6'];
  return rand(prefixes) + String(randInt(100000000, 999999999));
}
function randPnr() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const part1 = Array.from({length: 3}, () => alpha[randInt(0, alpha.length-1)]).join('');
  return part1 + randInt(1000000, 9999999);
}
function randDate(daysBack = 180) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, daysBack));
  return d.toISOString().substring(0, 10);
}
function randCreatedAt(date) {
  const d = new Date(date);
  d.setHours(randInt(6, 22), randInt(0, 59), randInt(0, 59));
  return d.toISOString();
}
function randRating() {
  // Weighted: mostly Excellent/Good
  const w = Math.random();
  if (w < 0.45) return 'Excellent';
  if (w < 0.80) return 'Good';
  if (w < 0.95) return 'Satisfactory';
  return 'Needs Improvement';
}
function randName() {
  return `${rand(firstNames)} ${rand(lastNames)}`;
}
function makeId(loc, idx) {
  const prefix = loc === 'RAICHUR' ? 'RCR' : 'YG';
  return `FB-GEN-${prefix}-${String(idx).padStart(4,'0')}`;
}

// ─── Generator ───────────────────────────────────────────────────────────────
function generateRecords(location, count, startIdx = 0) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const date = randDate(365);
    const areas = {};
    areaKeys.forEach(k => { areas[k] = randRating(); });
    records.push({
      id: makeId(location, startIdx + i),
      location,
      date,
      fromDate: '',
      toDate: '',
      passengerName: randName(),
      pnrOrUts: randPnr(),
      mobile: randPhone(),
      email: '',
      areas,
      remarks: rand(remarks),
      createdAt: randCreatedAt(date)
    });
  }
  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Remove old generated records to avoid duplication on re-run
const filtered = existing.filter(r => !String(r.id).startsWith('FB-GEN-'));

// Count existing real records per station
const rcrReal = filtered.filter(r => ['RCR','RAICHUR'].includes((r.location||'').toUpperCase())).length;
const ygReal  = filtered.filter(r => ['YG','YADGIR'].includes((r.location||'').toUpperCase())).length;

const RCR_TARGET = 615;
const YG_TARGET  = 862;
const rcrToGenerate = Math.max(0, RCR_TARGET - rcrReal);
const ygToGenerate  = Math.max(0, YG_TARGET  - ygReal);

console.log(`Existing: RCR=${rcrReal}, YG=${ygReal}`);
console.log(`Generating: RCR=${rcrToGenerate}, YG=${ygToGenerate}`);

const newRcr = generateRecords('RAICHUR', rcrToGenerate);
const newYg  = generateRecords('YADGIR',  ygToGenerate, rcrToGenerate);

const merged = [...filtered, ...newRcr, ...newYg];
fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));

const finalRcr = merged.filter(r => ['RCR','RAICHUR'].includes((r.location||'').toUpperCase())).length;
const finalYg  = merged.filter(r => ['YG','YADGIR'].includes((r.location||'').toUpperCase())).length;
console.log(`✅ Done! Total: ${merged.length} | RCR: ${finalRcr} | YG: ${finalYg}`);
