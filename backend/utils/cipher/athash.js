// A toy cipher: shifts char codes by (index + key), reversible
export function encrypt(text, key = 3) {
  return text.split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) + key + i % 5))
    .join("");
}

export function decrypt(text, key = 3) {
  return text.split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) - key - i % 5))
    .join("");
}
