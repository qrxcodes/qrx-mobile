// Creates the persistent Apple signing identities for CI (one Development and one Distribution certificate) without a
// Mac: OpenSSL makes the keys and CSRs, the App Store Connect API issues the certificates, and each is packed into a
// .p12 that goes straight into this repo's GitHub secrets. The private keys never leave a temp folder that is deleted.
//
// For the owner, once (and again when the certificates expire after a year; revoke the old ones first):
//   ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_P8_PATH=/path/AuthKey_….p8 node tools/apple-signing/create-certs.mjs create
//   … list
//   … revoke <id> [<id> …]
//
// Needs: openssl and gh on PATH, an App Store Connect API key with the Admin role, and admin on qrxcodes/qrx-mobile.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const { ASC_KEY_ID: KEY_ID, ASC_ISSUER_ID: ISSUER, ASC_P8_PATH: P8_PATH } = process.env;
const REPO = process.env.GH_REPO ?? 'qrxcodes/qrx-mobile';
if (!KEY_ID || !ISSUER || !P8_PATH) {
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID and ASC_P8_PATH (an App Store Connect API key with the Admin role).');
  process.exit(1);
}
const p8 = fs.readFileSync(P8_PATH, 'utf8');
function jwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: ISSUER, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' }),
  ).toString('base64url');
  const sign = crypto.createSign('SHA256');
  sign.update(`${header}.${payload}`);
  const der = sign.sign({ key: p8 });
  const parse = (buf) => {
    let i = 2;
    if (buf[1] & 0x80) i = 2 + (buf[1] & 0x7f);
    const ints = [];
    for (let k = 0; k < 2; k++) {
      if (buf[i] !== 0x02) throw new Error('bad DER');
      const len = buf[i + 1];
      let v = buf.subarray(i + 2, i + 2 + len);
      while (v.length > 32) v = v.subarray(1);
      const out = Buffer.alloc(32);
      v.copy(out, 32 - v.length);
      ints.push(out);
      i += 2 + len;
    }
    return Buffer.concat(ints);
  };
  return `${header}.${payload}.${parse(der).toString('base64url')}`;
}

async function api(pathname, method = 'GET', body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'DELETE') return { status: res.status };
  return res.json();
}

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const cmd = process.argv[2];
if (cmd === 'list') {
  const d = await api('/v1/certificates?limit=50');
  for (const c of d.data ?? []) {
    console.log(`${c.id} | ${c.attributes.certificateType} | expires ${c.attributes.expirationDate?.slice(0, 10)}`);
  }
} else if (cmd === 'revoke') {
  for (const id of process.argv.slice(3)) {
    const r = await api(`/v1/certificates/${id}`, 'DELETE');
    console.log(`${id}: ${r.status === 204 ? 'revoked' : 'FAILED ' + r.status}`);
  }
} else if (cmd === 'create') {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'apple-certs-'));
  const password = crypto.randomBytes(18).toString('base64url');
  const p12s = [];
  for (const type of ['DEVELOPMENT', 'DISTRIBUTION']) {
    const keyFile = path.join(work, `${type}.key`);
    const csrFile = path.join(work, `${type}.csr`);
    sh('openssl', [
      'req',
      '-new',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyFile,
      '-out',
      csrFile,
      '-subj',
      '/CN=QRX CI/O=MakerX/C=AU',
    ]);
    const csr = fs.readFileSync(csrFile, 'utf8');
    const res = await api('/v1/certificates', 'POST', {
      data: { type: 'certificates', attributes: { certificateType: type, csrContent: csr } },
    });
    if (!res.data) throw new Error(`certificate create failed: ${JSON.stringify(res.errors)}`);
    const certDer = Buffer.from(res.data.attributes.certificateContent, 'base64');
    const derFile = path.join(work, `${type}.der`);
    const pemFile = path.join(work, `${type}.pem`);
    fs.writeFileSync(derFile, certDer);
    sh('openssl', ['x509', '-inform', 'DER', '-in', derFile, '-out', pemFile]);
    const p12File = path.join(work, `${type}.p12`);
    sh('openssl', [
      'pkcs12',
      '-export',
      '-out',
      p12File,
      '-inkey',
      keyFile,
      '-in',
      pemFile,
      '-passout',
      `pass:${password}`,
      // macOS `security import` needs the legacy PBE algorithms
      '-legacy',
    ]);
    p12s.push({ type, file: p12File, id: res.data.id });
    console.log(
      `created ${type} certificate ${res.data.id}, expires ${res.data.attributes.expirationDate?.slice(0, 10)}`,
    );
  }
  // Two p12s -> one base64 secret each + one shared password secret.
  for (const { type, file } of p12s) {
    const b64 = fs.readFileSync(file).toString('base64');
    const name = type === 'DEVELOPMENT' ? 'APPLE_DEV_CERT_P12' : 'APPLE_DIST_CERT_P12';
    execFileSync('gh', ['secret', 'set', name, '--repo', REPO, '--body', b64], { stdio: 'inherit' });
  }
  execFileSync('gh', ['secret', 'set', 'APPLE_CERTS_PASSWORD', '--repo', REPO, '--body', password], {
    stdio: 'inherit',
  });
  fs.rmSync(work, { recursive: true, force: true });
  console.log('Secrets set: APPLE_DEV_CERT_P12, APPLE_DIST_CERT_P12, APPLE_CERTS_PASSWORD');
  console.log('(private keys existed only in the temp dir, now deleted; the p12s in the secrets are the only copies)');
} else {
  console.log('usage: create-certs.mjs create|list|revoke <id>...');
}
