const mongoose = require("mongoose");

const WorkspaceSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["owner","admin","editor","viewer"], default: "viewer" },
    }
  ],
  campaigns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Campaign" }],
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model("Workspace", WorkspaceSchema);
