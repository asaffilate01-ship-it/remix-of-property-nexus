// Server-only outbound adapters for third-party e-signature providers.
import type { EsignProviderId } from "./providers";

export type EsignSigner = { role: string; name: string; email: string };

export type EsignEnvelope = {
  instance_id: string;
  title: string;
  signers: EsignSigner[];
  /** Signed, publicly fetchable URL of the contract PDF. */
  document_url: string;
  document_name: string;
  test_mode: boolean;
};

export type EsignSendResult = {
  provider: EsignProviderId;
  external_ref: string;
  detail: string;
};

async function fetchDocumentBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the contract PDF (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > 20_000_000) throw new Error("Contract PDF is too large to send (20MB limit).");
  return buf.toString("base64");
}

export async function sendEnvelope(
  provider: EsignProviderId,
  envelope: EsignEnvelope,
): Promise<EsignSendResult> {
  if (provider === "dropbox_sign") {
    const key = process.env.DROPBOX_SIGN_API_KEY;
    if (!key) throw new Error("DROPBOX_SIGN_API_KEY is not configured.");
    const form = new URLSearchParams();
    form.set("title", envelope.title.slice(0, 200));
    form.set("subject", `Please sign: ${envelope.title}`.slice(0, 200));
    form.set("message", "This document was sent to you through Gabley.");
    form.set("test_mode", envelope.test_mode ? "1" : "0");
    form.set("file_url[0]", envelope.document_url);
    form.set("metadata[instance_id]", envelope.instance_id);
    envelope.signers.forEach((s, i) => {
      form.set(`signers[${i}][name]`, s.name);
      form.set(`signers[${i}][email_address]`, s.email);
      form.set(`signers[${i}][order]`, String(i));
    });

    const res = await fetch("https://api.hellosign.com/v3/signature_request/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Dropbox Sign rejected the envelope (${res.status}): ${text.slice(0, 300)}`);
    const json = JSON.parse(text) as { signature_request?: { signature_request_id?: string } };
    const id = json.signature_request?.signature_request_id;
    if (!id) throw new Error("Dropbox Sign did not return a signature request id.");
    return { provider, external_ref: id, detail: "Envelope sent through Dropbox Sign." };
  }

  if (provider === "docusign") {
    const token = process.env.DOCUSIGN_ACCESS_TOKEN;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const base = process.env.DOCUSIGN_BASE_URL ?? "https://demo.docusign.net/restapi";
    if (!token || !accountId) {
      throw new Error("DOCUSIGN_ACCESS_TOKEN and DOCUSIGN_ACCOUNT_ID must be configured.");
    }
    const documentBase64 = await fetchDocumentBase64(envelope.document_url);
    const body = {
      emailSubject: `Please sign: ${envelope.title}`.slice(0, 100),
      status: "sent",
      documents: [
        {
          documentBase64,
          name: envelope.document_name.slice(0, 100),
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: envelope.signers.map((s, i) => ({
          email: s.email,
          name: s.name,
          recipientId: String(i + 1),
          routingOrder: String(i + 1),
          tabs: {
            signHereTabs: [{ anchorString: "/sign/", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }],
          },
        })),
      },
      customFields: {
        textCustomFields: [{ name: "instance_id", value: envelope.instance_id, show: "false" }],
      },
    };
    const res = await fetch(`${base.replace(/\/$/, "")}/v2.1/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`DocuSign rejected the envelope (${res.status}): ${text.slice(0, 300)}`);
    const json = JSON.parse(text) as { envelopeId?: string };
    if (!json.envelopeId) throw new Error("DocuSign did not return an envelope id.");
    return { provider, external_ref: json.envelopeId, detail: "Envelope sent through DocuSign." };
  }

  throw new Error("Built-in Gabley signing does not use an external envelope.");
}
