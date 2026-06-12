// Mame Survivor — campaign story as a visual-novel DIALOGUE between MAME and each boss.
// Each act: a short back-and-forth (who: 'mame' | 'boss' | 'narrator').
const STORY = {
  acts: [
    { title:'ACT I · DEEP SPACE', world:'DEEP SPACE', dialogue:[
      { who:'narrator', text:'The market is bleeding red. Rival meme-coin warlords seized the galaxy to crash $MAME into the void. One loyal Doge sets off for the MOON...' },
      { who:'boss', text:'Such empty wallet. Much weak. Wow.' },
      { who:'mame', text:'Step aside, Asteroid Shiba — the Moon is mine to reach.' },
      { who:'boss', text:'You? A nobody coin? This gate stays shut.' },
      { who:'mame', text:'Then I’ll open it with your liquidation. Let’s go.' },
    ], outro:[
      { who:'boss', text:'Gah! You win this gate… but catch me if you can!' },
      { who:'mame', text:'You can’t escape, Asteroid Shiba! To the next sector — after him!' },
    ]},
    { title:'ACT II · MARS COLONY', world:'MARS COLONY', dialogue:[
      { who:'boss', text:'feels bad man... for YOU.' },
      { who:'mame', text:'Save the tears, frog. I’m fully green-pilled.' },
      { who:'boss', text:'Mars runs on despair. You’ll sink in red candles.' },
      { who:'mame', text:'Then I’ll buy the dip — right on your face.' },
    ], outro:[
      { who:'boss', text:'Ribbit! I’m bailing — to the next chain!' },
      { who:'mame', text:'No rug-puller outruns me. Punch it!' },
    ]},
    { title:'ACT III · TOXIC SWAMP', world:'TOXIC SWAMP', dialogue:[
      { who:'boss', text:'It is over. We are never going up again.' },
      { who:'mame', text:'Cope harder, doomer. Real ones HODL.' },
      { who:'boss', text:'...wait. Maybe... we are so back?' },
      { who:'mame', text:'Now you get it. Step aside and watch.' },
    ], outro:[
      { who:'boss', text:'Maybe we ARE going up… away from YOU!' },
      { who:'mame', text:'Not so fast, doomer — I’m right behind you!' },
    ]},
    { title:'ACT IV · NEO-TOKYO', world:'NEO-TOKYO', dialogue:[
      { who:'boss', text:'You will never reach orbit, pup.' },
      { who:'mame', text:'Watch me break atmosphere, astronaut.' },
      { who:'boss', text:'This relay is the moon’s final gate. I am its guard.' },
      { who:'mame', text:'Then this is exactly where you fall.' },
    ], outro:[
      { who:'boss', text:'I’ll reach the moon first — without you!' },
      { who:'mame', text:'That moon is MINE, astronaut. Chase!' },
    ]},
    { title:'ACT V · VOID NEBULA', world:'VOID NEBULA', dialogue:[
      { who:'boss', text:'I AM the market. Bow before the chain.' },
      { who:'mame', text:'Markets crash, king. Especially yours.' },
      { who:'boss', text:'One paw against the whole chain? Madness.' },
      { who:'mame', text:'One loyal Doge is all it takes. TO THE MOON! 🚀' },
    ], outro:[
      { who:'boss', text:'This… isn’t… over, Doge…' },
      { who:'mame', text:'It is. $MAME flies — to the moon, forever! 🚀' },
    ]},
  ],
  ending: 'Every warlord crushed. $MAME breaks orbit and rockets past the moon — the chart goes vertical, green forever. The loyal Doge is the CHAIN KING now. 🐕👑🚀',
};
// special one-time transition after STAGE 1: Moo Deng flies in and blocks MAME
STORY.stage1Trans = [
  { who:'boss',    text:'Heh! Catch me if you can — the Pump fleet is mine!' },
  { who:'moodeng', text:'Wait!! What are you doing?! Are you trying to KILL my friend?!' },
  { who:'mame',    text:'Stand aside, Moo Deng. I have to chase him down — I will avenge my friend.' },
];
function actOf(stage){ return Math.floor((stage-1)/10) % STORY.acts.length; }   // 0..4
