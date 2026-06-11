// Doge Survivor — upgrade pool offered on level up (pick 1 of 3)
const UPGRADES = [
  {icon:'💥', name:'Damage +30%',     desc:'Bắn đau hơn',       apply:p=>p.damage=Math.round(p.damage*1.3)},
  {icon:'⚡', name:'Fire Rate +20%',  desc:'Bắn nhanh hơn',     apply:p=>p.fireRate=Math.max(6,Math.round(p.fireRate*0.8))},
  {icon:'🔱', name:'+1 Projectile',   desc:'Thêm 1 tia đạn',    apply:p=>p.bullets+=1},
  {icon:'🥾', name:'Move Speed +15%', desc:'Chạy nhanh hơn',    apply:p=>p.speed*=1.15},
  {icon:'❤️', name:'Max HP +25',      desc:'Trâu hơn + hồi máu',apply:p=>{p.maxHp+=25; p.hp=Math.min(p.maxHp,p.hp+25);}},
  {icon:'🧲', name:'Pickup +40%',     desc:'Hút XP xa hơn',     apply:p=>p.pickup*=1.4},
  {icon:'🎯', name:'Pierce +1',       desc:'Đạn xuyên thêm',    apply:p=>p.pierce+=1},
  {icon:'🚀', name:'Bullet Speed',    desc:'Đạn bay nhanh +25%',apply:p=>p.bulletSpeed*=1.25},
  {icon:'💚', name:'Regen',           desc:'Tự hồi máu +0.4/s', apply:p=>p.regen+=0.4},
  {icon:'📡', name:'Range +20%',      desc:'Tầm bắn xa hơn',    apply:p=>p.range*=1.2},
];
function rollUpgrades(){
  const pool=[...UPGRADES], out=[];
  for(let i=0;i<3 && pool.length;i++) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  return out;
}
