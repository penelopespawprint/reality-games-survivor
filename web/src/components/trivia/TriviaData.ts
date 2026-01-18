/**
 * Trivia Data and Types
 * Generated from Season 50 castaway fun facts - 24 questions total (one per castaway)
 */

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
  castaway: string;
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    castaway: 'Rob Mariano',
    question: 'What memorable event happened during the All-Stars finale involving Rob Mariano?',
    options: ['He won fire-making', 'He proposed to Amber', 'He found a hidden idol', 'He was voted out unanimously'],
    correctIndex: 1,
    funFact:
      'Rob proposed to Amber on the All-Stars finale, they married and have 4 daughters.',
  },
  {
    castaway: 'Sandra Diaz-Twine',
    question: 'What historic Survivor achievement does Sandra Diaz-Twine hold?',
    options: ['Most days played', 'Only player to win twice', 'Most idols found', 'Most challenge wins'],
    correctIndex: 1,
    funFact:
      'Sandra is the only player to win Survivor twice, famous for her "As long as it ain\'t me" strategy.',
  },
  {
    castaway: 'Tony Vlachos',
    question: 'What is Tony Vlachos famous for building during his Survivor seasons?',
    options: ['Fire pits', 'Spy shacks and bunkers', 'Fishing traps', 'Tree houses'],
    correctIndex: 1,
    funFact:
      'Tony is known for building spy shacks/bunkers to eavesdrop on his tribemates.',
  },
  {
    castaway: 'Cirie Fields',
    question: 'What was Cirie Fields famously described as before becoming a Survivor legend?',
    options: ['A super athlete', 'Someone afraid to get off the couch', 'A wilderness expert', 'A competitive swimmer'],
    correctIndex: 1,
    funFact:
      'Cirie started as someone "afraid to get off the couch" and became one of the best to never win.',
  },
  {
    castaway: 'Tyson Apostol',
    question: 'What embarrassing mistake did Tyson Apostol make in Heroes vs Villains?',
    options: ['Lost his buff', 'Voted himself out', 'Forgot to vote', 'Played idol wrong'],
    correctIndex: 1,
    funFact:
      'Tyson is a professional cyclist who once voted himself out by mistake in Heroes vs Villains.',
  },
  {
    castaway: 'Sarah Lacina',
    question: 'How did Sarah Lacina describe her winning Game Changers strategy?',
    options: ['Playing like a criminal instead of a cop', 'Under the radar', 'Challenge beast mode', 'Loyal to the end'],
    correctIndex: 0,
    funFact:
      'Sarah was the first player to win Game Changers by playing like a criminal instead of a cop.',
  },
  {
    castaway: 'Ben Driebergen',
    question: 'How many hidden immunity idols did Ben Driebergen find in his winning season?',
    options: ['1', '2', '3', '4'],
    correctIndex: 2,
    funFact:
      'Ben found 3 idols in his winning season and won the fire-making challenge to reach Final 3.',
  },
  {
    castaway: 'Natalie Anderson',
    question: 'What happened to Natalie Anderson\'s twin sister Nadiya in San Juan del Sur?',
    options: ['Made the merge', 'Won immunity', 'Voted out first', 'Made Final 3'],
    correctIndex: 2,
    funFact:
      'Natalie won San Juan del Sur after her twin sister Nadiya was voted out first.',
  },
  {
    castaway: 'Parvati Shallow',
    question: 'What famous alliance did Parvati Shallow pioneer in Micronesia?',
    options: ['The Villains', 'Black Widow Brigade', 'The Four Horsemen', 'Stealth R Us'],
    correctIndex: 1,
    funFact:
      'Parvati pioneered the "Black Widow Brigade" alliance and flirting strategy.',
  },
  {
    castaway: 'Kim Spradlin-Wolfe',
    question: 'Which season is Kim Spradlin-Wolfe considered to have played the most dominant game?',
    options: ['Cambodia', 'One World', 'Cagayan', 'Pearl Islands'],
    correctIndex: 1,
    funFact:
      'Kim is considered to have played the most dominant winning game ever in One World.',
  },
  {
    castaway: 'Jeremy Collins',
    question: 'What strategy did Jeremy Collins use to win Cambodia?',
    options: ['Under the radar', 'Meat shield strategy', 'Challenge beast', 'Idol hunting'],
    correctIndex: 1,
    funFact:
      'Jeremy won Cambodia by successfully playing his meat shield strategy.',
  },
  {
    castaway: 'Michele Fitzgerald',
    question: 'What was unique about Michele Fitzgerald\'s Final Tribal Council win?',
    options: ['Unanimous vote', 'Won without receiving votes until winner reveal', 'Tied with another player', 'Won by one vote'],
    correctIndex: 1,
    funFact:
      'Michele won despite not receiving votes at final tribal until the winner reveal.',
  },
  {
    castaway: 'Wendell Holland',
    question: 'What historic first occurred when Wendell Holland won Ghost Island?',
    options: ['First unanimous winner', 'First tie-breaker vote at Final Tribal', 'First idol play at FTC', 'First fire-making winner'],
    correctIndex: 1,
    funFact:
      'Wendell won Ghost Island in the first ever tie-breaker vote at Final Tribal Council.',
  },
  {
    castaway: 'Sophie Clarke',
    question: 'How did Sophie Clarke beat Coach in South Pacific?',
    options: ['Won fire-making', 'Called out his religious hypocrisy', 'Had more immunity wins', 'Found more idols'],
    correctIndex: 1,
    funFact:
      'Sophie beat Coach in South Pacific by calling out his religious hypocrisy.',
  },
  {
    castaway: 'Yul Kwon',
    question: 'What famous comeback did Yul Kwon lead in Cook Islands?',
    options: ['Aitu Four from 4 vs 8', 'Foa Foa from 4 vs 8', 'Heroes from 5 vs 5', 'Villains from 3 vs 6'],
    correctIndex: 0,
    funFact:
      'Yul led the famous "Aitu Four" comeback from 4 vs 8 to win Cook Islands.',
  },
  {
    castaway: 'Denise Stapley',
    question: 'What remarkable record did Denise Stapley set in Philippines?',
    options: ['Most challenge wins', 'Attended every tribal council and won', 'Found most idols', 'Received zero votes'],
    correctIndex: 1,
    funFact:
      'Denise attended every single tribal council in Philippines and still won.',
  },
  {
    castaway: 'Ethan Zohn',
    question: 'What charity did Ethan Zohn start with his Survivor winnings?',
    options: ['Feed the Children', 'Grassroot Soccer', 'Red Cross', 'Habitat for Humanity'],
    correctIndex: 1,
    funFact:
      'Ethan is a cancer survivor who used his winnings to start Grassroot Soccer charity.',
  },
  {
    castaway: 'Tina Wesson',
    question: 'What historic Survivor first does Tina Wesson hold?',
    options: ['First unanimous winner', 'First female winner', 'First to find an idol', 'First to play twice'],
    correctIndex: 1,
    funFact:
      'Tina was the first female winner of Survivor and later returned with her daughter Katie.',
  },
  {
    castaway: 'Earl Cole',
    question: 'What two historic firsts did Earl Cole achieve in Fiji?',
    options: ['Won without watching the show before and first unanimous winner', 'First idol find and most days played', 'First challenge sweep and zero votes against', 'First minority winner and most confessionals'],
    correctIndex: 0,
    funFact:
      'Earl was the first unanimous winner in Survivor history and never watched the show before playing.',
  },
  {
    castaway: 'JT Thomas',
    question: 'What infamous move did JT Thomas make in Heroes vs Villains?',
    options: ['Voted out his ally', 'Gave his idol to Russell', 'Threw a challenge', 'Quit the game'],
    correctIndex: 1,
    funFact:
      'JT won Tocantins with zero votes against him but is infamous for giving his idol to Russell in HvV.',
  },
  {
    castaway: 'Vecepia Towery',
    question: 'What historic first did Vecepia Towery achieve in Marquesas?',
    options: ['First female winner', 'First African American winner', 'First unanimous winner', 'First to find an idol'],
    correctIndex: 1,
    funFact:
      'Vecepia was the first African American winner of Survivor, known for her under-the-radar game.',
  },
  {
    castaway: 'Danni Boatwright',
    question: 'How did Danni Boatwright hide her strategy from producers in Guatemala?',
    options: ['Never spoke in confessionals', 'Spoke in code', 'Wrote notes instead', 'Used hand signals'],
    correctIndex: 1,
    funFact:
      'Danni won Guatemala while hiding her strategy from producers by speaking in code.',
  },
  {
    castaway: 'Adam Klein',
    question: 'Who did Adam Klein dedicate his Survivor win to?',
    options: ['His father', 'His mother who passed away from cancer', 'His sister', 'His best friend'],
    correctIndex: 1,
    funFact:
      'Adam dedicated his win to his mother who passed away from lung cancer days after filming.',
  },
  {
    castaway: 'Nick Wilson',
    question: 'What was unique about how Nick Wilson named his alliances?',
    options: ['Named them after animals', 'Named them after famous duos', 'Named them after movies', 'Named them after songs'],
    correctIndex: 1,
    funFact:
      'Nick named all his alliances after famous duos (Mason-Dixon, Rockstars, etc.).',
  },
];

export const WRONG_MESSAGES = [
  'The Tribe Has Spoken.',
  'Your torch has been snuffed.',
  'Time for you to go.',
  'Blindsided!',
  "That's a vote against you.",
  "You've been voted out of the trivia.",
  'Grab your torch, head back to camp... to study.',
  "You didn't have the numbers.",
  "Should've played your idol.",
  'The jury saw right through that.',
];
