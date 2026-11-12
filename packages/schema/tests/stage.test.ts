import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/sample.cdom.json';
import { validateCdom, validateCommand, validateSvgAsset, type SvgAsset } from '../src';

describe('stage document and command extension', () => {
  it('accepts a lossless v2 extension while v1 rejects optional fields', () => {
    const document = structuredClone(fixture);
    document.schemaVersion = '0.2.0';
    Object.assign(document.layers[0], { visible: false, opacity: 0.5, name: '灯 🐈', keyframes: [{ id: 'kf', timeMs: 0, transform: document.layers[0].transform }] });
    expect(validateCdom(document).valid).toBe(true);
    document.schemaVersion = '0.1.0';
    expect(validateCdom(document).valid).toBe(false);
  });
  it('accepts camera/appearance/keyframe commands and rejects malformed edits', () => {
    const command = { commandId: 'c', projectId: 'p', branchId: 'b', expectedRevision: 0, actor: {kind:'human',id:'u'}, reason:'Edit', op:'setLayerAppearance', targetId:'l', args:{visible:false} };
    expect(validateCommand(command).valid).toBe(true);
    expect(validateCommand({...command,args:{}}).valid).toBe(false);
    expect(validateCommand({...command,args:{opacity:1.01}}).valid).toBe(false);
    expect(validateCommand({...command,op:'setLayerKeyframe',args:{keyframeId:'kf',timeMs:0,transform:fixture.layers[0].transform}}).valid).toBe(true);
    expect(validateCommand({...command,op:'setShotCamera',args:{camera:{aspectRatio:'16:9',position:{x:0,y:0,z:0},fovDeg:45}}}).valid).toBe(false);
  });
});

const svg: SvgAsset = {assetId:'a',uri:'assets/fixtures/a.svg',sourceUri:'assets/fixtures/a.svg',viewBox:{x:0,y:0,width:10,height:10},root:{tag:'svg',id:'root',attributes:{},text:'',children:[{tag:'rect',id:'rect',attributes:{width:'10',height:'10',fill:'#abc'},text:'',children:[]}]}};
it('validates safe SVG data and rejects malformed/unsafe attributes', () => {
  expect(validateSvgAsset(svg).valid).toBe(true);
  const invalid: Record<string, string>[] = [{width:'garbage'}, {width:'-1'}, {opacity:'2'}, {'stroke-linejoin':'malformed'}, {fill:'url(http://x)'}, {onload:'alert(1)'}, {id:'bad'}, {width:'1e999'}];
  for (const attributes of invalid) {
    const value = structuredClone(svg);
    value.root.children[0].attributes = attributes;
    expect(validateSvgAsset(value).valid).toBe(false);
  }
  const duplicate = structuredClone(svg); duplicate.root.children[0].id = 'root';
  expect(validateSvgAsset(duplicate).valid).toBe(false);
  const unicode = structuredClone(svg); unicode.root.children[0].text = '\ud800';
  expect(validateSvgAsset(unicode).valid).toBe(false);
  const deep = structuredClone(svg);
  for (let index=0;index<10000;index++) deep.root = {tag:'g',id:`g${index}`,attributes:{},text:'',children:[deep.root]};
  expect(validateSvgAsset(deep).valid).toBe(false);
});
it('rejects unsupported transform functions without throwing', () => {
  const asset = structuredClone(svg);
  asset.root.attributes.transform = 'constructor(1)';
  expect(validateSvgAsset(asset).valid).toBe(false);
});
