function validatePhoneNumber(phone) {
  if (!phone) return false;

  // Allow international (+), spaces, hyphens, and digits (min 8 digits)
  const regex = /^[+]?[\d\s\-()]{8,20}$/;
  return regex.test(phone.trim());
}

module.exports = { validatePhoneNumber };