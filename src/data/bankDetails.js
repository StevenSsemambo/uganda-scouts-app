// Single source of truth for the Association's bank details — used
// everywhere a member needs to know where to deposit their fee.
// Update here and it updates everywhere the details are shown.
export const BANK_DETAILS = {
  bankName: 'Stanbic Bank',
  accountNumber: '9030005854481',
  accountName: '', // add once provided
  branch: '',       // add once provided
  swiftCode: '',    // add if members may deposit from outside Uganda
}
