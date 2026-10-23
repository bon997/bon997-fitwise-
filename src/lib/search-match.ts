const loose = (s: string) => s.toLocaleLowerCase("sv").normalize("NFD").replace(/[̀-ͯ]/g, "");
// é = e always, but å, ä and ö are letters of their own in Swedish:
const strict = (s: string) =>
  s.toLocaleLowerCase("sv").replace(/[^åäö]/g, (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** Type "ös" → Österåker, not Osby. Type "malmo" (no å/ä/ö on the keyboard) → still Malmö. */
export const searchMatch = (text: string, query: string) =>
  /[åäö]/i.test(query) ? strict(text).includes(strict(query)) : loose(text).includes(loose(query));
