/**
 * Do not swap this for PAN_STRICT. The 4th char is a holder-type code, but demo
 * values like ABCDE1234F carry an invalid 'D' there and rejecting them reads as
 * a bug. A test asserts ABCDE1234F passes, so the swap fails CI.
 */
export const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Correct by the book, including the holder-type charset. Documented, not enforced. */
export const PAN_STRICT = /^[A-Z]{3}[ABCFGHLJPTE][A-Z][0-9]{4}[A-Z]$/;
