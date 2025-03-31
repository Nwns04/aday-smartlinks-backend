const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: String,
  spotifyId: String,
  name: String,
  email: String,
  profileImage: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
