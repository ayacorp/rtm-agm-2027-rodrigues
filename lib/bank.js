"use strict";

const PUBLISHED_BANK = {
  rail: "mcb_mur_transfer",
  beneficiaryName: "Mauritius Round Table No. 9",
  chequesPayableTo: "Round Table 9",
  bank: "The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis",
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
    chequesPayableTo: envText("MCB_CHEQUES_PAYABLE", PUBLISHED_BANK.chequesPayableTo),
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
  return {
    rail: details.rail,
    public: true,
    confirmed: true,
    message: "",
    currency: details.currency,
    beneficiaryName: details.beneficiaryName,
    chequesPayableTo: details.chequesPayableTo,
    bank: details.bank,
    accountNumber: details.accountNumber,
    iban: details.iban || "",
    swift: details.swift || "",
    labels: {
      beneficiaryName: "Beneficiary name",
      chequesPayableTo: "Cheques payable to",
      bank: "Bank",
      accountNumber: "Account",
      iban: "IBAN",
      swift: "SWIFT",
    },
  };
}

function notifyEmail() {
  return envText("BOOKING_NOTIFY_EMAIL", "ishant@ayacorp.io");
}

function treasurerPhone() {
  return envText("TREASURER_PHONE", "+230 5906 1912");
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
