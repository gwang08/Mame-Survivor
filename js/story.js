// Mame Survivor — campaign storyline (AI-authored). 5 acts × 10 stages = a galactic HODL saga.
const STORY = {
  intro: 'The market is bleeding red. Rival meme-coin warlords have seized the galaxy to crash $MAME into the void forever. '
       + 'Only one loyal Doge still believes... Cross 5 sectors, topple every warlord, and HODL all the way to the MOON. 🚀',
  acts: [
    { title:'ACT I · DEEP SPACE',  world:'DEEP SPACE',
      text:'Your launchpad erupts with FOMO. At the first jump-gate waits a traitor of your own kind — the DOGE MONARCH.',
      boss:'DOGE MONARCH', taunt:'“Such empty wallet. Much weak. Wow.”' },
    { title:'ACT II · MARS COLONY', world:'MARS COLONY',
      text:'Red dust, redder candles. The PEPE LORD farms pure despair across the mining colonies of Mars.',
      boss:'PEPE LORD', taunt:'“feels bad man… for YOU.”' },
    { title:'ACT III · TOXIC SWAMP', world:'TOXIC SWAMP',
      text:'A swamp of rug-pulls and dead tokens. WOJAK, the eternal doomer, drags every holder into the abyss.',
      boss:'WOJAK', taunt:'“It is over. We are never going up.”' },
    { title:'ACT IV · NEO-TOKYO', world:'NEO-TOKYO',
      text:'Neon megacity of 100x leverage. ASTEROID, the astronaut shiba, guards the last relay to the moon.',
      boss:'ASTEROID', taunt:'“You will never reach orbit, pup.”' },
    { title:'ACT V · VOID NEBULA', world:'VOID NEBULA',
      text:'The edge of the chart. The BNB CHAIN KING — overlord of all meme coins — awaits. Beat him and $MAME flies forever.',
      boss:'BNB CHAIN KING', taunt:'“I AM the market. Bow.”' },
  ],
  ending: 'Every warlord crushed. $MAME breaks orbit and rockets past the moon — the chart goes vertical, green forever. '
        + 'The loyal Doge is the CHAIN KING now. 🐕👑🚀',
};
function actOf(stage){ return Math.floor((stage-1)/10) % STORY.acts.length; }   // 0..4
