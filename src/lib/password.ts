import { randomInt } from "node:crypto";

/*
  Heslo se předává osobně nebo ve zprávě, takže se musí dát nadiktovat
  bez ptaní „velké, nebo malé?". Vynechané znaky: 0/O, 1/l/I, 5/S, 2/Z.
*/
const ALPHABET = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "346789";

export function generatePassword(): string {
  const block = (length: number) =>
    Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

  const digits = Array.from(
    { length: 3 },
    () => DIGITS[randomInt(DIGITS.length)],
  ).join("");

  // Tvar slovo-slovo-číslice, např. „krotva-plemn-473".
  return `${block(6)}-${block(5)}-${digits}`;
}
