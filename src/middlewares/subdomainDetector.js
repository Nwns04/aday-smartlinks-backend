const User = require('../models/User');

async function subdomainDetector(req, res, next) {
  const hostname = req.hostname.split(':')[0];
  const mainDomain = process.env.MAIN_DOMAIN || 'localhost';

  if (!hostname.includes('.') || hostname === mainDomain) return next();

  const [subdomain] = hostname.split('.');
  if (['www', 'app'].includes(subdomain)) return next();

  try {
    const user = await User.findOne({ subdomain });
    if (!user) return res.status(404).json({ message: 'Invalid subdomain' });
    req.subdomainUser = user;
    next();
  } catch (err) {
    console.error("Subdomain detection failed:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function domainDetector(req, res, next) {
    const host = req.hostname;
    const mainDomain = process.env.MAIN_DOMAIN || "aday.io";
  
    if (host.endsWith(mainDomain)) return next(); // subdomains handled
  
    const user = await User.findOne({ customDomain: host });
    if (user) {
      req.customDomainUser = user;
      return next();
    }
  
    return res.status(404).json({ message: "Unknown domain" });
  }
  

  module.exports = {
    subdomainDetector,
    domainDetector
  };
  
