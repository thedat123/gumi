import { chromium } from '@playwright/test';
import sharp from 'sharp';
const base=process.env.GAME_BASE_URL || 'http://127.0.0.1:5203';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
 await page.addInitScript(()=>localStorage.setItem('ld_mock_v3',JSON.stringify({session:{userId:'water-qa',email:'test5@gumi.vn'},users:{},profile:{id:'water-qa',name:'QA',avatar:'🐱',level:100,drinksPerWeek:7,role:'player',sugarPassAvailable:true},completed:[],passed:[],rejected:[],levels:{},wall:[],campaignDay:14,passesLeft:2,playStreak:0,storyBonus:0,earnedPoints:{}})));
 await page.goto(`${base}/mission/14?gfx=low`);
 await page.getByRole('button',{name:'Bắt đầu',exact:true}).waitFor();
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 // Freeze the actual scene and display every pooled sprite at a fixed point for a pixel check.
 const boxes=await page.evaluate(()=>{
   const scene=document.querySelector('.water-scene');
   const overlay=scene.parentElement.lastElementChild;if(overlay!==scene)overlay.remove();
   return ['water','tea','cube','sugar','candy'].map((kind,index)=>{
     const node=scene.querySelectorAll('.water-drop')[index];node.hidden=false;node.dataset.kind=kind;
     node.style.transform=`translate3d(${40+index*70}px,250px,0)`;
     const rect=node.getBoundingClientRect();return{kind,x:rect.x,y:rect.y,width:rect.width,height:rect.height};
   });
 });
 const png=await page.screenshot({path:'/private/tmp/gumi-water-drops-fixed.png'});
 const colors={water:[95,168,232],tea:[111,182,160],cube:[234,216,176],sugar:[242,242,242],candy:[241,154,176]};
 for(const box of boxes){
   const {data,info}=await sharp(png).extract({left:Math.round(box.x),top:Math.round(box.y),width:28,height:28}).removeAlpha().raw().toBuffer({resolveWithObject:true});
   let count=0,minY=28,maxY=-1;
   for(let y=0;y<28;y++)for(let x=0;x<28;x++){
     const i=(y*28+x)*info.channels;
     if(colors[box.kind].every((v,c)=>Math.abs(data[i+c]-v)<5)){count++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   }
   const good=['water','tea'].includes(box.kind);
   if(count<(good?100:250)||maxY-minY<(good?21:17))throw Error(`Sprite clipped: ${box.kind}, pixels=${count}, height=${maxY-minY+1}`);
   console.log(`PASS ${box.kind}: ${count} solid pixels, ${maxY-minY+1}px height`);
 }
} finally {await browser.close();}
