"use strict";

/**
 * Published MCB MUR transfer details (CoS / Ishant GO).
 * Returned to the client only when BANK_DETAILS_PUBLIC=true (default true).
 * Do not use RTM national account 000011738626.
 */
const PUBLISHED_BANK = {
  rail: "mcb_mur_transfer",
  beneficiaryName: "Round Table 9 (Reg. 17280)",
  bank: "MCB",
  accountNumber: "000443540438",
  iban: "MU13MCBL0944000443540438000MUR",
  swift: "MCBLMUMU",
  currency: "MUR",
};

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
  const raw = envFlag("BANK_DETAILS_PUBLIC", "true");
  return String(raw).toLowerCase() === "true" || raw === "1" || raw === "yes";
}

function resolveDetails() {
  return {
    rail: PUBLISHED_BANK.rail,
    beneficiaryName: envText("MCB_ACCOUNT_NAME", PUBLISHED_BANK.beneficiaryName),
    chequesPayableTo: envText("MCB_CHEQUES_PAYABLE", ""),
    bank: envText("MCB_BANK", "") || envText("MCB_BANK_NAME", PUBLISHED_BANK.bank),
    accountNumber: envText("MCB_ACCOUNT_NUMBER", PUBLISHED_BANK.accountNumber),
    iban: envText("MCB_IBAN", PUBLISHED_BANK.iban),
    swift: envText("MCB_SWIFT", PUBLISHED_BANK.swift),
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
  return envText("BOOKING_NOTIFY_EMAIL", "roundtable9.mu@gmail.com");
}

function treasurerPhone() {
  return envText("TREASURER_PHONE", "");
}

module.exports = {
  PUBLISHED_BANK,
  TBA_MESSAGE,
  publicBank,
  notifyEmail,
  treasurerPhone,
  isPublic,
  resolveDetails,
};
