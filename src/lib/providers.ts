// Browser-safe registry of third-party referencing and e-signature providers.

export const REFERENCING_PROVIDERS = [
  "goodlord",
  "homelet",
  "rentprofile",
  "canopy",
  "custom_rest",
  "simulated",
] as const;

export type ReferencingProviderId = (typeof REFERENCING_PROVIDERS)[number];

export const ESIGN_PROVIDERS = ["gabley", "dropbox_sign", "docusign"] as const;
export type EsignProviderId = (typeof ESIGN_PROVIDERS)[number];

export type ProviderMeta = {
  id: string;
  name: string;
  blurb: string;
  /** Environment secrets an admin must add before the provider can be used. */
  secrets: string[];
  docsUrl: string;
};

export const REFERENCING_PROVIDER_META: Record<ReferencingProviderId, ProviderMeta> = {
  goodlord: {
    id: "goodlord",
    name: "Goodlord",
    blurb: "Full tenant referencing, right to rent and affordability via the Goodlord API.",
    secrets: ["REFERENCING_API_KEY"],
    docsUrl: "https://www.goodlord.co/",
  },
  homelet: {
    id: "homelet",
    name: "HomeLet",
    blurb: "Credit, employer and landlord references with insurance-backed decisions.",
    secrets: ["REFERENCING_API_KEY"],
    docsUrl: "https://homelet.co.uk/letting-agents",
  },
  rentprofile: {
    id: "rentprofile",
    name: "RentProfile",
    blurb: "ID verification, right to rent share-code checks and rent history.",
    secrets: ["REFERENCING_API_KEY"],
    docsUrl: "https://rentprofile.co/",
  },
  canopy: {
    id: "canopy",
    name: "Canopy",
    blurb: "Open banking affordability and RentPassport referencing.",
    secrets: ["REFERENCING_API_KEY"],
    docsUrl: "https://www.canopy.rent/",
  },
  custom_rest: {
    id: "custom_rest",
    name: "Custom REST provider",
    blurb: "Any provider exposing a JSON endpoint — set the URL on the connection.",
    secrets: ["REFERENCING_API_KEY"],
    docsUrl: "https://gabley.co.uk/for-agents",
  },
  simulated: {
    id: "simulated",
    name: "Simulated (testing only)",
    blurb: "Deterministic fake results. Only usable when ENABLE_SIMULATED_REFERENCING=true.",
    secrets: [],
    docsUrl: "https://gabley.co.uk/for-agents",
  },
};

export const ESIGN_PROVIDER_META: Record<EsignProviderId, ProviderMeta> = {
  gabley: {
    id: "gabley",
    name: "Gabley e-sign (built in)",
    blurb: "Audit-trailed signing links hosted by Gabley. No third-party account needed.",
    secrets: [],
    docsUrl: "https://gabley.co.uk/for-agents",
  },
  dropbox_sign: {
    id: "dropbox_sign",
    name: "Dropbox Sign",
    blurb: "Legally binding envelopes sent through Dropbox Sign (HelloSign).",
    secrets: ["DROPBOX_SIGN_API_KEY", "ESIGN_WEBHOOK_SECRET"],
    docsUrl: "https://developers.hellosign.com/api/reference/",
  },
  docusign: {
    id: "docusign",
    name: "DocuSign",
    blurb: "Enterprise envelopes through the DocuSign eSignature REST API.",
    secrets: ["DOCUSIGN_ACCESS_TOKEN", "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_BASE_URL", "ESIGN_WEBHOOK_SECRET"],
    docsUrl: "https://developers.docusign.com/docs/esign-rest-api/",
  },
};

export type ProviderKind = "referencing" | "esign";
