// Simulate the draft logic to debug
const users = [
  { id: 1, name: "Player 1" },
  { id: 2, name: "Player 2" },
  { id: 3, name: "Player 3" },
  { id: 4, name: "Player 4" },
  { id: 5, name: "Player 5" },
  { id: 6, name: "Player 6" },
  { id: 7, name: "Player 7" },
  { id: 8, name: "Player 8" },
  { id: 9, name: "Player 9" }
];

const contestants = Array.from({length: 16}, (_, i) => ({ id: i + 1, name: `Contestant ${i + 1}` }));

console.log("Total players:", users.length);
console.log("Total contestants:", contestants.length);
console.log("\nRound 1 (forward order 1→9):");
console.log("After round 1:", contestants.length - users.length, "contestants remain");

const contestantsAfterR1 = contestants.length - users.length;
console.log("\nRound 2 logic:");
console.log("Contestants after R1:", contestantsAfterR1);
console.log("Players:", users.length);

if (contestantsAfterR1 < users.length) {
  const numReserving = users.length - contestantsAfterR1;
  console.log("\nNOT EQUAL - Reservation needed");
  console.log("Number of players reserving:", numReserving);
  console.log("Players who reserve (don't remove):", users.slice(-numReserving).map(u => u.name));
  console.log("Players who remove from pool:", users.slice(0, users.length - numReserving).reverse().map(u => u.name));
}

