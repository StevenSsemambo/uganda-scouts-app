// Official Uganda Scouts Association membership fee schedule (as at 1 April 2019).
// Selecting a category locks in its membership type and fee — members don't
// type an amount themselves, so there's no risk of an under/over-declared fee.
export const MEMBERSHIP_CATEGORIES = [
  { category: 'Life Membership — Gold', membership_type: 'Life', amount: 250000 },
  { category: 'Life Membership — Silver', membership_type: 'Life', amount: 100000 },
  { category: 'Corporate', membership_type: 'Annual', amount: 500000 },
  { category: 'District / Municipality', membership_type: 'Annual', amount: 150000 },
  { category: 'Unit Registration — Primary School', membership_type: 'Annual', amount: 30000 },
  { category: 'Unit Registration — Secondary / Tertiary', membership_type: 'Annual', amount: 50000 },
  { category: 'Commissioners', membership_type: 'Annual', amount: 20000 },
  { category: 'Woodbadge', membership_type: 'Annual', amount: 20000 },
  { category: 'Scout Leaders', membership_type: 'Annual', amount: 10000 },
  { category: 'Rover Scouts', membership_type: 'Annual', amount: 5000 },
  { category: 'Scouts (Cubs / Juniors / Ventures)', membership_type: 'Annual', amount: 3000 },
]

export function categoryFee(categoryLabel) {
  return MEMBERSHIP_CATEGORIES.find(c => c.category === categoryLabel) || null
}
