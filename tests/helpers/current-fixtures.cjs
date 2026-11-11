'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),manifest=require('../current-fixtures.json');
function fixturePath(id){
 const row=manifest.fixtures.find(item=>item.id===id);if(!row)throw Error('Unknown required fixture: '+id);
 const file=path.resolve(root,row.path),bytes=fs.readFileSync(file);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 if(digest!==row.sha256)throw Error('Required fixture changed: '+id);
 return file;
}
function readFixture(id){return JSON.parse(fs.readFileSync(fixturePath(id),'utf8'));}
function verifyFixtures(){return manifest.fixtures.map(row=>({id:row.id,kind:row.kind,path:fixturePath(row.id),sha256:row.sha256}));}
module.exports={fixturePath,readFixture,verifyFixtures};
