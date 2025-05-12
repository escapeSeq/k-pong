const K_FACTOR = 32;

const calculateElo = (playerRating, opponentRating, outcome) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = outcome === 'win' ? 1 : 0;
  
  return Math.round(playerRating + K_FACTOR * (actualScore - expectedScore));
};

module.exports = { calculateElo }; 