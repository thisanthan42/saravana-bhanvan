export const SPECIFIC_QUESTIONS = [
  {
    id: 'service',
    title: 'How was our service?',
    subtitle: 'Promptness, attention & dining assistance',
    icon: 'UtensilsCrossed',
  },
  {
    id: 'cleanliness',
    title: 'How was the cleanliness?',
    subtitle: 'Tables, dining area & hygiene standards',
    icon: 'Sparkles',
  },
  {
    id: 'toilet',
    title: 'How was the toilet/restroom?',
    subtitle: 'Sanitation, supplies & freshness',
    icon: 'Droplets',
  },
  {
    id: 'parking',
    title: 'How was the parking facility?',
    subtitle: 'Space availability & valet/security assistance',
    icon: 'Car',
  },
  {
    id: 'food',
    title: 'How was the food?',
    subtitle: 'Taste, freshness, temperature & presentation',
    icon: 'Soup',
  },
  {
    id: 'staffBehaviour',
    title: 'How was the staff behaviour?',
    subtitle: 'Courtesy, politeness & friendliness',
    icon: 'HeartHandshake',
  },
];

export const RATING_OPTIONS = [
  {
    value: 'good',
    label: 'Good',
    emoji: '😊',
    activeBg: 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20',
    indicatorColor: 'bg-emerald-500 text-white',
    hoverBg: 'hover:bg-emerald-50/50 hover:border-emerald-200',
  },
  {
    value: 'average',
    label: 'Average',
    emoji: '😐',
    activeBg: 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-2 ring-amber-500/20',
    indicatorColor: 'bg-amber-500 text-white',
    hoverBg: 'hover:bg-amber-50/50 hover:border-amber-200',
  },
  {
    value: 'bad',
    label: 'Bad',
    emoji: '🙁',
    activeBg: 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-2 ring-rose-500/20',
    indicatorColor: 'bg-rose-500 text-white',
    hoverBg: 'hover:bg-rose-50/50 hover:border-rose-200',
  },
];

export const STAR_DESCRIPTIONS = {
  1: { label: 'Poor', text: 'We apologize for not meeting your expectations.' },
  2: { label: 'Fair', text: 'We have room to improve and appreciate your honesty.' },
  3: { label: 'Good', text: 'Thank you! Glad you had a satisfactory visit.' },
  4: { label: 'Very Good', text: 'Delighted to know you enjoyed your experience!' },
  5: { label: 'Excellent', text: 'Outstanding! Thank you for the wonderful rating!' },
};
