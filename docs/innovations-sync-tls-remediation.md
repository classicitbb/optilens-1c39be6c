# Innovations Sync TLS Remediation

## Purpose

Use this runbook when the OptiLens Local Innovations sync fails before the
cloud receiver responds with a Node error such as:

```text
unable to verify the first certificate
```

This is an outbound HTTPS trust failure on the connector host. It is separate
from the Innovations SQL Server certificate settings and must not be worked
around by disabling TLS verification.

## Safety rules

- Do not use `-k` / `--insecure` for the sync.
- Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Do not accept or install a certificate until its issuer and fingerprint have
  been verified with the organisation that operates the network or receiver.
- Do not record the receiver URL, API key, certificate private key, or internal
  network address in tickets, logs, or this repository.

## Diagnose the trust path

Run this on the OptiLens Local host in an elevated PowerShell session. It makes
one unauthenticated read of the receiver version endpoint and does not send a
sync payload:

```powershell
@'
const vault = require('./lib/credential-vault');
const { functionsBase } = require('./lib/innovations-sync');

(async () => {
  const credentials = vault.cvApiFromVault();
  if (!credentials) throw new Error('CV API credentials are unavailable from the credential vault.');
  const endpoint = `${functionsBase(credentials.baseUrl)}/innovations-sync/version`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
  console.log(JSON.stringify({ status: response.status, body: (await response.text()).slice(0, 300) }));
})().catch((error) => {
  console.error(error.cause?.message || error.message || String(error));
  process.exitCode = 1;
});
'@ | node
```

Interpret the result before making a change:

| Result | Meaning | Next action |
| --- | --- | --- |
| `unable to verify the first certificate` | The issuer chain presented to Node is incomplete or untrusted. | Inspect the certificate issuer and repair the trusted CA path below. |
| `CERT_HAS_EXPIRED` | A certificate in the chain has expired. | Renew the affected receiver, proxy, or enterprise CA certificate. |
| Hostname mismatch | The certificate does not cover the configured receiver hostname. | Correct the receiver certificate or configured hostname; do not override hostname validation. |
| HTTP status | TLS succeeded. | Continue with the dry-run verification section. |

Use the Windows certificate viewer or the organisation's approved network
inspection process to identify the leaf certificate and issuing CA. If a TLS
inspection proxy is involved, its enterprise root CA must be explicitly
approved; an unexpected issuer is a security incident, not a connector fix.

## Repair the trusted CA path

### Public receiver certificate

If the receiver is public and its certificate should chain to a public CA:

1. Correct the receiver's full certificate chain so it sends the leaf and any
   required intermediate certificates.
2. Apply current Windows root-certificate updates on the connector host.
3. Restart the OptiLens Local service and rerun the diagnostic.

Do not install a public receiver's leaf certificate as a trusted root.

### Approved enterprise inspection CA

If the network deliberately intercepts HTTPS:

1. Obtain the enterprise root CA certificate through the organisation's
   approved IT distribution process.
2. Verify the issuer, subject, fingerprint, and intended scope with IT.
3. Install the public CA certificate in **Local Computer > Trusted Root
   Certification Authorities**, preferably through the approved Group Policy
   or device-management mechanism.
4. Restart the OptiLens Local service and repeat the diagnostic.

### Node does not consume the Windows trust store

The configured runtime is Node 22. Node 22.19 or newer supports the Windows
system trust store through `NODE_USE_SYSTEM_CA=1` (or `--use-system-ca`).
After confirming the installed Node version supports it, configure the service
environment with this name-only setting:

```text
NODE_USE_SYSTEM_CA=1
```

For an older supported Node runtime, use a PEM bundle containing only the
approved public CA certificate(s), stored outside the repository with ACLs
restricted to the service identity, and configure:

```text
NODE_EXTRA_CA_CERTS=<approved PEM bundle path>
```

`NODE_EXTRA_CA_CERTS` is read only when Node starts. Restart the service after
changing it. Do not place the PEM file, its path, or certificate private keys
in source control.

## Verify before committing a sync

First run only the two store-lens entities as a dry run. This validates the
receiver and payload but does not write cloud records:

```powershell
node scripts/innovations-sync-cli.js --use-credential-vault --dry-run --entities store_lenses,store_lens_power_rows
```

Review the result for a reachable receiver, zero failed records, and expected
entity counts. For the HA stock-order families, use the narrowly scoped
eight-family dry-run through the approved harness rather than a full catalog
push. Only after that review may an authorized operator run the corresponding
committed sync and then verify the active storefront variants.

## Evidence to retain

Record only these non-secret facts in the operations ticket:

- Node version and whether it supports system CA loading.
- Certificate issuer/fingerprint confirmation outcome, not the certificate
  material itself.
- Whether the receiver version read succeeded.
- Dry-run entity counts, failure count, and timestamp.

## References

Node documents `NODE_EXTRA_CA_CERTS` as an additive PEM trust bundle loaded at
process start, and documents Windows system-CA support in current Node 22
releases through `NODE_USE_SYSTEM_CA=1` / `--use-system-ca`.
