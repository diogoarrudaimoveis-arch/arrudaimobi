import { describe, it, expect } from "vitest";
import { WaMeProvider, buildTelUrl, buildMailtoUrl } from "../lib/messaging/whatsapp";
import type { WhatsAppMessage, WhatsAppProvider } from "../lib/messaging/whatsapp";

describe("WaMeProvider", () => {
  const provider = new WaMeProvider();

  describe("providerName", () => {
    it("should expose 'wa.me' as provider name", () => {
      expect(provider.providerName).toBe("wa.me");
    });
  });

  describe("buildUrl", () => {
    it("should build a valid wa.me URL for Brazilian phone with 55 prefix", () => {
      const url = provider.buildUrl({
        phone: "5531999998888",
        message: "Olá, vi o imóvel no site",
      });
      expect(url).toContain("https://wa.me/5531999998888");
      expect(url).toContain("text=");
      // encodeURIComponent uses UTF-8: "Olá" → "Ol%C3%A1", "," → "%2C", space → "%20"
      // Full text "Olá, vi o imóvel no site" → "Ol%C3%A1%2C%20vi%20o%20im%C3%B3vel%20no%20site"
      expect(url).toContain("Ol%C3%A1%2C%20vi");
    });

    it("should prepend 55 if phone does not start with it", () => {
      const url = provider.buildUrl({
        phone: "31999998888",
        message: "Olá",
      });
      expect(url).toContain("https://wa.me/5531");
    });

    it("should return null for empty phone", () => {
      const url = provider.buildUrl({ phone: "", message: "Olá" });
      expect(url).toBeNull();
    });

    it("should return null for null phone", () => {
      const url = provider.buildUrl({ phone: null as any, message: "Olá" });
      expect(url).toBeNull();
    });

    it("should return null for undefined phone", () => {
      const url = provider.buildUrl({ phone: undefined as any, message: "Olá" });
      expect(url).toBeNull();
    });

    it("should strip non-digit characters from phone", () => {
      const url = provider.buildUrl({
        phone: "+55 (31) 99999-8888",
        message: "Teste",
      });
      // Normalized: 55 + 31 stripped of non-digits → 5531999998888
      expect(url).toContain("https://wa.me/5531999998888");
      expect(url).not.toContain("+");
      expect(url).not.toContain("(");
    });

    it("should encode special characters in message", () => {
      const url = provider.buildUrl({
        phone: "5531999998888",
        message: "Olá, vi seu imóvel! 🔑",
      });
      expect(url).toContain("text=");
      expect(url).not.toContain("🚀");
    });
  });

  describe("send", () => {
    it("should return a Promise resolving to url and event name", async () => {
      const result = await provider.send({
        phone: "5531999998888",
        message: "Olá",
      });
      expect(result.url).toContain("https://wa.me/5531");
      expect(result.event).toBe("whatsapp_click");
    });

    it("should return empty string as url when phone is empty", async () => {
      const result = await provider.send({ phone: "", message: "Olá" });
      expect(result.url).toBe("");
      expect(result.event).toBe("whatsapp_click");
    });
  });
});

describe("WhatsAppProvider interface contract", () => {
  it("WaMeProvider should implement WhatsAppProvider contract", () => {
    const provider: WhatsAppProvider = new WaMeProvider();
    expect(typeof provider.providerName).toBe("string");
    expect(typeof provider.buildUrl).toBe("function");
    expect(typeof provider.send).toBe("function");
  });
});

describe("buildTelUrl", () => {
  it("should build tel: URL with + prefix for Brazilian phone", () => {
    const url = buildTelUrl("5531999998888");
    expect(url).toBe("tel:+5531999998888");
  });

  it("should prepend 55 and + if phone is local format", () => {
    const url = buildTelUrl("31999998888");
    expect(url).toBe("tel:+5531999998888");
  });

  it("should return null for empty phone", () => {
    const url = buildTelUrl("");
    expect(url).toBeNull();
  });

  it("should return null for null phone", () => {
    const url = buildTelUrl(null as any);
    expect(url).toBeNull();
  });

  it("should strip non-digit characters", () => {
    const url = buildTelUrl("+55 (31) 99999-8888");
    expect(url).toBe("tel:+5531999998888");
  });
});

describe("buildMailtoUrl", () => {
  it("should build a mailto URL with encoded subject and body", () => {
    const url = buildMailtoUrl("contato@arrudaimobi.com.br", " Interesse no Imóvel", "Olá, vi o imóvel no site.");
    expect(url).toContain("mailto:");
    // encodeURIComponent encodes @ as %40 and accented chars as UTF-8 sequences
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
    expect(url).toContain("%40arrudaimobi.com.br");
  });

  it("should encode spaces and special chars in subject", () => {
    const url = buildMailtoUrl("test@test.com", "Assunto com espaço", "Body");
    expect(url).not.toContain(" ");
  });
});
