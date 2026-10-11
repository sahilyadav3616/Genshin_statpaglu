const test=require('node:test');
const assert=require('node:assert/strict');
const {getFinalStats,serializeCharacter,characterElementFromAsset,characterImageFromMetadata}=require('../server');

test('extended final totals take precedence over regular combat stat IDs',()=>{
 const stats=getFinalStats({fightPropMap:{'2':10000,'5':1200,'8':700,'2000':22222,'2001':1888,'2002':900,'28':150,'20':0.62,'22':1.84,'23':1.3,'42':0.466}});
 const value=label=>stats.find(stat=>stat.label===label);
 assert.equal(value('HP').rawValue,22222);assert.equal(value('ATK').rawValue,1888);assert.equal(value('DEF').rawValue,900);
 assert.equal(value('Elemental Mastery').rawValue,150);assert.equal(value('CRIT Rate').rawValue,0.62);assert.equal(value('Hydro DMG Bonus').rawValue,0.466);
});
test('regular combat stat IDs remain fallbacks when extended totals are absent',()=>{
 const stats=getFinalStats({fightPropMap:{'2':12000,'5':1500,'8':800}}),value=label=>stats.find(stat=>stat.label===label);
 assert.equal(value('HP').rawValue,12000);assert.equal(value('ATK').rawValue,1500);assert.equal(value('DEF').rawValue,800);
});
test('Ayaka talent aliases map showcase IDs to the correct three talents',()=>{
 const character=serializeCharacter({avatarId:10000002,propMap:{'4001':{ival:90}},fightPropMap:{'2000':15000,'2001':1800,'2002':900,'20':0.4,'22':2.8,'23':1.2},talentIdList:[1,2],skillLevelMap:{'10261':9,'10262':10,'10265':10},equipList:[]},{name:'Kamisato Ayaka',element:'Cryo'});
 assert.deepEqual(character.talents.map(t=>t.level),[9,10,10]);assert.equal(character.element,'Cryo');assert.equal(character.level,90);assert.equal(character.constellation,2);assert.equal(character.weapon,null);assert.deepEqual(character.artifacts,[]);
});
test('character element resolver supports current and fallback metadata shapes',()=>{
 assert.equal(characterElementFromAsset({elementType:'Hydro'}),'Hydro');assert.equal(characterElementFromAsset({element:'Pyro'}),'Pyro');assert.equal(characterElementFromAsset({vision:'Cryo'}),'Cryo');assert.equal(characterElementFromAsset({}),null);
});
test('character artwork resolver handles string and URL metadata safely',()=>{
 assert.equal(characterImageFromMetadata({icons:{gacha:'https://example.test/character.png'}}),'https://example.test/character.png');
 assert.equal(characterImageFromMetadata({characterData:{icons:{gacha:{url:'https://example.test/splash.png'}}}}),'https://example.test/splash.png');
 assert.equal(characterImageFromMetadata({}),null);
});
