import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const sockets = [];
class Socket {
  static OPEN = 1; static CONNECTING = 0;
  readyState = 0; sent = [];
  constructor() {sockets.push(this);}
  send(message) {this.sent.push(JSON.parse(message));}
  open() {this.readyState = 1; this.onopen?.();}
  message(message) {this.onmessage?.({data: JSON.stringify(message)});}
  close(code = 1000) {this.readyState = 3; this.onclose?.({code, reason: ''});}
}
globalThis.WebSocket = Socket;
globalThis.window = globalThis;
globalThis.__testAuth = {currentUser: {getIdToken: async () => 'test-refreshed-token'}};
let source = readFileSync(new URL('../src/services/websocket.ts', import.meta.url), 'utf8');
source = source.replace("import { auth } from '../config/firebase';", 'const auth = globalThis.__testAuth;').replace("import.meta.env.VITE_API_URL", "'http://127.0.0.1:18000'");
const {outputText} = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}});
const {WebSocketService} = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const delay = () => new Promise(resolve => setTimeout(resolve, 30));

test('auth refresh retains subscriptions and notifies consumers after acknowledgement', async () => {
  const service = new WebSocketService(); service.reconnectDelay = 1; let ready = 0;
  try {
    await service.connect('test-token'); let socket = sockets.at(-1); socket.open(); socket.message({type: 'auth_success'});
    service.onSubscribed('terminal', () => {ready++;}); service.subscribe('terminal', {league: 'NBA'}, () => {});
    socket.message({type: 'subscribed', stream: 'terminal'});
    socket.message({type: 'auth_error'}); await delay();
    socket = sockets.at(-1); socket.open(); socket.message({type: 'auth_success'});
    assert.ok(socket.sent.some(m => m.type === 'subscribe' && m.stream === 'terminal'));
    socket.message({type: 'subscribed', stream: 'terminal'}); assert.equal(ready, 2);
  } finally {service.disconnect();}
});

test('server-initiated normal close reconnects; intentional disconnect does not', async () => {
  const service = new WebSocketService(); service.reconnectDelay = 1;
  try {
    await service.connect('test-token'); const first = sockets.at(-1); first.open(); first.message({type:'auth_success'});
    first.close(1000); await delay(); assert.notEqual(sockets.at(-1), first);
    const count = sockets.length; service.disconnect(); await delay(); assert.equal(sockets.length, count);
  } finally {service.disconnect();}
});
