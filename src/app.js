const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const checkReleasedCampaigns = require('./cron/releaseChecker');
const { subdomainDetector } = require('./middlewares/subdomainDetector');
const errorHandler = require('./middlewares/errorHandler');
const limiter = require('./middlewares/rateLimiter');
const paymentRoutes = require("./routes/payment.routes");
const checkTrial      = require('./middlewares/checkTrial');
const subscriptionRoutes = require('./routes/subscription.routes')
const logActivity = require('./middlewares/activityLogger');
const ensureAuthenticated = require('./middlewares/ensureAuthenticated');
const ensureCampaignOwner = require('./middlewares/ensureCampaignOwner');
const fs = require("fs");
const gb = require("./utils/growthbook");

// require('./services/supabaseSync')();



const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


dotenv.config();
connectDB();
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app); // 👈 create the server manually
const io = socketIo(server, {
  cors: {
    origin: "*", // Or restrict to your frontend domain
    methods: ["GET", "POST"]
  }
});

io.on('connection', socket => {
  console.log('⚡️ Socket connected:', socket.id);

  socket.on("joinCampaign", (slug) => {
    socket.join(slug);
    console.log(`👤 ${socket.id} joined room ${slug}`);
  });

  socket.on("leaveCampaign", (slug) => {
    socket.leave(slug);
    console.log(`👋 ${socket.id} left room ${slug}`);
  });
});

app.set("socketio", io);
checkReleasedCampaigns(io);

app.use(cors());
app.use(express.json());
app.use(subdomainDetector);
app.use(errorHandler);
app.use(limiter);
// app.use(checkTrial);
// app.use(logActivity);
// app.use(ensureAuthenticated);
// app.use(ensureCampaignOwner);

app.get('/', (req, res) => res.send('Aday Smartlinks API Running...'));
app.use('/campaigns', require('./routes/campaign.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/biolinks', require('./routes/biolink.routes'));
app.use('/spotify', require('./routes/spotify.routes'));
app.use("/logs", require("./routes/logs.routes"));
app.use('/api/loyalty', require('./routes/loyalty.routes'));
app.use('/api/presskit', require('./routes/presskit.routes'));
app.use('/api/aicopy', require('./routes/aicopy.routes'));
app.use('/shortlinks', require('./routes/shortlinks.routes'));
app.use("/api/workspaces", require("./routes/workspaces.routes"));
app.use("/api/audit", require("./routes/audit.routes"));
app.use("/api/push", require("./routes/push.routes"));
app.use('/abtests', require('./routes/abtests.routes'));
app.use('/api/segments', require('./routes/segments.routes'));
app.use('/api/push', require('./routes/push.routes'));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/payment", paymentRoutes);
app.use('/api', subscriptionRoutes);
app.set("socketio", io); // optional, only needed if accessed from inside routes

// ✅ Pass io to the cron job
checkReleasedCampaigns(io);

module.exports = { app, server  };
