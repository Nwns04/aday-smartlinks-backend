const express = require("express");
const router  = express.Router();
const Workspace = require("../models/Workspace");
const ensureAuth = require("../middlewares/ensureAuthenticated");
const gbClient  = require("../utils/growthbook");

// Create a workspace
router.post("/", ensureAuth, async (req, res) => {
  // gate by feature flag
  await gbClient.refreshFeatures();
  const gb = gbClient.createScopedInstance({ attributes: { id: req.user._id.toString(), email: req.user.email }});
  
   console.log("🔍 Checking feature for:", userEmail);
  console.log("🚀 Flag value:", gb.isOn("team_workspaces"));
  if (!gb.isOn("team_workspaces")) {
    return res.status(403).json({ message: "Workspaces are disabled." });
  }
  const ws = await Workspace.create({
    name: req.body.name,
    owner: req.user._id,
    members: [{ user: req.user._id, role: "owner" }]
  });
  res.status(201).json(ws);
});

// List your workspaces
router.get("/", ensureAuth, async (req, res) => {
  await gbClient.refreshFeatures();
  const gb = gbClient.createScopedInstance({ attributes: { id: req.user._id.toString(), email: req.user.email }});
  if (!gb.isOn("team_workspaces")) {
    return res.status(403).json({ message: "Workspaces are disabled." });
  }
  const wss = await Workspace.find({ "members.user": req.user._id });
  res.json(wss);
});

// Get one workspace
router.get("/:id", ensureAuth, async (req, res) => {
  const ws = await Workspace.findById(req.params.id)
    .populate("members.user", "name email")
    .populate("campaigns", "title slug");
  if (!ws || !ws.members.some(m => m.user._id.equals(req.user._id))) {
    return res.status(403).json({ message: "Access denied." });
  }
  res.json(ws);
});

// Invite a member
router.post("/:id/invite", ensureAuth, async (req, res) => {
  const { userId, role } = req.body;
  const ws = await Workspace.findById(req.params.id);
  if (!ws || !ws.owner.equals(req.user._id)) {
    return res.status(403).json({ message: "Only the owner may invite." });
  }
  ws.members.push({ user: userId, role });
  await ws.save();
  res.json(ws);
});

module.exports = router;
