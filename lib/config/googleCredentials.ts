import { prisma } from "@/lib/db";

const KEYS = {
  clientEmail: "google_sheets_client_email",
  privateKey: "google_sheets_private_key",
} as const;

/** Credenciais padrão da service account (fallback para evitar perda de conexão) */
const DEFAULT_SERVICE_ACCOUNT = {
  clientEmail: "inout-sheets@inout-490014.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDXoUORx0hXINKZ
COVtW7jE80YcDvFp1Z8mGL8sEzRJEvYXqsQjXQU2FVKaHr35QEyLYXEQHKdSqVpg
H6Ifwv4NsPs65EIoXFfWiHu3cM3qVmWy5IB+amjkBlEMYm+PTt9fqjHx4lyZz9j5
3jhbndlu0SekkCjl9ylEqnMvbgJjkcxwMi3Q6D/l9g23eXll0BiLm8geEgHpHFmZ
92YbTWH6im8LxCN+h88im7bfKfgd5aWNpiEtOFHfxLA7xhXtHFBbMNgyEPhnpM7J
lgPETs/gGkWF/sxqgKvfTnmSfsmRpWqSuXzG9qLug/m955Is5D9HOWLNQg4KpswT
TujV7YgfAgMBAAECggEADac6tbajlaNmElCQ47LEvpu/cF612div4g6maYOxx4AO
2wLHYTcuRvVkrI45GIOCFT/kk9DspfxD1QWhE1fFFFgvdX7R0ue98Wnk7iw+AueD
kFHi8kjfPrOeWtAPdkiCi6ElgRuvIgIaIAAlG2VMSOBaHT5k3eLKLHyKcedfpAQ6
jLbgTSoO+0GnTFpjx8XVtJIFyoJjSCgSfjTxvZ1jRXS5YQlZu1VTvt9T22EcFQp6
unVMMkW8Gb+Q8xOxvbvXstiyyYkxxnlVMVvdLq1+3BJSwUoouDw7/5rr1btMB0EV
AFnYlPCiWDJISYNzTOjeTO+1rO8Akx3mUeoPkk75KQKBgQD0N94wmS8/tWK9/HK2
GOfwINqRocp3WX8IGOxTUQu2NXhJWDWK8eSoGGG/7HcQmYTyM9mzgXiU+C/MKqDv
fWb9gU8iU5qr0w2bcAF/45Zyt7qLilUShSzhxLD85Wo3V20MA6DP6PhUtva3vUbQ
MVnWhFC8Tf0+/4Huz62QX9XBOwKBgQDiCFOD414ueu+7hrCiDyLWnABiJqPtW4Ze
wCW/fgnt5HOhXezQPD/YNMoIDgJ/0xpTGFJM1hgjwYnTWZfYoyTLX+8O9To7vQ3A
YCg2e6XdRuZpAXehxUVhXIHCoqV1bK1cuP6VdUTH8fdL7UXgdOX85SrpICj5mnx7
D/3Km/qmbQKBgQCunMtmoAAiYwRIppk2DbS4AiWEftOOZhTnqzo9j/L5wl1Qw5r0
z2MXtOcfHGk9GybtLZl4ORgIGzPBnLEYyua6VpxIBNLQC8Ts4DaSRB0rxKXCY5PT
/BhNDB8nkrhQ/Vdgga+XOBFmMLNSSCi7bq23LT+0g2aQhotWPnLwiTUCRQKBgGgj
Eecnr9KWTTEGowZnFtPtV7fguZG3ozawLDQHa6ewox1rWpmtyHRiDdqcKcaeifhS
skg4MzL2DfvTwUPMFj2k20z26ndvaJCDPMOtQAOskKc8R9O+QXLT3ezAZp6tDUo0
6QYO2zuLXTYcAR+ie/uB0b1KVdZ5uHQyL+lS564ZAoGBAOs4YkL9EaPnpyJ5VtJq
FfQJWK6QNeXpxSUETS1whfaqINqWL2dPu5y3DeWW9zHEIBRK/kEpluoIFHvyX2zY
xiPAQDtQlwfxMlah8eTpB8e6W7nJRrbKXmaJkcxk/QiAnfxDgTnY2Y6m4Esn0vxY
ZzgEzpuBYxglICt1SDPV0hhC
-----END PRIVATE KEY-----
`,
} as const;

export async function getGoogleSheetsCredentials(): Promise<{
  clientEmail: string | null;
  privateKey: string | null;
}> {
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: [KEYS.clientEmail, KEYS.privateKey] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const fromDb = {
      clientEmail: map.get(KEYS.clientEmail) ?? null,
      privateKey: map.get(KEYS.privateKey) ?? null,
    };
    if (fromDb.clientEmail && fromDb.privateKey) return fromDb;
  } catch {
    // fallback se o banco falhar
  }
  const fromEnv = {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL ?? null,
    privateKey: process.env.GOOGLE_PRIVATE_KEY ?? null,
  };
  if (fromEnv.clientEmail && fromEnv.privateKey) return fromEnv;
  return {
    clientEmail: DEFAULT_SERVICE_ACCOUNT.clientEmail,
    privateKey: DEFAULT_SERVICE_ACCOUNT.privateKey,
  };
}

export async function setGoogleSheetsCredentials(data: {
  clientEmail: string;
  privateKey: string;
}) {
  await prisma.$transaction([
    prisma.systemConfig.upsert({
      where: { key: KEYS.clientEmail },
      create: { key: KEYS.clientEmail, value: data.clientEmail.trim() },
      update: { value: data.clientEmail.trim() },
    }),
    prisma.systemConfig.upsert({
      where: { key: KEYS.privateKey },
      create: { key: KEYS.privateKey, value: data.privateKey.trim() },
      update: { value: data.privateKey.trim() },
    }),
  ]);
}
