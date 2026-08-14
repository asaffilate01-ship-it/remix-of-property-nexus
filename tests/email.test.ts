import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { escapeHtml, renderOutboxEmail } from "../src/lib/email.ts";

describe("transactional email rendering", () => {
  test("escapes user-controlled template values", () => {
    const email = renderOutboxEmail({
      id: "outbox-1",
      recipient_email: "signer@example.com",
      subject: null,
      html: null,
      template_name: "signature-request",
      template_data: {
        recipient: "<img src=x onerror=alert(1)>",
        document_title: "Tenancy <script>alert(1)</script>",
        signing_path: "/sign/safe-token",
      },
    }, "https://app.estately.example");

    assert.match(email.html, /&lt;img/);
    assert.doesNotMatch(email.html, /<script>/);
    assert.match(email.html, /https:\/\/app\.estately\.example\/sign\/safe-token/);
  });

  test("does not allow an outbox value to create an external action link", () => {
    const email = renderOutboxEmail({
      id: "outbox-2",
      recipient_email: "signer@example.com",
      subject: null,
      html: null,
      template_name: "signature-request",
      template_data: { signing_path: "https://evil.example/phish" },
    }, "https://app.estately.example");
    assert.doesNotMatch(email.html, /evil\.example/);
    assert.match(email.html, /https:\/\/app\.estately\.example\//);
  });

  test("escapes generic automation content instead of trusting stored HTML", () => {
    const email = renderOutboxEmail({
      id: "outbox-3",
      recipient_email: "person@example.com",
      subject: "Update",
      html: "<script>alert(1)</script><b>Hello</b>",
      template_name: "generic-notification",
      template_data: {},
    }, "https://app.estately.example");
    assert.doesNotMatch(email.html, /<script>/);
    assert.match(email.text, /Hello/);
    assert.equal(escapeHtml("<>&\"'"), "&lt;&gt;&amp;&quot;&#39;");
  });
});
