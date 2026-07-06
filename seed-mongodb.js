const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const feedbackSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  location: { type: String, uppercase: true, trim: true, index: true },
  date: String, fromDate: String, toDate: String,
  passengerName: String, pnrOrUts: String, mobile: String, email: String,
  areas: { type: mongoose.Schema.Types.Mixed, default: {} },
  remarks: String, createdAt: String
}, { collection: 'feedbacks', timestamps: false, versionKey: false });

const Feedback = mongoose.model('Feedback', feedbackSchema);

const MONGO_URI = 'mongodb+srv://adminadmin:Dsl9ycGKGmrNWGRm@cluster0.rssmtkm.mongodb.net/obhsfeedback?retryWrites=true&w=majority&appName=Cluster0';
const DATA_FILE = path.join(__dirname, 'server', 'data', 'feedback.json');

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
.then(async () => {
  const existing = await Feedback.countDocuments();
  console.log('Existing records in MongoDB obhsfeedback:', existing);
  if (existing === 0) {
    const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log('Seeding', fileData.length, 'records from feedback.json...');
    await Feedback.insertMany(fileData, { ordered: false });
    const total = await Feedback.countDocuments();
    const rcr = await Feedback.countDocuments({ location: 'RAICHUR' });
    const yg = await Feedback.countDocuments({ location: 'YADGIR' });
    console.log('DONE! Total:', total, '| RAICHUR:', rcr, '| YADGIR:', yg);
  } else {
    const rcr = await Feedback.countDocuments({ location: 'RAICHUR' });
    const yg = await Feedback.countDocuments({ location: 'YADGIR' });
    console.log('Already seeded! Total:', existing, '| RAICHUR:', rcr, '| YADGIR:', yg);
  }
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}).catch(err => {
  console.error('MongoDB error:', err.message);
  process.exit(1);
});
