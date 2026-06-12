// Mame Survivor — campaign story (3 stages):
// MAME "The Last Shiba" hunts Pump.fun's enforcers (Chillguy, Penguin), then Asteroid Shiba himself.
const STORY = {
  stages: [
    { // STAGE 1 — Mame meets Moo Deng + Asteroid Shiba, then fights CHILLGUY
      title:'STAGE 1 · DEEP SPACE',
      intro:[
        { who:'mame',     text:'Pump burned Dog Planet. Every last one of you is going DOWN!' },
        { who:'moodeng',  text:'Stop!! Don’t you dare hurt my friend!' },
        { who:'asteroid', text:'Relax, Moo Deng — this pup can’t even lay a paw on me.' },
        { who:'asteroid', text:'Want me, Last Shiba? Crush my two enforcers first. Moo Deng — stay out of this.' },
        { who:'chillguy', text:'Heh... just a chill guy. About to wreck you.' },
      ],
      outro:[
        { who:'chillguy', text:'Tch... not so chill anymore. My boss won’t go easy on you...' },
      ],
    },
    { // STAGE 2 — fight PENGUIN
      title:'STAGE 2 · FROZEN ORBIT',
      intro:[
        { who:'penguin', text:'One down? Cute. You’re not getting past me, mutt.' },
        { who:'mame',    text:'Move, bird. I’m coming for your boss.' },
      ],
      outro:[
        { who:'penguin', text:'Gah...! Just wait — my boss will avenge us!!' },
      ],
    },
    { // STAGE 3 — fight ASTEROID SHIBA; he concedes
      title:'STAGE 3 · PUMP CORE',
      intro:[
        { who:'asteroid', text:'Impressive, Last Shiba. But this is where you go extinct.' },
        { who:'mame',     text:'For Dog Planet. For my friends. Let’s end this.' },
      ],
      outro:[
        { who:'asteroid', text:'Enough... I yield. The Pump capsule controlled me — I never wanted this.' },
        { who:'moodeng',  text:'I knew you were still in there, old friend.' },
        { who:'mame',     text:'Then help me bring the real memes back. This is only the beginning.' },
      ],
    },
  ],
  ending: 'Two enforcers fell, and the Last Shiba reached the Pump Core — freeing Asteroid Shiba from its capsule.\nBut the Pump empire runs deeper still...\n\nTO BE CONTINUED — UPDATE SOON 🚀',
};
function actOf(stage){ return Math.min(Math.max(stage,1),3) - 1; }   // 3 stages -> 0,1,2
