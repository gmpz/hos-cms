import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../src/app/api/maps/resolve/route.ts';
const request = (url) => new Request(`http://localhost/api/maps/resolve?url=${encodeURIComponent(url)}`);
const short = 'https://maps.app.goo.gl/example';
test('full Maps URL does not require a server fetch', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected fetch'); });
  assert.equal((await GET(request('https://www.google.com/maps?q=Bangkok'))).status, 200);
  assert.equal(mock.mock.callCount(), 0);
});
test('valid redirects are manual and share one timeout signal', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({url:String(url),options});
    return calls.length === 1 ? new Response(null,{status:302,headers:{location:'/second'}})
      : calls.length === 2 ? new Response(null,{status:307,headers:{location:'https://www.google.com/maps?q=Bangkok'}})
      : new Response('page');
  });
  const response = await GET(request(short));
  assert.equal(response.status,200);
  assert.equal((await response.json()).externalUrl,'https://www.google.com/maps?q=Bangkok');
  assert.equal(calls[1].url,'https://maps.app.goo.gl/second');
  assert.ok(calls.every(({options}) => options.redirect === 'manual' && options.signal === calls[0].options.signal));
});
test('unsafe redirect destinations are rejected before fetching them', async (t) => {
  for (const location of ['https://example.com/', 'http://www.google.com/maps', 'https://127.0.0.1/', 'https://www.google.com:8443/', 'https://user:password@www.google.com/', 'https://www.google.com.evil.example/']) {
    const mock = t.mock.method(globalThis,'fetch',async () => new Response(null,{status:302,headers:{location}}));
    assert.equal((await GET(request(short))).status,422);
    assert.equal(mock.mock.callCount(),1);
    mock.mock.restore();
  }
});
test('unsafe initial URLs are rejected without network requests', async (t) => {
  const mock=t.mock.method(globalThis,'fetch',()=>{throw new Error('unexpected fetch');});
  for(const url of ['http://goo.gl/test','https://goo.gl:8080/test','https://user@goo.gl/test','https://example.com/'])
    assert.equal((await GET(request(url))).status,400);
  assert.equal(mock.mock.callCount(),0);
});
test('loops, missing Location, HTTP errors and network timeout fail cleanly',async(t)=>{
  for(const response of [new Response(null,{status:302,headers:{location:short}}),new Response(null,{status:302}),new Response(null,{status:500})]) {
    const mock=t.mock.method(globalThis,'fetch',async()=>response);
    assert.equal((await GET(request(short))).status,422);
    assert.equal(mock.mock.callCount(),1);
    mock.mock.restore();
  }
  t.mock.method(globalThis,'fetch',async()=>{throw new DOMException('Timed out','TimeoutError');});
  assert.equal((await GET(request(short))).status,422);
});
test('at most five redirects are followed',async(t)=>{
  let count=0;
  t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:302,headers:{location:`https://goo.gl/${++count}`}}));
  assert.equal((await GET(request(short))).status,422);
  assert.equal(count,6);
});
