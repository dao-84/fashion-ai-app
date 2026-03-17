function cleanTextInput(value) {
  if (!value) return '';
  return String(value).replace(/[\x00-\x1F\x7F]/g, '').trim();
}

module.exports = {
  cleanTextInput,
};
