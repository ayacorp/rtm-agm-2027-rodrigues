"use strict";

/**
 * Provisional MCB settle details live in env only (.env.example).
 * The public API returns the bank block solely when BANK_DETAILS_PUBLIC=true.
 * Do not use RTM national account 000011738626.
 */
const TBA_MESSAGE = "Awaiting organiser bank details / payment instructions by email.";

function envFlag(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return raw;
}

function envText(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const trimmed = String(raw).trim();
  return trimmed || fallback;
}

function isPublic() {
  const raw = envFlag("BANK_DETAILS_PUBLIC", "false");
  return String(raw).toLowerCase() === "true" || raw === "1" || raw === "yes";
}

function resolveDetails() {
  return {
    rail: "mcb_mur_transfer",
    beneficiaryName: envText("MCB_ACCOUNT_NAME", ""),
    chequesPayableTo: envText("MCB_CHEQUES_PAYABLE", ""),
    bank: envText("MCB_BANK", "") || envText("MCB_BANK_NAME", ""),
    accountNumber: envText("MCB_ACCOUNT_NUMBER", ""),
    iban: envText("MCB_IBAN", ""),
    swift: envText("MCB_SWIFT", ""),
    currency: "MUR",
  };
}

function hasAccountNumber(details) {
  return Boolean(details.accountNumber && details.beneficiaryName);
}

function publicBank() {
  const details = resolveDetails();
  if (!isPublic() || !hasAccountNumber(details)) {
    return {
      rail: "mcb_mur_transfer",
      public: false,
      confirmed: false,
      message: TBA_MESSAGE,
      currency: "MUR",
    };
  }
  const block = {
    rail: details.rail,
    public: true,
    confirmed: true,
    message: "",
    currency: details.currency,
    beneficiaryName: details.beneficiaryName,
    bank: details.bank,
    accountNumber: details.accountNumber,
    iban: details.iban || "",
    swift: details.swift || "",
    labels: {
      beneficiaryName: "Beneficiary name",
      bank: "Bank",
      accountNumber: "Account",
      iban: "IBAN",
      swift: "SWIFT",
    },
  };
  if (details.chequesPayableTo) {
    block.chequesPayableTo = details.chequesPayableTo;
    block.labels.chequesPayableTo = "Cheques payable to";
  }
  return block;
}

function notifyEmail() {
  return envText("BOOKING_NOTIFY_EMAIL", "");
}

function treasurerPhone() {
  return envText("TREASURER_PHONE", "");
}

module.exports = {
  TBA_MESSAGE,
  publicBank,
  notifyEmail,
  treasurerPhone,
  isPublic,
  resolveDetails,
};
