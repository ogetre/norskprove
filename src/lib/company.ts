/*
 * Who runs NorskprøveKlar, for the contact page, the sales terms and the privacy policy. The
 * e-commerce act (ehandelsloven § 8) requires the name, organisation number, a postal address and
 * an e-mail address. An empty field shows as «fylles inn» on the pages until it is filled in;
 * fill them all in before payments are switched on.
 */
export const COMPANY = {
  /** The company, or the owner's name for a sole proprietorship (ENK). */
  name: "",
  /** Nine digits from Brønnøysundregistrene, with «MVA» after them when VAT-registered. */
  orgNr: "",
  /** Street, postcode and place. */
  address: "",
  /** Where learners reach support, for example kontakt@norskproveklar.no. */
  email: "",
};

/** When the terms and the privacy policy last changed. */
export const LEGAL_UPDATED = "22. oktober 2026";
