"use strict";

const { wrap, sendJson, methodNotAllowed } = require("../lib/http");
const { publicBank, notifyEmail, treasurerPhone } = require("../lib/bank");
const { storeInfo, describeStoreRequirements } = require("../lib/store");
const { blobConfigured } = require("../lib/proof");

module.exports = wrap(async function config(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, "GET");
    return;
  }
  sendJson(res, 200, {
    ok: true,
    rail: "mcb_mur_transfer",
    bank: publicBank(),
    proofUpload: blobConfigured(),
    notifyConfigured: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    notifyInboxConfigured: Boolean(notifyEmail()),
    treasurerPhone: treasurerPhone(),
    store: storeInfo(),
    storeRequirements: describeStoreRequirements(),
  });
});
