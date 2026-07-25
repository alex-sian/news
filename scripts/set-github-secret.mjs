import { execFileSync } from "node:child_process";
import { stdin } from "node:process";
import sodium from "libsodium-wrappers";

const [repo, secretName] = process.argv.slice(2);
if (!repo || !secretName) {
  console.error("Usage: node scripts/set-github-secret.mjs owner/repo SECRET_NAME");
  process.exit(2);
}

const secretValue = await new Promise((resolve, reject) => {
  let value = "";
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    value += chunk;
  });
  stdin.on("end", () => resolve(value.trim()));
  stdin.on("error", reject);
});

if (!secretValue) {
  console.error("Secret value was empty.");
  process.exit(2);
}

const token = execFileSync("security", [
  "find-generic-password",
  "-a",
  "alex",
  "-s",
  "github-token",
  "-w",
], { encoding: "utf8" }).trim();

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
};

const keyResponse = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
  headers,
});
if (!keyResponse.ok) {
  throw new Error(`GitHub public key request failed: ${keyResponse.status}`);
}
const publicKey = await keyResponse.json();

await sodium.ready;
const encryptedBytes = sodium.crypto_box_seal(
  sodium.from_string(secretValue),
  sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL),
);
const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

const putResponse = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${secretName}`, {
  method: "PUT",
  headers: {
    ...headers,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    encrypted_value: encryptedValue,
    key_id: publicKey.key_id,
  }),
});

if (!putResponse.ok) {
  throw new Error(`GitHub secret update failed: ${putResponse.status}`);
}

console.log(`${secretName} updated for ${repo}.`);
